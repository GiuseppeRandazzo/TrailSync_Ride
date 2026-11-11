"""
AI Tour Guide Enrichment Service for Outdoora Ride & Partner Core.
Generates audio-ready, engaging cultural narratives and cycling tips for POIs
along a tour using OpenAI GPT or a rich local narrative mock engine.
"""

import os
import json
import logging
from typing import List, Dict, Any
from django.conf import settings
from core.models import Tour

logger = logging.getLogger(__name__)


def generate_tour_guide(tour: Tour, force_mock: bool = False) -> List[Dict[str, Any]]:
    """
    Enriches tour waypoints with audio-ready cultural narration and cycling tips.
    Saves the updated waypoints directly to the Tour model.
    """
    waypoints = tour.waypoints or []
    if not waypoints:
        logger.warning(f"Tour #{tour.id} has no waypoints to enrich.")
        return []

    use_mock = force_mock or getattr(settings, 'MOCK_OPENAI', True) or not getattr(settings, 'OPENAI_API_KEY', '')

    if use_mock:
        enriched_waypoints = _generate_mock_guide(tour.title, waypoints)
    else:
        enriched_waypoints = _generate_openai_guide(tour.title, waypoints)

    tour.waypoints = enriched_waypoints
    tour.save(update_fields=['waypoints', 'updated_at'])
    return enriched_waypoints


def _generate_openai_guide(tour_title: str, waypoints: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Calls OpenAI API to generate audio-ready narration for each waypoint."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=settings.OPENAI_API_KEY)

        prompt = f"""
You are Outdoora's expert local cycling guide and storyteller.
Tour Title: "{tour_title}".

For each of the following Waypoints/POIs, write a vivid, engaging, audio-ready narration in Italian.
Guidelines for each POI:
- Length: 2 to 4 sentences (approx. 35-50 words).
- Tone: Welcoming, immersive, culturally rich, like a podcast host speaking directly into the cyclist's ear.
- Include: One fascinating historical or natural curiosity and one quick cycling/safety tip.
- Output MUST be a valid JSON array of objects with keys: "id" and "ai_guide".

Waypoints:
{json.dumps([{"id": w.get("id"), "name": w.get("name"), "notes": w.get("notes"), "category": w.get("category")} for w in waypoints], ensure_ascii=False)}
"""

        response = client.chat.completions.create(
            model=getattr(settings, 'OPENAI_MODEL', 'gpt-4o-mini'),
            messages=[
                {"role": "system", "content": "You are a professional audio tour guide for cyclists. Respond strictly in JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            response_format={"type": "json_object"}
        )

        response_text = response.choices[0].message.content
        data = json.loads(response_text)
        
        # Handle cases where response might be wrapped in a key like {"waypoints": [...]} or be a direct list
        items = data if isinstance(data, list) else data.get('waypoints') or data.get('items') or list(data.values())[0]

        guide_map = {}
        if isinstance(items, list):
            for item in items:
                guide_map[item.get("id")] = item.get("ai_guide")

        for w in waypoints:
            w_id = w.get("id")
            if w_id in guide_map:
                w["ai_guide"] = guide_map[w_id]
            else:
                w["ai_guide"] = _build_default_narration(w.get("name", ""), w.get("category", ""))

        return waypoints

    except Exception as e:
        logger.error(f"OpenAI guide generation failed, falling back to mock: {e}")
        return _generate_mock_guide(tour_title, waypoints)


def _generate_mock_guide(tour_title: str, waypoints: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Generates rich, high-quality audio scripts without requiring OpenAI API quota.
    Curated specifically for outdoor cycling, Lake Como, and general alpine routes.
    """
    curated_knowledge = {
        "bellagio": (
            "Benvenuto a Bellagio, la 'Perla del Lario'! Ti trovi proprio dove i due rami del lago si separano verso Como e Lecco. "
            "Respira l'aria fresca del mattino e controlla la pressione delle gomme: davanti a noi si apre una delle salite più amate dai campioni del Giro di Lombardia."
        ),
        "villa melzi": (
            "Alla tua destra scorrono i giardini neoclassici di Villa Melzi d'Eril, progettati nel 1808. "
            "Sapevi che il compositore Franz Liszt compose qui alcune delle sue opere più celebri guardando i riflessi sull'acqua? "
            "Mantieni una pedalata agile e costante: il dislivello inizia ad aumentare dopo questa curva."
        ),
        "civenna": (
            "Fermati un istante al Belvedere di Civenna. Davanti a te si stagliano i maestosi torrioni calcarei della Grigna Settentrionale. "
            "Nelle giornate limpide la brezza termica, detta 'Breva', risale la valle rinfrescando i ciclisti. "
            "Bevi un sorso d'acqua: mancano solo 4 tornanti panoramici alla vetta."
        ),
        "ghisallo": (
            "Sei arrivato al leggendario Santuario della Madonna del Ghisallo, patrona universale dei ciclisti proclamata da Papa Pio XII nel 1949! "
            "All'interno arde la fiamma eterna e sono custodite le biciclette storiche di Coppi, Bartali e Pantani. "
            "Questo è il vero cuore pulsante del ciclismo mondiale: concediti una sosta e ascolta il rintocco della campana votiva."
        ),
        "rifugio": (
            "Complimenti, hai conquistato la cresta panoramica! Da qui la vista a 360 gradi abbraccia sia il lago che l'arco alpino svizzero. "
            "È il momento perfetto per una meritata pausa con polenta o formaggi tipici delle baite lariane prima di goderti la discesa in sicurezza."
        )
    }

    for idx, w in enumerate(waypoints, start=1):
        name = w.get("name", "").lower()
        notes = w.get("notes", "")
        category = w.get("category", "HIGHLIGHT")

        matched_text = None
        for key, script in curated_knowledge.items():
            if key in name or key in notes.lower():
                matched_text = script
                break

        if not matched_text:
            matched_text = _build_default_narration(w.get("name", f"Tappa {idx}"), category)

        w["ai_guide"] = matched_text

    return waypoints


def _build_default_narration(name: str, category: str) -> str:
    category_scripts = {
        "VIEWPOINT": f"Ti trovi a {name}. Da questo affaccio strategico puoi ammirare il profilo delle vette circostanti scolpite dai ghiacciai millenari. Respira a fondo e goditi il panorama prima di riprendere il ritmo.",
        "MONUMENT": f"Stai costeggiando {name}, un luogo ricco di storia e tradizione locale. Presta attenzione alla segnaletica e alle pavimentazioni in ciottoli tipiche dei borghi storici.",
        "REFRESHMENT": f"Punto sosta presso {name}. La corretta idratazione è fondamentale durante le uscite in bici: approfittane per fare il pieno alla borraccia e recuperare energie.",
        "BIKE_HUB": f"Sei arrivato a {name}. Qui puoi effettuare un check-up rapido al cambio e alla catena prima di affrontare la prossima sezione di percorso.",
        "HIGHLIGHT": f"Benvenuto a {name}. Questo waypoint segna un passaggio chiave del tuo itinerario Outdoora. Mantieni una pedalata fluida e assapora la bellezza del paesaggio."
    }
    return category_scripts.get(category, category_scripts["HIGHLIGHT"])
