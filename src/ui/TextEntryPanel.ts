import { el } from "./dom";
import type { SubmitOutcome } from "./KeypadPanel";

export interface TextEntryPanelOptions {
  caption?: string;
  maxLength: number;
  placeholder?: string;
  note?: string;
  onSubmit: (value: string) => SubmitOutcome;
}

/** PC ログインと観測コードの共通入力欄。 */
export class TextEntryPanel {
  readonly element: HTMLElement;
  readonly input: HTMLInputElement;
  private readonly wrapper: HTMLElement;

  constructor(options: TextEntryPanelOptions) {
    this.input = el("input", {
      class: "text-entry__field",
      type: "text",
      maxlength: options.maxLength,
      autocomplete: "off",
      spellcheck: "false",
      placeholder: options.placeholder ?? "",
      "aria-label": options.caption ?? "入力",
    });

    const submit = el("button", { type: "button", class: "btn btn--primary", text: "ENTER" });
    const run = () => {
      const outcome = options.onSubmit(this.input.value.trim());
      if (outcome === "ok") {
        this.wrapper.dataset["state"] = "ok";
        return;
      }
      this.wrapper.dataset["state"] = "wrong";
      this.input.value = "";
      this.input.focus();
    };
    submit.addEventListener("click", run);
    this.input.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      run();
    });
    this.input.addEventListener("input", () => {
      this.wrapper.dataset["state"] = "idle";
    });

    const children: (HTMLElement | string)[] = [];
    if (options.caption) {
      children.push(el("p", { class: "keypad__hint", text: options.caption }));
    }
    children.push(this.input, submit);
    if (options.note) {
      children.push(el("p", { class: "hints__note", text: options.note }));
    }

    this.wrapper = el("div", { class: "text-entry", "data-state": "idle" }, children);
    this.element = this.wrapper;
  }
}
