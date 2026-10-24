/**
 * Attract Screen Component
 * Full-screen idle animation, touch-to-start trigger, audio unlocker.
 */
import { mascot } from '../mascot/mascot.js';
import { unlockKioskAudio } from '../voice/sarvamAdapter.js';

export class AttractScreen {
  constructor(container, onStart) {
    this.container = container;
    this.onStart = onStart;
  }

  render() {
    this.container.innerHTML = `
      <div class="attract-screen" id="attractScreenWrap">
        <div class="attract-header-badge">
          <span>🏛️ छत्तीसगढ़ राज्योत्सव 2026 – AI सेवा सेतु फ्यूचर एक्सपीरियंस ज़ोन</span>
        </div>

        <h1 class="attract-title">डिजिटल छत्तीसगढ़ – सेवा सेतु</h1>
        <p class="attract-subtitle">
          आवाज़ से शासकीय सेवाओं के आवेदन भरने का आधुनिक एवं सरल अनुभव
        </p>

        <div class="attract-mascot-container" id="attractMascotHolder" style="width: 280px; height: 280px;"></div>

        <button type="button" class="attract-touch-btn" id="btnTouchToStart">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          छूने के लिए स्क्रीन को स्पर्श करें
        </button>

        <div class="demo-watermark-badge">
          डेमो – वास्तविक आवेदन नहीं
        </div>
      </div>
    `;

    const holder = this.container.querySelector('#attractMascotHolder');
    mascot.render(holder);
    mascot.show();
    mascot.setState('idle');

    // First touch listener to unlock browser audio & start
    const startHandler = (e) => {
      e.preventDefault();
      unlockKioskAudio();
      if (this.onStart) this.onStart();
    };

    this.container.querySelector('#btnTouchToStart').addEventListener('click', startHandler);
    this.container.querySelector('#attractScreenWrap').addEventListener('click', (e) => {
      if (e.target.id !== 'btnTouchToStart') startHandler(e);
    });
  }
}
