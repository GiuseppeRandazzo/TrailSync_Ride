import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { Waypoint, POICategory } from '../types';
import { speechService } from '../services/speech';

interface POIDetailSheetProps {
  poi: Waypoint;
  isNearbyTriggered?: boolean;
  onClose: () => void;
}

export const POIDetailSheet: React.FC<POIDetailSheetProps> = ({
  poi,
  isNearbyTriggered = false,
  onClose,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [fadeAnim] = useState(new Animated.Value(0));
  const cancelSpeechRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();

    return () => {
      speechService.stop();
      if (cancelSpeechRef.current) {
        cancelSpeechRef.current();
      }
    };
  }, []);

  // Audio playback progress animation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlayingAudio) {
      timer = setInterval(() => {
        setAudioProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingAudio(false);
            return 0;
          }
          return prev + 4;
        });
      }, 500);
    } else {
      setAudioProgress(0);
    }
    return () => clearInterval(timer);
  }, [isPlayingAudio]);

  const toggleAudio = () => {
    if (isPlayingAudio) {
      speechService.stop();
      setIsPlayingAudio(false);
      setAudioProgress(0);
    } else {
      const textToRead = poi.ai_guide || poi.notes || poi.name;
      cancelSpeechRef.current = speechService.speak(
        textToRead,
        undefined,
        () => {
          setIsPlayingAudio(false);
          setAudioProgress(0);
        }
      );
      setIsPlayingAudio(true);
    }
  };

  const getCategoryLabel = (category: POICategory) => {
    switch (category) {
      case 'VIEWPOINT':
        return '🔭 PUNTO PANORAMICO';
      case 'MONUMENT':
        return '🏛️ MONUMENTO STORICO';
      case 'REFRESHMENT':
        return '☕ SOSTA & RISTORO';
      case 'BIKE_HUB':
        return '🚲 PARTNER & BIKE HUB';
      default:
        return '📍 TAPPA DEL TOUR';
    }
  };

  return (
    <Animated.View style={[styles.sheetContainer, { opacity: fadeAnim }]}>
      <View style={styles.sheetHandle} />

      {/* Proximity Alert Pill */}
      {isNearbyTriggered && (
        <View style={styles.proximityBanner}>
          <Text style={styles.proximityEmoji}>🔔</Text>
          <Text style={styles.proximityText}>
            Sei nelle vicinanze di questo punto! Ascolta la guida dedicata.
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleArea}>
          <Text style={styles.categoryBadge}>{getCategoryLabel(poi.category)}</Text>
          <Text style={styles.poiTitle}>{poi.name}</Text>
          <Text style={styles.poiSub}>
            Quota: <Text style={styles.highlight}>{poi.elevation} m s.l.m.</Text> • Tappa #{poi.id}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        {/* Tourist Notes */}
        <View style={styles.notesBox}>
          <Text style={styles.notesTitle}>NOTE PERCORSO</Text>
          <Text style={styles.notesText}>{poi.notes}</Text>
        </View>

        {/* AI Audio Guide Box */}
        <View style={styles.aiGuideBox}>
          <View style={styles.aiGuideHeader}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>🤖 OUTDOORA AI GUIDE</Text>
            </View>
            <Text style={styles.audioDurationText}>~45 sec audio</Text>
          </View>

          {/* Interactive Audio Player Bar */}
          <View style={styles.playerBar}>
            <TouchableOpacity style={styles.playButton} onPress={toggleAudio}>
              <Text style={styles.playButtonIcon}>
                {isPlayingAudio ? '⏸️' : '▶️'}
              </Text>
            </TouchableOpacity>

            <View style={styles.waveformContainer}>
              <View style={styles.waveTrack}>
                <View
                  style={[
                    styles.waveFill,
                    { width: `${audioProgress}%` },
                  ]}
                />
              </View>
              <View style={styles.timeRow}>
                <Text style={styles.timeText}>
                  0:{Math.min(45, Math.round((audioProgress / 100) * 45))
                    .toString()
                    .padStart(2, '0')}
                </Text>
                <Text style={styles.timeText}>0:45</Text>
              </View>
            </View>
          </View>

          {/* AI Narration Text */}
          <View style={styles.narrationContainer}>
            <Text style={styles.narrationLabel}>Trascrizione Narrazione Audio:</Text>
            <Text style={styles.narrationText}>
              "{poi.ai_guide || 'Guida in fase di caricamento o non ancora generata.'}"
            </Text>
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '65%',
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#475569',
    alignSelf: 'center',
    marginBottom: 12,
  },
  proximityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#065F46',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  proximityEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  proximityText: {
    color: '#D1FAE5',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleArea: {
    flex: 1,
    marginRight: 12,
  },
  categoryBadge: {
    color: '#38BDF8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  poiTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  poiSub: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 3,
  },
  highlight: {
    color: '#34D399',
    fontWeight: '700',
  },
  closeBtn: {
    backgroundColor: '#1E293B',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  contentScroll: {
    marginTop: 4,
  },
  notesBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  notesTitle: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  notesText: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  aiGuideBox: {
    backgroundColor: '#172554',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E40AF',
    marginBottom: 10,
  },
  aiGuideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  audioDurationText: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '600',
  },
  playerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A8A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 12,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playButtonIcon: {
    fontSize: 16,
  },
  waveformContainer: {
    flex: 1,
  },
  waveTrack: {
    height: 6,
    backgroundColor: '#1E40AF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  waveFill: {
    height: '100%',
    backgroundColor: '#60A5FA',
    borderRadius: 3,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timeText: {
    color: '#BFDBFE',
    fontSize: 10,
    fontWeight: '600',
  },
  narrationContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 12,
  },
  narrationLabel: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  narrationText: {
    color: '#F1F5F9',
    fontSize: 13,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
