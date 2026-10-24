/**
 * DOM Filler Module
 * Sets values with character-by-character typing animation,
 * blue active glow, scrolling, and proper DOM event dispatching.
 */

export class DomFiller {
  constructor() {
    this.currentActiveElement = null;
  }

  /**
   * Highlights and scrolls an element into view
   */
  focusField(selectorOrEl) {
    this.clearHighlight();

    const el = typeof selectorOrEl === 'string'
      ? document.querySelector(selectorOrEl)
      : selectorOrEl;

    if (!el) return null;

    this.currentActiveElement = el;
    el.classList.add('field-active-glow');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.focus();
    return el;
  }

  clearHighlight() {
    if (this.currentActiveElement) {
      this.currentActiveElement.classList.remove('field-active-glow');
      this.currentActiveElement.blur();
      this.currentActiveElement = null;
    }
  }

  /**
   * Types text into an input or textarea with visible typing animation
   */
  async fillText(selectorOrEl, text, speedMs = 35) {
    const el = this.focusField(selectorOrEl);
    if (!el) return;

    el.value = '';
    const str = String(text);

    for (let i = 0; i < str.length; i++) {
      el.value += str[i];
      el.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise(r => setTimeout(r, speedMs));
    }

    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Sets select dropdown option
   */
  async fillSelect(selectorOrEl, value) {
    const el = this.focusField(selectorOrEl);
    if (!el) return;

    // Find best matching option
    let matchedOption = null;
    const normVal = String(value).toLowerCase().trim();

    for (const opt of el.options) {
      if (opt.value.toLowerCase().includes(normVal) || opt.text.toLowerCase().includes(normVal)) {
        matchedOption = opt;
        break;
      }
    }

    if (matchedOption) {
      el.value = matchedOption.value;
    } else if (el.options.length > 1) {
      el.selectedIndex = 1; // default to first valid
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  /**
   * Sets checkbox state
   */
  fillCheckbox(selectorOrEl, checked = true) {
    const el = this.focusField(selectorOrEl);
    if (!el) return;

    el.checked = Boolean(checked);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Attaches dummy file using DataTransfer API
   */
  attachDummyFile(fileInputEl, fileName = 'dummy-doc.pdf', mimeType = 'application/pdf') {
    if (!fileInputEl) return false;

    try {
      const dt = new DataTransfer();
      const file = new File(['%PDF-1.4 ... Chhattisgarh Seva Setu Dummy Document ...'], fileName, {
        type: mimeType,
        lastModified: Date.now()
      });
      dt.items.add(file);
      fileInputEl.files = dt.files;
      fileInputEl.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    } catch (err) {
      console.warn('DataTransfer file attach fallback:', err.message);
      return false;
    }
  }
}

export const domFiller = new DomFiller();
