/**
 * Kiosk Idle Activity Timer
 * 45s of inactivity -> prompts "क्या आप वहाँ हैं?"
 * 15s more -> wipes session and resets to ATTRACT screen.
 */
import { voiceAdapter } from '../voice/voiceAdapter.js';

export class IdleTimer {
  constructor(onTimeout) {
    this.onTimeout = onTimeout;
    this.promptTimeoutMs = 45000;
    this.finalTimeoutMs = 15000;
    this.promptTimer = null;
    this.finalTimer = null;
    this.enabled = true;

    this.bindActivityListeners();
  }

  bindActivityListeners() {
    const reset = () => this.reset();
    ['touchstart', 'mousedown', 'keydown', 'scroll'].forEach(evt => {
      window.addEventListener(evt, reset, { passive: true });
    });
  }

  start() {
    this.clear();
    if (!this.enabled) return;

    this.promptTimer = setTimeout(async () => {
      // Ask "क्या आप वहाँ हैं?"
      await voiceAdapter.speak('क्या आप वहाँ हैं?');

      this.finalTimer = setTimeout(() => {
        if (this.onTimeout) this.onTimeout();
      }, this.finalTimeoutMs);

    }, this.promptTimeoutMs);
  }

  reset() {
    this.clear();
    this.start();
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
