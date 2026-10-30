import { AmbientMode } from '../types/office';

class CozySoundEngine {
  private ctx: AudioContext | null = null;
  private masterMusicGain: GainNode | null = null;
  private masterSfxGain: GainNode | null = null;
  private noiseNode: AudioNode | null = null;
  private noiseGain: GainNode | null = null;
  private chordInterval: number | null = null;
  private isPlayingMusic = false;
  private currentMode: AmbientMode = 'Cozy Café';
  private musicVolume = 0.45;
  private sfxVolume = 0.5;
  private isMuted = false;
  private sfxEnabled = true;
  private stepIndex = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
        this.masterMusicGain = this.ctx.createGain();
        this.masterSfxGain = this.ctx.createGain();
        this.masterMusicGain.connect(this.ctx.destination);
        this.masterSfxGain.connect(this.ctx.destination);
        this.updateGainLevels();
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  private updateGainLevels() {
    if (!this.ctx || !this.masterMusicGain || !this.masterSfxGain) return;
    const now = this.ctx.currentTime;
    const targetMusic = this.isMuted || !this.isPlayingMusic ? 0.0001 : Math.max(0.0001, this.musicVolume * 0.28);
    const targetSfx = this.isMuted || !this.sfxEnabled ? 0.0001 : Math.max(0.0001, this.sfxVolume * 0.35);
    this.masterMusicGain.gain.setTargetAtTime(targetMusic, now, 0.08);
    this.masterSfxGain.gain.setTargetAtTime(targetSfx, now, 0.05);
  }

  public syncPreferences(opts: {
    musicEnabled: boolean;
    musicVolume: number;
    isMuted: boolean;
    ambientMode: AmbientMode;
    soundEffectsEnabled: boolean;
    sfxVolume: number;
  }) {
    const modeChanged = this.currentMode !== opts.ambientMode;
    this.musicVolume = opts.musicVolume;
    this.isMuted = opts.isMuted;
    this.currentMode = opts.ambientMode;
    this.sfxEnabled = opts.soundEffectsEnabled;
    this.sfxVolume = opts.sfxVolume;

    if (opts.musicEnabled && !this.isPlayingMusic) {
      this.startMusic();
    } else if (!opts.musicEnabled && this.isPlayingMusic) {
      this.stopMusic();
    } else if (this.isPlayingMusic && modeChanged) {
      this.stopMusic();
      this.startMusic();
    } else {
      this.updateGainLevels();
    }
  }

  public startMusic() {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterMusicGain) return;
    this.stopMusic();
    this.isPlayingMusic = true;
    this.updateGainLevels();

    // Create subtle ambient texture (warm vinyl / rain / soft room tone)
    try {
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
        data[i] *= 0.15;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value =
        this.currentMode === 'Rainy Afternoon'
          ? 900
          : this.currentMode === 'Cozy Café'
          ? 520
          : 340;

      const nGain = ctx.createGain();
      nGain.gain.value =
        this.currentMode === 'Rainy Afternoon'
          ? 0.35
          : this.currentMode === 'Cozy Café'
          ? 0.14
          : 0.07;

      noise.connect(filter);
      filter.connect(nGain);
      nGain.connect(this.masterMusicGain);
      noise.start();
      this.noiseNode = noise;
      this.noiseGain = nGain;
    } catch {
      // Ignore if buffer fails
    }

    // Schedule gentle lo-fi chords / notes
    this.playAmbientChordStep();
    const intervalMs =
      this.currentMode === 'Peaceful Night'
        ? 3400
        : this.currentMode === 'Quiet Office'
        ? 3000
        : 2400;

    this.chordInterval = window.setInterval(() => {
      if (this.isPlayingMusic && !this.isMuted && !document.hidden) {
        this.playAmbientChordStep();
      }
    }, intervalMs);
  }

  public stopMusic() {
    this.isPlayingMusic = false;
    if (this.chordInterval !== null) {
      clearInterval(this.chordInterval);
      this.chordInterval = null;
    }
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop();
        this.noiseNode.disconnect();
      } catch {
        // Ignore
      }
      this.noiseNode = null;
    }
    if (this.noiseGain) {
      try {
        this.noiseGain.disconnect();
      } catch {
        // Ignore
      }
      this.noiseGain = null;
    }
    this.updateGainLevels();
  }

  private playAmbientChordStep() {
    const ctx = this.ctx;
    if (!ctx || !this.masterMusicGain || ctx.state !== 'running') return;

    // Warm pentatonic / maj7 chord progressions per ambient mode
    const progressions: Record<AmbientMode, number[][]> = {
      'Cozy Café': [
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 392.0], // Am7
        [174.61, 220.0, 261.63, 329.63], // Fmaj7
        [196.0, 246.94, 293.66, 392.0], // G6
      ],
      'Rainy Afternoon': [
        [293.66, 349.23, 440.0, 523.25], // Dm7
        [196.0, 246.94, 329.63, 392.0], // G13
        [261.63, 329.63, 392.0, 493.88], // Cmaj7
        [220.0, 261.63, 329.63, 440.0], // Am
      ],
      'Quiet Office': [
        [329.63, 392.0, 493.88], // Em
        [261.63, 329.63, 440.0], // C6
        [293.66, 369.99, 440.0], // D
        [196.0, 293.66, 392.0], // G
      ],
      'Peaceful Night': [
        [392.0, 493.88, 587.33, 739.99], // Gmaj7 high celesta
        [329.63, 392.0, 493.88, 659.25], // Em7
        [261.63, 329.63, 392.0, 587.33], // Cadd9
        [293.66, 369.99, 440.0, 659.25], // D6
      ],
    };

    const chords = progressions[this.currentMode] || progressions['Cozy Café'];
    const chord = chords[this.stepIndex % chords.length];
    this.stepIndex++;

    const now = ctx.currentTime;
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = this.currentMode === 'Peaceful Night' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1100;

      gain.gain.setValueAtTime(0.0001, now + idx * 0.12);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.12 + 0.35);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 2.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterMusicGain!);

      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 2.5);
    });
  }

  public playClick() {
    if (!this.sfxEnabled || this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(680, now + 0.045);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.masterSfxGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playSelectCharacter() {
    if (!this.sfxEnabled || this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.05);
      gain.gain.setValueAtTime(0.14, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.12);
      osc.connect(gain);
      gain.connect(this.masterSfxGain!);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.13);
    });
  }

  public playRoomTransition() {
    if (!this.sfxEnabled || this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(510, now + 0.12);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.masterSfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playTaskComplete(notificationSoundsEnabled = true) {
    if (!this.sfxEnabled || !notificationSoundsEnabled || this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.masterSfxGain) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.14, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(this.masterSfxGain!);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.26);
    });
  }
}

export const soundEngine = new CozySoundEngine();
