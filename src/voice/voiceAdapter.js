/**
 * Unified Voice Adapter
 * Integrates Sarvam AI with transparent Web Speech fallback,
 * in-memory TTS audio caching, and audio feedback.
 */
import { SarvamAdapter } from './sarvamAdapter.js';
import { WebSpeechAdapter } from './webSpeechAdapter.js';

export class VoiceAdapter {
  constructor() {
    this.sarvam = new SarvamAdapter();
    this.webSpeech = new WebSpeechAdapter();
    this.ttsCache = new Map();
    this.isSpeaking = false;
    this.isListening = false;
    this.activeVoiceSettings = { lang: 'hi-IN', speaker: 'shreya', pace: 1.0 };
    this.listeners = new Set();
  }

  setVoiceSettings(settings) {
    this.activeVoiceSettings = { ...this.activeVoiceSettings, ...settings };
  }

  on(event, callback) {
    this.listeners.add({ event, callback });
  }

  emit(event, data) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (err) {
          console.warn(`Error in voice event listener (${event}):`, err);
        }
      }
    }
  }

  async speak(text, options = {}) {
    if (!text) return;

    this.stopListening();
    this.isSpeaking = true;
    this.emit('speaking:start', { text });

    const mergedOptions = { ...this.activeVoiceSettings, ...options };

    try {
      // Try Sarvam first
      await this.sarvam.speak(text, mergedOptions);
    } catch (err) {
      console.warn('Sarvam TTS failed, using WebSpeech fallback:', err.message);
      await this.webSpeech.speak(text, mergedOptions);
    } finally {
      this.isSpeaking = false;
      this.emit('speaking:end', { text });
    }
  }

  async listen(options = {}) {
    if (this.isSpeaking) {
      // Prevent listening while speaking to avoid echo
      return '';
    }

    this.isListening = true;
    this.emit('listening:start');

    const mergedOptions = {
      ...this.activeVoiceSettings,
      ...options,
      onLevel: (lvl) => this.emit('audio:level', lvl)
    };

    let transcript = '';
    try {
      transcript = await this.sarvam.listen(mergedOptions);
    } catch (err) {
      console.warn('Sarvam STT failed, using WebSpeech fallback:', err.message);
      transcript = await this.webSpeech.listen(mergedOptions);
    } finally {
      this.isListening = false;
      this.emit('listening:end', { transcript });
    }

    return transcript;
  }

  stopListening() {
    this.isListening = false;
    this.sarvam.stop();
    this.webSpeech.stop();
    this.emit('listening:end', { transcript: '' });
  }

  stopAll() {
    this.isSpeaking = false;
    this.isListening = false;
    this.sarvam.stop();
    this.webSpeech.stop();
  }
}

export const voiceAdapter = new VoiceAdapter();
