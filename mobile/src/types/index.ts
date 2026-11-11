export type POICategory = 'VIEWPOINT' | 'MONUMENT' | 'REFRESHMENT' | 'BIKE_HUB' | 'HIGHLIGHT';

export interface PartnerShop {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  total_bikes: number;
  available_bikes: number;
  has_availability: boolean;
  contact_phone?: string;
  contact_email?: string;
  is_active: boolean;
}

export interface Waypoint {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  elevation: number;
  notes: string;
  category: POICategory;
  ai_guide?: string;
}

export interface PolylinePoint {
  latitude: number;
  longitude: number;
  elevation?: number;
}

export interface Tour {
  id: number;
  title: string;
  description: string;
  distance_km: number;
  elevation_gain_m: number;
  estimated_duration_min: number;
  waypoints: Waypoint[];
  polyline: PolylinePoint[];
  gpx_file?: string;
  is_published: boolean;
  created_at: string;
}

export type BookingStatus = 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Booking {
  id: number;
  booking_code: string;
  customer_name: string;
  customer_email: string;
  tour_date: string;
  status: BookingStatus;
  activated_at?: string;
  partner_shop?: PartnerShop;
  tour: Tour;
}

export interface RiderLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}
