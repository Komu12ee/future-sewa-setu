/**
 * Form Runner Engine
 * Executes official Seva Setu 8-step form flow end to end:
 * Step 1 -> Step 2 -> Step 3 (Docs) -> Step 4 (Preview) -> Step 5 (Fee)
 * -> Step 6 (Payment) -> Step 7 (Feedback) -> Step 8 (Receipt) -> Thank You
 */
import { voiceAdapter } from '../voice/voiceAdapter.js';
import { voiceHud } from '../mascot/hud.js';
import { mascot } from '../mascot/mascot.js';
import { fieldAsker } from './fieldAsker.js';
import { domFiller } from './domFiller.js';
import { session } from '../app/session.js';
import { parseYesNo } from './parsers/yesNoParser.js';
import { showToast } from '../ui/toast.js';

export class FormRunner {
  constructor(containerEl, onComplete, onReset) {
    this.container = containerEl;
    this.onComplete = onComplete;
    this.onReset = onReset;
    this.serviceConfig = null;
    this.isPaused = false;
    this.activeRunId = 0;
  }

  stopCurrentRun() {
    this.activeRunId++;
    voiceAdapter.stopAll();
  }

  async run(serviceConfig) {
    this.stopCurrentRun();
    const runId = this.activeRunId;
    this.serviceConfig = serviceConfig;

    // Announce opening form & switch to Voice HUD
    mascot.hide();
    voiceHud.show({
      onRepeat: () => {
        if (fieldAsker.currentField) {
          fieldAsker.askField(fieldAsker.currentField);
        }
      },
      onManualType: () => {
        if (fieldAsker.currentField) {
          const el = document.querySelector(fieldAsker.currentField.selector);
          if (el) el.focus();
        }
      }
    });

    // 1. Step 1: Basic Information
    if (this.activeRunId !== runId) return;
    await this.runStep1();

    // 2. Step 2: Beneficiary, Address, Income
    if (this.activeRunId !== runId) return;
    await this.runStep2();

    // 3. Step 3: Documents Attachment
    if (this.activeRunId !== runId) return;
    await this.runStep3Docs();

    // 4. Step 4: Preview and Confirmation
    if (this.activeRunId !== runId) return;
    await this.runStep4Preview();

    // 5. Step 5: Fee Details
    if (this.activeRunId !== runId) return;
    await this.runStep5Fee();

    // 6. Step 6: Payment Popup Modal
    if (this.activeRunId !== runId) return;
    await this.runStep6Payment();

    // 7. Step 7: Feedback Modal
    if (this.activeRunId !== runId) return;
    await this.runStep7Feedback();

    // 8. Step 8: Receipt Acknowledgement
    if (this.activeRunId !== runId) return;
    await this.runStep8Receipt();
  }

  async loadTemplate(filename) {
    let target = document.querySelector('#formContentArea');
    if (!target && window.kioskStateMachine) {
      window.kioskStateMachine.ensureFormShell();
      target = document.querySelector('#formContentArea');
    }
    if (target) {
      this.container = target;
    }
    const serviceDir = session.currentService || 'income-certificate';
    const res = await fetch(`./services/${serviceDir}/${filename}`);
    if (!res.ok) throw new Error(`Template ${filename} not found`);
    const html = await res.text();
    this.container.innerHTML = html;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (window.kioskDevPanel) {
      window.kioskDevPanel.update();
    }
  }

