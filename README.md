# AI Seva Setu – Future Experience Zone (AI सेवा सेतु)
### Voice Mascot Form-Filling Kiosk for Chhattisgarh Rajyotsava

An interactive voice-enabled AI Mascot touch-screen kiosk prototype designed for the Chhattisgarh Rajyotsava. The AI mascot greets visitors in Hindi, collects basic details, presents Seva Setu services, and automatically fills the authentic Seva Setu form with character-by-character animations, cascading selectors, document attachments, preview, payment simulation, and official acknowledgement receipt.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment (Optional for Sarvam AI)
Create `.env` file in the project root or `server/`:
```env
SARVAM_API_KEY=your_sarvam_api_key_here
PORT=3001
```
*(If no API key is set, the kiosk automatically falls back to native Chrome Web Speech API and touch input without freezing!)*

### 3. Start Backend Proxy & Frontend Vite Server
In one terminal:
```bash
npm run server
```

In another terminal (or run dev):
```bash
npm run dev
```
Open **`http://localhost:5173`** in Google Chrome.

---

## 🖥️ Kiosk Fullscreen Setup (1920×1080 Landscape)

To launch Google Chrome directly in Kiosk mode for touch displays:
```bash
chrome.exe --kiosk --incognito --autoplay-policy=no-user-gesture-required --disable-features=Translate "http://localhost:5173"
```

---

## 🎨 Admin Mascot Gallery & Hardware Settings
- **Trigger:** Long-press (press and hold for 3 seconds) on the **top-left corner** of the screen.
- **PIN:** `1234`
- **Features:**
  - Preview & swap between mascots (`Chips` / `Sangwari`).
  - Test states: Idle, Speaking, Listening, Happy.
  - Speaker audio test.
  - Microphone test.
  - Toggle Voice HUD during form filling.

---

## 🛠️ Developer Diagnostics Panel
Add `?dev=1` to the URL:
```
http://localhost:5173?dev=1
```
Allows jumping directly to any of the 8 steps or resetting the session instantly.

---

## 📝 8-Step Reference Flow (Matches `income-ssimage/`)

1. **Step 1 (आवेदक की बुनियादी जानकारी):** Applicant details on left gray panel + cascading office selector on royal blue card (जिला → कार्यालय प्रकार → उप जिला राजस्व तालुक / तहसील → राजस्व गांव).
2. **Step 2 (हितग्राही, पता एवं आय का विवरण):** Long form with 3 rounded blue section pills, search widgets (`🔍`), auto-disabled fields, and Public Service Guarantee consent.
3. **Step 3 (अनुलग्नक का विवरण):** 8-row documents attachment table with simulated dummy file uploads (`dummy-doc.pdf`).
4. **Step 4 (पूर्वावलोकन- आय प्रमाण पत्र):** 5-section review table, official declaration, and required confirmation checkbox.
5. **Step 5 (शुल्क विवरण):** Official fee table (Total ₹30.00) and payment method selector.
6. **Step 6 (भुगतान):** Modal popup with QR code, ₹30.00 amount, "Scan to pay", followed by animated "भुगतान सफल ✓".
7. **Step 7 (संतुष्टि सूचकांक):** User feedback popup with 5 interactive rating stars.
8. **Step 8 (पावती - लोक सेवा गारंटी):** Official receipt with reference number, dates, Seva Setu center details, and print trigger.
9. **Thank You & Auto Reset:** Mascot returns with celebration state, thanks the user, and wipes session after 8 seconds.

---

## 🎭 Demo Script (Happy Path)

1. **Attract Screen:** Tap "छूने के लिए स्क्रीन को स्पर्श करें".
2. **Greeting:** Listen to mascot greeting: *"नमस्कार! आपका स्वागत है, एआई बेस्ड सेवा सेतु फ्यूचर एक्सपीरियंस ज़ोन में।"*
3. **Profile Details:**
   - Speak name: *"कमल कुमार"* → Confirm *"हाँ"*
   - Speak district: *"बालोद"* → Confirm *"हाँ"*
   - Speak mobile: *"9407901033"* → Confirm *"हाँ"*
4. **Service Selection:** Speak *"आय प्रमाण पत्र"* (or tap the card).
5. **Form Automation:** Watch the mascot voice guide and character-by-character typing through Steps 1 to 8.
6. **Preview & Submit:** Say *"हाँ"* to confirm declaration.
7. **Payment & Receipt:** View payment success, submit feedback, view printable acknowledgement receipt.
