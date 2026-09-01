import { ENDING_A, ENDING_B } from "../data/dialogue";
import type { EndingId } from "../core/ids";
import { el } from "./dom";

export interface EndingStats {
  ending: EndingId;
  elapsedSeconds: number;
  hintsUsed: number;
  logsFound: number;
  logsTotal: number;
}

export function formatTime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/**
 * イントロのタイプライターとクリア画面。
 * 演出はここだけに閉じ込め、ゲームループから切り離す。
 */
export class Cinematic {
  private readonly root: HTMLElement;
  private timer = 0;
  private cleanup: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = el("div", { class: "cinematic", hidden: true });
    parent.append(this.root);
  }

  get isPlaying(): boolean {
    return !this.root.hidden;
  }

  /** 1 文字ずつ表示。クリック / キー / ボタンでスキップできる。 */
  playIntro(lines: string[], onDone: () => void): void {
    const text = el("p", { class: "cinematic__text" });
    const caret = el("span", { class: "cinematic__caret", text: "▌" });
    const skip = el("button", { type: "button", class: "btn btn--quiet", text: "スキップ (Enter)" });

    this.root.replaceChildren(
      el("div", { class: "cinematic__inner" }, [
        el("p", { class: "cinematic__text" }, [text, caret]),
        el("div", { class: "cinematic__skip" }, [skip]),
      ]),
    );
    this.root.hidden = false;

    const full = lines.join("\n");
    let index = 0;
    const finish = () => {
      this.stop();
      onDone();
    };
    const step = () => {
      index += 1;
      text.textContent = full.slice(0, index);
      if (index >= full.length) {
        this.timer = window.setTimeout(finish, 1400);
        return;
      }
      const char = full[index - 1];
      const delay = char === "\n" ? 220 : 34;
      this.timer = window.setTimeout(step, delay);
    };

    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== "Escape" && event.key !== " ") return;
      event.preventDefault();
      finish();
    };
    skip.addEventListener("click", finish);
    window.addEventListener("keydown", onKey);
    this.cleanup = () => {
      window.removeEventListener("keydown", onKey);
    };

    this.timer = window.setTimeout(step, 500);
  }

  /** 白フラッシュ (END A のドア開放時) */
  flash(durationMs: number, onDone: () => void): void {
    this.root.replaceChildren();
    this.root.classList.add("cinematic--flash");
    this.root.hidden = false;
    this.timer = window.setTimeout(() => {
      this.root.classList.remove("cinematic--flash");
      this.stop();
      onDone();
    }, durationMs);
  }

  showEnding(
    stats: EndingStats,
    actions: { onTitle: () => void; onRestart: () => void },
  ): void {
    const copy = stats.ending === "A" ? ENDING_A : ENDING_B;
    const rows: [string, string, boolean][] = [
      ["CLEAR TIME", formatTime(stats.elapsedSeconds), false],
      ["HINTS USED", String(stats.hintsUsed), false],
      ["LOGS FOUND", `${stats.logsFound} / ${stats.logsTotal}`, false],
      ["ENDING", stats.ending === "A" ? "RELEASE" : "TRUTH", true],
    ];

    const title = el("button", { type: "button", class: "btn", text: "タイトルへ" });
    title.addEventListener("click", actions.onTitle);
    const restart = el("button", { type: "button", class: "btn btn--primary", text: "もう一度挑戦する" });
    restart.addEventListener("click", actions.onRestart);

    this.root.replaceChildren(
      el("div", { class: "report", "data-ending": stats.ending }, [
        el("p", { class: "report__label", text: copy.label }),
        el("h2", { class: "report__title", text: copy.title }),
        el("p", { class: "report__lede", text: copy.lede }),
        el(
          "div",
          { class: "report__stats" },
          rows.map(([key, value, accent]) =>
            el("div", { class: "report__row" }, [
              el("span", { class: "report__key", text: key }),
              el("span", { class: `report__val${accent ? " report__val--accent" : ""}`, text: value }),
            ]),
          ),
        ),
        el("div", { class: "report__actions" }, [restart, title]),
      ]),
    );
    this.root.classList.remove("cinematic--flash");
    this.root.hidden = false;
  }

  stop(): void {
    window.clearTimeout(this.timer);
    this.timer = 0;
    this.cleanup?.();
    this.cleanup = null;
    this.root.hidden = true;
    this.root.classList.remove("cinematic--flash");
    this.root.replaceChildren();
  }
}
