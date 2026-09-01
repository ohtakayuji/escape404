import type { Page } from "@playwright/test";

export interface TestApi {
  getState(): {
    flags: Record<string, boolean>;
    inventory: string[];
    solvedPuzzles: string[];
    logs: Record<string, boolean>;
    shapeSlots: (string | null)[];
    ending: string | null;
    elapsedSeconds: number;
  };
  scene(): string;
  submit(puzzleId: string, answer: unknown): string;
  pickShape(id: string): void;
  placeShape(slot: number, shape: string): void;
  clearSlot(slot: number): void;
  readLog(id: string): void;
  revealFilterDigits(): void;
  useMasterKey(): boolean;
  chooseEnding(ending: "A" | "B"): void;
  openKeypad(puzzleId: string, digits?: number): void;
  openPc(): void;
  openFinalTerminal(): void;
  teleport(x: number, z: number, yaw?: number, pitch?: number): void;
  focus(): { id: string; label: string; verb: string } | null;
  pressInteract(): void;
  debugRay(): {
    camera: { x: number; y: number; z: number; yaw: number; pitch: number };
    hits: { id: string | null; name: string; distance: number }[];
    blockers: { name: string; distance: number }[];
    updateCount: number;
    lastError: string | null;
  };
  pressUseItem(): void;
  selectItem(id: string): void;
  position(): { x: number; z: number };
  walk(dx: number, dz: number, steps?: number): { x: number; z: number };
  setFlashlight(on: boolean): void;
  flashlightOn(): boolean;
  modalId(): string | null;
  renderStats(): { triangles: number; calls: number; frame: number };
}

/**
 * ページ側の __escape404 を評価する小さなラッパー。
 * 関数は文字列化してページへ渡すので、外側の変数は参照できない。
 * 値を渡したいときは第 3 引数 args を使う。
 */
export async function api<T, A = undefined>(
  page: Page,
  fn: (api: TestApi, args: A) => T,
  args?: A,
): Promise<T> {
  return page.evaluate(
    ({ source, payload }) => {
      const handle = (window as unknown as Record<string, unknown>)["__escape404"];
      return new Function("api", "args", `return (${source})(api, args)`)(
        handle,
        payload,
      ) as unknown;
    },
    { source: fn.toString(), payload: args ?? null },
  ) as Promise<T>;
}
