import type { ItemDef } from "../inventory/items";
import type { Line } from "../data/dialogue";
import { el } from "./dom";

export type CrosshairState = "idle" | "interact" | "use";

/**
 * 常時表示の HUD。表示は最小限にし、必要な時だけ濃くする。
 * クロスヘアは形 (+ / ○ / ◇) で状態を示し、色だけに依存しない。
 */
export class Hud {
  readonly root: HTMLElement;
  private readonly crosshair: HTMLElement;
  private readonly prompt: HTMLElement;
  private readonly promptLabel: HTMLElement;
  private readonly promptKeys: HTMLElement;
  private readonly selected: HTMLElement;
  private readonly telemetry: HTMLElement;
  private readonly pips: HTMLElement[] = [];
  private readonly subtitle: HTMLElement;
  private readonly subtitleLine: HTMLElement;
  private readonly subtitleTranslation: HTMLElement;
  private readonly toasts: HTMLElement;
  private subtitleTimer = 0;

  constructor(parent: HTMLElement, puzzleCount: number) {
    this.crosshair = el("div", { class: "crosshair", "data-state": "idle", text: "+" });
    this.promptLabel = el("span", { class: "focus-prompt__label" });
    this.promptKeys = el("span", { class: "focus-prompt__keys" });
    this.prompt = el("div", { class: "focus-prompt", "data-visible": "false" }, [
      this.promptLabel,
      this.promptKeys,
    ]);

    this.selected = el("div", { class: "hud__selected", "data-empty": "true" });

    for (let i = 0; i < puzzleCount; i += 1) {
      this.pips.push(el("span", { class: "telemetry__pip", "data-solved": "false" }));
    }
    this.telemetry = el("div", { class: "telemetry" }, [
      el("span", { text: "SUBJECT 17" }),
      ...this.pips,
      el("span", { class: "telemetry__count", text: `0/${puzzleCount}` }),
    ]);

    this.subtitleLine = el("span", { class: "subtitle__line" });
    this.subtitleTranslation = el("span", { class: "subtitle__translation" });
    this.subtitle = el("div", { class: "subtitle", "data-visible": "false", role: "status" }, [
      el("span", { class: "subtitle__speaker", text: "EVE" }),
      this.subtitleLine,
      this.subtitleTranslation,
    ]);

    this.toasts = el("div", { class: "toast-stack", role: "status", "aria-live": "polite" });

    this.root = el("div", { class: "hud", hidden: true }, [
      this.telemetry,
      this.crosshair,
      this.prompt,
      this.toasts,
      this.subtitle,
      el("div", { class: "hud__corner hud__corner--left" }, [this.selected]),
      el("div", { class: "hud__corner hud__corner--right" }, [
        el("div", { class: "hud__meta", text: "E 調べる ／ F 使う ／ L ライト" }),
        el("div", { class: "hud__meta", text: "TAB 持ち物 ／ H ヒント ／ ESC 中断" }),
      ]),
    ]);
    parent.append(this.root);
    this.setSelectedItem(null);
  }

  setVisible(visible: boolean): void {
    this.root.hidden = !visible;
  }

  setCrosshair(state: CrosshairState): void {
    const glyph = state === "interact" ? "○" : state === "use" ? "◇" : "+";
    this.crosshair.textContent = glyph;
    this.crosshair.dataset["state"] = state;
  }

  setCrosshairSize(size: number): void {
    this.crosshair.style.setProperty("--crosshair-size", String(size));
  }

  setPrompt(label: string | null, verb = "調べる", canUseItem = false): void {
    if (!label) {
      this.prompt.dataset["visible"] = "false";
      return;
    }
    this.promptLabel.textContent = label;
    this.promptKeys.replaceChildren(
      el("span", { class: "keycap", text: `E ${verb}` }),
      ...(canUseItem ? [el("span", { class: "keycap", text: "F 使う" })] : []),
    );
    this.prompt.dataset["visible"] = "true";
  }

  setSelectedItem(item: ItemDef | null): void {
    this.selected.dataset["empty"] = item ? "false" : "true";
    this.selected.replaceChildren(
      el("span", { class: "hud__glyph", text: item?.glyph ?? "·" }),
      el("span", { text: item ? item.name : "アイテム未選択" }),
    );
  }

  setProgress(solvedCount: number): void {
    this.pips.forEach((pip, index) => {
      pip.dataset["solved"] = index < solvedCount ? "true" : "false";
    });
    const count = this.telemetry.querySelector(".telemetry__count");
    if (count) count.textContent = `${solvedCount}/${this.pips.length}`;
  }

  toast(text: string, tone: "info" | "warn" = "info"): void {
    const node = el("div", { class: "toast", "data-tone": tone, text });
    this.toasts.append(node);
    // 一度に積み上がりすぎると画面を覆うので、古いものから消す
    while (this.toasts.childElementCount > 3) this.toasts.firstElementChild?.remove();
    window.setTimeout(() => {
      node.classList.add("toast--out");
      window.setTimeout(() => node.remove(), 300);
    }, 2500);
  }

  speak(line: Line): void {
    this.subtitleLine.textContent = line.text;
    this.subtitleTranslation.textContent = line.translation;
    this.subtitle.dataset["visible"] = "true";
    this.subtitleTimer = line.hold ?? 5;
  }

  /** 字幕の表示時間をゲームループで減らす (ポーズ中は進まない)。 */
  update(dt: number): void {
    if (this.subtitleTimer <= 0) return;
    this.subtitleTimer -= dt;
    if (this.subtitleTimer <= 0) this.subtitle.dataset["visible"] = "false";
  }
}
