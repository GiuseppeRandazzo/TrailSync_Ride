import React, { useRef, useEffect, useMemo } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { PolylinePoint, Waypoint, RiderLocation, POICategory } from '../types';

interface MapViewWrapperProps {
  polyline: PolylinePoint[];
  waypoints: Waypoint[];
  riderLocation: RiderLocation | null;
  visitedPOIIds: number[];
  selectedPOI: Waypoint | null;
  onSelectPOI: (poi: Waypoint) => void;
}

export const MapViewWrapper: React.FC<MapViewWrapperProps> = ({
  polyline,
  waypoints,
  riderLocation,
  visitedPOIIds,
  selectedPOI,
  onSelectPOI,
}) => {
  const mapRef = useRef<MapView | null>(null);

  const initialRegion = useMemo(() => {
    if (polyline.length === 0) {
      return {
        latitude: 45.988,
        longitude: 9.262,
        latitudeDelta: 0.12,
        longitudeDelta: 0.12,
      };
    }
    const lats = polyline.map((p) => p.latitude);
    const lngs = polyline.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.04, (maxLat - minLat) * 1.4),
      longitudeDelta: Math.max(0.04, (maxLng - minLng) * 1.4),
    };
  }, [polyline]);

  useEffect(() => {
    if (mapRef.current && riderLocation) {
      mapRef.current.animateCamera({
        center: {
          latitude: riderLocation.latitude,
          longitude: riderLocation.longitude,
        },
        pitch: 25,
        zoom: 14,
      });
    }
  }, [riderLocation]);

  const getCategoryColor = (category: POICategory) => {
    switch (category) {
      case 'VIEWPOINT':
        return '#0284c7';
      case 'MONUMENT':
        return '#8b5cf6';
      case 'REFRESHMENT':
        return '#ea580c';
      case 'BIKE_HUB':
        return '#10b981';
      default:
        return '#6366f1';
    }
  };

  const getCategoryIcon = (category: POICategory) => {
    switch (category) {
      case 'VIEWPOINT':
        return '🔭';
      case 'MONUMENT':
        return '🏛️';
      case 'REFRESHMENT':
        return '☕';
      case 'BIKE_HUB':
        return '🚲';
      default:
        return '📍';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsCompass={true}
        showsScale={true}
      >
        {polyline.length > 1 && (
          <Polyline
            coordinates={polyline}
            strokeColor="#10B981"
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {waypoints.map((wpt) => {
          const isVisited = visitedPOIIds.includes(wpt.id);
          const isSelected = selectedPOI?.id === wpt.id;
          const markerColor = getCategoryColor(wpt.category);

          return (
            <Marker
              key={`poi-${wpt.id}`}
              coordinate={{ latitude: wpt.latitude, longitude: wpt.longitude }}
              title={wpt.name}
              description={`${wpt.elevation}m - ${wpt.notes}`}
              onPress={() => onSelectPOI(wpt)}
            >
              <View
                style={[
                  styles.nativeMarker,
                  { backgroundColor: markerColor },
                  isSelected && styles.nativeMarkerSelected,
                  isVisited && styles.nativeMarkerVisited,
                ]}
              >
                <Text style={styles.markerEmoji}>{getCategoryIcon(wpt.category)}</Text>
                <Text style={styles.markerNumber}>{wpt.id}</Text>
              </View>
            </Marker>
          );
        })}

        {riderLocation && (
          <Marker
            coordinate={{
              latitude: riderLocation.latitude,
              longitude: riderLocation.longitude,
            }}
            title="Tu sei qui (Ciclista)"
            description={`Altitudine: ${riderLocation.altitude || 0}m | Velocità: ${riderLocation.speed || 0} km/h`}
          >
            <View style={styles.cyclistMarkerContainer}>
              <View style={styles.cyclistPulseRing} />
              <View style={styles.cyclistIconCircle}>
                <Text style={styles.cyclistEmoji}>🚴</Text>
              </View>
            </View>
          </Marker>
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  nativeMarker: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  nativeMarkerSelected: {
    borderColor: '#F59E0B',
    transform: [{ scale: 1.2 }],
  },
  nativeMarkerVisited: {
    opacity: 0.85,
  },
  markerEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  markerNumber: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cyclistMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
  },
  cyclistPulseRing: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.35)',
    borderWidth: 1.5,
    borderColor: '#10B981',
  },
  cyclistIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#065F46',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  cyclistEmoji: {
    fontSize: 14,
  },
});
