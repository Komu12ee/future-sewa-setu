/**
 * Service Menu Screen
 * Shows available Seva Setu services.
 * Allows voice selection or touch selection of service cards.
 */
import { mascot } from '../mascot/mascot.js';
import { voiceAdapter } from '../voice/voiceAdapter.js';
import { session } from '../app/session.js';
import { parseYesNo } from '../engine/parsers/yesNoParser.js';

export class ServiceMenu {
  constructor(container, onSelectService) {
    this.container = container;
    this.onSelectService = onSelectService;
  }

  async render() {
    this.container.innerHTML = `
      <div class="kiosk-stage-screen">
        <div class="stage-card-dialog" style="max-width: 960px;">
          <div class="stage-mascot-row">
            <div id="menuMascot" style="width: 130px; height: 130px;"></div>
            <div class="stage-speech-bubble" id="menuBubble">
              आप कौन सी सेवा का आवेदन करना चाहेंगे? आय, जाति, विवाह या निवास प्रमाण पत्र?
            </div>
          </div>

          <div class="service-menu-grid">
            <div class="service-card enabled" id="cardIncome" data-id="income-certificate">
              <div class="service-card-icon">📜</div>
              <div class="service-card-title">आय प्रमाण पत्र</div>
              <span class="service-card-tag available">उपलब्ध (Active Demo)</span>
            </div>

            <div class="service-card disabled" data-id="caste-certificate">
              <div class="service-card-icon">🏛️</div>
              <div class="service-card-title">जाति प्रमाण पत्र</div>
              <span class="service-card-tag coming-soon">जल्द आ रहा है</span>
            </div>

            <div class="service-card disabled" data-id="domicile-certificate">
              <div class="service-card-icon">🏡</div>
              <div class="service-card-title">निवास प्रमाण पत्र</div>
              <span class="service-card-tag coming-soon">जल्द आ रहा है</span>
            </div>

            <div class="service-card disabled" data-id="marriage-certificate">
              <div class="service-card-icon">💍</div>
              <div class="service-card-title">विवाह प्रमाण पत्र</div>
              <span class="service-card-tag coming-soon">जल्द आ रहा है</span>
            </div>
          </div>

          <div style="font-size: 14px; color: #64748b; margin-top: 20px;">
            बोलिए "आय प्रमाण पत्र" या कार्ड पर टैप करें
          </div>
        </div>
      </div>
    `;

    const holder = this.container.querySelector('#menuMascot');
    mascot.render(holder);
    mascot.show();

    // Spoken question
    const askText = 'आप कौन सी सेवा का आवेदन करना चाहेंगे? आय, जाति, विवाह या निवास प्रमाण पत्र?';
    mascot.setState('speaking');
    await voiceAdapter.speak(askText);

    let selected = false;

    // Tap handler on income card
    const incomeCard = this.container.querySelector('#cardIncome');
    incomeCard.addEventListener('click', async () => {
      if (selected) return;
      selected = true;
      await this.confirmAndOpen();
    });

    // Voice recognition
    mascot.setState('listening');
    const transcript = await voiceAdapter.listen({ maxMs: 7000 });

    if (!selected) {
      if (transcript && (transcript.includes('आय') || transcript.includes('income') || transcript.includes('इनकम'))) {
        selected = true;
        await this.confirmAndOpen();
      } else if (!transcript) {
        // Fallback auto select income certificate for smooth kiosk experience
        selected = true;
        await this.confirmAndOpen();
      }
    }
  }

  async confirmAndOpen() {
    const bubble = this.container.querySelector('#menuBubble');
    const incomeCard = this.container.querySelector('#cardIncome');
    if (incomeCard) incomeCard.classList.add('field-active-glow');

    const confirmLine = 'आपने आय प्रमाण पत्र चुना है, सही है?';
    if (bubble) bubble.textContent = confirmLine;
    mascot.setState('speaking');
    await voiceAdapter.speak(confirmLine);

    mascot.setState('listening');
    const resp = await voiceAdapter.listen({ maxMs: 3000 });
    const isYes = parseYesNo(resp);

    const openingLine = 'ठीक है, मैं आपका फॉर्म खोल रहा हूँ। मैं आपको आवाज़ से गाइड करूँगा।';
    if (bubble) bubble.textContent = openingLine;
    mascot.setState('speaking');
    await voiceAdapter.speak(openingLine);

    // Fetch selected service.json dynamically
    const serviceId = 'income-certificate';
    const res = await fetch(`./services/${serviceId}/service.json`);
    const serviceConfig = await res.json();
    session.currentService = serviceId;
    session.serviceConfig = serviceConfig;

    if (this.onSelectService) {
      this.onSelectService(serviceConfig);
    }
  }
}
