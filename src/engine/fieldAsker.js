/**
 * Field Asker Engine
 * Asks questions, handles reverify of prefilled profile values, parses answers,
 * animates DOM typing with blue glow, confirms when requested, and offers touch fallback.
 */
import { voiceAdapter } from '../voice/voiceAdapter.js';
import { voiceHud } from '../mascot/hud.js';
import { domFiller } from './domFiller.js';
import { checkGlobalCommand, COMMANDS } from './commands.js';
import * as parsers from './parsers/index.js';
import { session } from '../app/session.js';

export class FieldAsker {
  constructor() {
    this.currentField = null;
  }

  async askField(field, options = {}) {
    this.currentField = field;
    const label = field.label?.hi || field.id;
    const el = document.querySelector(field.selector);

    if (!el && !field.auto) {
      console.warn(`Selector ${field.selector} not found for field ${field.id}`);
      return null;
    }

    // Scroll and focus
    if (el) domFiller.focusField(el);

    // 1. REVERIFY CHECK
    let existingVal = '';
    if (field.prefillFrom) {
      const parts = field.prefillFrom.split('.');
      if (parts[0] === 'profile') existingVal = session.profile[parts[1]] || '';
      else if (parts[0] === 'formData') existingVal = session.formData[parts[1]] || '';
    } else if (session.formData[field.id]) {
      existingVal = session.formData[field.id];
    } else if (el && el.value) {
      existingVal = el.value;
    }

    if (existingVal) {
      // Reverify flow
      const reverifyText = `आपका ${label} ${existingVal} है। क्या यही रखना है या बदलना है?`;
      voiceHud.setQuestion(reverifyText);
      await voiceAdapter.speak(reverifyText);

      const response = await this.listenWithRetry({
        prompt: reverifyText,
        maxRetries: 1
      });

      if (response) {
        const cmd = checkGlobalCommand(response);
        if (cmd && cmd.command === COMMANDS.CHANGE) {
          // User wants to change
        } else {
          const isKeep = parsers.parseYesNo(response);
          if (isKeep === true || response.includes('रखना') || response.includes('यही') || response.includes('सही')) {
            session.setFormField(field.id, existingVal);
            if (el && !el.value) el.value = existingVal;
            domFiller.clearHighlight();
            return existingVal;
          }
        }
      } else {
        // If no response, keep existing value
        session.setFormField(field.id, existingVal);
        if (el && !el.value) el.value = existingVal;
        domFiller.clearHighlight();
        return existingVal;
      }
    }

    // 2. ASK PROMPT
    let askText = field.ask?.hi || `कृपया ${label} बताइए।`;

    // If dropdown with <= 6 options, announce options
    if (el && el.tagName === 'SELECT' && el.options.length <= 6 && !askText.includes('विकल्प')) {
      const optTexts = Array.from(el.options)
        .map(o => o.text.trim())
        .filter(t => t && !t.includes('चुनें') && !t.includes('--'));
      if (optTexts.length > 0 && optTexts.length <= 5) {
        askText += ` ${optTexts.join(', ')}?`;
      }
    }

    voiceHud.setQuestion(askText);
    await voiceAdapter.speak(askText);

    // 3. LISTEN & PARSE LOOP
    let parsedValue = null;
    let attempts = 0;

    while (attempts < 2 && parsedValue === null) {
      attempts++;
      const transcript = await this.listenWithRetry({
        prompt: askText,
        maxRetries: 0
      });

      if (!transcript) {
        if (attempts < 2) {
          const retryMsg = 'मुझे सुनाई नहीं दिया, कृपया फिर से बोलिए।';
          voiceHud.setQuestion(retryMsg);
          await voiceAdapter.speak(retryMsg);
          continue;
        } else {
          // Touch fallback
          parsedValue = await this.showTouchInputFallback(field, el);
          break;
        }
      }

      // Check global command
      const globalCmd = checkGlobalCommand(transcript);
      if (globalCmd) {
        if (globalCmd.command === COMMANDS.REPEAT) {
          await voiceAdapter.speak(askText);
          attempts = 0;
          continue;
        }
        if (options.onGlobalCommand) {
          options.onGlobalCommand(globalCmd);
          return null;
        }
      }

      // Parse value
      parsedValue = this.parseTranscript(transcript, field, el);

      if (parsedValue === null && attempts >= 2) {
        parsedValue = await this.showTouchInputFallback(field, el);
      } else if (parsedValue === null) {
        const notUnderstood = `क्षमा करें, मैं समझ नहीं पाया। कृपया ${label} फिर से बोलिए।`;
        voiceHud.setQuestion(notUnderstood);
        await voiceAdapter.speak(notUnderstood);
      }
    }

    if (!parsedValue && el) {
      parsedValue = el.value || 'प्रमाणित';
    }

    // 4. FILL DOM
    if (el) {
      if (el.tagName === 'SELECT') {
        await domFiller.fillSelect(el, parsedValue);
      } else if (el.type === 'checkbox') {
        domFiller.fillCheckbox(el, parsedValue);
      } else {
        await domFiller.fillText(el, parsedValue);
      }
    }

    session.setFormField(field.id, parsedValue);

    // 5. CONFIRMATION READ-BACK
    if (field.confirm) {
      const confirmText = `${label}: ${parsedValue}। सही है?`;
      voiceHud.setQuestion(confirmText);
      await voiceAdapter.speak(confirmText);

      const confirmResp = await voiceAdapter.listen({ maxMs: 4000 });
      if (confirmResp) {
        const isYes = parsers.parseYesNo(confirmResp);
        if (isYes === false) {
          // Re-ask this field
          return this.askField(field, options);
        }
      }
    }

    domFiller.clearHighlight();
    return parsedValue;
  }

