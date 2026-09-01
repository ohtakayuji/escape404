/**
 * 外部依存を増やさないための最小トゥイーン。
 * GameLoop から update(dt) を呼ぶだけで動く。
 */
export type EaseFn = (t: number) => number;

export const easeOutCubic: EaseFn = (t) => 1 - (1 - t) ** 3;
export const easeInOutQuad: EaseFn = (t) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

interface TweenSpec {
  duration: number;
  ease?: EaseFn;
  onUpdate: (value: number) => void;
  onComplete?: () => void;
}

interface ActiveTween extends TweenSpec {
  elapsed: number;
}

export class Animator {
  private tweens: ActiveTween[] = [];
  private timers: { remaining: number; fn: () => void }[] = [];

  tween(spec: TweenSpec): void {
    this.tweens.push({ ...spec, elapsed: 0 });
  }

  /** setTimeout の代替。ポーズ中に進まないので演出のズレが起きない。 */
  after(seconds: number, fn: () => void): void {
    this.timers.push({ remaining: seconds, fn });
  }

  update(dt: number): void {
    if (this.tweens.length > 0) {
      const finished: ActiveTween[] = [];
      for (const tween of this.tweens) {
        tween.elapsed += dt;
        const raw = Math.min(1, tween.elapsed / tween.duration);
        tween.onUpdate((tween.ease ?? easeOutCubic)(raw));
        if (raw >= 1) finished.push(tween);
      }
      if (finished.length > 0) {
        this.tweens = this.tweens.filter((t) => !finished.includes(t));
        for (const tween of finished) tween.onComplete?.();
      }
    }

    if (this.timers.length > 0) {
      const due = this.timers.filter((timer) => (timer.remaining -= dt) <= 0);
      if (due.length > 0) {
        this.timers = this.timers.filter((timer) => !due.includes(timer));
        for (const timer of due) timer.fn();
      }
    }
  }

  clear(): void {
    this.tweens = [];
    this.timers = [];
  }
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
