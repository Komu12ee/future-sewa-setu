/**
 * Web Speech API Adapter
 * Native browser STT (SpeechRecognition) & TTS (speechSynthesis) fallback.
 * Guarantees the kiosk operates smoothly offline or if external API keys fail.
 */

export class WebSpeechAdapter {
  constructor() {
    this.synth = window.speechSynthesis;
    this.recognition = null;
    this.initRecognition();
  }

  initRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRec) {
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'hi-IN';
    }
  }

  speak(text, options = {}) {
    return new Promise((resolve) => {
      if (!this.synth) {
        console.warn('SpeechSynthesis not supported');
        return resolve();
      }

      this.synth.cancel(); // stop any ongoing speech

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || 'hi-IN';
      utterance.rate = options.pace || 0.95;
      utterance.pitch = 1.0;

      // Find Hindi voice if available
      const voices = this.synth.getVoices();
      const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
      if (hindiVoice) {
        utterance.voice = hindiVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn('Utterance error:', e);
        resolve();
      };

      // Safety timeout so speech never hangs
      const wordsCount = text.split(' ').length;
      const timeoutMs = Math.max(2500, wordsCount * 450);
      const timer = setTimeout(() => resolve(), timeoutMs);

      utterance.onend = () => {
        clearTimeout(timer);
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  listen(options = {}) {
    return new Promise((resolve) => {
      if (!this.recognition) {
        console.warn('SpeechRecognition not available');
        return resolve('');
      }

      const maxMs = options.maxMs || 8000;
      let settled = false;

      const finish = (result) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          try { this.recognition.stop(); } catch (_) {}
          resolve(result);
        }
      };

      const timer = setTimeout(() => {
        finish('');
      }, maxMs);

      this.recognition.lang = options.lang || 'hi-IN';

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        finish(transcript);
      };

      this.recognition.onerror = (err) => {
        console.warn('SpeechRecognition error:', err.error);
        finish('');
      };

      this.recognition.onend = () => {
        finish('');
      };

      try {
        this.recognition.start();
      } catch (err) {
        console.warn('Recognition start failed:', err.message);
        finish('');
      }
    });
  }

  stop() {
    if (this.synth) this.synth.cancel();
    if (this.recognition) {
      try { this.recognition.stop(); } catch (_) {}
    }
  }
}
