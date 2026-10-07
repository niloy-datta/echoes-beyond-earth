"use client";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { useSettings } from "./settings";

/**
 * Generative ambience synthesised with the Web Audio API — no audio files ship with the site.
 * A low, slowly breathing drone, faint channel hiss and an occasional quiet signal tone.
 * Audio only ever starts from the visitor's own click on the sound control.
 */
class Ambience {
  private ctx: AudioContext;
  private master: GainNode;
  private nodes: AudioScheduledSourceNode[] = [];
  private timer: number | null = null;
  private stopTimer: number | null = null;

  constructor() {
    const AC =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);
  }

  start() {
    const { ctx } = this;
    if (this.stopTimer) window.clearTimeout(this.stopTimer); // re-enabled during fade-out: don't suspend
    this.stopTimer = null;
    void ctx.resume();
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.6;
    filter.connect(this.master);

    // Low partials (A1, E2, A2) breathing on slow independent LFOs.
    const partials: [number, number][] = [
      [55, 0.18],
      [82.41, 0.09],
      [110.3, 0.035],
    ];
    for (const [freq, gain] of partials) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.random() * 0.05;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = gain * 0.6;
      lfo.connect(lfoGain).connect(g.gain);
      osc.connect(g).connect(filter);
      osc.start();
      lfo.start();
      this.nodes.push(osc, lfo);
    }

    // Brownian noise — the hiss of an open channel.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < samples.length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      samples[i] = last * 3.2;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    noise.connect(ng).connect(filter);
    noise.start();
    this.nodes.push(noise);

    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0.55, ctx.currentTime, 1.6);
    this.timer = window.setInterval(() => this.ping(0.25), 14000);
  }

  ping(level = 0.5, freq = 1318.5) {
    const { ctx } = this;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.06 * level, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.34;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.38;
    osc.connect(g);
    g.connect(this.master);
    g.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(this.master);
    osc.start(t);
    osc.stop(t + 2.6);
  }

  stop() {
    const { ctx } = this;
    if (this.timer) window.clearInterval(this.timer);
    this.timer = null;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    // Schedule the old voices to stop after the fade, so a quick re-enable never doubles them.
    for (const n of this.nodes) {
      try {
        n.stop(ctx.currentTime + 1.8);
      } catch {
        /* already stopped */
      }
    }
    this.nodes = [];
    this.stopTimer = window.setTimeout(() => void ctx.suspend(), 2000);
  }
}

interface SoundCtx {
  /** A short signal tone; does nothing while sound is off. */
  ping: (level?: number, freq?: number) => void;
}

const Ctx = createContext<SoundCtx>({ ping: () => {} });

export function SoundProvider({ children }: { children: ReactNode }) {
  const { sound } = useSettings();
  const engine = useRef<Ambience | null>(null);

  useEffect(() => {
    if (!sound) {
      engine.current?.stop();
      return;
    }
    try {
      engine.current ??= new Ambience();
      engine.current.start();
    } catch {
      /* Web Audio unavailable — the experience continues silently */
    }
  }, [sound]);

  const ping = useCallback(
    (level?: number, freq?: number) => {
      if (sound) engine.current?.ping(level, freq);
    },
    [sound],
  );

  return <Ctx.Provider value={{ ping }}>{children}</Ctx.Provider>;
}

export const useSound = () => useContext(Ctx);
