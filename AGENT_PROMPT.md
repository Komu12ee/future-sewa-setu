# PROJECT: "AI Seva Setu – Future Experience Zone" (Voice Mascot Form-Filling Kiosk)

You are a senior full-stack engineer. Build the project described below end to end. Work in milestones (section 14), run and test after each milestone, and keep the code **modular**. Ask me only when something is truly blocked; otherwise make a reasonable choice, note it in `DECISIONS.md`, and continue.

---

## 1. Goal

A touch-screen kiosk for the Chhattisgarh Rajyotsava event (1 November). A visitor touches the screen, an AI mascot greets them in Hindi, collects basic details, shows the available Seva Setu services, and the visitor picks one by voice. The mascot then **fills the real-looking Seva Setu form by voice**, page by page, asking one field at a time. At the end it previews the form, simulates a payment, and shows an acknowledgement receipt.

This is a **DEMO / prototype**. Nothing is submitted to any government system. Show a small "डेमो – वास्तविक आवेदन नहीं" badge somewhere on screen, use dummy data only, and store nothing after the session ends.

---

## 2. Tech stack and hard constraints

- **Frontend:** Vite + vanilla JavaScript (ES modules) or React + Vite. Choose one, keep it simple, no heavy UI frameworks. Plain CSS (reuse the Seva Setu CSS from the reference pages).
- **Backend:** a tiny **Node.js (Express) proxy** in `server/`. Its only jobs are (1) to hold the AI API key so it is **never exposed in browser code**, and (2) to forward speech/text requests to the AI provider.
- **AI provider:** **Sarvam AI** for all AI features (I believe this is what "Servom AI" refers to – use Sarvam): speech-to-text (STT), text-to-speech (TTS), and an optional chat/LLM call for answer parsing. Model names and endpoints change, so **read the current official Sarvam documentation first** and use what it currently recommends. Use `hi-IN` as the default language.
- **Secrets:** `.env` (git-ignored) with `SARVAM_API_KEY=...`. Provide `.env.example`. Never hard-code or log the key.
- **Kiosk target:** full-screen Chrome on a touch display (1920×1080, landscape), a microphone and speakers attached.
- **Offline-safe fallback:** if the AI API fails or the network drops, fall back to (a) browser Web Speech API for STT/TTS if available, and (b) an on-screen touch input. The demo must never freeze.

---

## 3. Modularity requirements (most important)

Everything below must be swappable **without editing engine code**:

| Swappable thing | How |
|---|---|
| Mascot (look, video, image, voice) | A "mascot pack" folder + a **Gallery** screen (section 5) |
| Services (income, caste, marriage, domicile…) | One folder per service under `services/` |
| Voice/AI provider | One adapter file implementing a common interface |
| Language / spoken lines | `i18n/hi.json` (and `en.json`) |

### Folder structure

```
seva-mascot/
├── server/
│   ├── index.js                 # Express: /api/stt  /api/tts  /api/parse
│   └── .env.example
├── src/
│   ├── main.js
│   ├── app/
│   │   ├── stateMachine.js      # global flow (section 7)
│   │   ├── session.js           # in-memory profile + formData, wiped on reset
│   │   └── idleTimer.js
│   ├── engine/
│   │   ├── formRunner.js        # runs a service: pages → fields → upload → preview
│   │   ├── fieldAsker.js        # ask → listen → parse → verify → fill
│   │   ├── domFiller.js         # sets values + dispatches input/change events
│   │   ├── parsers/             # name, number, amount, digits, date, option, yesno, text
│   │   └── commands.js          # global voice commands (repeat, back, change…)
│   ├── voice/
│   │   ├── voiceAdapter.js      # interface: speak(text), listen({timeout}) → text
│   │   ├── sarvamAdapter.js     # calls our /api/* proxy
│   │   └── webSpeechAdapter.js  # fallback
│   ├── mascot/
│   │   ├── mascot.js            # states: idle | speaking | listening | thinking | happy
│   │   ├── hud.js               # face-less voice HUD shown during forms
│   │   └── gallery.js           # Gallery screen logic
│   └── ui/                      # attract screen, menu, popups, toasts
├── mascot-packs/                # ← each mascot is one folder
│   └── default/
│       ├── manifest.json
│       ├── idle.webm  speaking.webm  listening.webm  (or idle.png etc.)
│       └── thumbnail.png
├── services/                    # ← each service is one folder
│   └── income-certificate/
│       ├── service.json         # automation config (selectors, asks, parsers)
│       ├── page1.html  page2.html  page3-docs.html
│       ├── preview.html  fee.html  receipt.html
│       └── ...
├── reference/                   # official saved HTML + screenshots (read-only)
├── assets/dummy-docs/           # dummy-doc.pdf, dummy-doc.jpg (each < 700 KB)
├── i18n/hi.json  en.json
└── styles/sevasetu/             # CSS extracted from official pages
```

