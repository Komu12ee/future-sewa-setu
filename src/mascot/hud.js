/**
 * Voice HUD Component
 * Floating panel at bottom-left active during form filling.
 * Displays live questions, user transcript, audio level meter, and repeat/manual typing buttons.
 */
import { mascot } from './mascot.js';
import { voiceAdapter } from '../voice/voiceAdapter.js';

export class VoiceHud {
  constructor() {
    this.container = null;
    this.enabled = localStorage.getItem('seva_show_hud') !== 'false';
    this.currentQuestion = '';
    this.currentTranscript = '';
    this.state = 'idle'; // idle | speaking | listening | thinking
    this.onRepeatCallback = null;
    this.onManualTypeCallback = null;
    this.init();
  }

  init() {
    this.container = document.createElement('div');
    this.container.className = 'voice-hud';
    this.container.id = 'voiceHud';
    this.container.style.display = 'none';
    document.body.appendChild(this.container);

    voiceAdapter.on('speaking:start', ({ text }) => {
      this.setState('speaking');
      this.setQuestion(text);
    });

    voiceAdapter.on('speaking:end', () => {
      this.setState('listening');
    });

    voiceAdapter.on('listening:start', () => {
      this.setState('listening');
      this.setTranscript('सुन रहा हूँ...');
    });

    voiceAdapter.on('listening:end', ({ transcript }) => {
      if (transcript) {
        this.setTranscript(`आपने कहा: "${transcript}"`);
      }
    });

    voiceAdapter.on('audio:level', (level) => {
      this.updateAudioMeter(level);
    });
  }

  show(callbacks = {}) {
    if (callbacks.onRepeat) this.onRepeatCallback = callbacks.onRepeat;
    if (callbacks.onManualType) this.onManualTypeCallback = callbacks.onManualType;

    if (this.enabled && this.container) {
      this.container.style.display = 'flex';
      this.render();
    }
  }

  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  setQuestion(q) {
    this.currentQuestion = q || '';
    this.render();
  }

  setTranscript(t) {
    this.currentTranscript = t || '';
    this.render();
  }

  setState(st) {
    this.state = st;
    mascot.setState(st);
    this.render();
  }

  updateAudioMeter(level) {
    const bars = this.container?.querySelectorAll('.meter-bar');
    if (!bars) return;
    bars.forEach((bar, idx) => {
      const height = Math.max(4, Math.min(24, Math.round(level * 24 * (1 + (idx % 3) * 0.4))));
      bar.style.height = `${height}px`;
    });
  }

  render() {
    if (!this.container) return;

    const pack = mascot.activePack;
    let thumb = pack?.thumbnail || pack?.image || './mascot-packs/default/mascot.svg';
    if (thumb.startsWith('/')) {
      thumb = '.' + thumb;
    }
    const name = pack?.name || 'Mascot';

    let badgeClass = 'voice-hud-status-speaking';
    let badgeText = 'बोल रहा हूँ';

    if (this.state === 'listening') {
      badgeClass = 'voice-hud-status-listening';
      badgeText = 'सुन रहा हूँ... 🎙';
    } else if (this.state === 'thinking') {
      badgeClass = 'voice-hud-status-thinking';
      badgeText = 'सोच रहा हूँ...';
    }

    this.container.innerHTML = `
      <div class="voice-hud-header">
        <div class="voice-hud-mascot-info">
          <img src="${thumb}" alt="${name}" class="voice-hud-mascot-thumb" />
          <div>
            <div class="voice-hud-mascot-name">${name}</div>
            <div class="voice-hud-status-badge ${badgeClass}">${badgeText}</div>
          </div>
        </div>
        <div class="voice-hud-meter-wrap">
          <div class="meter-bar"></div>
          <div class="meter-bar"></div>
          <div class="meter-bar"></div>
          <div class="meter-bar"></div>
          <div class="meter-bar"></div>
        </div>
      </div>

      <div class="voice-hud-content">
        <div class="voice-hud-question">${this.currentQuestion || 'मार्गदर्शन चालू है'}</div>
        ${this.currentTranscript ? `<div class="voice-hud-transcript">${this.currentTranscript}</div>` : ''}
      </div>

      <div class="voice-hud-actions">
        <button type="button" class="hud-btn" id="hudBtnRepeat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 12 4-4 4 4"/><path d="M7 8v8a4 4 0 0 0 4 4h9"/></svg>
          दोहराओ
        </button>
        <button type="button" class="hud-btn primary" id="hudBtnManual">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="12" x="3" y="4" rx="2"/><path d="M7 8h.01M11 8h.01M15 8h.01M7 12h.01M17 12h.01M11 12h4"/></svg>
          हाथ से भरें
        </button>
      </div>
    `;

    // Bind action buttons
    this.container.querySelector('#hudBtnRepeat')?.addEventListener('click', () => {
      if (this.onRepeatCallback) this.onRepeatCallback();
    });

    this.container.querySelector('#hudBtnManual')?.addEventListener('click', () => {
      if (this.onManualTypeCallback) this.onManualTypeCallback();
    });
  }
}

export const voiceHud = new VoiceHud();
