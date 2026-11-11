from rest_framework import serializers
from core.models import PartnerShop, Tour, Booking


class PartnerShopSerializer(serializers.ModelSerializer):
    has_availability = serializers.ReadOnlyField()

    class Meta:
        model = PartnerShop
        fields = [
            'id',
            'name',
            'address',
            'latitude',
            'longitude',
            'total_bikes',
            'available_bikes',
            'has_availability',
            'contact_phone',
            'contact_email',
            'is_active',
            'created_at',
        ]


class TourSummarySerializer(serializers.ModelSerializer):
    waypoints_count = serializers.SerializerMethodField()

    class Meta:
        model = Tour
        fields = [
            'id',
            'title',
            'description',
            'distance_km',
            'elevation_gain_m',
            'estimated_duration_min',
            'waypoints_count',
            'is_published',
            'created_at',
        ]

    def get_waypoints_count(self, obj) -> int:
        return len(obj.waypoints or [])


class TourDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tour
        fields = [
            'id',
            'title',
            'description',
            'gpx_file',
            'distance_km',
            'elevation_gain_m',
            'estimated_duration_min',
            'waypoints',
            'polyline',
            'is_published',
            'created_at',
            'updated_at',
        ]


class BookingSerializer(serializers.ModelSerializer):
    partner_shop = PartnerShopSerializer(read_only=True)
    tour = TourSummarySerializer(read_only=True)
    tour_id = serializers.PrimaryKeyRelatedField(
        queryset=Tour.objects.all(),
        source='tour',
        write_only=True
    )
    partner_shop_id = serializers.PrimaryKeyRelatedField(
        queryset=PartnerShop.objects.all(),
        source='partner_shop',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_code',
            'customer_name',
            'customer_email',
            'tour_date',
            'status',
            'activated_at',
            'completed_at',
            'partner_shop',
            'partner_shop_id',
            'tour',
            'tour_id',
            'created_at',
        ]
        read_only_fields = ['id', 'activated_at', 'completed_at', 'created_at']


class BookingActivationRequestSerializer(serializers.Serializer):
    booking_code = serializers.CharField(
        max_length=50,
        required=True,
        help_text="Codice prenotazione univoco (es. OUT-1234)"
    )


class BookingActivationResponseSerializer(serializers.ModelSerializer):
    """
    Complete payload returned to the mobile app upon tour activation.
    Includes full GPX polyline, waypoints with AI guide, and partner shop.
    """
    tour = TourDetailSerializer(read_only=True)
    partner_shop = PartnerShopSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id',
            'booking_code',
            'customer_name',
            'customer_email',
            'tour_date',
            'status',
            'activated_at',
            'partner_shop',
            'tour',
        ]


class GenerateGuideRequestSerializer(serializers.Serializer):
    force_mock = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Forza la modalità mock locale anche se OPENAI_API_KEY è configurata"
    )