**Design decision for forms:** keep the official page HTML as faithful templates (pixel-faithful look: red top bar with session timer, blue section bars, bordered cards). Do **not** regenerate forms from JSON. `service.json` only describes the automation (which selector to fill, what to ask, how to parse). This keeps the UI identical to Seva Setu and makes each service a drop-in folder.

---

## 4. Mascot pack format

`mascot-packs/<name>/manifest.json`:

```json
{
  "id": "default",
  "name": "Chips",
  "type": "video",                      // "video" or "image"
  "states": {
    "idle": "idle.webm",
    "speaking": "speaking.webm",
    "listening": "listening.webm",
    "happy": "happy.webm"               // optional, falls back to idle
  },
  "image": "mascot.png",                // used when type = "image"
  "thumbnail": "thumbnail.png",
  "background": "transparent",
  "scale": 1.0,
  "voice": { "lang": "hi-IN", "speaker": "default", "pace": 1.0 }
}
```

Rules:
- If `type` is `"image"`, animate with CSS (gentle bounce while speaking, glow ring while listening, blink-scale while thinking). This must look acceptable with a single still image.
- Videos loop, are muted, and autoplay; crossfade between states in ≤200 ms.
- The mascot module exposes only: `mascot.setState(state)`, `mascot.show()`, `mascot.hide()`. The rest of the app must not know which mascot is loaded.
- The pack is loaded **at runtime from the manifest**, so replacing the folder (or choosing another in the Gallery) changes the mascot everywhere: attract screen, greeting, service menu, thank-you screen.

---

## 5. Gallery section (mascot switcher)

A hidden admin screen opened by long-pressing (3 s) the top-left corner, protected by a 4-digit PIN (config value, default `1234`):

- Grid of all packs found in `mascot-packs/` (thumbnail + name).
- Tap a pack → live preview with buttons: Idle / Speaking / Listening. 
- "Set as active" saves the choice (localStorage) and applies it to the **whole app** instantly.
- "Test voice" plays a sample line with that pack's voice settings.
- "Add mascot" lets me upload an image or video(s) from the browser; the server stores them in `mascot-packs/<new>/` and generates a manifest (image-type by default).
- Also on this screen: microphone test, speaker test, language switch (hi/en), toggle "show voice HUD during forms".

---

## 6. Voice layer behaviour

**Speak (TTS):** `voiceAdapter.speak(text)` returns a promise that resolves when audio finishes. While speaking: mascot state `speaking`, HUD shows caption text. Cache TTS audio for fixed lines (greeting, menu, "next page?") in memory so repeats are instant. Pre-warm the greeting audio at app start.

**Listen (STT):** `voiceAdapter.listen({ maxMs: 8000, silenceMs: 1200 })`:
- Record with MediaRecorder, detect end-of-speech with a simple volume threshold (VAD) on a Web Audio analyser, stop after `silenceMs` of silence, send audio to `/api/stt`, return the Devanagari transcript.
- Mascot state `listening`, show a live mic level meter.
- The microphone must **not listen while the mascot is speaking** (avoid hearing itself). Open the mic only after TTS ends.
- Retry rules: no speech → "मुझे सुनाई नहीं दिया, कृपया फिर से बोलिए" (retry up to 2 times) → then show an on-screen touch fallback (keyboard / option buttons) and continue.

