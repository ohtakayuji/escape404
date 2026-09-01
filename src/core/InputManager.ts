import { EventBus } from "./EventBus";

export type GameAction =
  | "interact"
  | "use-item"
  | "flashlight"
  | "inventory"
  | "hint"
  | "pause";

export interface InputEvents extends Record<string, unknown> {
  action: GameAction;
  "pointerlock:change": boolean;
  "pointerlock:error": void;
}

/** 押した瞬間に発火するキー → アクションの対応表 */
const ACTION_KEYS: Record<string, GameAction> = {
  KeyE: "interact",
  KeyF: "use-item",
  KeyL: "flashlight",
  Tab: "inventory",
  KeyH: "hint",
  Escape: "pause",
};

/** 押している間の移動入力。前後左右をベクトルで持つ。 */
const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export interface MoveInput {
  x: number;
  z: number;
}

export class InputManager {
  readonly events = new EventBus<InputEvents>();

  private readonly held = new Set<string>();
  private lookDeltaX = 0;
  private lookDeltaY = 0;
  private cleanups: (() => void)[] = [];

  /** モーダル表示中は移動・視点を止める (アクションキーは通す)。 */
  movementEnabled = true;

  constructor(private readonly canvas: HTMLCanvasElement) {}

  attach(): void {
    const onKeyDown = (event: KeyboardEvent) => this.handleKeyDown(event);
    const onKeyUp = (event: KeyboardEvent) => {
      this.held.delete(event.code);
    };
    const onMouseMove = (event: MouseEvent) => {
      if (!this.pointerLocked || !this.movementEnabled) return;
      this.lookDeltaX += event.movementX;
      this.lookDeltaY += event.movementY;
    };
    const onBlur = () => this.held.clear();
    const onLockChange = () => {
      this.held.clear();
      this.events.emit("pointerlock:change", this.pointerLocked);
    };
    const onLockError = () => this.events.emit("pointerlock:error", undefined);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);

    this.cleanups = [
      () => window.removeEventListener("keydown", onKeyDown),
      () => window.removeEventListener("keyup", onKeyUp),
      () => window.removeEventListener("blur", onBlur),
      () => document.removeEventListener("mousemove", onMouseMove),
      () => document.removeEventListener("pointerlockchange", onLockChange),
      () => document.removeEventListener("pointerlockerror", onLockError),
    ];
  }

  dispose(): void {
    for (const cleanup of this.cleanups) cleanup();
    this.cleanups = [];
    this.events.clear();
    this.held.clear();
  }

  get pointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  requestPointerLock(): void {
    if (this.pointerLocked) return;
    const result = this.canvas.requestPointerLock() as unknown;
    if (result instanceof Promise) result.catch(() => this.events.emit("pointerlock:error", undefined));
  }

  releasePointerLock(): void {
    if (this.pointerLocked) document.exitPointerLock();
  }

  /** 今フレームの移動入力。長さ 1 に正規化して返す。 */
  readMove(): MoveInput {
    if (!this.movementEnabled) return { x: 0, z: 0 };
    let x = 0;
    let z = 0;
    for (const code of this.held) {
      const vector = MOVE_KEYS[code];
      if (!vector) continue;
      x += vector[0];
      z += vector[1];
    }
    const length = Math.hypot(x, z);
    return length > 1 ? { x: x / length, z: z / length } : { x, z };
  }

  /** 今フレームの視点移動量。読むと 0 に戻る。 */
  readLook(): { x: number; y: number } {
    const delta = { x: this.lookDeltaX, y: this.lookDeltaY };
    this.lookDeltaX = 0;
    this.lookDeltaY = 0;
    return delta;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    const action = ACTION_KEYS[event.code];
    const typing = isTextEntry(document.activeElement);

    // Tab はフォーカス移動、E/F などは文字入力に使われるので入力欄では通さない
    if (typing && event.code !== "Escape") {
      if (event.code === "Tab") event.preventDefault();
      return;
    }

    if (MOVE_KEYS[event.code]) this.held.add(event.code);

    if (action) {
      if (event.repeat) return;
      event.preventDefault();
      this.events.emit("action", action);
    }
  }
}

function isTextEntry(element: Element | null): boolean {
  if (!element) return false;
  const tag = element.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || element.hasAttribute("contenteditable");
}