  // ==========================================
  // STEP 1: Applicant Basic Details
  // ==========================================
  async runStep1() {
    session.currentStep = 1;
    await this.loadTemplate('step1.html');

    // Populate auto fields
    const appDateEl = document.querySelector('#applicationDate');
    if (appDateEl) appDateEl.value = session.applicationTimestamp;

    // Applicant Name prefill
    const appNameEl = document.querySelector('#applicantName');
    const benNameEl = document.querySelector('#beneficiaryName');
    const sameCheck = document.querySelector('#sameApplicantBeneficiary');

    if (session.profile.name) {
      if (appNameEl) appNameEl.value = session.profile.name;
      if (benNameEl) benNameEl.value = session.profile.name;
    }

    if (sameCheck) {
      sameCheck.addEventListener('change', () => {
        if (sameCheck.checked && appNameEl && benNameEl) {
          benNameEl.value = appNameEl.value;
        }
      });
    }

    if (session.profile.mobile) {
      const mobEl = document.querySelector('#applicantMobile');
      if (mobEl) mobEl.value = session.profile.mobile;
    }

    if (session.profile.district) {
      const distEl = document.querySelector('#officeDistrict');
      if (distEl) distEl.value = session.profile.district;
    }

    // Bind manual next / reset buttons
    const nextBtn = document.querySelector('#btnStep1Next');
    let userSkipped = false;
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        userSkipped = true;
        voiceAdapter.stopListening();
      });
    }

    // Spoken intro
    await voiceAdapter.speak('पहले आपकी बुनियादी जानकारी भरते हैं।');

    // Run fields
    const pageConfig = this.serviceConfig.pages[0];
    for (const field of pageConfig.fields) {
      if (userSkipped) break;
      if (field.auto) continue;
      await fieldAsker.askField(field);
    }

    // Ask "क्या हम अगले पेज पर चलें?"
    if (!userSkipped) {
      await this.askNextPageConfirmation('step1');
    }
  }

  // ==========================================
  // STEP 2: Beneficiary, Address, Income
  // ==========================================
  async runStep2() {
    session.currentStep = 2;
    await this.loadTemplate('step2.html');

    // Prefill address & district from step 1
    const addrEl = document.querySelector('#beneficiaryAddress');
    if (addrEl) {
      addrEl.value = session.formData.applicantAddress || 'अर्जुनीटिकरी, बालोद';
    }

    const distEl = document.querySelector('#beneficiaryDistrict');
    if (distEl) {
      distEl.value = session.profile.district || 'बालोद';
    }

    // Bind manual next button
    const nextBtn = document.querySelector('#btnStep2Next');
    let userSkipped = false;
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        userSkipped = true;
        voiceAdapter.stopListening();
      });
    }

    // Spoken intro
    await voiceAdapter.speak('अब हितग्राही और आय की जानकारी भरते हैं।');

    // Run fields
    const pageConfig = this.serviceConfig.pages[1];
    for (const field of pageConfig.fields) {
      if (userSkipped) break;
      if (field.auto) continue;
      await fieldAsker.askField(field);
    }

    // Ask "क्या हम अगले पेज पर चलें?"
    if (!userSkipped) {
      await this.askNextPageConfirmation('step2');
    }
  }

  // ==========================================
  // STEP 3: Documents Attachment (Dummy Upload)
  // ==========================================
  async runStep3Docs() {
    session.currentStep = 3;
    await this.loadTemplate('step3-docs.html');

    const introText = 'अभी के लिए मैं डमी दस्तावेज़ अपलोड कर रहा हूँ।';
    voiceHud.setQuestion(introText);
    await voiceAdapter.speak(introText);

    // Simulate upload for all 8 rows
    for (let r = 1; r <= 8; r++) {
      const row = document.querySelector(`#docRow_${r}`);
      if (!row) continue;

      row.classList.add('field-active-glow');
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const fileNameLabel = row.querySelector(`#fileName_${r}`);
      const uploadStatus = row.querySelector(`#uploadStatus_${r}`);
      const uploadBtn = row.querySelector(`#btnUpload_${r}`);

      if (fileNameLabel) fileNameLabel.textContent = 'dummy-doc.pdf';

      await new Promise(res => setTimeout(res, 400));

      if (uploadBtn) uploadBtn.style.background = '#15803d';
      if (uploadStatus) {
        uploadStatus.style.display = 'inline-flex';
        uploadStatus.innerHTML = '✓ संलग्न (700 KB)';
      }

      row.classList.remove('field-active-glow');
    }

    const docsDoneText = 'सभी दस्तावेज़ अपलोड हो गए। क्या हम आगे चलें?';
    voiceHud.setQuestion(docsDoneText);
    await voiceAdapter.speak(docsDoneText);

    const resp = await voiceAdapter.listen({ maxMs: 4000 });
    // Proceed to next
  }

  // ==========================================
  // STEP 4: Preview & Declaration Confirmation
  // ==========================================
  async runStep4Preview() {
    session.currentStep = 4;
    await this.loadTemplate('step4-preview.html');

    // Fill preview table with actual session data
    const setVal = (id, val) => {
      const el = document.querySelector(id);
      if (el && val) el.textContent = val;
    };

    setVal('#prevApplicantName', session.formData.applicantName || session.profile.name || 'कमल कुमार');
    setVal('#prevBeneficiaryName', session.formData.beneficiaryName || session.profile.name || 'कमल कुमार');
    setVal('#prevAppDate', session.applicationDate);
    setVal('#prevApplicantAddress', session.formData.applicantAddress || 'अर्जुनीटिकरी, बालोद');
    setVal('#prevApplicantMobile', session.formData.applicantMobile || session.profile.mobile || '9407901033');
    setVal('#prevApplicantEmail', session.profile.email || 'komendra25302@iiitnr.edu.in');
    setVal('#prevGuardianName', session.formData.guardianName || 'सुरेश कुमार');
    setVal('#prevGender', session.formData.beneficiaryGender || 'पुरुष/Male');
    setVal('#prevAge', session.formData.beneficiaryAge || '35');
    setVal('#prevGuardianType', session.formData.guardianType || 'पिता');
    setVal('#prevRelationship', session.formData.relationship || 'स्वयं');
    setVal('#prevCaste', session.formData.caste || 'अवधिया');
    setVal('#prevCategory', session.formData.category || 'अन्य पिछड़ा वर्ग');
    setVal('#prevAddress', session.formData.beneficiaryAddress || session.formData.applicantAddress || 'अर्जुनीटिकरी, बालोद');
    setVal('#prevDistrict', session.formData.beneficiaryDistrict || session.profile.district || 'बालोद');
    setVal('#prevPinCode', session.formData.pinCode || '491226');
    setVal('#prevOccupation', session.formData.occupation || 'कृषि एवं सेवा');
    setVal('#prevReason', session.formData.reasonDescription || 'शैक्षणिक प्रमाण पत्र');
    setVal('#prevAnnualIncome', session.formData.annualIncome ? `₹${session.formData.annualIncome}` : '₹45,000');

    // Read summary
    const summaryIntro = 'कृपया स्क्रीन पर अपनी भरी हुई जानकारी देख लीजिए। क्या सारी जानकारी सही है?';
    voiceHud.setQuestion(summaryIntro);
    await voiceAdapter.speak(summaryIntro);

    const confirmResp = await voiceAdapter.listen({ maxMs: 4000 });

    // Ask declaration confirmation
    const declText = 'क्या आप घोषणा से सहमत हैं और आवेदन जमा करना चाहते हैं?';
    voiceHud.setQuestion(declText);
    await voiceAdapter.speak(declText);

    const declResp = await voiceAdapter.listen({ maxMs: 4000 });
    const isYes = parseYesNo(declResp);

    const declCheck = document.querySelector('#declarationCheck');
    if (declCheck) {
      declCheck.checked = true;
      declCheck.dispatchEvent(new Event('change'));
    }

    await new Promise(r => setTimeout(r, 600));
  }

  // ==========================================
  // STEP 5: Fee Breakdown Page
  // ==========================================
  async runStep5Fee() {
    session.currentStep = 5;
    await this.loadTemplate('step5-fee.html');

    const feeText = 'कुल शुल्क तीस रुपये है, भुगतान का तरीका ई-वॉलेट रखा है।';
    voiceHud.setQuestion(feeText);
    await voiceAdapter.speak(feeText);

    await new Promise(r => setTimeout(r, 1200));
  }

  // ==========================================
  // STEP 6: Payment Modal Popup & Success
  // ==========================================
  async runStep6Payment() {
    session.currentStep = 6;
    const modalWrap = document.createElement('div');
    const serviceDir = session.currentService || 'income-certificate';
    const res = await fetch(`./services/${serviceDir}/step6-payment.html`);
    modalWrap.innerHTML = await res.text();
    document.body.appendChild(modalWrap);

    // Keep for 2.5 seconds, then auto confirm payment
    await new Promise(r => setTimeout(r, 2200));

    // Show success view
    const body1 = modalWrap.querySelector('#paymentModalBody');
    const body2 = modalWrap.querySelector('#paymentSuccessBody');
    if (body1) body1.style.display = 'none';
    if (body2) body2.style.display = 'block';

    voiceHud.setQuestion('भुगतान सफल रहा।');
    await voiceAdapter.speak('भुगतान सफल रहा।');

    await new Promise(r => setTimeout(r, 2200));
    document.body.removeChild(modalWrap);
  }

  // ==========================================
  // STEP 7: Feedback Modal
  // ==========================================
  async runStep7Feedback() {
    session.currentStep = 7;
    const modalWrap = document.createElement('div');
    const serviceDir = session.currentService || 'income-certificate';
    const res = await fetch(`./services/${serviceDir}/step7-feedback.html`);
    modalWrap.innerHTML = await res.text();
    document.body.appendChild(modalWrap);

    const askText = 'आप हमें एक से पाँच में कितने स्टार देंगे?';
    voiceHud.setQuestion(askText);
    await voiceAdapter.speak(askText);

    // Default 5 stars
    const stars = modalWrap.querySelectorAll('.seva-star');
    stars.forEach((s, idx) => {
      s.addEventListener('click', () => {
        stars.forEach((other, oIdx) => {
          if (oIdx <= idx) other.classList.add('active');
          else other.classList.remove('active');
        });
      });
    });

    const submitBtn = modalWrap.querySelector('#btnSubmitFeedback');
    const closeBtn = modalWrap.querySelector('#btnCloseFeedbackModal');

    await new Promise(resolve => {
      const finish = () => {
        if (modalWrap.parentNode) document.body.removeChild(modalWrap);
        resolve();
      };
      if (submitBtn) submitBtn.addEventListener('click', finish);
      if (closeBtn) closeBtn.addEventListener('click', finish);
      setTimeout(finish, 4000);
    });
  }

  // ==========================================
  // STEP 8: Acknowledgement Receipt
  // ==========================================
  async runStep8Receipt() {
    session.currentStep = 8;
    voiceHud.hide();
    await this.loadTemplate('step8-receipt.html');

    // Populate receipt details
    const setVal = (id, val) => {
      const el = document.querySelector(id);
      if (el && val) el.textContent = val;
    };

    setVal('#rcptRefNumber', session.referenceNumber);
    setVal('#rcptDate', session.applicationDate);
    setVal('#rcptDueDate', session.dueDate);
    setVal('#rcptApplicantName', session.formData.applicantName || session.profile.name || 'कमल कुमार');
    setVal('#rcptDistrict', session.formData.beneficiaryDistrict || session.profile.district || 'बालोद');
    setVal('#rcptAppDistrict', session.formData.beneficiaryDistrict || session.profile.district || 'बालोद');
    setVal('#rcptMobile', session.formData.applicantMobile || session.profile.mobile || '9407901033');
    setVal('#rcptEmail', session.profile.email || 'komendra25302@iiitnr.edu.in');

    // Action buttons
    document.querySelector('#btnPrintReceipt')?.addEventListener('click', () => {
      window.print();
    });

    document.querySelector('#btnNewRegistration')?.addEventListener('click', () => {
      this.finishAndThankYou();
    });

    document.querySelector('#btnCloseReceipt')?.addEventListener('click', () => {
      this.finishAndThankYou();
    });

    // Bring mascot back for Thank You
    setTimeout(() => {
      this.finishAndThankYou();
    }, 6000);
  }

  async finishAndThankYou() {
    voiceHud.hide();
    this.container.innerHTML = `
      <div class="kiosk-stage-screen">
        <div class="stage-card-dialog">
          <div class="stage-mascot-row">
            <div id="thankYouMascot" style="width: 140px; height: 140px;"></div>
            <div class="stage-speech-bubble" style="background:#f0fdf4; border-color:#86efac; color:#166534;">
              बधाई हो! आपने सफलतापूर्वक फ्यूचर सेवा सेतु फॉर्म भरने का अनुभव कर लिया। धन्यवाद!
            </div>
          </div>
          <div style="font-size: 15px; color: #64748b; margin-top: 14px;">
            सत्र 8 सेकंड में स्वतः समाप्त होकर मुख्य स्क्रीन पर वापस जाएगा...
          </div>
        </div>
      </div>
    `;

    const mascotHolder = document.querySelector('#thankYouMascot');
    if (mascotHolder) {
      mascot.render(mascotHolder);
      mascot.show();
      mascot.setState('happy');
    }

    await voiceAdapter.speak('बधाई हो! आपने सफलतापूर्वक फ्यूचर सेवा सेतु फॉर्म भरने का अनुभव कर लिया। धन्यवाद!');

    setTimeout(() => {
      if (this.onReset) this.onReset();
    }, 8000);
  }

  async askNextPageConfirmation(pageId) {
    const qText = 'क्या हम अगले पेज पर चलें?';
    voiceHud.setQuestion(qText);
    await voiceAdapter.speak(qText);

    const resp = await voiceAdapter.listen({ maxMs: 4000 });
    const isYes = parseYesNo(resp);

    if (isYes === false) {
      const changeQ = 'क्या आप कोई जानकारी बदलना चाहते हैं?';
      voiceHud.setQuestion(changeQ);
      await voiceAdapter.speak(changeQ);
      await voiceAdapter.listen({ maxMs: 4000 });
    }
  }
}