**Parse:** use deterministic parsers first (fast, predictable). Call the LLM through `/api/parse` only as a fallback for messy answers (e.g. extracting a name from "मेरा नाम राजेश कुमार है", or matching an option fuzzily). Parsers needed:
- `name` (strip filler words: "मेरा नाम", "है"), `digits` (spoken Hindi/English digits → string, e.g. pin code, mobile), `number`, `amount` (handles "दो लाख", "पचास हज़ार", "४३५६"), `option` (fuzzy-match to the live `<option>` / list items using Devanagari normalisation + the LLM fallback), `yesno` (हाँ/जी/ठीक है/सही/हां/yes vs नहीं/नहीं जी/no/बदलो), `text` (free text, address).

**Global voice commands** (work at any time, checked before field parsing):
`दोहराओ` (repeat the question), `वापस / पीछे` (previous field/page), `बदलो <field>` (change a field), `रुको` (pause), `शुरू से` (restart, ask confirmation), `रद्द करो` (cancel to menu).

**Silence/idle:** 45 s with no interaction → mascot asks "क्या आप वहाँ हैं?" → another 15 s → reset to attract screen and wipe the session.

---

## 7. Global flow (state machine)

```
ATTRACT → GREETING → PROFILE → SERVICE_MENU → FORM (page loop) → DOCUMENTS
→ PREVIEW_CONFIRM → FEE → PAYMENT_POPUP → PAYMENT_SUCCESS → FEEDBACK
→ RECEIPT → THANK_YOU → RESET (back to ATTRACT)
```

### Step-by-step (follow exactly)

**1. ATTRACT.** Full-screen mascot idle animation + big text "छूने के लिए स्क्रीन को स्पर्श करें" (Touch the screen to start). Start on **first touch** (also needed to unlock browser audio).

**2. GREETING.** Mascot speaks:
> "नमस्कार! आपका स्वागत है, एआई बेस्ड सेवा सेतु फ्यूचर एक्सपीरियंस ज़ोन में।"

**3. PROFILE (basic details).** Mascot asks one at a time and **confirms each**: 
1. नाम – "कृपया अपना नाम बताइए।" 
2. ज़िला – "आप किस जिले से हैं?" (match against the district list used in the form) 
3. मोबाइल नंबर – "अपना दस अंकों का मोबाइल नंबर बताइए।" 
Optional (config flag, default off for the demo): email – too error-prone by voice; use a default demo email unless enabled. Save into `session.profile`. After each answer, mascot repeats it: "आपने बताया {value}, क्या यह सही है?" 

**4. SERVICE_MENU.** Mascot still visible, and shows service cards (icon + name) for all **enabled** services: आय प्रमाण पत्र, जाति प्रमाण पत्र, विवाह प्रमाण पत्र, निवास (मूल निवासी) प्रमाण पत्र, etc. Mascot says: "आप कौन सी सेवा का आवेदन करना चाहेंगे? आय, जाति, विवाह या निवास प्रमाण पत्र?" The user chooses **by voice** (tap on a card must also work). Each service has `keywords` in `service.json` (e.g. "आय", "income", "इनकम") for matching. Confirm: "आपने आय प्रमाण पत्र चुना है, सही है?" 

**5. SERVICE_SELECTED → FORM.** Mascot says "ठीक है, मैं आपका फॉर्म खोल रहा हूँ। मैं आपको आवाज़ से गाइड करूँगा।" Then **hide the mascot face** and open the form full screen. During the form show only the **voice HUD**: a small floating panel (bottom-left) with an animated mic/waveform ring, live captions of what the mascot is asking and what the user said, and a "repeat" and "type instead" button. (Setting `showHudDuringForm` in the Gallery; the mascot face stays hidden either way.) The mascot's **voice continues**.

**6. FORM page loop** (for each page of the service, see section 8):
- Mascot speaks a one-line page intro (optional, from `service.json`).
- For every field, in order: skip if `readOnly`, `auto`, or `showIf` is false. Run the **field procedure** below.
- When all fields on the page are filled and valid, ask: **"क्या हम अगले पेज पर चलें?"** 
  - "हाँ" → click the page's Next/Save button (e.g. "सहेजें और पूर्वावलोकन") and continue. 
  - "नहीं" → ask **"क्या आप कोई जानकारी बदलना चाहते हैं?"** → if yes, ask "कौन सी जानकारी?" (match field label), re-ask that field, then return to the "अगले पेज पर चलें?" question. If no, wait and re-ask once, then proceed.
