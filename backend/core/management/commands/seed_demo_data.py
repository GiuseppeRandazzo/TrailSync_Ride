"""
Management command to seed initial demonstration data for Outdoora MVP:
- Superuser: admin / admin123
- Partner Shops (Lake Como & Ghisallo)
- Sample Tour from GPX with parsed polyline and AI guide waypoints
- Sample Bookings (OUT-1234, OUT-9999) ready to test in Mobile App!
"""

import os
from pathlib import Path
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.core.files import File
from django.utils import timezone
from core.models import PartnerShop, Tour, Booking
from core.services.gpx_parser import parse_gpx_content
from core.services.ai_tour_guide import generate_tour_guide
from core.services.partner_matching import assign_partner_to_booking

User = get_user_model()


class Command(BaseCommand):
    help = "Seeds demo database with admin, partner shops, tour from GPX, and bookings."

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("🚀 Starting Outdoora Demo Seeding..."))

        # 1. Superuser
        admin_user, created = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@outdoora.com", "is_staff": True, "is_superuser": True}
        )
        if created:
            admin_user.set_password("admin123")
            admin_user.save()
            self.stdout.write(self.style.SUCCESS("✅ Superuser created: admin / admin123"))
        else:
            self.stdout.write(self.style.WARNING("ℹ️ Superuser 'admin' already exists."))

        # 2. Partner Shops
        partners_data = [
            {
                "name": "Bellagio E-Bike Experience",
                "address": "Lungolago Europa 14, 22021 Bellagio (CO)",
                "latitude": 45.9875,
                "longitude": 9.2620,
                "total_bikes": 14,
                "available_bikes": 11,
                "contact_phone": "+39 031 950123",
                "contact_email": "info@bellagio-ebike.it",
                "is_active": True,
            },
            {
                "name": "Ghisallo Cycling Hub & Repair",
                "address": "Piazzale Madonna del Ghisallo, 22030 Magreglio (CO)",
                "latitude": 45.9238,
                "longitude": 9.2672,
                "total_bikes": 8,
                "available_bikes": 6,
                "contact_phone": "+39 031 965432",
                "contact_email": "assistenza@ghisallohub.it",
                "is_active": True,
            },
            {
                "name": "Como Lake Adventure Hub",
                "address": "Viale Geno 6, 22100 Como (CO)",
                "latitude": 45.8150,
                "longitude": 9.0880,
                "total_bikes": 20,
                "available_bikes": 16,
                "contact_phone": "+39 031 245890",
                "contact_email": "booking@comolakeadventure.com",
                "is_active": True,
            }
        ]

        partner_objs = []
        for pdata in partners_data:
            shop, _ = PartnerShop.objects.update_or_create(
                name=pdata["name"],
                defaults=pdata
            )
            partner_objs.append(shop)
        self.stdout.write(self.style.SUCCESS(f"✅ Created/Updated {len(partner_objs)} Partner Shops."))

        # 3. Sample Tour with GPX parsing & AI Guide
        base_dir = Path(__file__).resolve().parent.parent.parent.parent
        gpx_path = base_dir / "sample_data" / "lake_como_scenic_ridge.gpx"

        tour, t_created = Tour.objects.get_or_create(
            title="Lake Como Scenic Ridge: Bellagio to Ghisallo",
            defaults={
                "description": (
                    "Un percorso iconico che parte dal lungolago di Bellagio e risale i versanti "
                    "prealpini fino al celebre Santuario dei Ciclisti della Madonna del Ghisallo. "
                    "Panorami spettacolari a picco sui due rami del Lario e dislivello stimolante."
                ),
                "is_published": True,
            }
        )

        if gpx_path.exists():
            with open(gpx_path, 'rb') as f:
                parsed = parse_gpx_content(f)
                tour.distance_km = parsed["distance_km"]
                tour.elevation_gain_m = parsed["elevation_gain_m"]
                tour.estimated_duration_min = parsed["estimated_duration_min"]
                tour.polyline = parsed["polyline"]
                tour.waypoints = parsed["waypoints"]
                
                # Save file to model filefield if not set
                if not tour.gpx_file:
                    f.seek(0)
                    tour.gpx_file.save("lake_como_scenic_ridge.gpx", File(f), save=False)
                
                tour.save()

            # Enrich with AI Guide
            self.stdout.write(self.style.NOTICE("🤖 Enriching Waypoints with AI Tour Guide scripts..."))
            generate_tour_guide(tour, force_mock=True)
            tour.refresh_from_db()
            self.stdout.write(self.style.SUCCESS(
                f"✅ Tour configured: {tour.title} ({tour.distance_km} km, +{tour.elevation_gain_m}m, {len(tour.waypoints)} POIs with AI Audio Guide)."
            ))
        else:
            self.stdout.write(self.style.ERROR(f"❌ GPX file not found at {gpx_path}"))

        # 4. Sample Bookings
        # Booking 1: Mario Rossi - OUT-1234 (Ready to activate in mobile app!)
        booking1, b1_created = Booking.objects.get_or_create(
            booking_code="OUT-1234",
            defaults={
                "customer_name": "Mario Rossi",
                "customer_email": "mario.rossi@example.com",
                "tour_date": timezone.now() + timezone.timedelta(hours=2),
                "tour": tour,
                "partner_shop": partner_objs[0], # Bellagio E-Bike
                "status": Booking.STATUS_CONFIRMED,
            }
        )
        if b1_created:
            assign_partner_to_booking(booking1, decrement_inventory=False)

        # Booking 2: Laura Bianchi - OUT-9999 (Already in progress)
        booking2, b2_created = Booking.objects.get_or_create(
            booking_code="OUT-9999",
            defaults={
                "customer_name": "Laura Bianchi",
                "customer_email": "laura.bianchi@example.com",
                "tour_date": timezone.now(),
                "tour": tour,
                "partner_shop": partner_objs[0],
                "status": Booking.STATUS_IN_PROGRESS,
                "activated_at": timezone.now() - timezone.timedelta(minutes=35),
            }
        )

        self.stdout.write(self.style.SUCCESS("✅ Sample Bookings Created:"))
        self.stdout.write(f"   🎟️ Code: {booking1.booking_code} -> {booking1.customer_name} (Status: {booking1.status}) [USE IN MOBILE]")
        self.stdout.write(f"   🎟️ Code: {booking2.booking_code} -> {booking2.customer_name} (Status: {booking2.status})")

        self.stdout.write(self.style.SUCCESS("\n🎉 Outdoora backend seeded and ready!"))
        self.stdout.write("👉 Start server: python manage.py runserver 0.0.0.0:8000")
        self.stdout.write("👉 Admin Panel: http://127.0.0.1:8000/admin/ (User: admin, Pass: admin123)")
        self.stdout.write("👉 Activation Endpoint: POST http://127.0.0.1:8000/api/bookings/activate/")
