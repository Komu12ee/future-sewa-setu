/**
 * Kiosk Idle Activity Timer
 * Monitored during form filling and idle states.
 * Resets on ANY touch, mouse, keyboard, or VOICE interaction (speaking/listening).
 * Never triggers while mascot or user is actively conversing.
 */
import { voiceAdapter } from '../voice/voiceAdapter.js';

export class IdleTimer {
  constructor(onTimeout) {
    this.onTimeout = onTimeout;
    this.promptTimeoutMs = 180000; // 3 minutes of absolute inactivity
    this.finalTimeoutMs = 30000;   // 30 seconds after prompt
    this.promptTimer = null;
    this.finalTimer = null;
    this.enabled = true;
    this.isPaused = false;

    this.bindActivityListeners();
  }

  bindActivityListeners() {
    const reset = () => this.reset();

    // DOM User Interactions
    ['touchstart', 'mousedown', 'pointerdown', 'keydown', 'scroll', 'input', 'click'].forEach(evt => {
      window.addEventListener(evt, reset, { passive: true });
    });

    // Voice Engine Activity (User talking or Mascot speaking)
    voiceAdapter.on('speaking:start', reset);
    voiceAdapter.on('speaking:end', reset);
    voiceAdapter.on('listening:start', reset);
    voiceAdapter.on('listening:end', reset);
    voiceAdapter.on('audio:level', (lvl) => {
      if (lvl > 0.05) reset();
    });
  }

  start() {
    this.clear();
    if (!this.enabled || this.isPaused) return;

    this.promptTimer = setTimeout(async () => {
      // If voice is active or user is engaged, do not interrupt
      if (voiceAdapter.isSpeaking || voiceAdapter.isListening) {
        this.reset();
        return;
      }

      // Inactivity prompt
      await voiceAdapter.speak('क्या आप वहाँ हैं?');

      this.finalTimer = setTimeout(() => {
        if (voiceAdapter.isSpeaking || voiceAdapter.isListening) {
          this.reset();
          return;
        }
        if (this.onTimeout) this.onTimeout();
      }, this.finalTimeoutMs);

    }, this.promptTimeoutMs);
  }

  reset() {
    this.clear();
    this.start();
  }

  pause() {
    this.isPaused = true;
    this.clear();
  }

  resume() {
    this.isPaused = false;
    this.reset();
  }

  clear() {
    if (this.promptTimer) clearTimeout(this.promptTimer);
    if (this.finalTimer) clearTimeout(this.finalTimer);
    this.promptTimer = null;
    this.finalTimer = null;
  }

  stop() {
    this.clear();
  }
}