- Validate before moving on exactly as the page would (required fields, mobile 10 digits, pin code 6 digits). If invalid, read the error and re-ask that field.

**Field procedure:**
1. If the field has a value already (from `session.profile` or an earlier page, e.g. name, district, mobile, address), **reverify instead of asking**: "आपका नाम {value} है। क्या यही रखना है या बदलना है?" → keep or re-ask.
2. Otherwise speak the `ask` line (for dropdowns include the options if ≤ 6, e.g. "लिंग क्या है? पुरुष, महिला या अन्य?").
3. Listen → parse → **type the value into the on-screen field visibly** (character-by-character animation for text; highlight the field with a blue glow while active; scroll it into view).
4. Fields marked `confirm: true` are read back: "{label}: {value}। सही है?" Others are filled silently and move on.
5. On parse failure: one clarifying re-ask, then the touch fallback.
6. Dependent dropdowns (District → Office type → Tehsil → Revenue village) must wait for the next dropdown's options to load (`waitForOptions`) before asking.

**7. DOCUMENTS page.** On the upload page the mascot says: **"अभी के लिए मैं डमी दस्तावेज़ अपलोड कर रहा हूँ।"** Then, for **every** upload row: fill "दस्तावेज़ संख्या" with a dummy value (e.g. `DEMO-001`, `DEMO-002`…), keep "संलग्न प्रकार" = अपलोड, attach `assets/dummy-docs/dummy-doc.pdf` to the file input programmatically (via `DataTransfer` + `input.files`, dispatch `change`), click the row's Upload button (simulate success with a green tick and file name, ~400 ms per row so the audience sees it happen). No real upload request is made. Finally click "अनुलग्नक सहेजें". The mascot says "सभी दस्तावेज़ अपलोड हो गए। क्या हम आगे चलें?" and follows the same yes/no logic.

**8. PREVIEW_CONFIRM.** Open the preview page (all sections as in the official preview: आवेदक की बुनियादी जानकारी, हितग्राही की जानकारी, पता, आय का विवरण, सहमति, अनुलग्न दस्तावेज़ सूची). The mascot says: "कृपया स्क्रीन पर अपनी भरी हुई जानकारी देख लीजिए।" and **reads out the key details** (name, age, address, annual income, etc., short). Then asks "क्या सारी जानकारी सही है?" 
- "हाँ" → ask about the declaration: "क्या आप घोषणा से सहमत हैं और आवेदन जमा करना चाहते हैं?" → on "हाँ", tick the declaration checkbox ("आवेदन जमा करने के लिए यहाँ चेक करें") and click submit. **Never tick the declaration without an explicit yes.** 
- "नहीं" → "कौन सी जानकारी बदलनी है?" → jump back to that field/page, then return to the preview.

**9. FEE page** ("शुल्क विवरण"). Show the fee table (स्कैनिंग शुल्क ₹0, लोकसेवा केंद्र सेवा शुल्क ₹30, कुल ₹30). Mascot says "कुल शुल्क तीस रुपये है, भुगतान का तरीका ई-वॉलेट रखा है।" Select eWallet and click "जमा करें".

**10. PAYMENT_POPUP.** Show the "भुगतान" modal with "कुल राशि देय ₹30.00", a **dummy QR image** (static placeholder), "Scan to pay", UPI/card/bank icons, "पुष्टि करें" button. Keep it for **2 seconds**, then automatically close and show a **"भुगतान सफल ✓"** popup (green tick, amount, dummy transaction id) for ~2 s. Mascot voice (HUD only): "भुगतान सफल रहा।"

**11. FEEDBACK popup.** Show the satisfaction popup ("क्या आप सेवा सेतु के साथ अपने अनुभव का मूल्यांकन करेंगे?" with 5 stars and a message box). Mascot asks "आप हमें एक से पाँच में कितने स्टार देंगे?" → select stars by voice, then click "संदेश भेजें". Allow "छोड़ दीजिए" (skip) and also a touch option.

