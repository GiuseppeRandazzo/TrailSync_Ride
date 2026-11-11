from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import PartnerShopViewSet, TourViewSet, BookingViewSet

router = DefaultRouter()
router.register(r'partners', PartnerShopViewSet, basename='partner')
router.register(r'tours', TourViewSet, basename='tour')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('', include(router.urls)),
]
