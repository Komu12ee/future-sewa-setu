# Architecture & Design Decisions – AI Seva Setu Kiosk

## 1. No UI Framework (Vanilla ES Modules + Vite)
- **Decision:** As explicitly specified ("don't use react", "vanilla JavaScript ES modules"), we implemented modular vanilla JavaScript with modern ES module imports.
- **Rationale:** Delivers zero-overhead rendering speed, instantaneous state changes, complete control over native DOM manipulation (`domFiller.js`), and pixel-exact compliance with the official Seva Setu layouts.

## 2. Layouts Built From Reference Screenshots (Step 1 to Step 8)
- **Decision:** All 8 form and modal templates were modeled directly from `income-ssimage/step-1.jpeg` through `step-8.jpeg`:
  - **Step 1:** Two-column split layout with left applicant card (`#f8f9fa`) and right royal blue office selector card (`#0050a0`) with cascading selectors (जिला → कार्यालय प्रकार → तहसील → राजस्व गांव).
  - **Step 2:** Three blue rounded pill headers ("हितग्राही की जानकारी", "पता का विवरण", "आय का विवरण"), 2-column input grid, search inputs with `🔍` buttons, and full-width public service guarantee SLA consent row.
  - **Step 3:** 8-row documents attachment table with simulated animated dummy file attachment (`assets/dummy-docs/dummy-doc.pdf`).
  - **Step 4:** Official 5-section preview layout, declaration statement, and required confirmation checkbox.
  - **Step 5:** Fee table with ₹30 charge breakdown and eWallet payment method.
  - **Step 6:** Red-header payment popup with ₹30.00, high-res QR code, UPI/Card/Bank logos, and automatic transition to "भुगतान सफल ✓" badge.
  - **Step 7:** Satisfaction rating popup with 5 interactive stars and message box.
  - **Step 8:** Official "पावती (लोक सेवा गारंटी)" certificate receipt with CHiPS logo and Chhattisgarh Government emblem.

## 3. Sarvam AI Voice Proxy + Offline Browser Fallback
- **Decision:** Node.js Express proxy in `server/index.js` handles Sarvam AI calls (`/api/stt`, `/api/tts`, `/api/parse`). Never exposes `SARVAM_API_KEY` to the client.
- **Fallback:** When API key is not configured or offline, the kiosk automatically falls back to native Web Speech API (`SpeechSynthesis` and `SpeechRecognition`) and on-screen touch inputs, ensuring the kiosk never freezes during Rajyotsava.

## 4. Swappable Mascot Packs & Runtime Gallery
- **Decision:** Mascots are isolated in `mascot-packs/<name>/manifest.json`. The app loads them dynamically.
- **Provided Packs:**
  1. `default`: Chips (चिप्स) - AI Robot mascot with digital screen and Chhattisgarh Seva badge.
  2. `sangwari`: Sangwari (संगवारी) - Traditional cultural Chhattisgarh mascot.
- **Admin Access:** 3-second long-press on top-left corner triggers PIN modal (PIN: `1234`) to switch mascots, test microphone and speaker.

## 5. Privacy & Zero-Persistence
- **Decision:** No cookies, no LocalStorage of applicant details, no external database logging. `session.js` holds values only in memory and wipes them clean upon reset or idle timeout.

## 6. Zero Hardcoded Root Paths & Dynamic Path Resolution
- **Decision:** Eliminate all hardcoded root paths (such as `/services/...`, `/assets/...`, `/mascot-packs/...`) across the frontend templates, engine, mascot manifests, and CSS.
- **Implementation:**
  - Configured Vite with `base: './'`.
  - Updated templates and manifests to use relative paths (`./assets/...`, `./mascot-packs/...`).
  - Implemented dynamic template loading in `formRunner.js` based on `session.currentService` (`./services/${serviceId}/${filename}`).
  - Added normalization in mascot controller and HUD to auto-resolve any leading root slashes to relative paths.
- **Rationale:** Guarantees portable, friction-free deployment whether served from the root domain, a subdirectory/subpath, an offline intranet kiosk gateway, or a packaged local bundle.
