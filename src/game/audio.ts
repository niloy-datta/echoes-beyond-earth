/**
 * Generative game audio built with the Web Audio API — no audio files ship.
 * Wind ambience that thickens with the storm, a slow ambient score, UI and
 * footstep effects, EKO chirps panned to EKO's side, and a positional hum on
 * the current objective beacon. Audio starts only after a user gesture.
 */
import type { Cue } from "./core/session.ts";

export type Mood = "calm" | "storm" | "archive" | "finale";

const CHORDS: Record<Mood, number[][]> = {
  calm: [[220, 261.63, 329.63, 493.88], [196, 246.94, 293.66, 440], [174.61, 220, 261.63, 392], [196, 246.94, 329.63, 392]],
  storm: [[146.83, 174.61, 220, 261.63], [138.59, 164.81, 207.65, 246.94], [130.81, 155.56, 196, 233.08]],
  archive: [[261.63, 329.63, 392, 493.88], [220, 277.18, 329.63, 440], [246.94, 311.13, 369.99, 493.88]],
  finale: [[261.63, 329.63, 392, 523.25], [293.66, 369.99, 440, 587.33], [349.23, 440, 523.25, 698.46], [329.63, 415.3, 493.88, 659.25]],
};

function noiseBuffer(ctx: AudioContext, seconds: number, brown: boolean): AudioBuffer {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    if (brown) { last = (last + 0.02 * white) / 1.02; data[i] = last * 3.5; } else data[i] = white;
  }
  return buf;
}

export class GameAudio {
  readonly ctx: AudioContext;
  private master: GainNode;
  private music: GainNode;
  private sfx: GainNode;
  private ambience: GainNode;
  private windGain: GainNode;
  private windFilter: BiquadFilterNode;
  private hissGain: GainNode;
  private white: AudioBuffer;
  private pad: { oscs: OscillatorNode[]; gain: GainNode; filter: BiquadFilterNode } | null = null;
  private mood: Mood = "calm";
  private chordIndex = 0;
  private chordTimer: number | null = null;
  private hum: { osc: OscillatorNode; gain: GainNode; panner: PannerNode } | null = null;
  private stopped = false;

  constructor() {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.master = ctx.createGain(); this.master.gain.value = 0.8; this.master.connect(ctx.destination);
    this.music = ctx.createGain(); this.music.connect(this.master);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.ambience = ctx.createGain(); this.ambience.gain.value = 0.9; this.ambience.connect(this.sfx);
    this.white = noiseBuffer(ctx, 2, false);

    // Wind: looping brown noise through a wandering band-pass.
    const wind = ctx.createBufferSource();
    wind.buffer = noiseBuffer(ctx, 4, true); wind.loop = true;
    this.windFilter = ctx.createBiquadFilter(); this.windFilter.type = "bandpass"; this.windFilter.frequency.value = 380; this.windFilter.Q.value = 0.7;
    this.windGain = ctx.createGain(); this.windGain.gain.value = 0.12;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 160;
    lfo.connect(lfoGain).connect(this.windFilter.frequency);
    wind.connect(this.windFilter).connect(this.windGain).connect(this.ambience);
    // Storm hiss: high-passed white noise.
    const hiss = ctx.createBufferSource(); hiss.buffer = this.white; hiss.loop = true;
    const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2400;
    this.hissGain = ctx.createGain(); this.hissGain.gain.value = 0;
    hiss.connect(hp).connect(this.hissGain).connect(this.ambience);
    wind.start(); lfo.start(); hiss.start();
    this.startPad();
  }

  resume() { void this.ctx.resume(); }

  setVolumes(master: number, music: number, sfx: number) {
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(master, t, 0.1);
    this.music.gain.setTargetAtTime(music * 0.55, t, 0.2);
    this.sfx.gain.setTargetAtTime(sfx, t, 0.1);
  }

