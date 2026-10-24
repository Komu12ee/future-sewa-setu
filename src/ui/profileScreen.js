/**
 * Profile Screen
 * Collects and confirms visitor's basic profile details (Name, District, Mobile)
 * using voice, and saves them to session.profile.
 */
import { mascot } from '../mascot/mascot.js';
import { voiceAdapter } from '../voice/voiceAdapter.js';
import { session } from '../app/session.js';
import { parseName } from '../engine/parsers/nameParser.js';
import { parseOption } from '../engine/parsers/optionParser.js';
import { parseDigits } from '../engine/parsers/digitsParser.js';
import { parseYesNo } from '../engine/parsers/yesNoParser.js';

const DISTRICTS = [
  'बालोद', 'रायपुर', 'दुर्ग', 'बिलासपुर', 'बस्तर', 'राजनांदगांव',
  'धमतरी', 'महासमुंद', 'कवर्धा', 'कोरबा', 'रायगढ़', 'सरगुजा', 'कांकेर'
];

export class ProfileScreen {
  constructor(container, onNext) {
    this.container = container;
    this.onNext = onNext;
  }

  async render() {
    this.container.innerHTML = `
      <div class="kiosk-stage-screen">
        <div class="stage-card-dialog">
          <div class="stage-mascot-row">
            <div id="profileMascot" style="width: 130px; height: 130px;"></div>
            <div class="stage-speech-bubble" id="profileBubble">
              कृपया अपनी सामान्य जानकारी साझा करें...
            </div>
          </div>

          <!-- Profile Cards Summary -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 24px 0;">
            <div class="service-card" id="cardName" style="padding: 16px;">
              <div style="font-size: 13px; color: #64748b;">नाम (Name)</div>
              <div id="valName" style="font-size: 18px; font-weight: 700; color: #1e293b;">-</div>
            </div>
            <div class="service-card" id="cardDistrict" style="padding: 16px;">
              <div style="font-size: 13px; color: #64748b;">ज़िला (District)</div>
              <div id="valDistrict" style="font-size: 18px; font-weight: 700; color: #1e293b;">-</div>
            </div>
            <div class="service-card" id="cardMobile" style="padding: 16px;">
              <div style="font-size: 13px; color: #64748b;">मोबाइल (Mobile)</div>
              <div id="valMobile" style="font-size: 18px; font-weight: 700; color: #1e293b;">-</div>
            </div>
          </div>

          <div style="font-size: 14px; color: #64748b;" id="profileStatusNote">
            बोलकर उत्तर दें या स्क्रीन पर टैप करें
          </div>
        </div>
      </div>
    `;

    const holder = this.container.querySelector('#profileMascot');
    mascot.render(holder);
    mascot.show();

    // 1. Name
    await this.collectField({
      cardId: '#cardName',
      valId: '#valName',
      ask: 'कृपया अपना नाम बताइए।',
      parser: (t) => parseName(t),
      defaultVal: 'कमल कुमार',
      onSave: (v) => session.setProfileField('name', v)
    });

    // 2. District
    await this.collectField({
      cardId: '#cardDistrict',
      valId: '#valDistrict',
      ask: 'आप किस जिले से हैं?',
      parser: (t) => parseOption(t, DISTRICTS),
      defaultVal: 'बालोद',
      onSave: (v) => session.setProfileField('district', v)
    });

    // 3. Mobile
    await this.collectField({
      cardId: '#cardMobile',
      valId: '#valMobile',
      ask: 'अपना दस अंकों का मोबाइल नंबर बताइए।',
      parser: (t) => parseDigits(t, 10),
      defaultVal: '9407901033',
      onSave: (v) => session.setProfileField('mobile', v)
    });

    await new Promise(r => setTimeout(r, 600));
    if (this.onNext) this.onNext();
  }

  async collectField({ cardId, valId, ask, parser, defaultVal, onSave }) {
    const bubble = this.container.querySelector('#profileBubble');
    const valEl = this.container.querySelector(valId);
    const cardEl = this.container.querySelector(cardId);
    const noteEl = this.container.querySelector('#profileStatusNote');

    if (cardEl) cardEl.classList.add('field-active-glow');
    bubble.textContent = ask;
    if (noteEl) noteEl.innerHTML = '<span style="color:#64748b;">सहायक आपसे बात कर रहा है...</span>';
    mascot.setState('speaking');
    await voiceAdapter.speak(ask);

    mascot.setState('listening');
    if (noteEl) noteEl.innerHTML = '<span style="color:#0284c7; font-weight:700; font-size:16px;">🎙️ अब बोलिए, मैं सुन रहा हूँ...</span>';
    let transcript = await voiceAdapter.listen({ maxMs: 6000 });
    let val = transcript ? parser(transcript) : null;

    if (!val) {
      val = defaultVal;
    }

    if (valEl) valEl.textContent = val;
    onSave(val);

    // Confirm
    const confirmPrompt = `आपने बताया ${val}, क्या यह सही है?`;
    bubble.textContent = confirmPrompt;
    if (noteEl) noteEl.innerHTML = '<span style="color:#64748b;">पुष्टि की जा रही है...</span>';
    mascot.setState('speaking');
    await voiceAdapter.speak(confirmPrompt);

    mascot.setState('listening');
    if (noteEl) noteEl.innerHTML = '<span style="color:#0284c7; font-weight:700; font-size:16px;">🎙️ बोलिए "हाँ" या "नहीं"</span>';
    const confirmResp = await voiceAdapter.listen({ maxMs: 3500 });
    const isYes = parseYesNo(confirmResp);

    if (isYes === false) {
      // Re-collect
      return this.collectField({ cardId, valId, ask, parser, defaultVal, onSave });
    }

    if (cardEl) cardEl.classList.remove('field-active-glow');
    mascot.setState('idle');
  }
}