**12. RECEIPT.** Show the acknowledgement page ("पावती (लोक सेवा गारंटी)", "आवेदन सारांश"): generated reference number (e.g. 16 digits, clearly dummy), application date (today), service name, payment details (service fee 30.00, scanning 0.00, total 30, e-wallet), due date (today + 20 days), office block (district, office type, tehsil, revenue village), applicant block (name, address, district, state छत्तीसगढ़, email, mobile), Seva Setu center block (dummy name/address/phone, config), "मुहर एवं हस्ताक्षर" box, and the footer note about fees. Buttons: छापें (print – only opens print preview), नया पंजीकरण (new registration → RESET), बंद.

**13. THANK_YOU.** Bring the **mascot back on screen** (happy state) and speak:
> "बधाई हो! आपने सफलतापूर्वक फ्यूचर सेवा सेतु फॉर्म भरने का अनुभव कर लिया। धन्यवाद!"

Then wait 8 s and **RESET** (wipe session, return to ATTRACT).

---

## 8. Income certificate – page definitions (from the real screenshots)

Implement this as the **reference service**. Take exact element ids/classes from the HTML saved in `reference/income-certificate/`. Where I wrote "(verify)", inspect the DOM to decide whether a field is auto-filled, read-only, conditionally enabled, or required.

**Page 1 – आवेदक की बुनियादी जानकारी** (left card + blue "कार्यालय का चयन" panel)
- आवेदक का नाम* – text (prefill from `profile.name`, reverify)
- हितग्राही का नाम* – text
- Checkbox "क्या हितग्राही और आवेदक एक ही है" – ask yes/no; if yes, tick it and copy the name (verify auto-copy)
- ई मेल* – demo default or spoken (config)
- मोबाइल नंबर* – prefill from `profile.mobile`, reverify, `digits`, length 10
- आवेदन दिनांक – read-only (auto, never ask)
- आवेदक का पता* – textarea, `text`, confirm, allow on-screen edit
- Blue panel (office selection): optional checkbox "पिछले कार्यालय का चयन" (leave unchecked), then **cascading** searchable dropdowns: जिला* (prefill from `profile.district`) → कार्यालय प्रकार* (उप-जिला / राजस्व तहसील / राजस्व उप-तहसील) → उप जिला राजस्व तालुक / तहसील* → राजस्व गांव*. These are Select2-style widgets (search box inside) – the filler must open the widget, type/select the matched option, and wait for the next one to populate.
- Buttons: "जमा करें" (go next), "फिर से" (reset page)

**Page 2 – single long page with three sections**
- *हितग्राही की जानकारी*: लिंग* (select) · हितग्राही की उम्र* (number, 0–120, confirm) · हितग्राही के अभिभावक का प्रकार* (select) · हितग्राही के अभिभावक का नाम* (name, confirm) · हितग्राही के साथ संबंध* (select) · हितग्राही के पुत्र या पुत्री या पत्नी नाम (disabled by default – verify the condition that enables it; ask only if enabled) · जाति* (search field with search button: speak the caste, type it, press search, pick the matching result) · श्रेणी* and वर्ग का क्रमांक* (verify – probably auto-filled after the caste is picked; if so, **do not ask**, just read them out and verify)
- *पता का विवरण*: पता* (prefilled from page 1 – reverify) · पिन कोड (optional; `digits`, length 6, read back digit by digit) · जिला* (prefilled – reverify)
- *आय का विवरण*: व्यवसाय या सेवा का विवरण* (search field with button) · आवेदन का कारण* (text) · वार्षिक आय (disabled by default – verify what enables it; `amount`, confirm) · विगत 3 वर्षों की औसत वार्षिक आय (disabled by default – same) · consent dropdown* "मैं सहमति देता/देती हूँ कि यदि निर्धारित समय सीमा के भीतर… स्वतः शिकायत/अपील दर्ज की जाए" → mascot reads this in short ("अगर समय पर सेवा न मिले तो आपकी ओर से स्वतः शिकायत दर्ज होगी। क्या आप सहमत हैं?") and selects हाँ/नहीं
- Buttons: "सहेजें और पूर्वावलोकन" (next), "सुधारे", "पीछे"
- Because this page is long, ask the mascot's page question once after the whole page, but scroll each active field into view.

