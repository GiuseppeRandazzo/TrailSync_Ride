import json
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from core.models import PartnerShop, Tour, Booking
from core.services.gpx_parser import parse_gpx_content, calculate_haversine_distance_km
from core.services.partner_matching import find_nearest_partner, assign_partner_to_booking
from core.services.ai_tour_guide import generate_tour_guide


SAMPLE_GPX_XML = """<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Test">
  <wpt lat="45.98" lon="9.26"><name>Start Point</name><desc>Lakefront</desc></wpt>
  <wpt lat="45.92" lon="9.27"><name>Summit</name><desc>Ghisallo Church</desc></wpt>
  <trk><trkseg>
    <trkpt lat="45.98" lon="9.26"><ele>200.0</ele></trkpt>
    <trkpt lat="45.95" lon="9.265"><ele>450.0</ele></trkpt>
    <trkpt lat="45.92" lon="9.27"><ele>750.0</ele></trkpt>
  </trkseg></trk>
</gpx>
"""


class GPXParserTests(TestCase):
    def test_parse_gpx_content(self):
        parsed = parse_gpx_content(SAMPLE_GPX_XML)
        self.assertEqual(len(parsed["polyline"]), 3)
        self.assertEqual(len(parsed["waypoints"]), 2)
        self.assertGreater(parsed["distance_km"], 6.0)
        self.assertEqual(parsed["elevation_gain_m"], 550.0) # (450-200) + (750-450) = 550m
        self.assertGreater(parsed["estimated_duration_min"], 20)

    def test_haversine_calculation(self):
        # Distance between Bellagio (45.9875, 9.2620) and Ghisallo (45.9238, 9.2672)
        dist = calculate_haversine_distance_km(45.9875, 9.2620, 45.9238, 9.2672)
        self.assertGreater(dist, 6.0)
        self.assertLess(dist, 8.0)


class PartnerMatchingTests(TestCase):
    def setUp(self):
        self.close_shop = PartnerShop.objects.create(
            name="Shop Close",
            address="Near Start",
            latitude=45.9870,
            longitude=9.2620,
            total_bikes=5,
            available_bikes=3,
            is_active=True
        )
        self.far_shop = PartnerShop.objects.create(
            name="Shop Far",
            address="Far Away",
            latitude=45.8000,
            longitude=9.0800,
            total_bikes=10,
            available_bikes=10,
            is_active=True
        )

    def test_find_nearest_partner(self):
        partner, dist = find_nearest_partner(45.9875, 9.2625)
        self.assertIsNotNone(partner)
        self.assertEqual(partner.id, self.close_shop.id)
        self.assertLess(dist, 0.5) # Under 500m away

    def test_find_nearest_partner_no_availability(self):
        self.close_shop.available_bikes = 0
        self.close_shop.save()
        partner, dist = find_nearest_partner(45.9875, 9.2625)
        self.assertEqual(partner.id, self.far_shop.id)


class BookingAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.partner = PartnerShop.objects.create(
            name="Test Partner",
            address="Test Address",
            latitude=45.9875,
            longitude=9.2620,
            total_bikes=5,
            available_bikes=5,
            is_active=True
        )
        self.tour = Tour.objects.create(
            title="Test Tour",
            distance_km=12.5,
            elevation_gain_m=400.0,
            polyline=[{"latitude": 45.9875, "longitude": 9.2620}, {"latitude": 45.95, "longitude": 9.26}],
            waypoints=[
                {"id": 1, "name": "Start Hub", "latitude": 45.9875, "longitude": 9.2620, "category": "BIKE_HUB"},
                {"id": 2, "name": "Ghisallo", "latitude": 45.9238, "longitude": 9.2672, "category": "MONUMENT"}
            ]
        )
        self.booking = Booking.objects.create(
            booking_code="OUT-TEST1",
            customer_name="Test Rider",
            customer_email="rider@test.com",
            tour=self.tour,
            status=Booking.STATUS_CONFIRMED
        )

    def test_activate_booking_success(self):
        url = reverse('booking-activate')
        response = self.client.post(url, {"booking_code": "OUT-TEST1"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertIn("booking", data)
        self.assertEqual(data["booking"]["status"], Booking.STATUS_IN_PROGRESS)
        self.assertEqual(data["booking"]["booking_code"], "OUT-TEST1")
        self.assertEqual(len(data["booking"]["tour"]["polyline"]), 2)
        # Should have auto-generated AI narration for waypoints
        self.assertTrue(len(data["booking"]["tour"]["waypoints"][0]["ai_guide"]) > 10)

    def test_activate_invalid_booking_code(self):
        url = reverse('booking-activate')
        response = self.client.post(url, {"booking_code": "INVALID-999"}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_generate_ai_guide_endpoint(self):
        url = reverse('tour-generate-guide', kwargs={'pk': self.tour.pk})
        response = self.client.post(url, {"force_mock": True}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data["waypoints"]), 2)
        self.assertTrue(len(data["waypoints"][1]["ai_guide"]) > 10)

    def test_export_gpx_endpoint(self):
        url = reverse('tour-export-gpx', kwargs={'pk': self.tour.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/gpx+xml')
        content = response.content.decode('utf-8')
        self.assertIn('<gpx version="1.1"', content)
        self.assertIn('<wpt', content)
        self.assertIn('<trkpt', content)
        self.assertIn('Start Hub', content)
