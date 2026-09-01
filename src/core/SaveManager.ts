import {
  SAVE_VERSION,
  createInitialState,
  type GameState,
  type ShapeSlots,
} from "./GameState";
import { ITEM_IDS, LOG_IDS, PUZZLE_IDS, SHAPE_ITEM_IDS } from "./ids";
import type { InventoryItemId, LogId, PuzzleId, ShapeItemId } from "./ids";

export const SAVE_KEY = "escape404-save-v1";

export type LoadResult =
  | { status: "ok"; state: GameState }
  | { status: "empty" }
  | { status: "corrupt"; reason: string };

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickIds<T extends string>(value: unknown, allowed: readonly T[]): T[] {
  const set = new Set<string>(allowed);
  const seen = new Set<T>();
  for (const entry of asArray(value)) {
    if (typeof entry === "string" && set.has(entry)) seen.add(entry as T);
  }
  return [...seen];
}

function readShapeSlots(value: unknown): ShapeSlots {
  const slots: ShapeSlots = [null, null, null, null];
  const source = asArray(value);
  const allowed = new Set<string>(SHAPE_ITEM_IDS);
  for (let i = 0; i < 4; i += 1) {
    const entry = source[i];
    if (typeof entry === "string" && allowed.has(entry)) {
      slots[i] = entry as ShapeItemId;
    }
  }
  return slots;
}

/**
 * 保存データを現行の GameState 形へ正規化する。
 * 未知のキーは捨て、欠けたキーは初期値で埋めるので、
 * 部分的に壊れたセーブでもクラッシュしない。
 */
export function migrate(raw: unknown): GameState {
  const base = createInitialState();
  if (typeof raw !== "object" || raw === null) return base;
  const data = raw as Record<string, unknown>;

  const flags = (data["flags"] ?? {}) as Record<string, unknown>;
  for (const key of Object.keys(base.flags) as (keyof GameState["flags"])[]) {
    if (typeof flags[key] === "boolean") base.flags[key] = flags[key] as boolean;
  }

  const logs = (data["logs"] ?? {}) as Record<string, unknown>;
  for (const key of LOG_IDS) {
    if (typeof logs[key] === "boolean") base.logs[key as LogId] = logs[key] as boolean;
  }

  base.startedAt = typeof data["startedAt"] === "number" ? (data["startedAt"] as number) : base.startedAt;
  base.elapsedSeconds =
    typeof data["elapsedSeconds"] === "number" && Number.isFinite(data["elapsedSeconds"])
      ? Math.max(0, data["elapsedSeconds"] as number)
      : 0;
  base.solvedPuzzles = pickIds<PuzzleId>(data["solvedPuzzles"], PUZZLE_IDS);
  base.inventory = pickIds<InventoryItemId>(data["inventory"], ITEM_IDS);
  base.shapeSlots = readShapeSlots(data["shapeSlots"]);
  base.readDocuments = asArray(data["readDocuments"]).filter(
    (entry): entry is string => typeof entry === "string",
  );

  const selected = data["selectedItem"];
  base.selectedItem =
    typeof selected === "string" && base.inventory.includes(selected as InventoryItemId)
      ? (selected as InventoryItemId)
      : null;

  const hints = (data["hintsUsed"] ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(hints)) {
    if (typeof value === "number" && Number.isFinite(value)) {
      base.hintsUsed[key] = Math.min(3, Math.max(0, Math.round(value)));
    }
  }

  const ending = data["ending"];
  base.ending = ending === "A" || ending === "B" ? ending : null;
  base.version = SAVE_VERSION;
  return base;
}

/** localStorage が使えない環境 (Safari private 等) でも落ちないラッパー。 */
export class SaveManager {
  private storage: Storage | null;
  private lastError: string | null = null;

  constructor(storage: Storage | null = safeStorage()) {
    this.storage = storage;
  }

  get available(): boolean {
    return this.storage !== null;
  }

  get error(): string | null {
    return this.lastError;
  }

  hasSave(): boolean {
    if (!this.storage) return false;
    try {
      return this.storage.getItem(SAVE_KEY) !== null;
    } catch {
      return false;
    }
  }

  load(): LoadResult {
    if (!this.storage) return { status: "empty" };
    let text: string | null = null;
    try {
      text = this.storage.getItem(SAVE_KEY);
    } catch (error) {
      this.lastError = String(error);
      return { status: "corrupt", reason: "セーブデータを読み出せませんでした。" };
    }
    if (text === null) return { status: "empty" };
    try {
      return { status: "ok", state: migrate(JSON.parse(text)) };
    } catch {
      return { status: "corrupt", reason: "セーブデータが壊れています。" };
    }
  }

  save(state: GameState): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (error) {
      this.lastError = String(error);
      return false;
    }
  }

  clear(): void {
    if (!this.storage) return;
    try {
      this.storage.removeItem(SAVE_KEY);
    } catch {
      /* 消せなくても進行に影響しない */
    }
  }
}

function safeStorage(): Storage | null {
  try {
    const probe = "__escape404_probe__";
    globalThis.localStorage.setItem(probe, "1");
    globalThis.localStorage.removeItem(probe);
    return globalThis.localStorage;
  } catch {
    return null;
  }
}
