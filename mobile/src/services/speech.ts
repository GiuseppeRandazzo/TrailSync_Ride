/**
 * Speech Service for Outdoora Rider Audio Guide.
 * Supports native Web Speech API in browser and optional expo-speech in native apps.
 */

let ExpoSpeech: any = null;
try {
  // Lazy require to avoid build break if not installed
  ExpoSpeech = require('expo-speech');
} catch {
  ExpoSpeech = null;
}

export class SpeechService {
  private isSpeakingNow: boolean = false;

  public speak(
    text: string,
    onProgress?: (progressPct: number) => void,
    onEnd?: () => void
  ): () => void {
    this.stop();
    this.isSpeakingNow = true;

    // 1. Browser Web Speech Synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'it-IT';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => {
        this.isSpeakingNow = false;
        onEnd?.();
      };

      utterance.onerror = () => {
        this.isSpeakingNow = false;
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);

      return () => {
        this.stop();
      };
    }

    // 2. Expo Native Speech
    if (ExpoSpeech && ExpoSpeech.speak) {
      ExpoSpeech.speak(text, {
        language: 'it-IT',
        pitch: 1.0,
        rate: 0.95,
        onDone: () => {
          this.isSpeakingNow = false;
          onEnd?.();
        },
        onStopped: () => {
          this.isSpeakingNow = false;
          onEnd?.();
        },
        onError: () => {
          this.isSpeakingNow = false;
          onEnd?.();
        },
      });

      return () => {
        this.stop();
      };
    }

    // Fallback: silent timer if no speech engine is available
    return () => {
      this.stop();
    };
  }

  public stop(): void {
    this.isSpeakingNow = false;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (ExpoSpeech && ExpoSpeech.stop) {
      ExpoSpeech.stop();
    }
  }

  public isSpeaking(): boolean {
    return this.isSpeakingNow;
  }
}

export const speechService = new SpeechService();
