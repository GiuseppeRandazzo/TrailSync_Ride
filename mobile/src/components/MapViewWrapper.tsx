import React, { useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { PolylinePoint, Waypoint, RiderLocation, POICategory } from '../types';

interface MapViewWrapperProps {
  polyline: PolylinePoint[];
  waypoints: Waypoint[];
  riderLocation: RiderLocation | null;
  visitedPOIIds: number[];
  selectedPOI: Waypoint | null;
  onSelectPOI: (poi: Waypoint) => void;
}

// Check if running in native mobile (react-native-maps supported) vs web
let MapView: any = null;
let Polyline: any = null;
let Marker: any = null;

try {
  if (Platform.OS !== 'web') {
    const Maps = require('react-native-maps');
    MapView = Maps.default;
    Polyline = Maps.Polyline;
    Marker = Maps.Marker;
  }
} catch (e) {
  MapView = null;
}

export const MapViewWrapper: React.FC<MapViewWrapperProps> = ({
  polyline,
  waypoints,
  riderLocation,
  visitedPOIIds,
  selectedPOI,
  onSelectPOI,
}) => {
  const mapRef = useRef<any>(null);

  // Calculate bounding box or initial region
  const initialRegion = React.useMemo(() => {
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

  // Recenter map on rider when location changes
  useEffect(() => {
    if (mapRef.current && riderLocation && Platform.OS !== 'web') {
      mapRef.current.animateCamera({
        center: {
          latitude: riderLocation.latitude,
          longitude: riderLocation.longitude,
        },
        pitch: 30,
        zoom: 15,
      });
    }
  }, [riderLocation]);

  const getCategoryColor = (category: POICategory) => {
    switch (category) {
      case 'VIEWPOINT':
        return '#0284c7'; // Sky Blue
      case 'MONUMENT':
        return '#8b5cf6'; // Violet
      case 'REFRESHMENT':
        return '#ea580c'; // Orange
      case 'BIKE_HUB':
        return '#10b981'; // Emerald
      default:
        return '#6366f1'; // Indigo
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

  // If running natively and react-native-maps is available
  if (MapView && Platform.OS !== 'web') {
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
          {/* GPX Track Polyline */}
          {polyline.length > 1 && (
            <Polyline
              coordinates={polyline}
              strokeColor="#10B981"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Waypoints / POIs */}
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

          {/* Cyclist Position Marker */}
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
  }

  // Cross-platform Web & Simulator Fallback (Interactive Vector Map)
  return (
    <View style={styles.webContainer}>
      <View style={styles.webMapHeader}>
        <Text style={styles.webMapTitle}>🗺️ Outdoora Interactive Trail View</Text>
        <Text style={styles.webMapSubtitle}>
          Traccia GPX attiva: {polyline.length} coordinate registrate
        </Text>
      </View>

      {/* Visual Canvas Representation of the Route */}
      <View style={styles.webCanvas}>
        {/* Polyline Path representation */}
        <View style={styles.webRoutePath}>
          <Text style={styles.webStartText}>🟢 Partenza: Bellagio</Text>
          <View style={styles.webLine} />
          <Text style={styles.webEndText}>🏁 Traguardo: Ghisallo Summit</Text>
        </View>

        {/* POI Cards on Web Map */}
        <View style={styles.webPOIList}>
          {waypoints.map((wpt) => {
            const isVisited = visitedPOIIds.includes(wpt.id);
            const isSelected = selectedPOI?.id === wpt.id;

            return (
              <TouchableOpacity
                key={`web-wpt-${wpt.id}`}
                style={[
                  styles.webPOICard,
                  { borderLeftColor: getCategoryColor(wpt.category) },
                  isSelected && styles.webPOICardSelected,
                ]}
                onPress={() => onSelectPOI(wpt)}
              >
                <View style={styles.webPOIBadge}>
                  <Text style={styles.webPOIEmoji}>{getCategoryIcon(wpt.category)}</Text>
                  <Text style={styles.webPOINumber}>#{wpt.id}</Text>
                </View>
                <View style={styles.webPOIInfo}>
                  <Text style={styles.webPOIName}>{wpt.name}</Text>
                  <Text style={styles.webPOIEle}>
                    Alt: {wpt.elevation}m {isVisited ? '• ✅ Visitato' : '• 🎧 Guida pronta'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Active Cyclist Status Box */}
      {riderLocation && (
        <View style={styles.riderBox}>
          <Text style={styles.riderBoxTitle}>🚴 Posizione Ciclista Corrente</Text>
          <Text style={styles.riderBoxCoords}>
            Lat: {riderLocation.latitude.toFixed(4)} | Lng: {riderLocation.longitude.toFixed(4)} |
            Quota: {riderLocation.altitude || 0}m | Velocità: {riderLocation.speed || 0} km/h
          </Text>
        </View>
      )}
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
  // Web / Fallback Styles
  webContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
    justifyContent: 'space-between',
  },
  webMapHeader: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  webMapTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  webMapSubtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  webCanvas: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
  },
  webRoutePath: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  webStartText: {
    color: '#34D399',
    fontWeight: '600',
    fontSize: 14,
  },
  webLine: {
    height: 4,
    backgroundColor: '#10B981',
    borderRadius: 2,
    marginVertical: 8,
  },
  webEndText: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 14,
  },
  webPOIList: {
    gap: 8,
  },
  webPOICard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  webPOICardSelected: {
    backgroundColor: '#1e3a5f',
    borderColor: '#38bdf8',
  },
  webPOIBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  webPOIEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  webPOINumber: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 12,
  },
  webPOIInfo: {
    flex: 1,
  },
  webPOIName: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 13,
  },
  webPOIEle: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  riderBox: {
    backgroundColor: '#064E3B',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  riderBoxTitle: {
    color: '#A7F3D0',
    fontWeight: 'bold',
    fontSize: 13,
  },
  riderBoxCoords: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
  },
});
