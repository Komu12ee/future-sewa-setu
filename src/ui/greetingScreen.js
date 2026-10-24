/**
 * Greeting Screen
 * Welcomes visitor with the official spoken greeting.
 */
import { mascot } from '../mascot/mascot.js';
import { voiceAdapter } from '../voice/voiceAdapter.js';

export class GreetingScreen {
  constructor(container, onNext) {
    this.container = container;
    this.onNext = onNext;
  }

  async render() {
    this.container.innerHTML = `
      <div class="kiosk-stage-screen">
        <div class="stage-card-dialog">
          <div class="stage-mascot-row">
            <div id="greetingMascot" style="width: 150px; height: 150px;"></div>
            <div class="stage-speech-bubble" id="greetingBubble">
              नमस्कार! आपका स्वागत है, एआई बेस्ड सेवा सेतु फ्यूचर एक्सपीरियंस ज़ोन में।
            </div>
          </div>
          <div style="font-size: 15px; color: #64748b;">
            कृपया ध्यान से सुनें, आपका सहायक आपसे बातचीत कर रहा है...
          </div>
        </div>
      </div>
    `;

    const holder = this.container.querySelector('#greetingMascot');
    mascot.render(holder);
    mascot.show();
    mascot.setState('speaking');

    const greetingLine = 'नमस्कार! आपका स्वागत है, एआई बेस्ड सेवा सेतु फ्यूचर एक्सपीरियंस ज़ोन में।';
    await voiceAdapter.speak(greetingLine);

    mascot.setState('idle');
    await new Promise(r => setTimeout(r, 600));

    if (this.onNext) this.onNext();
  }
}
