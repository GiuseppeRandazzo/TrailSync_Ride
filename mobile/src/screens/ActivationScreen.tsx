import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTour } from '../context/TourContext';
import { api } from '../services/api';

export const ActivationScreen: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [apiUrl, setApiUrl] = useState<string>(api.getBaseUrl());
  const { activateBooking, loadDemoOfflineTour, isLoading, error, setApiBaseUrl } = useTour();

  const handleActivate = async (codeToUse?: string) => {
    const targetCode = (codeToUse || code).trim();
    if (!targetCode) return;
    await activateBooking(targetCode);
  };

  const handleSaveApiUrl = () => {
    setApiBaseUrl(apiUrl);
    setShowConfig(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header */}
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🌲🚴</Text>
          </View>
          <Text style={styles.brandTitle}>OUTDOORA</Text>
          <Text style={styles.brandSubtitle}>Rider &amp; Partner Core</Text>
          <Text style={styles.brandTagline}>
            Inserisci il codice ricevuto via email o da GetYourGuide / Viator per sbloccare la tua traccia GPX e la guida AI.
          </Text>
        </View>

        {/* Activation Card */}
        <View style={styles.card}>
          <Text style={styles.inputLabel}>CODICE PRENOTAZIONE</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="es. OUT-1234"
              placeholderTextColor="#64748B"
              value={code}
              onChangeText={(val) => setCode(val.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => handleActivate()}
            />
          </View>

          {/* Quick Demo Pill */}
          <View style={styles.demoPillsRow}>
            <Text style={styles.demoLabel}>Demo Rapida:</Text>
            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => {
                setCode('OUT-1234');
                handleActivate('OUT-1234');
              }}
            >
              <Text style={styles.demoPillText}>⚡ OUT-1234</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demoPill}
              onPress={() => {
                setCode('OUT-9999');
                handleActivate('OUT-9999');
              }}
            >
              <Text style={styles.demoPillText}>OUT-9999</Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorEmoji}>⚠️</Text>
              <View style={styles.errorContentCol}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={styles.offlineDemoBtn}
                  onPress={() => loadDemoOfflineTour()}
                >
                  <Text style={styles.offlineDemoBtnText}>
                    ⚡ Carica Tour in Modalità Demo Locale (Offline)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, (!code.trim() || isLoading) && styles.submitButtonDisabled]}
            onPress={() => handleActivate()}
            disabled={!code.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Sblocca Tour e Avvia Mappa →</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Feature Highlights */}
        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🗺️</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Traccia GPX Navigabile</Text>
              <Text style={styles.featureDesc}>
                Visualizza la polyline con dislivello in tempo reale e profilo altimetrico.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎧</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Guida Culturale AI Audio</Text>
              <Text style={styles.featureDesc}>
                Curiosità storiche e suggerimenti tecnici per ogni punto d'interesse.
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🚲</Text>
            <View style={styles.featureTextCol}>
              <Text style={styles.featureTitle}>Matching Partner Shop</Text>
              <Text style={styles.featureDesc}>
                Punto di ritiro bici ed assistenza tecnica più vicino al percorso.
              </Text>
            </View>
          </View>
        </View>

        {/* Backend Endpoint Config (Accordion) */}
        <View style={styles.configAccordion}>
          <TouchableOpacity
            style={styles.configToggle}
            onPress={() => setShowConfig((prev) => !prev)}
          >
            <Text style={styles.configToggleText}>
              ⚙️ Configura Host Backend ({apiUrl})
            </Text>
          </TouchableOpacity>

          {showConfig && (
            <View style={styles.configBody}>
              <Text style={styles.configHelp}>
                Se testi con Expo Go su cellulare fisico, usa l'IP locale della tua macchina (es. http://192.168.1.100:8000) anziché localhost.
              </Text>
              <TextInput
                style={styles.configInput}
                value={apiUrl}
                onChangeText={setApiUrl}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity style={styles.configSaveBtn} onPress={handleSaveApiUrl}>
                <Text style={styles.configSaveBtnText}>Salva Indirizzo Backend</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  logoIcon: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1,
    marginTop: 2,
  },
  brandTagline: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  inputLabel: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputWrapper: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#374151',
  },
  input: {
    height: 52,
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  demoPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  demoLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '600',
  },
  demoPill: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  demoPillText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#7F1D1D33',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
  },
  errorEmoji: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 2,
  },
  errorContentCol: {
    flex: 1,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 12,
    lineHeight: 16,
  },
  offlineDemoBtn: {
    backgroundColor: '#059669',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  offlineDemoBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: '#059669',
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  submitButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  featuresContainer: {
    marginTop: 32,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11182780',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 14,
  },
  featureTextCol: {
    flex: 1,
  },
  featureTitle: {
    color: '#F3F4F6',
    fontSize: 13,
    fontWeight: '700',
  },
  featureDesc: {
    color: '#9CA3AF',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  configAccordion: {
    marginTop: 30,
    alignItems: 'center',
  },
  configToggle: {
    padding: 8,
  },
  configToggleText: {
    color: '#6B7280',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  configBody: {
    backgroundColor: '#111827',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  configHelp: {
    color: '#9CA3AF',
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 15,
  },
  configInput: {
    backgroundColor: '#1F2937',
    color: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    marginBottom: 8,
  },
  configSaveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  configSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
