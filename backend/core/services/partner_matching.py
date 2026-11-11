"""
Partner Matching Service for Outdoora Ride & Partner Core.
Automatically matches a booking to the nearest active rental/partner shop
with available bikes using geospatial distance calculations.
"""

import logging
from typing import Optional, Tuple
from django.db import transaction
from core.models import PartnerShop, Booking, Tour
from core.services.gpx_parser import calculate_haversine_distance_km

logger = logging.getLogger(__name__)


def find_nearest_partner(
    start_lat: float,
    start_lng: float,
    min_bikes_required: int = 1
) -> Tuple[Optional[PartnerShop], Optional[float]]:
    """
    Searches all active partner shops with sufficient bike inventory and finds
    the closest one to the provided coordinates.
    
    Returns:
        (nearest_shop, distance_in_km) or (None, None) if none found.
    """
    eligible_partners = PartnerShop.objects.filter(
        is_active=True,
        available_bikes__gte=min_bikes_required
    )

    if not eligible_partners.exists():
        logger.warning("No active partner shops with available bikes found.")
        return None, None

    nearest_shop = None
    min_distance = float('inf')

    for shop in eligible_partners:
        distance = calculate_haversine_distance_km(start_lat, start_lng, shop.latitude, shop.longitude)
        if distance < min_distance:
            min_distance = distance
            nearest_shop = shop

    if nearest_shop:
        logger.info(f"Matched nearest partner: {nearest_shop.name} at {min_distance:.2f} km.")
        return nearest_shop, round(min_distance, 2)

    return None, None


def assign_partner_to_booking(
    booking: Booking,
    decrement_inventory: bool = True
) -> Tuple[Booking, Optional[PartnerShop]]:
    """
    Finds the optimal partner shop for the booking's tour start point and assigns it.
    If decrement_inventory is True, reduces available bikes by 1 inside a transaction.
    """
    tour: Tour = booking.tour
    start_lat, start_lng = tour.start_point

    if start_lat is None or start_lng is None:
        logger.warning(f"Tour #{tour.id} has no start coordinates. Defaulting to first partner.")
        first_partner = PartnerShop.objects.filter(is_active=True, available_bikes__gt=0).first()
        if first_partner:
            booking.partner_shop = first_partner
            booking.save(update_fields=['partner_shop', 'updated_at'])
        return booking, first_partner

    with transaction.atomic():
        partner, _ = find_nearest_partner(start_lat, start_lng)
        if partner:
            booking.partner_shop = partner
            if decrement_inventory and partner.available_bikes > 0:
                partner.available_bikes -= 1
                partner.save(update_fields=['available_bikes', 'updated_at'])
            booking.save(update_fields=['partner_shop', 'updated_at'])

    return booking, booking.partner_shop
