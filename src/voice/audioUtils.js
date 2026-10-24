/**
 * Audio Utilities: VAD (Voice Activity Detection), MediaStream recorder,
 * volume analysis, and audio level meters.
 */

export class AudioLevelMonitor {
  constructor(stream, onLevel) {
    this.stream = stream;
    this.onLevel = onLevel;
    this.audioContext = null;
    this.analyser = null;
    this.animId = null;
    this.isMonitoring = false;
    this.init();
  }

  init() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      this.isMonitoring = true;
      this.tick();
    } catch (e) {
      console.warn('AudioLevelMonitor init error:', e.message);
    }
  }

  tick() {
    if (!this.isMonitoring || !this.analyser) return;

    const buffer = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(buffer);

    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i];
    }
    const avg = sum / buffer.length;
    const normalized = Math.min(1.0, avg / 128);

    if (this.onLevel) {
      this.onLevel(normalized);
    }

    this.animId = requestAnimationFrame(() => this.tick());
  }

  stop() {
    this.isMonitoring = false;
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
    }
  }
}
