import logging
from xml.sax.saxutils import escape as xml_escape
from django.shortcuts import get_object_or_404
from django.http import HttpResponse
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.request import Request

from core.models import PartnerShop, Tour, Booking
from core.serializers import (
    PartnerShopSerializer,
    TourSummarySerializer,
    TourDetailSerializer,
    BookingSerializer,
    BookingActivationRequestSerializer,
    BookingActivationResponseSerializer,
    GenerateGuideRequestSerializer,
)
from core.services.gpx_parser import parse_gpx_content
from core.services.ai_tour_guide import generate_tour_guide
from core.services.partner_matching import assign_partner_to_booking

logger = logging.getLogger(__name__)


class PartnerShopViewSet(viewsets.ModelViewSet):
    """
    CRUD API for rental and service partner shops.
    """
    queryset = PartnerShop.objects.all()
    serializer_class = PartnerShopSerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'address']


class TourViewSet(viewsets.ModelViewSet):
    """
    API for managing cycling tours and GPX tracks.
    """
    queryset = Tour.objects.all()

    def get_serializer_class(self):
        if self.action in ['retrieve', 'update', 'partial_update']:
            return TourDetailSerializer
        return TourSummarySerializer

    def perform_create(self, serializer):
        """Auto-parse GPX track on creation if file is uploaded."""
        tour = serializer.save()
        if tour.gpx_file:
            try:
                parsed = parse_gpx_content(tour.gpx_file)
                tour.distance_km = parsed["distance_km"]
                tour.elevation_gain_m = parsed["elevation_gain_m"]
                tour.estimated_duration_min = parsed["estimated_duration_min"]
                tour.polyline = parsed["polyline"]
                if not tour.waypoints:
                    tour.waypoints = parsed["waypoints"]
                tour.save()
            except Exception as e:
                logger.error(f"Failed to parse GPX on tour creation: {e}")

    @action(detail=True, methods=['post'], url_path='generate-guide')
    def generate_guide(self, request: Request, pk=None) -> Response:
        """
        POST /api/tours/{id}/generate-guide/
        Enriches tour waypoints with audio-ready cultural narration and cycling tips
        using OpenAI or the local intelligent narrative engine.
        """
        tour = self.get_object()
        req_serializer = GenerateGuideRequestSerializer(data=request.data)
        req_serializer.is_valid(raise_exception=True)
        force_mock = req_serializer.validated_data.get('force_mock', False)

        try:
            enriched_waypoints = generate_tour_guide(tour, force_mock=force_mock)
            return Response({
                "message": f"Guida AI generata con successo per {len(enriched_waypoints)} waypoints.",
                "tour_id": tour.id,
                "waypoints": enriched_waypoints,
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Error generating AI tour guide")
            return Response(
                {"error": f"Generazione guida fallita: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], url_path='reparse-gpx')
    def reparse_gpx(self, request: Request, pk=None) -> Response:
        """
        POST /api/tours/{id}/reparse-gpx/
        Re-parses the uploaded GPX file and recalculates polyline, distance, and elevation.
        """
        tour = self.get_object()
        if not tour.gpx_file:
            return Response({"error": "Nessun file GPX presente per questo tour."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            parsed = parse_gpx_content(tour.gpx_file)
            tour.distance_km = parsed["distance_km"]
            tour.elevation_gain_m = parsed["elevation_gain_m"]
            tour.estimated_duration_min = parsed["estimated_duration_min"]
            tour.polyline = parsed["polyline"]
            # Preserve existing AI guides if matching names exist
            old_guide_map = {w.get("name"): w.get("ai_guide") for w in (tour.waypoints or [])}
            new_waypoints = parsed["waypoints"]
            for w in new_waypoints:
                if w.get("name") in old_guide_map and old_guide_map[w.get("name")]:
                    w["ai_guide"] = old_guide_map[w.get("name")]
            tour.waypoints = new_waypoints
            tour.save()

            return Response(TourDetailSerializer(tour).data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception("Failed to re-parse GPX")
            return Response({"error": f"Errore parsing GPX: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='export-gpx')
    def export_gpx(self, request: Request, pk=None) -> HttpResponse:
        """
        GET /api/tours/{id}/export-gpx/
        Exports the tour as a standardized GPX 1.1 file enriched with AI audio guide notes
        inside each <wpt> tag, ready for Garmin, Wahoo, and Hammerhead bike computers.
        """
        tour = self.get_object()
        xml_lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<gpx version="1.1" creator="Outdoora Ride Platform - https://outdoora.com" xmlns="http://www.topografix.com/GPX/1/1">',
            '  <metadata>',
            f'    <name>{xml_escape(tour.title)}</name>',
            f'    <desc>{xml_escape(tour.description or "")}</desc>',
            '  </metadata>',
        ]

        # Add enriched waypoints
        for wpt in (tour.waypoints or []):
            lat = wpt.get('latitude', 0.0)
            lon = wpt.get('longitude', 0.0)
            ele = wpt.get('elevation', 0.0)
            name = xml_escape(str(wpt.get('name', 'Waypoint')))
            desc_text = str(wpt.get('ai_guide') or wpt.get('notes') or '')
            desc = xml_escape(desc_text)
            xml_lines.append(f'  <wpt lat="{lat:.6f}" lon="{lon:.6f}">')
            xml_lines.append(f'    <ele>{ele:.1f}</ele>')
            xml_lines.append(f'    <name>{name}</name>')
            if desc:
                xml_lines.append(f'    <desc>{desc}</desc>')
            xml_lines.append('  </wpt>')

        # Add track and track points
        xml_lines.append('  <trk>')
        xml_lines.append(f'    <name>{xml_escape(tour.title)}</name>')
        xml_lines.append('    <type>Cycling</type>')
        xml_lines.append('    <trkseg>')
        for pt in (tour.polyline or []):
            lat = pt.get('latitude', 0.0)
            lon = pt.get('longitude', 0.0)
            ele = pt.get('elevation', 0.0)
            xml_lines.append(f'      <trkpt lat="{lat:.6f}" lon="{lon:.6f}"><ele>{ele:.1f}</ele></trkpt>')
        xml_lines.append('    </trkseg>')
        xml_lines.append('  </trk>')
        xml_lines.append('</gpx>')

        gpx_content = "\n".join(xml_lines)
        response = HttpResponse(gpx_content, content_type='application/gpx+xml')
        safe_title = "".join(c if c.isalnum() else "_" for c in tour.title).strip("_")
        response['Content-Disposition'] = f'attachment; filename="outdoora_tour_{tour.id}_{safe_title}.gpx"'
        return response


class BookingViewSet(viewsets.ModelViewSet):
    """
    API for rider bookings, matching partners, and mobile activation.
    """
    queryset = Booking.objects.select_related('partner_shop', 'tour').all()
    serializer_class = BookingSerializer
    filterset_fields = ['status', 'booking_code']
    search_fields = ['booking_code', 'customer_name', 'customer_email']

    def perform_create(self, serializer):
        booking = serializer.save()
        # Automatically match nearest partner if not explicitly provided
        if not booking.partner_shop:
            assign_partner_to_booking(booking, decrement_inventory=False)

    @action(detail=False, methods=['post'], url_path='activate')
    def activate(self, request: Request) -> Response:
        """
        POST /api/bookings/activate/
        Called by the mobile app when rider enters their booking code (e.g. OUT-1234).
        Validates code, activates booking, matches partner if needed, and returns
        the complete tour payload (polyline, waypoints with AI guide, and partner info).
        """
        req_serializer = BookingActivationRequestSerializer(data=request.data)
        req_serializer.is_valid(raise_exception=True)
        code = req_serializer.validated_data['booking_code'].strip().upper()

        booking = Booking.objects.filter(booking_code__iexact=code).select_related('partner_shop', 'tour').first()
        if not booking:
            return Response(
                {"error": f"Nessuna prenotazione trovata con il codice '{code}'. Verifica il codice e riprova."},
                status=status.HTTP_404_NOT_FOUND
            )

        if booking.status == Booking.STATUS_CANCELLED:
            return Response(
                {"error": "Questa prenotazione risulta annullata. Contatta l'assistenza Outdoora."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Auto-match partner if none assigned yet
        if not booking.partner_shop:
            assign_partner_to_booking(booking, decrement_inventory=True)

        # Ensure tour waypoints have AI guides
        tour = booking.tour
        has_guides = any(w.get("ai_guide") for w in (tour.waypoints or []))
        if not has_guides and tour.waypoints:
            try:
                generate_tour_guide(tour)
                tour.refresh_from_db()
            except Exception as e:
                logger.warning(f"Could not auto-generate guide on activation: {e}")

        # Activate booking
        booking.activate()

        resp_serializer = BookingActivationResponseSerializer(booking)
        return Response({
            "message": f"Tour '{tour.title}' attivato con successo! Buona pedalata.",
            "booking": resp_serializer.data
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='complete')
    def complete(self, request: Request, pk=None) -> Response:
        """
        POST /api/bookings/{id}/complete/
        Marks the booking ride as completed.
        """
        booking = self.get_object()
        booking.complete()
        return Response({
            "message": f"Corsa #{booking.booking_code} completata con successo!",
            "status": booking.status,
            "completed_at": booking.completed_at
        }, status=status.HTTP_200_OK)
