import type { Settings } from "../core/Settings";
import type { SfxName } from "../interaction/Interactable";

interface SfxSpec {
  /** 基本波形 */
  type: OscillatorType | "noise";
  /** 開始周波数 (Hz) */
  frequency: number;
  /** 終了周波数。省略時は変化なし */
  toFrequency?: number;
  duration: number;
  gain: number;
  /** ノイズ用のバンドパス中心周波数 */
  filter?: number;
  /** 続けて鳴らす和音 (周波数比) */
  harmonics?: number[];
}

/**
 * 音は外部ファイルを持たず Web Audio で合成する。
 * アセット待ちがなく、404 も起きない。
 */
const SFX: Record<SfxName, SfxSpec> = {
  footstep: { type: "noise", frequency: 0, duration: 0.11, gain: 0.16, filter: 260 },
  interact: { type: "triangle", frequency: 520, toFrequency: 640, duration: 0.09, gain: 0.14 },
  denied: { type: "square", frequency: 180, toFrequency: 120, duration: 0.16, gain: 0.12 },
  pickup: { type: "triangle", frequency: 660, toFrequency: 990, duration: 0.16, gain: 0.16, harmonics: [1, 1.5] },
  keypad: { type: "square", frequency: 900, duration: 0.045, gain: 0.09 },
  correct: { type: "sine", frequency: 523, toFrequency: 784, duration: 0.5, gain: 0.18, harmonics: [1, 1.26, 1.5] },
  incorrect: { type: "sawtooth", frequency: 220, toFrequency: 110, duration: 0.34, gain: 0.14 },
  drawer: { type: "noise", frequency: 0, duration: 0.42, gain: 0.2, filter: 420 },
  safe: { type: "noise", frequency: 0, duration: 0.6, gain: 0.24, filter: 200 },
  door: { type: "noise", frequency: 0, duration: 1.0, gain: 0.22, filter: 160 },
  wall: { type: "noise", frequency: 0, duration: 1.4, gain: 0.28, filter: 120 },
  terminal: { type: "sine", frequency: 320, toFrequency: 480, duration: 0.22, gain: 0.12, harmonics: [1, 2] },
  flashlight: { type: "square", frequency: 1400, duration: 0.035, gain: 0.07 },
  ending: { type: "sine", frequency: 196, toFrequency: 392, duration: 2.6, gain: 0.2, harmonics: [1, 1.5, 2] },
};

export class AudioManager {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private bgmBus: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private ambientNodes: AudioNode[] = [];
  private settings: Settings;

  constructor(settings: Settings) {
    this.settings = settings;
  }

  /** ブラウザの制約でユーザー操作の中から呼ぶ必要がある。 */
  unlock(): void {
    if (this.context) {
      if (this.context.state === "suspended") void this.context.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.context = new Ctor();
    } catch {
      return;
    }
    this.master = this.context.createGain();
    this.sfxBus = this.context.createGain();
    this.bgmBus = this.context.createGain();
    this.sfxBus.connect(this.master);
    this.bgmBus.connect(this.master);
    this.master.connect(this.context.destination);
    this.applySettings(this.settings);
  }

  applySettings(settings: Settings): void {
    this.settings = settings;
    if (!this.master || !this.sfxBus || !this.bgmBus) return;
    const master = settings.muted ? 0 : settings.masterVolume;
    this.master.gain.value = master;
    this.sfxBus.gain.value = settings.sfxVolume;
    this.bgmBus.gain.value = settings.bgmVolume;
  }

  /** 空調のような低いアンビエントを鳴らし続ける。 */
  startAmbient(): void {
    if (!this.context || !this.bgmBus || this.ambientNodes.length > 0) return;
    const ctx = this.context;

    const hum = ctx.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 58;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.09;
    hum.connect(humGain).connect(this.bgmBus);
    hum.start();

    const server = ctx.createOscillator();
    server.type = "triangle";
    server.frequency.value = 121;
    const serverGain = ctx.createGain();
    serverGain.gain.value = 0.025;
    server.connect(serverGain).connect(this.bgmBus);
    server.start();

    const air = ctx.createBufferSource();
    air.buffer = this.getNoiseBuffer();
    air.loop = true;
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = "lowpass";
    airFilter.frequency.value = 380;
    const airGain = ctx.createGain();
    airGain.gain.value = 0.05;
    air.connect(airFilter).connect(airGain).connect(this.bgmBus);
    air.start();

    this.ambientNodes = [hum, server, air, humGain, serverGain, airFilter, airGain];
  }

  stopAmbient(): void {
    for (const node of this.ambientNodes) {
      if ("stop" in node && typeof (node as OscillatorNode).stop === "function") {
        try {
          (node as OscillatorNode).stop();
        } catch {
          /* すでに停止していることがある */
        }
      }
      node.disconnect();
    }
    this.ambientNodes = [];
  }

  play(name: SfxName): void {
    const ctx = this.context;
    const bus = this.sfxBus;
    if (!ctx || !bus) return;
    const spec = SFX[name];
    const now = ctx.currentTime;

    if (spec.type === "noise") {
      const source = ctx.createBufferSource();
      source.buffer = this.getNoiseBuffer();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = spec.filter ?? 300;
      filter.Q.value = 0.8;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(spec.gain, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
      source.connect(filter).connect(gain).connect(bus);
      source.start(now);
      source.stop(now + spec.duration);
      return;
    }

    for (const ratio of spec.harmonics ?? [1]) {
      const osc = ctx.createOscillator();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.frequency * ratio, now);
      if (spec.toFrequency !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, spec.toFrequency * ratio),
          now + spec.duration,
        );
      }
      const gain = ctx.createGain();
      const peak = spec.gain / (spec.harmonics?.length ?? 1);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + spec.duration);
      osc.connect(gain).connect(bus);
      osc.start(now);
      osc.stop(now + spec.duration + 0.02);
    }
  }

  private getNoiseBuffer(): AudioBuffer {
    if (this.noiseBuffer || !this.context) {
      return this.noiseBuffer ?? this.context!.createBuffer(1, 1, 44100);
    }
    const ctx = this.context;
    const length = Math.floor(ctx.sampleRate * 2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }

  dispose(): void {
    this.stopAmbient();
    void this.context?.close();
    this.context = null;
    this.master = null;
    this.sfxBus = null;
    this.bgmBus = null;
    this.noiseBuffer = null;
  }
}
