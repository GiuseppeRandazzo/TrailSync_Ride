import React, { useState } from 'react';
import { StyleSheet, View, Platform, StatusBar, Modal, Text, TouchableOpacity } from 'react-native';
import { useTour } from '../context/TourContext';
import { MapViewWrapper } from '../components/MapViewWrapper';
import { StatsHeader } from '../components/StatsHeader';
import { SimulationControls } from '../components/SimulationControls';
import { POIDetailSheet } from '../components/POIDetailSheet';
import { Waypoint } from '../types';

export const TourMapScreen: React.FC = () => {
  const {
    tour,
    partner,
    booking,
    riderLocation,
    selectedPOI,
    visitedPOIIds,
    nearbyAlertPOI,
    isSimulating,
    simulationSpeed,
    progressPercentage,
    selectPOI,
    dismissNearbyAlert,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    setSpeed,
    completeTour,
    exitTour,
  } = useTour();

  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);

  if (!tour) {
    return null;
  }

  // Active POI to show in bottom sheet (selected or proximity triggered)
  const activePOI: Waypoint | null = selectedPOI || nearbyAlertPOI;
  const isNearby = !selectedPOI && !!nearbyAlertPOI;

  const handleCompleteRide = async () => {
    await completeTour();
    setShowCompletedModal(true);
  };

  return (
    <View style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      <View style={styles.container}>
        {/* Map View Rendering Polyline and Markers */}
        <MapViewWrapper
          polyline={tour.polyline || []}
          waypoints={tour.waypoints || []}
          riderLocation={riderLocation}
          visitedPOIIds={visitedPOIIds}
          selectedPOI={selectedPOI}
          onSelectPOI={(poi) => selectPOI(poi)}
        />

        {/* Floating Top HUD Stats */}
        <View style={styles.topHudContainer}>
          <StatsHeader
            tour={tour}
            partner={partner}
            riderLocation={riderLocation}
            onExit={() => setShowExitConfirm(true)}
          />
        </View>

        {/* Floating Bottom Simulation Controls (Hidden if sheet is open) */}
        {!activePOI && (
          <View style={styles.bottomControlsContainer}>
            <SimulationControls
              isSimulating={isSimulating}
              simulationSpeed={simulationSpeed}
              progressPercentage={progressPercentage}
              onStart={startSimulation}
              onPause={pauseSimulation}
              onReset={resetSimulation}
              onSetSpeed={setSpeed}
              onCompleteTour={handleCompleteRide}
            />
          </View>
        )}

        {/* POI Detail Bottom Sheet */}
        {activePOI && (
          <POIDetailSheet
            poi={activePOI}
            isNearbyTriggered={isNearby}
            onClose={() => {
              selectPOI(null);
              dismissNearbyAlert();
            }}
          />
        )}

        {/* Exit Confirmation Modal */}
        <Modal
          visible={showExitConfirm}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowExitConfirm(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalEmoji}>🚲</Text>
              <Text style={styles.modalTitle}>Sospendere la navigazione?</Text>
              <Text style={styles.modalDesc}>
                Potrai rientrare nella sessione in qualsiasi momento reinserendo il codice prenotazione {booking?.booking_code}.
              </Text>
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => setShowExitConfirm(false)}
                >
                  <Text style={styles.modalSecondaryBtnText}>Continua Tour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDangerBtn}
                  onPress={() => {
                    setShowExitConfirm(false);
                    exitTour();
                  }}
                >
                  <Text style={styles.modalDangerBtnText}>Esci</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Tour Completed Modal */}
        <Modal
          visible={showCompletedModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowCompletedModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalEmoji}>🏆</Text>
              <Text style={styles.modalTitle}>Congratulazioni, Tour Completato!</Text>
              <Text style={styles.modalDesc}>
                Hai percorso con successo i {tour.distance_km} km del tour "{tour.title}" con un dislivello di +{tour.elevation_gain_m}m!
              </Text>
              <View style={styles.recapBox}>
                <Text style={styles.recapItem}>✅ Tappe ascoltate: {visitedPOIIds.length} / {tour.waypoints.length}</Text>
                <Text style={styles.recapItem}>🚲 Rientro bici: {partner?.name || 'Partner Shop'}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setShowCompletedModal(false);
                  exitTour();
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Torna alla Home</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#090D16',
    paddingTop: Platform.OS === 'ios' ? 44 : Platform.OS === 'android' ? StatusBar.currentHeight || 24 : 0,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  topHudContainer: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  bottomControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  modalEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDesc: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  recapBox: {
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    gap: 6,
  },
  recapItem: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  modalDangerBtn: {
    flex: 1,
    backgroundColor: '#DC2626',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalDangerBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalPrimaryBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    width: '100%',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
