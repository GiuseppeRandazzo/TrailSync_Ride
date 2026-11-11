import { PolylinePoint, Waypoint, RiderLocation } from '../types';

/**
 * Calculates great-circle distance between two geographic coordinates in meters.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance in meters to a human-readable string (e.g. "850 m" or "14.2 km").
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Formats duration in minutes to a human-readable string (e.g. "45 min" or "2h 15m").
 */
export function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0) {
    return `${hrs}h ${mins > 0 ? `${mins}m` : ''}`.trim();
  }
  return `${mins} min`;
}

/**
 * Checks if the rider is within proximity of any waypoint along the route.
 */
export function findNearbyWaypoint(
  rider: RiderLocation | null,
  waypoints: Waypoint[],
  proximityRadiusMeters: number = 80
): Waypoint | null {
  if (!rider || !waypoints || waypoints.length === 0) return null;

  for (const wpt of waypoints) {
    const dist = calculateDistanceMeters(
      rider.latitude,
      rider.longitude,
      wpt.latitude,
      wpt.longitude
    );
    if (dist <= proximityRadiusMeters) {
      return wpt;
    }
  }

  return null;
}
