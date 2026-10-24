/**
 * Kiosk Global State Machine
 * Coordinates the states:
 * ATTRACT -> GREETING -> PROFILE -> SERVICE_MENU -> FORM -> RESET
 */
import { session } from './session.js';
import { IdleTimer } from './idleTimer.js';
import { voiceAdapter } from '../voice/voiceAdapter.js';
import { voiceHud } from '../mascot/hud.js';
import { mascot } from '../mascot/mascot.js';
import { AttractScreen } from '../ui/attractScreen.js';
import { GreetingScreen } from '../ui/greetingScreen.js';
import { ProfileScreen } from '../ui/profileScreen.js';
import { ServiceMenu } from '../ui/serviceMenu.js';
import { FormRunner } from '../engine/formRunner.js';

export const STATES = {
  ATTRACT: 'ATTRACT',
  GREETING: 'GREETING',
  PROFILE: 'PROFILE',
  SERVICE_MENU: 'SERVICE_MENU',
  FORM: 'FORM',
  RESET: 'RESET'
};

export class StateMachine {
  constructor(rootContainer) {
    this.root = rootContainer;
    this.currentState = STATES.ATTRACT;
    this.session = session;
    this.devPanel = null;
    this.idleTimer = new IdleTimer(() => this.handleIdleTimeout());
    this.formRunner = null;
    this.countdownSeconds = 890; // ~14:50 session timer
    this.timerInterval = null;
  }

  setDevPanel(dp) {
    this.devPanel = dp;
  }

  start() {
    this.transitionTo(STATES.ATTRACT);
    this.idleTimer.start();
  }

  async transitionTo(state, payload = null) {
    this.currentState = state;
    voiceAdapter.stopAll();

    if (this.devPanel) this.devPanel.update();

    switch (state) {
      case STATES.ATTRACT:
        this.renderAttract();
        break;

      case STATES.GREETING:
        this.renderGreeting();
        break;

      case STATES.PROFILE:
        this.renderProfile();
        break;

      case STATES.SERVICE_MENU:
        this.renderServiceMenu();
        break;

      case STATES.FORM:
        this.renderForm(payload);
        break;

      case STATES.RESET:
        this.resetSession();
        break;
    }
  }

  renderAttract() {
    this.root.innerHTML = '';
    const screen = new AttractScreen(this.root, () => {
      this.transitionTo(STATES.GREETING);
    });
    screen.render();
  }

  renderGreeting() {
    this.root.innerHTML = '';
    const screen = new GreetingScreen(this.root, () => {
      this.transitionTo(STATES.PROFILE);
    });
    screen.render();
  }

  renderProfile() {
    this.root.innerHTML = '';
    const screen = new ProfileScreen(this.root, () => {
      this.transitionTo(STATES.SERVICE_MENU);
    });
    screen.render();
  }

  renderServiceMenu() {
    this.root.innerHTML = '';
    const screen = new ServiceMenu(this.root, (serviceConfig) => {
      this.transitionTo(STATES.FORM, serviceConfig);
    });
    screen.render();
  }

  renderForm(serviceConfig) {
    this.root.innerHTML = `
      <!-- Red Topbar matching Step 1 to 8 -->
      <div class="seva-topbar">
        <div class="seva-topbar-left">
          <span>Session TimeOut (In Minute) : <span id="sessionTimerDisplay">14:50</span></span>
        </div>
        <div class="seva-topbar-right">
          <div class="seva-topbar-item" id="topbarDashboard">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
            <span>डैशबोर्ड</span>
          </div>
          <div class="seva-topbar-item" id="topbarUser">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
            <span>राकेश ▾</span>
          </div>
        </div>
      </div>

      <div id="formContentArea"></div>

      <!-- Footer Bar -->
      <div class="seva-footer-bar">
        © 2026 cgstate.gov.in | All rights reserved.
      </div>
    `;

    this.startSessionTimer();

    const contentArea = this.root.querySelector('#formContentArea');
    this.formRunner = new FormRunner(contentArea, () => {}, () => {
      this.transitionTo(STATES.RESET);
    });

    this.formRunner.run(serviceConfig || session.serviceConfig);
  }

  ensureFormShell() {
    if (!this.root.querySelector('#formContentArea')) {
      this.root.innerHTML = `
        <div class="seva-topbar">
          <div class="seva-topbar-left">
            <span>Session TimeOut (In Minute) : <span id="sessionTimerDisplay">14:50</span></span>
          </div>
          <div class="seva-topbar-right">
            <div class="seva-topbar-item" id="topbarDashboard">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              <span>डैशबोर्ड</span>
            </div>
            <div class="seva-topbar-item" id="topbarUser">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
              <span>राकेश ▾</span>
            </div>
          </div>
        </div>

        <div id="formContentArea"></div>

        <div class="seva-footer-bar">
          © 2026 cgstate.gov.in | All rights reserved.
        </div>
      `;
      this.startSessionTimer();
      const contentArea = this.root.querySelector('#formContentArea');
      this.formRunner = new FormRunner(contentArea, () => {}, () => {
        this.transitionTo(STATES.RESET);
      });
    }
  }

  async jumpToFormStep(stepNum) {
    this.currentState = STATES.FORM;
    if (!session.serviceConfig) {
      const serviceId = session.currentService || 'income-certificate';
      const res = await fetch(`./services/${serviceId}/service.json`);
      session.serviceConfig = await res.json();
    }

    this.ensureFormShell();
    this.formRunner.serviceConfig = session.serviceConfig;
    this.formRunner.stopCurrentRun();

    switch (stepNum) {
      case 1: await this.formRunner.runStep1(); break;
      case 2: await this.formRunner.runStep2(); break;
      case 3: await this.formRunner.runStep3Docs(); break;
      case 4: await this.formRunner.runStep4Preview(); break;
      case 5: await this.formRunner.runStep5Fee(); break;
      case 8: await this.formRunner.runStep8Receipt(); break;
    }
  }

  startSessionTimer() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.countdownSeconds = 890;

    const display = this.root.querySelector('#sessionTimerDisplay');
    this.timerInterval = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds <= 0) {
        clearInterval(this.timerInterval);
        this.transitionTo(STATES.RESET);
        return;
      }
      if (display) {
        const mins = String(Math.floor(this.countdownSeconds / 60)).padStart(2, '0');
        const secs = String(this.countdownSeconds % 60).padStart(2, '0');
        display.textContent = `${mins}:${secs}`;
      }
    }, 1000);
  }

  handleIdleTimeout() {
    console.log('Idle timeout triggered - resetting kiosk to attract screen');
    this.transitionTo(STATES.RESET);
  }

  resetSession() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    voiceAdapter.stopAll();
    voiceHud.hide();
    session.reset();
    this.transitionTo(STATES.ATTRACT);
  }
}