  async listenWithRetry({ prompt, maxRetries = 1 }) {
    let transcript = await voiceAdapter.listen({ maxMs: 7000, silenceMs: 1200 });
    let retries = 0;

    while (!transcript && retries < maxRetries) {
      retries++;
      await voiceAdapter.speak('मुझे सुनाई नहीं दिया, कृपया फिर से बोलिए।');
      transcript = await voiceAdapter.listen({ maxMs: 7000, silenceMs: 1200 });
    }

    return transcript;
  }

  parseTranscript(transcript, field, el) {
    const pType = field.parser || field.type;

    switch (pType) {
      case 'name':
        return parsers.parseName(transcript);

      case 'digits':
        return parsers.parseDigits(transcript, field.validate?.length || null);

      case 'number':
        return parsers.parseNumber(transcript, field.validate?.min || 0, field.validate?.max || 120);

      case 'amount':
        return parsers.parseAmount(transcript);

      case 'yesno': {
        const yn = parsers.parseYesNo(transcript);
        return yn === true ? 'हाँ' : yn === false ? 'नहीं' : null;
      }

      case 'option': {
        const selectOptions = el && el.tagName === 'SELECT'
          ? Array.from(el.options).map(o => o.value).filter(v => v)
          : [];
        return parsers.parseOption(transcript, selectOptions.length ? selectOptions : field.options || []);
      }

      case 'text':
      default:
        return parsers.parseText(transcript);
    }
  }

  showTouchInputFallback(field, el) {
    return new Promise((resolve) => {
      const label = field.label?.hi || field.id;
      const modal = document.createElement('div');
      modal.className = 'seva-modal-overlay';
      modal.style.zIndex = '1000';

      const isSelect = el && el.tagName === 'SELECT';
      let inputHtml = '';

      if (isSelect) {
        const optionsHtml = Array.from(el.options)
          .map(o => `<option value="${o.value}">${o.text}</option>`)
          .join('');
        inputHtml = `<select id="fallbackInput" class="seva-select" style="font-size:18px; padding:12px;">${optionsHtml}</select>`;
      } else {
        inputHtml = `<input type="text" id="fallbackInput" class="seva-input" style="font-size:18px; padding:12px;" value="${el?.value || ''}" placeholder="${label} दर्ज करें" autofocus />`;
      }

      modal.innerHTML = `
        <div class="pin-dialog" style="width: 440px;">
          <h3 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">स्क्रीन पर दर्ज करें</h3>
          <p style="font-size: 14px; color: #475569; margin-bottom: 14px;">${label}</p>
          ${inputHtml}
          <div style="margin-top: 18px; display: flex; gap: 12px; justify-content: center;">
            <button type="button" id="btnFallbackSubmit" class="seva-btn seva-btn-green">स्वीकार करें</button>
            <button type="button" id="btnFallbackSkip" class="seva-btn seva-btn-dark">छोड़ें</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      const submit = () => {
        const val = modal.querySelector('#fallbackInput').value;
        document.body.removeChild(modal);
        resolve(val);
      };

      modal.querySelector('#btnFallbackSubmit').addEventListener('click', submit);
      modal.querySelector('#btnFallbackSkip').addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(el?.value || '');
      });
    });
  }
}

export const fieldAsker = new FieldAsker();