  /** 0..1 dust level drives wind loudness, brightness and hiss. */
  setStorm(level: number) {
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.1 + level * 0.55, t, 0.8);
    this.windFilter.frequency.setTargetAtTime(320 + level * 520, t, 1.2);
    this.hissGain.gain.setTargetAtTime(level * level * 0.08, t, 0.8);
  }

  setMood(mood: Mood) {
    if (mood === this.mood) return;
    this.mood = mood; this.chordIndex = 0;
    this.playChord();
  }

  private startPad() {
    const ctx = this.ctx;
    const filter = ctx.createBiquadFilter(); filter.type = "lowpass"; filter.frequency.value = 900; filter.Q.value = 0.4;
    const gain = ctx.createGain(); gain.gain.value = 0.0;
    filter.connect(gain).connect(this.music);
    const oscs: OscillatorNode[] = [];
    for (let i = 0; i < 8; i++) {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "triangle" : "sine";
      o.detune.value = (i % 2 ? 6 : -6);
      const g = ctx.createGain(); g.gain.value = i < 4 ? 0.09 : 0.05;
      o.connect(g).connect(filter);
      o.start();
      oscs.push(o);
    }
    const flfo = ctx.createOscillator(); flfo.frequency.value = 0.03;
    const flfoGain = ctx.createGain(); flfoGain.gain.value = 380;
    flfo.connect(flfoGain).connect(filter.frequency); flfo.start();
    this.pad = { oscs, gain, filter };
    gain.gain.setTargetAtTime(0.5, ctx.currentTime, 3);
    this.playChord();
  }

  private playChord() {
    if (!this.pad || this.stopped) return;
    const chords = CHORDS[this.mood];
    const chord = chords[this.chordIndex % chords.length];
    const t = this.ctx.currentTime;
    this.pad.oscs.forEach((o, i) => o.frequency.setTargetAtTime(chord[i % 4] * (i < 4 ? 0.5 : 1), t, 1.8));
    this.chordIndex++;
    if (this.chordTimer) window.clearTimeout(this.chordTimer);
    this.chordTimer = window.setTimeout(() => this.playChord(), this.mood === "storm" ? 11000 : 14000);
  }

  private envelope(node: AudioNode, gain: number, attack: number, release: number, at = this.ctx.currentTime): GainNode {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(gain, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
    node.connect(g);
    return g;
  }

  private tone(freq: number, type: OscillatorType, gain: number, at: number, dur: number, pan = 0) {
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const env = this.envelope(o, gain, 0.01, dur, at);
    const p = this.ctx.createStereoPanner(); p.pan.value = pan;
    env.connect(p).connect(this.sfx);
    o.start(at); o.stop(at + dur + 0.05);
  }

  private noiseBurst(freq: number, gain: number, dur: number, q = 1) {
    const src = this.ctx.createBufferSource(); src.buffer = this.white;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq; f.Q.value = q;
    src.connect(f);
    const env = this.envelope(f, gain, 0.005, dur);
    env.connect(this.sfx);
    const t = this.ctx.currentTime;
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }

  /** `pan` (-1..1) places EKO's chirps on the side of the screen EKO is on. */
  play(cue: Cue, pan = 0) {
    if (this.stopped) return;
    const t = this.ctx.currentTime;
    switch (cue) {
      case "step": this.noiseBurst(520 + Math.random() * 140, 0.11, 0.09, 2); break;
      case "step-sprint": this.noiseBurst(700 + Math.random() * 160, 0.16, 0.08, 2); break;
      case "jump": this.noiseBurst(900, 0.12, 0.16); break;
      case "land": this.noiseBurst(300, 0.22, 0.22); this.tone(70, "sine", 0.18, t, 0.18); break;
      case "scan": {
        const o = this.ctx.createOscillator(); o.type = "sawtooth";
        o.frequency.setValueAtTime(320, t); o.frequency.exponentialRampToValueAtTime(1500, t + 0.55);
        const f = this.ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1200; f.Q.value = 4;
        o.connect(f); this.envelope(f, 0.07, 0.05, 0.6).connect(this.sfx);
        o.start(t); o.stop(t + 0.7); break;
      }
      case "objective": [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, "triangle", 0.11, t + i * 0.09, 0.5)); break;
      case "evidence": [659.25, 987.77, 1318.5].forEach((f, i) => this.tone(f, "sine", 0.09, t + i * 0.12, 0.9)); break;
      case "achievement": [523.25, 783.99, 1046.5, 1567.98].forEach((f, i) => this.tone(f, "sine", 0.1, t + i * 0.1, 1.2)); break;
      case "level": [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, "triangle", 0.09, t + i * 0.07, 0.8)); break;
      case "eko": [880, 1174.66, 987.77].forEach((f, i) => this.tone(f * (0.95 + Math.random() * 0.1), "sine", 0.06, t + i * 0.06, 0.12, pan)); break;
      case "puzzle": this.tone(440, "triangle", 0.08, t, 0.3); this.tone(660, "triangle", 0.07, t + 0.1, 0.4); break;
      case "wrong": this.tone(220, "square", 0.05, t, 0.25); this.tone(185, "square", 0.05, t + 0.12, 0.3); break;
      case "chapter": [261.63, 392, 523.25].forEach((f) => this.tone(f, "sine", 0.07, t, 2.5)); break;
      case "cutscene": this.tone(196, "sine", 0.06, t, 2); break;
      case "complete": [261.63, 329.63, 392, 523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, "sine", 0.08, t + i * 0.18, 2.4)); break;
    }
  }

  /** Positional hum for the active beacon; listener follows the camera. */
  updateSpatial(listener: { x: number; y: number; z: number; fx: number; fz: number }, beacon: { x: number; y: number; z: number } | null) {
    const ctx = this.ctx;
    const L = ctx.listener;
    if (L.positionX) {
      L.positionX.value = listener.x; L.positionY.value = listener.y; L.positionZ.value = listener.z;
      L.forwardX.value = listener.fx; L.forwardY.value = 0; L.forwardZ.value = listener.fz;
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    } else {
      L.setPosition(listener.x, listener.y, listener.z);
      L.setOrientation(listener.fx, 0, listener.fz, 0, 1, 0);
    }
    if (!beacon) { if (this.hum) this.hum.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.3); return; }
    if (!this.hum) {
      const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = 174.6;
      const trem = ctx.createOscillator(); trem.frequency.value = 3.2;
      const tremGain = ctx.createGain(); tremGain.gain.value = 0.02;
      const gain = ctx.createGain(); gain.gain.value = 0;
      trem.connect(tremGain).connect(gain.gain);
      const panner = ctx.createPanner();
      panner.panningModel = "equalpower"; panner.distanceModel = "inverse"; panner.refDistance = 2; panner.rolloffFactor = 1.4; panner.maxDistance = 60;
      osc.connect(gain).connect(panner).connect(this.sfx);
      osc.start(); trem.start();
      this.hum = { osc, gain, panner };
    }
    const p = this.hum.panner;
    if (p.positionX) { p.positionX.value = beacon.x; p.positionY.value = beacon.y; p.positionZ.value = beacon.z; } else p.setPosition(beacon.x, beacon.y, beacon.z);
    this.hum.gain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.5);
  }

  dispose() {
    this.stopped = true;
    if (this.chordTimer) window.clearTimeout(this.chordTimer);
    void this.ctx.close().catch(() => {});
  }
}
