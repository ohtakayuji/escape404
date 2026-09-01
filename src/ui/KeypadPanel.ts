import { el } from "./dom";

export type SubmitOutcome = "ok" | "wrong" | "locked";

export interface KeypadPanelOptions {
  digits: number;
  caption?: string;
  onDigit?: () => void;
  onSubmit: (value: string) => SubmitOutcome;
}

/** 4 桁キーパッド。クリックとキーボード数字の両方に対応する。 */
export class KeypadPanel {
  readonly element: HTMLElement;
  private value = "";
  private readonly cells: HTMLElement[] = [];
  private readonly wrapper: HTMLElement;
  private locked = false;
  private readonly onKeyDown = (event: KeyboardEvent) => this.handleKey(event);

  constructor(private readonly options: KeypadPanelOptions) {
    for (let i = 0; i < options.digits; i += 1) {
      this.cells.push(el("span", { class: "keypad__cell", "data-filled": "false", text: "_" }));
    }
    const readout = el("div", { class: "keypad__readout" }, this.cells);

    const grid = el("div", { class: "keypad__grid" });
    const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    for (const key of keys) grid.append(this.keyButton(key, key));
    grid.append(
      this.keyButton("C", "clear", "keypad__key--wide"),
      this.keyButton("0", "0"),
      this.keyButton("ENTER", "enter", "keypad__key--wide"),
    );

    this.wrapper = el("div", { class: "keypad", "data-state": "idle" }, [
      readout,
      grid,
      el("p", {
        class: "keypad__hint",
        text: options.caption ?? "キーボードの数字でも入力できます",
      }),
    ]);
    this.element = this.wrapper;
    window.addEventListener("keydown", this.onKeyDown);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
  }

  private keyButton(label: string, action: string, extra = ""): HTMLButtonElement {
    const button = el("button", {
      type: "button",
      class: `keypad__key ${extra}`.trim(),
      text: label,
      "data-action": action,
    });
    button.addEventListener("click", () => this.press(action));
    return button;
  }

  private handleKey(event: KeyboardEvent): void {
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      this.press(event.key);
    } else if (event.key === "Enter") {
      event.preventDefault();
      this.press("enter");
    } else if (event.key === "Backspace") {
      event.preventDefault();
      this.value = this.value.slice(0, -1);
      this.render();
    }
  }

  private press(action: string): void {
    if (this.locked) return;
    if (action === "clear") {
      this.value = "";
      this.wrapper.dataset["state"] = "idle";
      this.render();
      return;
    }
    if (action === "enter") {
      this.submit();
      return;
    }
    if (this.value.length >= this.options.digits) return;
    this.value += action;
    this.wrapper.dataset["state"] = "idle";
    this.options.onDigit?.();
    this.render();
    if (this.value.length === this.options.digits) {
      // 桁が埋まったら少し置いて自動判定する (ENTER も押せる)
      window.setTimeout(() => this.submit(), 220);
    }
  }

  private submit(): void {
    if (this.locked || this.value.length !== this.options.digits) return;
    const outcome = this.options.onSubmit(this.value);
    if (outcome === "ok") {
      this.locked = true;
      this.wrapper.dataset["state"] = "ok";
      return;
    }
    this.wrapper.dataset["state"] = "wrong";
    this.value = "";
    window.setTimeout(() => this.render(), 180);
  }

  private render(): void {
    this.cells.forEach((cell, index) => {
      const char = this.value[index];
      cell.textContent = char ?? "_";
      cell.dataset["filled"] = char ? "true" : "false";
    });
  }
}
