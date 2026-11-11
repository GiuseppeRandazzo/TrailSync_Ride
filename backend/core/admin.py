from django.contrib import admin
from django.utils.html import format_html
from django.contrib import messages
from core.models import PartnerShop, Tour, Booking
from core.services.gpx_parser import parse_gpx_content
from core.services.ai_tour_guide import generate_tour_guide
from core.services.partner_matching import assign_partner_to_booking


@admin.register(PartnerShop)
class PartnerShopAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'address',
        'coordinates_display',
        'bikes_status_badge',
        'contact_phone',
        'is_active',
        'created_at',
    ]
    list_filter = ['is_active', 'total_bikes']
    search_fields = ['name', 'address', 'contact_phone', 'contact_email']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ("Informazioni Partner", {
            'fields': ('name', 'address', 'is_active')
        }),
        ("Geolocalizzazione", {
            'fields': ('latitude', 'longitude'),
            'description': 'Coordinate geografiche WGS84 per il calcolo della prossimità con i tour.'
        }),
        ("Flotta & Disponibilità", {
            'fields': ('total_bikes', 'available_bikes')
        }),
        ("Contatti Assistenza", {
            'fields': ('contact_phone', 'contact_email')
        }),
        ("Audit", {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def coordinates_display(self, obj):
        return f"{obj.latitude:.4f}, {obj.longitude:.4f}"
    coordinates_display.short_description = "Coordinate"

    def bikes_status_badge(self, obj):
        if not obj.is_active:
            color = "#6c757d"
            text = "Non Attivo"
        elif obj.available_bikes > 3:
            color = "#28a745"
            text = f"{obj.available_bikes} / {obj.total_bikes} Disp."
        elif obj.available_bikes > 0:
            color = "#fd7e14"
            text = f"Pochi: {obj.available_bikes} / {obj.total_bikes}"
        else:
            color = "#dc3545"
            text = "Esaurite (0)"
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">{}</span>',
            color, text
        )
    bikes_status_badge.short_description = "Flotta Bici"


@admin.register(Tour)
class TourAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'distance_km_display',
        'elevation_gain_display',
        'estimated_duration_display',
        'waypoints_count_badge',
        'is_published',
        'created_at',
    ]
    list_filter = ['is_published']
    search_fields = ['title', 'description']
    readonly_fields = ['created_at', 'updated_at', 'waypoints_preview']
    actions = ['reparse_gpx_action', 'generate_ai_guide_action']

    fieldsets = (
        ("Dettagli Principali", {
            'fields': ('title', 'description', 'is_published')
        }),
        ("Traccia GPX", {
            'fields': ('gpx_file', 'distance_km', 'elevation_gain_m', 'estimated_duration_min'),
            'description': 'Carica un file .gpx per calcolare automaticamente distanza, dislivello, polyline e tappe.'
        }),
        ("Punti di Interesse (POI) & Guida AI", {
            'fields': ('waypoints_preview', 'waypoints'),
            'description': 'Waypoints estratti dalla traccia e arricchiti con storytelling turistico.'
        }),
        ("Polyline Mappa (JSON)", {
            'fields': ('polyline',),
            'classes': ('collapse',)
        }),
        ("Audit", {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def distance_km_display(self, obj):
        return f"{obj.distance_km:.1f} km"
    distance_km_display.short_description = "Distanza"

    def elevation_gain_display(self, obj):
        return f"+{obj.elevation_gain_m:.0f} m"
    elevation_gain_display.short_description = "Dislivello"

    def estimated_duration_display(self, obj):
        hours = obj.estimated_duration_min // 60
        mins = obj.estimated_duration_min % 60
        if hours > 0:
            return f"{hours}h {mins}m"
        return f"{mins} min"
    estimated_duration_display.short_description = "Durata Stimata"

    def waypoints_count_badge(self, obj):
        count = len(obj.waypoints or [])
        has_ai = sum(1 for w in (obj.waypoints or []) if w.get('ai_guide'))
        color = "#28a745" if has_ai == count and count > 0 else "#17a2b8"
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">{} POI (AI: {}/{})</span>',
            color, count, has_ai, count
        )
    waypoints_count_badge.short_description = "POI / Guida AI"

    def waypoints_preview(self, obj):
        if not obj.waypoints:
            return "Nessun waypoint registrato. Carica un file GPX o lancia l'azione di estrazione."
        html = '<div style="max-height: 250px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; border-radius: 4px; background: #fafafa;">'
        for w in obj.waypoints:
            has_ai_indicator = "✅ AI Ready" if w.get('ai_guide') else "⚠️ No AI Narration"
            html += f"""
            <div style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dashed #ddd;">
                <strong>#{w.get('id')} - {w.get('name')}</strong> [{w.get('category')}] ({w.get('elevation')}m) - <em>{has_ai_indicator}</em><br/>
                <span style="color: #666; font-size: 12px;">{w.get('notes', '')}</span>
                {f"<br/><span style='color: #2b6cb0; font-size: 12px;'>🎧 <strong>Guida Audio:</strong> {w.get('ai_guide')[:140]}...</span>" if w.get('ai_guide') else ""}
            </div>
            """
        html += '</div>'
        return format_html(html)
    waypoints_preview.short_description = "Anteprima Contenuti POI"

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        if obj.gpx_file and ('gpx_file' in form.changed_data or not obj.polyline):
            try:
                parsed = parse_gpx_content(obj.gpx_file)
                obj.distance_km = parsed["distance_km"]
                obj.elevation_gain_m = parsed["elevation_gain_m"]
                obj.estimated_duration_min = parsed["estimated_duration_min"]
                obj.polyline = parsed["polyline"]
                if not obj.waypoints:
                    obj.waypoints = parsed["waypoints"]
                obj.save()
                messages.success(request, f"Traccia GPX '{obj.title}' parsata con successo: {obj.distance_km} km, +{obj.elevation_gain_m}m.")
            except Exception as e:
                messages.error(request, f"Errore nel parsing GPX: {e}")

    @admin.action(description="🔄 Ricalcola e ri-parsa la traccia GPX")
    def reparse_gpx_action(self, request, queryset):
        success_count = 0
        for tour in queryset:
            if tour.gpx_file:
                try:
                    parsed = parse_gpx_content(tour.gpx_file)
                    tour.distance_km = parsed["distance_km"]
                    tour.elevation_gain_m = parsed["elevation_gain_m"]
                    tour.estimated_duration_min = parsed["estimated_duration_min"]
                    tour.polyline = parsed["polyline"]
                    tour.waypoints = parsed["waypoints"]
                    tour.save()
                    success_count += 1
                except Exception as e:
                    messages.error(request, f"Errore per tour #{tour.id}: {e}")
        messages.success(request, f"Ricalcolati {success_count} tour con successo.")

    @admin.action(description="🤖 Genera / Rigenera Guida AI per tutti i POI")
    def generate_ai_guide_action(self, request, queryset):
        for tour in queryset:
            try:
                enriched = generate_tour_guide(tour)
                messages.success(request, f"Tour '{tour.title}': generata guida AI per {len(enriched)} waypoints.")
            except Exception as e:
                messages.error(request, f"Errore generazione guida per '{tour.title}': {e}")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = [
        'booking_code',
        'customer_name',
        'customer_email',
        'tour_title_display',
        'partner_shop_display',
        'tour_date',
        'status_badge',
        'activated_at',
    ]
    list_filter = ['status', 'tour_date', 'partner_shop']
    search_fields = ['booking_code', 'customer_name', 'customer_email', 'tour__title']
    readonly_fields = ['created_at', 'updated_at']
    actions = ['activate_booking_action', 'assign_nearest_partner_action', 'mark_completed_action']

    fieldsets = (
        ("Codice e Cliente", {
            'fields': ('booking_code', 'customer_name', 'customer_email')
        }),
        ("Dettagli Corsa", {
            'fields': ('tour', 'tour_date', 'status', 'partner_shop')
        }),
        ("Tracking Temporale", {
            'fields': ('activated_at', 'completed_at', 'created_at', 'updated_at')
        }),
    )

    def tour_title_display(self, obj):
        return obj.tour.title
    tour_title_display.short_description = "Tour"

    def partner_shop_display(self, obj):
        if obj.partner_shop:
            return obj.partner_shop.name
        return format_html('<span style="color: #dc3545; font-style: italic;">Da assegnare</span>')
    partner_shop_display.short_description = "Partner Noleggio"

    def status_badge(self, obj):
        colors = {
            Booking.STATUS_CONFIRMED: '#007bff',
            Booking.STATUS_IN_PROGRESS: '#ffc107; color: #212529',
            Booking.STATUS_COMPLETED: '#28a745',
            Booking.STATUS_CANCELLED: '#6c757d',
        }
        color_style = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">{}</span>',
            color_style, obj.get_status_display()
        )
    status_badge.short_description = "Stato"

    @admin.action(description="🚲 Assegna automaticamente partner più vicino")
    def assign_nearest_partner_action(self, request, queryset):
        count = 0
        for booking in queryset:
            assign_partner_to_booking(booking, decrement_inventory=False)
            count += 1
        messages.success(request, f"Partner shop calcolato e assegnato per {count} prenotazioni.")

    @admin.action(description="🟢 Attiva corsa (Stato: In Corso)")
    def activate_booking_action(self, request, queryset):
        for b in queryset:
            b.activate()
        messages.success(request, f"{queryset.count()} prenotazioni marcate come IN_PROGRESS.")

    @admin.action(description="🏁 Segna come Completata")
    def mark_completed_action(self, request, queryset):
        for b in queryset:
            b.complete()
        messages.success(request, f"{queryset.count()} prenotazioni marcate come COMPLETED.")
