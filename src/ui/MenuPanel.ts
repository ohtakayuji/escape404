import type { Settings } from "../core/Settings";
import { el } from "./dom";

export interface PauseMenuOptions {
  onResume: () => void;
  onSettings: () => void;
  onHints: () => void;
  onReset: () => void;
  onTitle: () => void;
}

export function createPauseMenu(options: PauseMenuOptions): HTMLElement {
  const button = (label: string, handler: () => void, className = "btn") => {
    const node = el("button", { type: "button", class: className, text: label });
    node.addEventListener("click", handler);
    return node;
  };

  return el("div", { class: "menu" }, [
    button("ゲームに戻る", options.onResume, "btn btn--primary"),
    button("ヒントを見る", options.onHints),
    button("設定", options.onSettings),
    button("タイトルへ戻る", options.onTitle, "btn btn--quiet"),
    button("最初からやり直す (RESET)", options.onReset, "btn btn--danger"),
    el("p", {
      class: "hints__note",
      text: "画面をクリックすると視点操作に戻る (ブラウザの制約で自動復帰はできない)。",
    }),
  ]);
}

export interface SettingsPanelOptions {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

interface SliderSpec {
  key: keyof Settings;
  label: string;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
}

const SLIDERS: SliderSpec[] = [
  { key: "mouseSensitivity", label: "マウス感度", min: 0.4, max: 2, step: 0.05, format: (v) => `${v.toFixed(2)}x` },
  { key: "fov", label: "視野角 (FOV)", min: 65, max: 90, step: 1, format: (v) => `${v.toFixed(0)}°` },
  { key: "crosshairSize", label: "照準サイズ", min: 10, max: 32, step: 1, format: (v) => `${v.toFixed(0)}px` },
  { key: "masterVolume", label: "全体音量", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "bgmVolume", label: "環境音", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "sfxVolume", label: "効果音", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
];

interface ToggleSpec {
  key: "cameraBob" | "motionEffects" | "muted";
  label: string;
  on: string;
  off: string;
}

const TOGGLES: ToggleSpec[] = [
  { key: "cameraBob", label: "歩行時のカメラ揺れ", on: "ON", off: "OFF" },
  { key: "motionEffects", label: "点滅・モーション演出", on: "ON", off: "OFF" },
  { key: "muted", label: "ミュート", on: "ミュート中", off: "音あり" },
];

export function createSettingsPanel(options: SettingsPanelOptions): HTMLElement {
  const fields: HTMLElement[] = [
    el("p", { class: "settings__group-title", text: "操作・表示" }),
  ];

  for (const spec of SLIDERS) {
    if (spec.key === "masterVolume") {
      fields.push(el("p", { class: "settings__group-title", text: "音量" }));
    }
    const value = options.settings[spec.key] as number;
    const readout = el("span", { class: "field__value", text: spec.format(value) });
    const input = el("input", {
      type: "range",
      min: spec.min,
      max: spec.max,
      step: spec.step,
      value,
      "aria-label": spec.label,
    });
    input.addEventListener("input", () => {
      const next = Number(input.value);
      readout.textContent = spec.format(next);
      options.onChange({ [spec.key]: next } as Partial<Settings>);
    });
    fields.push(
      el("div", { class: "field" }, [
        el("span", { class: "field__label", text: spec.label }),
        readout,
        el("div", { class: "field__control" }, [input]),
      ]),
    );
  }

  fields.push(el("p", { class: "settings__group-title", text: "その他" }));
  for (const spec of TOGGLES) {
    const current = options.settings[spec.key];
    const button = el("button", {
      type: "button",
      class: "field__toggle",
      "aria-pressed": current ? "true" : "false",
      text: current ? spec.on : spec.off,
    });
    button.addEventListener("click", () => {
      const next = button.getAttribute("aria-pressed") !== "true";
      button.setAttribute("aria-pressed", next ? "true" : "false");
      button.textContent = next ? spec.on : spec.off;
      options.onChange({ [spec.key]: next } as Partial<Settings>);
    });
    fields.push(
      el("div", { class: "field" }, [
        el("span", { class: "field__label", text: spec.label }),
        button,
      ]),
    );
  }

  return el("div", { class: "settings" }, fields);
}

export interface ConfirmPanelOptions {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function createConfirmPanel(options: ConfirmPanelOptions): HTMLElement {
  const confirm = el("button", { type: "button", class: "btn btn--danger", text: options.confirmLabel });
  confirm.addEventListener("click", options.onConfirm);
  const cancel = el("button", { type: "button", class: "btn", text: "やめる" });
  cancel.addEventListener("click", options.onCancel);
  return el("div", { class: "menu" }, [
    el("p", { class: "inventory__desc", text: options.message }),
    confirm,
    cancel,
  ]);
}
