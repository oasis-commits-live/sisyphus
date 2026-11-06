// Procedural Web Audio API Music, Arcade Sound Effects & Spoken Philosophical Narrator

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted = false;
  public musicEnabled = true;
  public narrationEnabled = true;
  private musicTimer: number | null = null;
  private musicStepIdx = 0;
  private currentBiome = 1;

  private ensureContext(): AudioContext | null {
    if (this.muted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setBiome(biome: number): void {
    this.currentBiome = Math.max(1, Math.min(10, biome));
  }

  public startMusicLoop(): void {
    if (typeof window === 'undefined' || this.musicTimer !== null) return;
    // Play a catchy, slightly mischievous Crossy-Sisyphean marimba/synth bass & arpeggio every 210ms
    const scaleNotes = [
      261.63, // C4
      293.66, // D4
      311.13, // Eb4
      349.23, // F4
      392.0,  // G4
      415.3,  // Ab4
      466.16, // Bb4
      523.25, // C5
    ];
    const pattern = [0, 4, 2, 4, 3, 5, 4, 2, 0, 3, 5, 7, 6, 4, 3, 1];

    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.musicEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx) return;

      const idx = pattern[this.musicStepIdx % pattern.length];
      const biomeShift = 1 + (this.currentBiome - 1) * 0.035;
      const freq = scaleNotes[idx] * biomeShift;
      const now = ctx.currentTime;

      // Plucky voxel marimba lead
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = this.currentBiome === 7 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.018, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

      // Sub-bass pulse on every 4th beat
      if (this.musicStepIdx % 4 === 0) {
        const bass = ctx.createOscillator();
        const bGain = ctx.createGain();
        bass.type = 'sine';
        bass.frequency.setValueAtTime(freq * 0.5, now);
        bGain.gain.setValueAtTime(0.028, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        bass.connect(bGain);
        bGain.connect(ctx.destination);
        bass.start(now);
        bass.stop(now + 0.19);
      }

      this.musicStepIdx++;
    }, 220);
  }

  public stopMusicLoop(): void {
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  public speakNarratorQuote(quote: string): void {
    if (this.muted || !this.narrationEnabled || typeof window === 'undefined') {
      return;
    }
    try {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(quote);
        utter.rate = 0.92;
        utter.pitch = 0.82;
        utter.volume = 0.85;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // Ignore speech synthesis errors on headless browsers
    }
  }

  public playChargeTick(chargeRatio: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const baseFreq = 180 + chargeRatio * 460;
    osc.frequency.setValueAtTime(baseFreq, now);
    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playJumpLaunch(chargeRatio: number): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitchVariance = 0.94 + Math.random() * 0.12;
    const startFreq = (210 + chargeRatio * 150) * pitchVariance;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.9, now + 0.11);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playStepLand(isAscent: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const variance = 0.93 + Math.random() * 0.14;

    osc.type = isAscent ? 'triangle' : 'sine';
    const base = isAscent ? 160 * variance : 105 * variance;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.09);

    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playLedgeBonk(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(65, now + 0.08);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCarHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    [340, 425].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.055, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.19);
    });
  }

  public playGlitchZap(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.setValueAtTime(210, now + 0.04);
    osc.frequency.setValueAtTime(840, now + 0.08);
    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playHazardHit(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.playCarHorn();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playCatastrophicFall(stepsLost: number, quote?: string): void {
    if (quote) {
      this.speakNarratorQuote(quote);
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    // Descending comical-yet-tragic slide + somber gong
    const freqs = [293.66, 220, 146.83];
    const duration = Math.min(1.4, 0.45 + stepsLost * 0.015);

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.08);
      osc.frequency.exponentialRampToValueAtTime(f * 0.72, now + duration);

      gain.gain.setValueAtTime(0.08 / (idx + 1), now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + duration + 0.02);
    });
  }

  public playPhilosophicalEndingHollowChord(quote?: string): void {
    this.stopMusicLoop();
    if (quote) {
      this.speakNarratorQuote(quote);
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const freqs = [130.81, 196.0, 261.63, 311.13];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.07, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + 2.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + 2.25);
    });
  }
}

export const soundEngine = new SoundEngine();
