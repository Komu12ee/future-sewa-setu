/**
 * Admin Mascot Gallery & Hardware Switcher
 * Accessed via 3-second long-press on top-left corner.
 * Protected by 4-digit PIN (default 1234).
 */
import { mascot } from './mascot.js';
import { voiceAdapter } from '../voice/voiceAdapter.js';
import { showToast } from '../ui/toast.js';

export class MascotGallery {
  constructor() {
    this.pin = '1234';
    this.overlay = null;
    this.selectedPack = null;
    this.initCornerTrigger();
  }

  initCornerTrigger() {
    let pressTimer = null;

    const startPress = () => {
      pressTimer = setTimeout(() => {
        this.openPinPrompt();
      }, 3000);
    };

    const cancelPress = () => {
      if (pressTimer) clearTimeout(pressTimer);
    };

    // Listen on top-left area
    window.addEventListener('mousedown', (e) => {
      if (e.clientX < 100 && e.clientY < 60) startPress();
    });
    window.addEventListener('mouseup', cancelPress);
    window.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      if (touch && touch.clientX < 100 && touch.clientY < 60) startPress();
    });
    window.addEventListener('touchend', cancelPress);
  }

  openPinPrompt() {
    const dialog = document.createElement('div');
    dialog.className = 'gallery-modal-overlay';
    dialog.innerHTML = `
      <div class="pin-dialog">
        <h3 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">प्रशासक पिन (Admin PIN)</h3>
        <p style="font-size: 13px; color: #64748b;">4-अंकों का पिन दर्ज करें (Default: 1234)</p>
        <input type="password" id="adminPinInput" class="pin-input" maxlength="4" autofocus />
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button type="button" id="btnPinSubmit" class="seva-btn seva-btn-green" style="padding: 8px 24px;">प्रवेश करें</button>
          <button type="button" id="btnPinCancel" class="seva-btn seva-btn-dark" style="padding: 8px 24px;">रद्द करें</button>
        </div>
      </div>
    `;

    document.body.appendChild(dialog);

    const input = dialog.querySelector('#adminPinInput');
    const submit = () => {
      if (input.value === this.pin) {
        document.body.removeChild(dialog);
        this.openGallery();
      } else {
        showToast('गलत पिन! कृपया पुनः प्रयास करें।');
        input.value = '';
      }
    };

    dialog.querySelector('#btnPinSubmit').addEventListener('click', submit);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    dialog.querySelector('#btnPinCancel').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  }

  openGallery() {
    this.selectedPack = mascot.activePack;

    this.overlay = document.createElement('div');
    this.overlay.className = 'gallery-modal-overlay';
    this.renderGalleryModal();
    document.body.appendChild(this.overlay);
  }

  renderGalleryModal() {
    const packs = mascot.availablePacks;
    const isHudEnabled = localStorage.getItem('seva_show_hud') !== 'false';

    this.overlay.innerHTML = `
      <div class="gallery-modal-card">
        <div class="gallery-header">
          <div class="gallery-title">🎨 मैस्कॉट गैलरी एवं सेटिंग्स (Mascot Gallery)</div>
          <button type="button" class="seva-modal-close" id="btnCloseGallery" style="color:#64748b;">&times;</button>
        </div>

        <h4 style="font-size: 15px; margin-bottom: 12px; color: #334155;">उपलब्ध मैस्कॉट चुनें:</h4>
        <div class="gallery-mascot-grid">
          ${packs.map(p => `
            <div class="gallery-pack-card ${this.selectedPack?.id === p.id ? 'active' : ''}" data-pack-id="${p.id}">
              <img src="${p.thumbnail || p.image}" alt="${p.name}" class="gallery-pack-thumb" />
              <div style="font-weight: 700; color: #1e293b; font-size: 16px;">${p.name}</div>
              <div style="font-size: 12px; color: #64748b;">Voice: ${p.voice?.speaker || 'default'}</div>
            </div>
          `).join('')}
        </div>

        <!-- Live Preview Controls -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
          <h5 style="font-size: 14px; font-weight: 700; margin-bottom: 10px;">लाइव पूर्वावलोकन (Preview States):</h5>
          <div style="display: flex; gap: 10px; margin-bottom: 14px;">
            <button type="button" class="dev-btn" id="btnPreviewIdle">Idle</button>
            <button type="button" class="dev-btn" id="btnPreviewSpeak">Speaking</button>
            <button type="button" class="dev-btn" id="btnPreviewListen">Listening</button>
            <button type="button" class="dev-btn" id="btnPreviewHappy">Happy</button>
          </div>
          <div style="display: flex; gap: 12px;">
            <button type="button" id="btnSaveActivePack" class="seva-btn seva-btn-green" style="padding: 8px 20px; font-size: 14px;">सक्रिय मैस्कॉट बनाएं (Set as active)</button>
            <button type="button" id="btnTestVoice" class="seva-btn seva-btn-navy" style="padding: 8px 20px; font-size: 14px;">आवाज़ टेस्ट करें (Test voice)</button>
          </div>
        </div>

        <!-- Hardware & Settings Tests -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">हार्डवेयर टेस्ट:</div>
            <div style="display: flex; gap: 8px;">
              <button type="button" id="btnTestSpeaker" class="hud-btn">🔊 स्पीकर टेस्ट</button>
              <button type="button" id="btnTestMic" class="hud-btn">🎙 माइक टेस्ट</button>
            </div>
            <div id="micTestResult" style="font-size: 12px; color: #0284c7; margin-top: 6px;"></div>
          </div>

          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;">
            <div style="font-weight: 700; margin-bottom: 8px; font-size: 14px;">फॉर्म HUD सेटिंग्स:</div>
            <label class="seva-checkbox-label">
              <input type="checkbox" id="chkShowHud" class="seva-checkbox" ${isHudEnabled ? 'checked' : ''} />
              <span>फॉर्म भरते समय वॉइस HUD दिखाएं</span>
            </label>
          </div>
        </div>
      </div>
    `;

    // Event Handlers
    this.overlay.querySelector('#btnCloseGallery').addEventListener('click', () => {
      document.body.removeChild(this.overlay);
    });

    // Pick card
    this.overlay.querySelectorAll('.gallery-pack-card').forEach(card => {
      card.addEventListener('click', () => {
        const packId = card.getAttribute('data-pack-id');
        this.selectedPack = packs.find(p => p.id === packId);
        this.renderGalleryModal();
      });
    });

    // State preview buttons
    this.overlay.querySelector('#btnPreviewIdle').addEventListener('click', () => mascot.setState('idle'));
    this.overlay.querySelector('#btnPreviewSpeak').addEventListener('click', () => mascot.setState('speaking'));
    this.overlay.querySelector('#btnPreviewListen').addEventListener('click', () => mascot.setState('listening'));
    this.overlay.querySelector('#btnPreviewHappy').addEventListener('click', () => mascot.setState('happy'));

    // Save pack
    this.overlay.querySelector('#btnSaveActivePack').addEventListener('click', () => {
      if (this.selectedPack) {
        mascot.setPack(this.selectedPack);
        showToast(`मैस्कॉट ${this.selectedPack.name} सक्रिय हो गया!`);
      }
    });

    // Test voice
    this.overlay.querySelector('#btnTestVoice').addEventListener('click', () => {
      voiceAdapter.speak('नमस्कार, यह मेरा आवाज़ परीक्षण है। सेवा सेतु में आपका स्वागत है।');
    });

    // Speaker test
    this.overlay.querySelector('#btnTestSpeaker').addEventListener('click', () => {
      voiceAdapter.speak('स्पीकर परीक्षण सफल रहा। ऑडियो स्पष्ट है।');
    });

    // Mic test
    this.overlay.querySelector('#btnTestMic').addEventListener('click', async () => {
      const resEl = this.overlay.querySelector('#micTestResult');
      resEl.textContent = 'माइक सुन रहा है... कृपया कुछ बोलें';
      const text = await voiceAdapter.listen({ maxMs: 4000 });
      resEl.textContent = text ? `पहचाना गया: "${text}"` : 'कोई आवाज़ नहीं मिली';
    });

    // HUD Toggle
    this.overlay.querySelector('#chkShowHud').addEventListener('change', (e) => {
      localStorage.setItem('seva_show_hud', e.target.checked);
      showToast(`वॉइस HUD ${e.target.checked ? 'सक्रिय' : 'निष्क्रिय'}`);
    });
  }
}

export const mascotGallery = new MascotGallery();
