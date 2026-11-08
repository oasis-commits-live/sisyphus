// Serene Acoustic & Ambient Mountain Soundtrack Engine + Studio Foley & Narrator
// Designed specifically as a deeply calming, peaceful, meditative contrast to the high-stakes climb.

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayWet: GainNode | null = null;
  private breezeSource: AudioBufferSourceNode | null = null;
  private breezeGain: GainNode | null = null;

  public muted = false;
  public musicEnabled = true;
  public narrationEnabled = true;
  private musicTimer: number | null = null;
  private chordTimer: number | null = null;
  private arpStepIdx = 0;
  private chordStepIdx = 0;
  private currentBiome = 1;
  private autoUnlockBound = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.bindAutoUnlock();
    }
  }

  private bindAutoUnlock(): void {
    if (this.autoUnlockBound || typeof window === 'undefined') return;
    this.autoUnlockBound = true;
    const unlock = () => {
      if (!this.muted && this.musicEnabled) {
        this.startMusicLoop();
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

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

        // Master output bus with warm compression/limiting feel
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.85;
        this.masterGain.connect(this.ctx.destination);

        // Lush Canyon Echo / Acoustic Reverb Tail (380ms warm filtered delay)
        this.delayNode = this.ctx.createDelay(1.0);
        this.delayNode.delayTime.value = 0.38;

        const echoFilter = this.ctx.createBiquadFilter();
        echoFilter.type = 'lowpass';
        echoFilter.frequency.value = 1450;

        this.delayFeedback = this.ctx.createGain();
        this.delayFeedback.gain.value = 0.36;

        this.delayWet = this.ctx.createGain();
        this.delayWet.gain.value = 0.28;

        this.delayNode.connect(echoFilter);
        echoFilter.connect(this.delayFeedback);
        this.delayFeedback.connect(this.delayNode);
        echoFilter.connect(this.delayWet);
        this.delayWet.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private startGentleBreezeAmbience(ctx: AudioContext): void {
    if (this.breezeSource || !this.masterGain) return;
    try {
      // 4-second seamless pink-noise buffer filtered into a soothing pine breeze / distant stream
      const sampleRate = ctx.sampleRate;
      const length = sampleRate * 4;
      const buffer = ctx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.03;
        b6 = white * 0.115926;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 340;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      gain.gain.value = 0.018;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();

      this.breezeSource = source;
      this.breezeGain = gain;
    } catch {
      // Ignore on unsupported audio contexts
    }
  }

  public setBiome(biome: number): void {
    this.currentBiome = Math.max(1, Math.min(10, biome));
  }

  public startMusicLoop(): void {
    if (typeof window === 'undefined') return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    this.startGentleBreezeAmbience(ctx);

    if (this.musicTimer !== null) return;

    // 1. Serene Lydian / Major-9th Warm Pad Chord Progression (Changes every 4.2 seconds)
    // Evokes peaceful sunrise over Hawk Peak (A Short Hike / Jusant / Celeste calm sanctuary vibe)
    const progressions: number[][] = [
      [174.61, 220.0, 261.63, 329.63, 392.0], // Fmaj9 (F3, A3, C4, E4, G4)
      [130.81, 196.0, 246.94, 293.66, 329.63], // Cmaj9 (C3, G3, B3, D4, E4)
      [146.83, 220.0, 261.63, 329.63, 392.0], // Dm11 (D3, A3, C4, E4, G4)
      [110.0, 164.81, 220.0, 246.94, 329.63], // Amadd9 (A2, E3, A3, B3, E4)
      [116.54, 174.61, 220.0, 261.63, 349.23], // Bbmaj9 (Bb2, F3, A3, C4, F4)
      [130.81, 196.0, 261.63, 329.63, 392.0], // C6/9 (C3, G3, C4, E4, G4)
    ];

    const playWarmPadChord = () => {
      if (this.muted || !this.musicEnabled) return;
      const activeCtx = this.ensureContext();
      if (!activeCtx || !this.masterGain) return;

      const chord = progressions[this.chordStepIdx % progressions.length];
      this.chordStepIdx++;
      const now = activeCtx.currentTime;
      const duration = 4.6;

      chord.forEach((freq, i) => {
        const osc = activeCtx.createOscillator();
        const filter = activeCtx.createBiquadFilter();
        const gain = activeCtx.createGain();

        osc.type = i === 0 ? 'sine' : 'triangle';
        // Subtle warm analog detune
        osc.frequency.setValueAtTime(freq * (1 + (i - 2) * 0.0012), now);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(520 + i * 90, now);

        const peakGain = i === 0 ? 0.022 : 0.012;
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(peakGain, now + 1.6);
        gain.gain.setValueAtTime(peakGain, now + duration - 1.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain!);
        if (this.delayNode && i >= 2) {
          gain.connect(this.delayNode);
        }

        osc.start(now);
        osc.stop(now + duration + 0.05);
      });
    };

    playWarmPadChord();
    this.chordTimer = window.setInterval(playWarmPadChord, 4200);

    // 2. Fingerpicked Acoustic Guitar / Felt Piano & Harp Arpeggio (Every 520ms)
    // Peaceful pentatonic phrases with occasional breathing rests
    const sereneNotes = [
      261.63, // C4
      293.66, // D4
      329.63, // E4
      392.0, // G4
      440.0, // A4
      523.25, // C5
      587.33, // D5
      659.25, // E5
      783.99, // G5
      880.0, // A5
    ];
    // -1 represents a peaceful breathing rest in the melody
    const melodyPattern = [
      0, 2, 3, 5, 4, -1, 3, 2,
      1, 3, 4, 6, 5, -1, 4, 3,
      2, 4, 5, 7, 8, -1, 7, 5,
      4, 3, 2, 0, 2, -1, -1, 1,
    ];

    this.musicTimer = window.setInterval(() => {
      if (this.muted || !this.musicEnabled) return;
      const activeCtx = this.ensureContext();
      if (!activeCtx || !this.masterGain) return;

      const noteIdx = melodyPattern[this.arpStepIdx % melodyPattern.length];
      this.arpStepIdx++;
      if (noteIdx < 0) return;

      const baseFreq = sereneNotes[noteIdx % sereneNotes.length];
      const now = activeCtx.currentTime;

      // Felt Piano / Acoustic Harp Plucked Tone (Fundamental Sine + Soft Harmonic Triangle)
      const oscMain = activeCtx.createOscillator();
      const oscHarm = activeCtx.createOscillator();
      const filter = activeCtx.createBiquadFilter();
      const noteGain = activeCtx.createGain();

      oscMain.type = 'sine';
      oscMain.frequency.setValueAtTime(baseFreq, now);

      oscHarm.type = 'triangle';
      oscHarm.frequency.setValueAtTime(baseFreq * 2.0, now);

      const harmGain = activeCtx.createGain();
      harmGain.gain.setValueAtTime(0.18, now);
      harmGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(480, now + 1.4);

      noteGain.gain.setValueAtTime(0.0001, now);
      noteGain.gain.linearRampToValueAtTime(0.032, now + 0.025);
      noteGain.gain.exponentialRampToValueAtTime(0.0004, now + 1.55);

      oscMain.connect(filter);
      oscHarm.connect(harmGain);
      harmGain.connect(filter);
      filter.connect(noteGain);

      noteGain.connect(this.masterGain);
      if (this.delayNode) {
        noteGain.connect(this.delayNode);
      }

      oscMain.start(now);
      oscHarm.start(now);
      oscMain.stop(now + 1.6);
      oscHarm.stop(now + 1.6);
    }, 520);
  }

  public stopMusicLoop(): void {
    if (this.musicTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (this.chordTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.chordTimer);
      this.chordTimer = null;
    }
    if (this.breezeGain && this.ctx) {
      this.breezeGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
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
        utter.pitch = 0.88;
        utter.volume = 0.8;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      // Ignore speech synthesis errors on headless browsers
    }
  }

  public playChargeTick(chargeRatio: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const baseFreq = 240 + chargeRatio * 380;
    osc.frequency.setValueAtTime(baseFreq, now);
    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playJumpLaunch(chargeRatio: number): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitchVariance = 0.96 + Math.random() * 0.08;
    const startFreq = (220 + chargeRatio * 140) * pitchVariance;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 1.75, now + 0.12);

    gain.gain.setValueAtTime(0.085, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playStepLand(isAscent: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const base = isAscent ? 185 : 120;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.1);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);

    // If ascending to a new stage, add a soft peaceful wind-chime harmonic
    if (isAscent) {
      const chime = ctx.createOscillator();
      const cGain = ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(523.25, now + 0.03);
      chime.frequency.exponentialRampToValueAtTime(659.25, now + 0.28);
      cGain.gain.setValueAtTime(0.022, now + 0.03);
      cGain.gain.exponentialRampToValueAtTime(0.0005, now + 0.45);
      chime.connect(cGain);
      cGain.connect(this.masterGain);
      if (this.delayNode) cGain.connect(this.delayNode);
      chime.start(now + 0.03);
      chime.stop(now + 0.48);
    }
  }

  public playLedgeBonk(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.08);
    gain.gain.setValueAtTime(0.075, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playCarHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    [330, 440].forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now);
      gain.gain.setValueAtTime(0.045, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(now);
      osc.stop(now + 0.24);
    });
  }

  public playGlitchZap(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.setValueAtTime(783.99, now + 0.06);
    osc.frequency.setValueAtTime(1046.5, now + 0.12);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.35);
    osc.connect(gain);
    gain.connect(this.masterGain);
    if (this.delayNode) gain.connect(this.delayNode);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playHazardHit(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.22);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playCatastrophicFall(stepsLost: number, quote?: string): void {
    if (quote) {
      this.speakNarratorQuote(quote);
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    // Ironic, deeply peaceful Tibetan singing-bowl / acoustic harp cascade when falling!
    const freqs = [392.0, 329.63, 261.63, 196.0];
    const duration = Math.min(1.8, 0.75 + stepsLost * 0.02);

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + idx * 0.11);
      osc.frequency.exponentialRampToValueAtTime(f * 0.98, now + duration);

      gain.gain.setValueAtTime(0.045 / (idx + 1), now + idx * 0.11);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      if (this.delayNode) gain.connect(this.delayNode);
      osc.start(now + idx * 0.11);
      osc.stop(now + duration + 0.05);
    });
  }

  public playPhilosophicalEndingHollowChord(quote?: string): void {
    if (quote) {
      this.speakNarratorQuote(quote);
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain) return;

    const now = ctx.currentTime;
    const freqs = [130.81, 196.0, 261.63, 329.63, 392.0, 523.25];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.09);
      gain.gain.setValueAtTime(0.048, now + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.0004, now + 2.8);

      osc.connect(gain);
      gain.connect(this.masterGain!);
      if (this.delayNode) gain.connect(this.delayNode);
      osc.start(now + i * 0.09);
      osc.stop(now + 2.9);
    });
  }
}

export const soundEngine = new SoundEngine();
