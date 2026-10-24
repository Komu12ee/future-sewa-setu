/**
 * Developer Diagnostics Panel
 * Enabled when ?dev=1 is present in the URL.
 * Shows state, active field, transcript, and step jump triggers.
 */

import { voiceAdapter } from '../voice/voiceAdapter.js';

export class DevPanel {
  constructor(stateMachine) {
    this.stateMachine = stateMachine;
    this.container = null;
    this.init();
  }

  init() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('dev')) return;

    this.container = document.createElement('div');
    this.container.className = 'dev-panel-container';
    document.body.appendChild(this.container);
    this.render();
  }

  render() {
    if (!this.container) return;

    const sm = this.stateMachine;

    this.container.innerHTML = `
      <div class="dev-panel-title">
        <span>🛠 DEV PANEL</span>
        <span style="color:#22c55e;">ONLINE</span>
      </div>
      <div><strong>Current State:</strong> <span style="color:#f59e0b;">${sm?.currentState || 'N/A'}</span></div>
      <div><strong>Step:</strong> ${sm?.session?.currentStep || 1} / 8</div>
      <div><strong>User:</strong> ${sm?.session?.profile?.name || '(None)'}</div>

      <div style="margin-top: 10px; font-weight: bold; color: #38bdf8;">Jump to step:</div>
      <div class="dev-btn-grid">
        <button type="button" class="dev-btn" id="devBtnAttract">Attract</button>
        <button type="button" class="dev-btn" id="devBtnProfile">Profile</button>
        <button type="button" class="dev-btn" id="devBtnMenu">Menu</button>
        <button type="button" class="dev-btn" id="devBtnStep1">Step 1</button>
        <button type="button" class="dev-btn" id="devBtnStep2">Step 2</button>
        <button type="button" class="dev-btn" id="devBtnStep3">Step 3 Docs</button>
        <button type="button" class="dev-btn" id="devBtnStep4">Step 4 Prev</button>
        <button type="button" class="dev-btn" id="devBtnStep5">Step 5 Fee</button>
        <button type="button" class="dev-btn" id="devBtnStep8">Step 8 Rcpt</button>
        <button type="button" class="dev-btn" id="devBtnTestVoice" style="background:#0284c7;">🔊 Test Voice</button>
        <button type="button" class="dev-btn" id="devBtnReset" style="background:#b91c1c;">Reset All</button>
      </div>
    `;

    // Bind Jump Triggers
    this.container.querySelector('#devBtnAttract')?.addEventListener('click', () => sm.transitionTo('ATTRACT'));
    this.container.querySelector('#devBtnProfile')?.addEventListener('click', () => sm.transitionTo('PROFILE'));
    this.container.querySelector('#devBtnMenu')?.addEventListener('click', () => sm.transitionTo('SERVICE_MENU'));
    this.container.querySelector('#devBtnStep1')?.addEventListener('click', () => sm.jumpToFormStep(1));
    this.container.querySelector('#devBtnStep2')?.addEventListener('click', () => sm.jumpToFormStep(2));
    this.container.querySelector('#devBtnStep3')?.addEventListener('click', () => sm.jumpToFormStep(3));
    this.container.querySelector('#devBtnStep4')?.addEventListener('click', () => sm.jumpToFormStep(4));
    this.container.querySelector('#devBtnStep5')?.addEventListener('click', () => sm.jumpToFormStep(5));
    this.container.querySelector('#devBtnStep8')?.addEventListener('click', () => sm.jumpToFormStep(8));
    this.container.querySelector('#devBtnTestVoice')?.addEventListener('click', async () => {
      await voiceAdapter.speak('नमस्कार, यह सेवा सेतु का आवाज़ परीक्षण है।');
    });
    this.container.querySelector('#devBtnReset')?.addEventListener('click', () => sm.transitionTo('RESET'));
  }

  update() {
    this.render();
  }
}
