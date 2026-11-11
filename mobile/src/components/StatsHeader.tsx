import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Tour, PartnerShop, RiderLocation } from '../types';

interface StatsHeaderProps {
  tour: Tour;
  partner: PartnerShop | null;
  riderLocation: RiderLocation | null;
  onExit: () => void;
}

export const StatsHeader: React.FC<StatsHeaderProps> = ({
  tour,
  partner,
  riderLocation,
  onExit,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Bar with Title and Exit */}
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          <Text style={styles.tourLabel}>TOUR ATTIVO</Text>
          <Text style={styles.tourTitle} numberOfLines={1}>
            {tour.title}
          </Text>
        </View>

        <TouchableOpacity style={styles.exitButton} onPress={onExit}>
          <Text style={styles.exitButtonText}>Esci</Text>
        </TouchableOpacity>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Distanza</Text>
          <Text style={styles.metricValue}>{tour.distance_km.toFixed(1)} km</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Dislivello</Text>
          <Text style={styles.metricValue}>+{tour.elevation_gain_m.toFixed(0)} m</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Quota Attuale</Text>
          <Text style={styles.metricValue}>{riderLocation?.altitude || 0} m</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Velocità</Text>
          <Text style={[styles.metricValue, styles.speedHighlight]}>
            {riderLocation?.speed || 0} km/h
          </Text>
        </View>
      </View>

      {/* Partner Shop Info Pill */}
      {partner && (
        <View style={styles.partnerPill}>
          <Text style={styles.partnerEmoji}>🚲</Text>
          <Text style={styles.partnerText} numberOfLines={1}>
            <Text style={styles.partnerBold}>Partner Hub:</Text> {partner.name} ({partner.available_bikes} bici disp.)
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172ACC',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  tourLabel: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  tourTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  exitButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exitButtonText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  metricLabel: {
    color: '#94A3B8',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  speedHighlight: {
    color: '#34D399',
  },
  partnerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 8,
  },
  partnerEmoji: {
    fontSize: 12,
    marginRight: 6,
  },
  partnerText: {
    color: '#A7F3D0',
    fontSize: 11,
    flex: 1,
  },
  partnerBold: {
    fontWeight: '700',
  },
});
