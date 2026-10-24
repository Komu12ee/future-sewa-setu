/**
 * Mascot Controller
 * Manages active mascot pack, states (idle, speaking, listening, thinking, happy),
 * rendering, and swappable packs without altering engine code.
 */
import { voiceAdapter } from '../voice/voiceAdapter.js';

export class MascotController {
  constructor() {
    this.activePack = null;
    this.currentState = 'idle';
    this.isVisible = true;
    this.containerEl = null;
    this.availablePacks = [];
    this.initPacks();
  }

  async initPacks() {
    // Default fallback pack
    const defaultPack = {
      id: 'default',
      name: 'Chips (चिप्स)',
      type: 'image',
      states: {
        idle: './mascot-packs/default/mascot.svg',
        speaking: './mascot-packs/default/mascot.svg',
        listening: './mascot-packs/default/mascot.svg',
        thinking: './mascot-packs/default/mascot.svg',
        happy: './mascot-packs/default/mascot.svg'
      },
      image: './mascot-packs/default/mascot.svg',
      thumbnail: './mascot-packs/default/mascot.svg',
      voice: { lang: 'hi-IN', speaker: 'shreya', pace: 1.0 }
    };

    const sangwariPack = {
      id: 'sangwari',
      name: 'Sangwari (संगवारी)',
      type: 'image',
      states: {
        idle: './mascot-packs/sangwari/mascot.svg',
        speaking: './mascot-packs/sangwari/mascot.svg',
        listening: './mascot-packs/sangwari/mascot.svg',
        thinking: './mascot-packs/sangwari/mascot.svg',
        happy: './mascot-packs/sangwari/mascot.svg'
      },
      image: './mascot-packs/sangwari/mascot.svg',
      thumbnail: './mascot-packs/sangwari/mascot.svg',
      voice: { lang: 'hi-IN', speaker: 'aditya', pace: 1.05 }
    };

    this.availablePacks = [defaultPack, sangwariPack];

    // Try fetching any extra server packs
    try {
      const res = await fetch('/api/mascots');
      if (res.ok) {
        const serverPacks = await res.json();
        if (serverPacks.length > 0) {
          this.availablePacks = serverPacks;
        }
      }
    } catch (_) {}

    const savedPackId = localStorage.getItem('seva_mascot_pack') || 'default';
    const found = this.availablePacks.find(p => p.id === savedPackId) || this.availablePacks[0];
    this.setPack(found);
  }

  setPack(pack) {
    this.activePack = pack;
    localStorage.setItem('seva_mascot_pack', pack.id);
    if (pack.voice) {
      voiceAdapter.setVoiceSettings(pack.voice);
    }
    this.updateDom();
  }

  setState(state) {
    this.currentState = state || 'idle';
    this.updateDom();
  }

  show() {
    this.isVisible = true;
    if (this.containerEl) {
      this.containerEl.style.display = 'flex';
    }
  }

  hide() {
    this.isVisible = false;
    if (this.containerEl) {
      this.containerEl.style.display = 'none';
    }
  }

  render(container) {
    this.containerEl = container;
    this.updateDom();
  }

  updateDom() {
    if (!this.containerEl || !this.activePack) return;

    // Preserve existing container classes (e.g. attract-mascot-container)
    this.containerEl.classList.add('mascot-avatar-wrapper');
    this.containerEl.classList.remove(
      'mascot-state-idle',
      'mascot-state-speaking',
      'mascot-state-listening',
      'mascot-state-thinking',
      'mascot-state-happy'
    );
    this.containerEl.classList.add(`mascot-state-${this.currentState}`);
    this.containerEl.style.display = this.isVisible ? 'flex' : 'none';

    let imgSrc = this.activePack.states?.[this.currentState] || this.activePack.image || this.activePack.thumbnail || '';
    if (imgSrc.startsWith('/')) {
      imgSrc = '.' + imgSrc;
    }
    const scale = this.activePack.scale !== undefined ? this.activePack.scale : 1.0;
    const bg = this.activePack.background || 'transparent';
    this.containerEl.style.backgroundColor = bg;
    this.containerEl.innerHTML = `
      <img src="${imgSrc}" alt="${this.activePack.name}" class="mascot-img" style="transform: scale(${scale});" />
    `;
  }
}

export const mascot = new MascotController();
