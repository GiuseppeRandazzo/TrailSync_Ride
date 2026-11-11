import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
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
    <View style={styles.webContainer}>
      <View style={styles.webMapHeader}>
        <Text style={styles.webMapTitle}>🗺️ Outdoora Interactive Trail View</Text>
        <Text style={styles.webMapSubtitle}>
          Traccia GPX attiva: {polyline.length} punti • Seleziona una tappa per ascoltare la guida AI
        </Text>
      </View>

      <ScrollView style={styles.webCanvas} contentContainerStyle={styles.webCanvasContent}>
        <View style={styles.webRoutePath}>
          <Text style={styles.webStartText}>🟢 Partenza: Bellagio Lakefront</Text>
          <View style={styles.webLine} />
          <Text style={styles.webEndText}>🏁 Vetts: Madonna del Ghisallo &amp; Rifugio</Text>
        </View>

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
                    Quota: {wpt.elevation}m {isVisited ? '• ✅ Visitato' : '• 🎧 Tocca per Guida Audio'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

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
  webContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 16,
    paddingTop: 155,
    paddingBottom: 130,
  },
  webMapHeader: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  webMapTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  webMapSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  webCanvas: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 12,
  },
  webCanvasContent: {
    padding: 14,
  },
  webRoutePath: {
    backgroundColor: '#334155',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  webStartText: {
    color: '#34D399',
    fontWeight: '600',
    fontSize: 13,
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
    fontSize: 13,
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
    marginBottom: 8,
  },
  webPOICardSelected: {
    backgroundColor: '#1e3a5f',
    borderColor: '#38bdf8',
    borderWidth: 1,
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
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  riderBoxTitle: {
    color: '#A7F3D0',
    fontWeight: 'bold',
    fontSize: 12,
  },
  riderBoxCoords: {
    color: '#FFFFFF',
    fontSize: 11,
    marginTop: 2,
  },
});
