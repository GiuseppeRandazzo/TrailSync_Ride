"""
GPX Parser Service for Outdoora Ride & Partner Core.
Parses GPX tracks, extracts polyline coordinates, calculates 2D/3D distance,
elevation gain, estimated cycling duration, and extracts waypoints/POIs.
"""

import math
import logging
from typing import Dict, Any, List
import gpxpy
import gpxpy.gpx

logger = logging.getLogger(__name__)


def calculate_haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in km."""
    R = 6371.0 # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def parse_gpx_content(content_or_file) -> Dict[str, Any]:
    """
    Parses a GPX file or string and extracts structured track data.
    
    Returns:
        {
            "title": str,
            "description": str,
            "polyline": List[Dict[str, float]], # [{"latitude": lat, "longitude": lng, "elevation": ele}]
            "distance_km": float,
            "elevation_gain_m": float,
            "estimated_duration_min": int,
            "waypoints": List[Dict[str, Any]]
        }
    """
    if hasattr(content_or_file, 'read'):
        raw_data = content_or_file.read()
        if isinstance(raw_data, bytes):
            xml_text = raw_data.decode('utf-8', errors='replace')
        else:
            xml_text = str(raw_data)
        if hasattr(content_or_file, 'seek'):
            content_or_file.seek(0)
    elif isinstance(content_or_file, bytes):
        xml_text = content_or_file.decode('utf-8', errors='replace')
    else:
        xml_text = str(content_or_file)

    gpx = gpxpy.parse(xml_text)

    # 1. Polyline and Elevation Gain
    polyline: List[Dict[str, Any]] = []
    total_distance_meters = 0.0
    elevation_gain_m = 0.0
    last_pt = None

    for track in gpx.tracks:
        for segment in track.segments:
            for pt in segment.points:
                point_dict = {
                    "latitude": round(pt.latitude, 6),
                    "longitude": round(pt.longitude, 6),
                    "elevation": round(pt.elevation or 0.0, 1),
                }
                polyline.append(point_dict)

                if last_pt:
                    # Elevation gain calculation
                    if pt.elevation and last_pt.elevation:
                        diff = pt.elevation - last_pt.elevation
                        if diff > 0:
                            elevation_gain_m += diff
                last_pt = pt

    # If gpxpy has built-in distance calculation, use it or fallback to haversine sum
    try:
        dist_2d = gpx.length_2d()
        if dist_2d and dist_2d > 0:
            distance_km = dist_2d / 1000.0
        else:
            # Fallback manual calculation
            manual_dist = 0.0
            for i in range(1, len(polyline)):
                manual_dist += calculate_haversine_distance_km(
                    polyline[i-1]["latitude"], polyline[i-1]["longitude"],
                    polyline[i]["latitude"], polyline[i]["longitude"]
                )
            distance_km = manual_dist
    except Exception as e:
        logger.warning(f"Error computing GPX 2D length: {e}")
        distance_km = 0.0

    # If gpxpy has elevation analysis
    try:
        uphill, downhill = gpx.get_uphill_downhill()
        if uphill and uphill > 0:
            elevation_gain_m = uphill
    except Exception:
        pass

    # 2. Extract Waypoints
    waypoints: List[Dict[str, Any]] = []
    for idx, wpt in enumerate(gpx.waypoints, start=1):
        waypoints.append({
            "id": idx,
            "name": wpt.name or f"Punto di Interesse #{idx}",
            "latitude": round(wpt.latitude, 6),
            "longitude": round(wpt.longitude, 6),
            "elevation": round(wpt.elevation or 0.0, 1),
            "notes": wpt.description or wpt.comment or "Tappa panoramica sul percorso.",
            "category": _infer_poi_category(wpt.name or "", wpt.description or ""),
            "ai_guide": "" # Will be populated by ai_tour_guide.py
        })

    # If no waypoints were explicitly present in the GPX file, generate smart checkpoints
    if not waypoints and len(polyline) > 2:
        step = max(1, len(polyline) // 4)
        indices = [0, step, step * 2, min(step * 3, len(polyline) - 1)]
        poi_labels = ["Partenza Tour", "Belvedere Panoramico", "Punto Sosta & Ristoro", "Traguardo"]
        for idx, pt_idx in enumerate(indices, start=1):
            pt = polyline[pt_idx]
            label = poi_labels[idx - 1] if idx - 1 < len(poi_labels) else f"Tappa #{idx}"
            waypoints.append({
                "id": idx,
                "name": label,
                "latitude": pt["latitude"],
                "longitude": pt["longitude"],
                "elevation": pt["elevation"],
                "notes": f"Tappa intermedia al km {(idx - 1) * (distance_km / 3):.1f}.",
                "category": "VIEWPOINT" if idx == 2 else "BIKE_STOP",
                "ai_guide": ""
            })

    # 3. Estimated Duration (min)
    # Average recreational e-bike / gravel cycling: ~18 km/h on flat, + 1 min for every 10m ascent
    avg_speed_kmh = 18.0
    flat_time_hours = distance_km / avg_speed_kmh if avg_speed_kmh > 0 else 1.0
    climb_penalty_min = (elevation_gain_m / 100.0) * 8.0 # 8 mins per 100m climb
    estimated_duration_min = max(20, int((flat_time_hours * 60) + climb_penalty_min))

    title = gpx.name or "Outdoora Cycling Trail"
    description = gpx.description or f"Percorso di {distance_km:.1f} km con {elevation_gain_m:.0f}m di dislivello positivo."

    return {
        "title": title,
        "description": description,
        "polyline": polyline,
        "distance_km": round(distance_km, 2),
        "elevation_gain_m": round(elevation_gain_m, 1),
        "estimated_duration_min": estimated_duration_min,
        "waypoints": waypoints,
    }


def _infer_poi_category(name: str, desc: str) -> str:
    """Categorizes the POI based on keyword matching."""
    text = f"{name} {desc}".lower()
    if any(k in text for k in ['chiesa', 'santuario', 'villa', 'castello', 'monumento', 'museo', 'storico']):
        return "MONUMENT"
    if any(k in text for k in ['belvedere', 'panorama', 'vista', 'terrazza', 'lago', 'monte', 'cima']):
        return "VIEWPOINT"
    if any(k in text for k in ['rifugio', 'bar', 'caffè', 'ristoro', 'trattoria', 'fontana', 'acqua']):
        return "REFRESHMENT"
    if any(k in text for k in ['noleggio', 'officina', 'partner', 'bici', 'ricarica', 'start', 'partenza']):
        return "BIKE_HUB"
    return "HIGHLIGHT"
