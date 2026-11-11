import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';

interface SimulationControlsProps {
  isSimulating: boolean;
  simulationSpeed: number;
  progressPercentage: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSetSpeed: (speed: number) => void;
  onCompleteTour: () => void;
}

export const SimulationControls: React.FC<SimulationControlsProps> = ({
  isSimulating,
  simulationSpeed,
  progressPercentage,
  onStart,
  onPause,
  onReset,
  onSetSpeed,
  onCompleteTour,
}) => {
  return (
    <View style={styles.container}>
      {/* Progress Bar along the GPX Track */}
      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Avanzamento Traccia GPX</Text>
          <Text style={styles.progressValue}>{progressPercentage}%</Text>
        </View>
        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${progressPercentage}%` },
            ]}
          />
        </View>
      </View>

      {/* Control Buttons Row */}
      <View style={styles.controlsRow}>
        {/* Play / Pause Toggle */}
        <TouchableOpacity
          style={[
            styles.mainButton,
            isSimulating ? styles.pauseButton : styles.playButton,
          ]}
          onPress={isSimulating ? onPause : onStart}
        >
          <Text style={styles.mainButtonText}>
            {isSimulating ? '⏸️ Pausa Simulazione' : '▶️ Simula Corsa GPS'}
          </Text>
        </TouchableOpacity>

        {/* Speed Selector */}
        <View style={styles.speedGroup}>
          {[1, 2, 5].map((spd) => (
            <TouchableOpacity
              key={`speed-${spd}`}
              style={[
                styles.speedButton,
                simulationSpeed === spd && styles.speedButtonActive,
              ]}
              onPress={() => onSetSpeed(spd)}
            >
              <Text
                style={[
                  styles.speedButtonText,
                  simulationSpeed === spd && styles.speedButtonTextActive,
                ]}
              >
                {spd}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Reset */}
        <TouchableOpacity style={styles.iconButton} onPress={onReset}>
          <Text style={styles.iconButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Complete Ride Action */}
      {progressPercentage >= 80 && (
        <TouchableOpacity style={styles.completeButton} onPress={onCompleteTour}>
          <Text style={styles.completeButtonText}>🏁 Termina Corsa con Successo</Text>
        </TouchableOpacity>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  progressValue: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainButton: {
    flex: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    backgroundColor: '#059669',
  },
  pauseButton: {
    backgroundColor: '#D97706',
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  speedGroup: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 2,
  },
  speedButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
  },
  speedButtonActive: {
    backgroundColor: '#3B82F6',
  },
  speedButtonText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  speedButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  iconButton: {
    backgroundColor: '#1E293B',
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    fontSize: 14,
  },
  completeButton: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
});
