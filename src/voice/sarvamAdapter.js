/**
 * Sarvam AI Voice Adapter
 * Communicates with the local backend proxy (/api/tts and /api/stt).
 * Uses DOM <audio id="kioskAudioPlayer"> as primary with guaranteed safety timeouts
 * and proactive user-activation unlocking to prevent audio stalls.
 */
import { AudioLevelMonitor } from './audioUtils.js';

let sharedAudioContext = null;

export function getAudioContext() {
  if (!sharedAudioContext) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      sharedAudioContext = new AudioCtx();
    }
  }
  if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
}

export function unlockKioskAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const banner = document.getElementById('audioUnlockBanner');
  if (banner) banner.remove();
}

// Global user-gesture audio unlocker
if (typeof window !== 'undefined') {
  ['click', 'touchstart', 'mousedown', 'keydown', 'pointerdown'].forEach(evt => {
    window.addEventListener(evt, () => unlockKioskAudio(), { passive: true });
  });
}

export class SarvamAdapter {
  constructor() {
    this.currentAudio = null;
    this.currentSource = null;
    this.mediaRecorder = null;
    this.activeStream = null;
    this.audioMonitor = null;
  }

  showAudioUnlockBanner() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('audioUnlockBanner')) return;

    const banner = document.createElement('div');
    banner.id = 'audioUnlockBanner';
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #1e3a8a, #2563eb);
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 9999px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      z-index: 99999;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: bounce 1.5s infinite;
    `;
    banner.innerHTML = `
      <span>🔊</span>
      <span>आवाज़ सुनने के लिए यहाँ क्लिक करें (Click to Enable Audio)</span>
    `;
    banner.addEventListener('click', (e) => {
      e.stopPropagation();
      unlockKioskAudio();
      banner.remove();
    });
    document.body.appendChild(banner);
  }

  async speak(text, options = {}) {
    if (!text) return;

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        language_code: options.lang || 'hi-IN',
        speaker: options.speaker || 'shreya',
        pace: options.pace || 1.0
      })
    });

    if (!response.ok) {
      throw new Error(`Sarvam TTS error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.audios || !data.audios[0]) {
      throw new Error('No audio returned from Sarvam TTS');
    }

    const audioBase64 = data.audios[0];

    // Get or create persistent DOM audio element
    let player = typeof document !== 'undefined' ? document.getElementById('kioskAudioPlayer') : null;
    if (!player && typeof document !== 'undefined') {
      player = document.createElement('audio');
      player.id = 'kioskAudioPlayer';
      player.preload = 'auto';
      player.playsInline = true;
      document.body.appendChild(player);
    }

    if (player) {
      return new Promise(async (resolve) => {
        let settled = false;
        let safetyTimer = null;

        const finish = () => {
          if (!settled) {
            settled = true;
            if (safetyTimer) clearTimeout(safetyTimer);
            if (player) {
              player.onended = null;
              player.onerror = null;
            }
            this.currentAudio = null;
            resolve();
          }
        };

        const words = text.split(/\s+/).length;
        const fallbackMs = Math.max(3000, words * 450 + 1500);

        player.onended = finish;
        player.onerror = (e) => {
          console.warn('HTML5 Audio error event:', e);
          finish();
        };

        player.onloadedmetadata = () => {
          const durMs = (player.duration && !isNaN(player.duration) && player.duration > 0)
            ? Math.ceil(player.duration * 1000) + 400
            : fallbackMs;
          if (safetyTimer) clearTimeout(safetyTimer);
          safetyTimer = setTimeout(finish, durMs);
        };

        // Fallback safety timer guaranteed to release the await lock
        safetyTimer = setTimeout(finish, fallbackMs);

        // Mount base64 directly to audio tag
        player.src = `data:audio/wav;base64,${audioBase64}`;
        player.volume = 1.0;
        this.currentAudio = player;

        try {
          await player.play();
        } catch (err) {
          console.warn('HTML5 Audio play() prevented:', err.message);
          this.showAudioUnlockBanner();
          finish();
        }
      });
    }

    // Fallback: Web Audio API with safety timeout
    const binaryStr = atob(audioBase64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    try {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        const audioBuffer = await ctx.decodeAudioData(bytes.buffer.slice(0));

        return new Promise((resolve) => {
          let settled = false;
          const finish = () => {
            if (!settled) {
              settled = true;
              this.currentSource = null;
              resolve();
            }
          };

          const durationMs = Math.ceil(audioBuffer.duration * 1000) + 400;
          const safetyTimer = setTimeout(finish, durationMs);

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          this.currentSource = source;

          source.onended = () => {
            clearTimeout(safetyTimer);
            finish();
          };

          source.start(0);
        });
      }
    } catch (err) {
      console.warn('Web Audio fallback failed:', err.message);
    }
  }

  async listen(options = {}) {
    const maxMs = options.maxMs || 8000;
    const silenceMs = options.silenceMs || 1400;

    let stream;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }
      stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Microphone permission timeout or denied')), 4000))
      ]);
      this.activeStream = stream;
    } catch (err) {
      console.warn('Microphone access unavailable:', err.message);
      await new Promise(r => setTimeout(r, 2000));
      return '';
    }

    return new Promise((resolve, reject) => {
      const chunks = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.mediaRecorder = mediaRecorder;

      let silenceTimer = null;
      let maxTimer = null;
      let hasHeardSpeech = false;

      // Monitor audio volume
      this.audioMonitor = new AudioLevelMonitor(stream, (level) => {
        if (options.onLevel) options.onLevel(level);

        // VAD: Speech threshold
        if (level > 0.08) {
          hasHeardSpeech = true;
          if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
          }
        } else if (hasHeardSpeech && !silenceTimer) {
          silenceTimer = setTimeout(() => {
            if (mediaRecorder.state === 'recording') {
              mediaRecorder.stop();
            }
          }, silenceMs);
        }
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        clearTimeout(maxTimer);
        if (silenceTimer) clearTimeout(silenceTimer);
        this.cleanup();

        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        try {
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64Data = reader.result.split(',')[1];
            try {
              const res = await fetch('/api/stt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  audioBase64: base64Data,
                  mimeType: 'audio/webm',
                  language_code: options.lang || 'hi-IN'
                })
              });

              if (!res.ok) {
                return reject(new Error(`STT failed ${res.status}`));
              }
              const data = await res.json();
              resolve(data.transcript || '');
            } catch (err) {
              reject(err);
            }
          };
        } catch (err) {
          reject(err);
        }
      };

      maxTimer = setTimeout(() => {
        if (mediaRecorder.state === 'recording') mediaRecorder.stop();
      }, maxMs);

      mediaRecorder.start(200);
    });
  }

  cleanup() {
    if (this.audioMonitor) {
      this.audioMonitor.stop();
      this.audioMonitor = null;
    }
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(t => t.stop());
      this.activeStream = null;
    }
    this.mediaRecorder = null;
  }

  stop() {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch (_) {}
      this.currentSource = null;
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
    }
    this.cleanup();
  }
}