**Page 3 – अनुलग्नक का विवरण** (documents table, 8 rows): 1 शपथ पत्र (mandatory *), 2 पटवारी/सरपंच/पार्षद से प्रमाण पत्र, 3 नियोक्ता का आय प्रमाण पत्र/फार्म 16, 4 भूमि/घर से आय, 5 अन्य, 6 आवेदन प्रपत्र, 7 फार्म 16, 8 परिवार के अन्य सदस्यों की आय. Columns: दस्तावेज़ संख्या (input), संलग्न प्रकार (select: अपलोड / डिजिटल लॉकर), file input + Upload button, delete checkbox. Rules shown on page: mandatory docs marked (*), at least one of the same attachment type marked (#), max 750 KB, jpeg/jpg/png/pdf. Buttons: "अनुलग्नक सहेजें", "बंद", "पीछे". Handled by the dummy-upload step (section 7, step 7).

**Then:** Preview → Fee ("शुल्क विवरण") → Payment popup → Feedback popup → Receipt, exactly as in section 7.

### `service.json` shape (example fragment)

```json
{
  "id": "income-certificate",
  "enabled": true,
  "title": { "hi": "आय प्रमाण पत्र", "en": "Income Certificate" },
  "keywords": ["आय", "इनकम", "income", "आय प्रमाण पत्र"],
  "pages": [
    {
      "id": "page1",
      "template": "page1.html",
      "intro": { "hi": "पहले आपकी बुनियादी जानकारी भरते हैं।" },
      "fields": [
        {
          "id": "applicantName",
          "selector": "#TODO",
          "label": { "hi": "आवेदक का नाम" },
          "ask": { "hi": "आवेदक का नाम बताइए।" },
          "type": "text",
          "parser": "name",
          "required": true,
          "prefillFrom": "profile.name",
          "confirm": true
        },
        {
          "id": "applicationDate",
          "selector": "#TODO",
          "type": "text",
          "auto": true
        },
        {
          "id": "tehsil",
          "selector": "#TODO",
          "widget": "select2",
          "label": { "hi": "तहसील" },
          "ask": { "hi": "आपकी तहसील कौन सी है?" },
          "parser": "option",
          "dependsOn": "officeType",
          "waitForOptions": true
        }
      ],
      "pageQuestion": true,
      "nextAction": { "type": "click", "selector": "#TODO" }
    }
  ],
  "documents": {
    "page": "page3-docs.html",
    "rowSelector": "#TODO",
    "dummyFile": "assets/dummy-docs/dummy-doc.pdf",
    "saveButton": "#TODO"
  },
  "preview": { "template": "preview.html", "declarationCheckbox": "#TODO", "submitButton": "#TODO" },
  "fee": { "template": "fee.html", "paymentMethod": "eWallet", "submitButton": "#TODO" },
  "receipt": { "template": "receipt.html" }
}
```

For **caste, marriage and domicile** services: create the same folder structure and `service.json` once I drop their saved HTML into `reference/<service-name>/`. Until then register them in the menu with `"enabled": false` (card shows "जल्द आ रहा है"). Do **not** invent their fields.

---

## 9. DOM filling rules (`domFiller.js`)

- Set `.value`, then dispatch `input`, `change` and `blur` events so the page's own validation runs.
- Select2 / searchable widgets: open, type the query, wait for results, choose the best match, close.
- Checkboxes: set `.checked`, dispatch `change`.
- File inputs: `DataTransfer` trick (see section 7 step 7).
- Always add a visible "typing" effect and a blue glow on the active field so the audience sees what the mascot is filling.
- Never click a Next/Submit/Payment button without the voice confirmation described above.

---

## 10. UI / visual requirements

- Reuse the official look: red top bar with "Session TimeOut (In Minute): 15:00" countdown (cosmetic) and a "डैशबोर्ड / user" area, blue rounded section bars, bordered white cards, red/green/yellow/black action buttons. Large touch-friendly buttons (min 56 px).
- The Seva Setu logos/branding: use the assets I provide; label the app clearly as a demo.
- Dark text on light backgrounds, Devanagari font that renders well (Noto Sans Devanagari).
- Smooth transitions between steps (fade/slide ≤ 300 ms).

---

## 11. Privacy and safety

- Dummy-data only for demo screens. No analytics, no persistence: `session.js` is in-memory and wiped on RESET, idle reset, or "नया पंजीकरण".
- Do not store audio. Send audio to the proxy only for transcription and discard it afterwards.
- The proxy must rate-limit and only accept requests from localhost / the kiosk origin.
- Do not log personal answers in the console in production mode.

---

## 12. Error handling

- Every network call has a timeout (STT 10 s, TTS 8 s) and one retry, then the fallback adapter.
- If a selector in `service.json` is not found, show a small dev-only warning, skip the field, and continue (never crash the flow).
- A "dev mode" (`?dev=1`) shows a debug panel: current state, current field, last transcript, parse result, and buttons to jump to any step.

---

## 13. Acceptance criteria (test each)

1. First touch starts the greeting audio with the exact greeting line; mascot is shown.
2. Profile (name, district, mobile) is collected and confirmed by voice; values appear later in the form as **reverify** questions, not blank questions.
3. Saying "आय प्रमाण पत्र" opens the income form; the mascot face disappears and the voice HUD appears; mascot voice continues.
4. Every field on page 1 and page 2 is filled by voice; dropdowns and the cascading office selection work; disabled/auto fields are not asked.
5. After each page, "क्या हम अगले पेज पर चलें?" is asked; "हाँ" proceeds, "नहीं" leads to the change-information flow.
6. The documents page announces the dummy upload and fills all 8 rows with a dummy number + dummy file, then saves.
7. The preview shows all entered data; the mascot reads key details and asks for confirmation; declaration is ticked only after explicit "हाँ".
8. Payment: fee page → QR popup visible for 2 s → auto "भुगतान सफल" popup → feedback popup → receipt with a generated reference number.
9. Mascot returns and speaks the final thank-you line; after 8 s the app resets with no data left.
10. Swapping to another mascot in the Gallery changes the mascot everywhere with no code change; adding a new service folder with `enabled: true` adds a card to the menu.
11. With the network cut, the app falls back to Web Speech / touch input without freezing.
12. No API key appears in any browser bundle or network request from the browser (only the local proxy is called).

---

## 14. Build order (milestones)

1. **Scaffold:** Vite app + Express proxy + `.env`, kiosk full-screen layout, attract screen, i18n loader.
2. **Mascot + Gallery:** mascot pack loader, states, image/video support, Gallery with PIN.
3. **Voice layer:** Sarvam adapter via proxy (STT + TTS), VAD, fallback adapter, mic/speaker test in Gallery.
4. **Parsers + commands:** all parsers with unit tests (Hindi numbers, amounts, digits, yes/no, option matching).
5. **Greeting → profile → service menu** end to end by voice.
6. **Income certificate pages 1–2** with `domFiller`, Select2 handling, reverify, page-question loop.
7. **Documents page** dummy upload, then **preview → fee → payment popup → feedback → receipt → thank-you → reset**.
8. **Hardening:** idle timers, error handling, dev panel, accessibility, performance (pre-warm TTS), README with run + kiosk setup instructions.
9. **Other services:** stubs (`enabled:false`), then implement each when its reference HTML is provided.

---

## 15. What I will provide / what you must not assume

- I will place official HTML/CSS/screenshots in `reference/`. Read them before writing selectors.
- I will provide the Sarvam API key in `.env` myself. Never ask me to paste it into chat or code.
- I will provide the mascot packs. Until then, use a placeholder image mascot so everything runs.
- If a Hindi spoken line sounds unnatural or any official wording is unclear, keep it editable in `i18n/hi.json` and list those lines in `DECISIONS.md` for me to review.

Deliver: working code, `README.md` (setup, `npm run dev`, kiosk mode instructions), `DECISIONS.md`, and a short demo script of the happy path.
