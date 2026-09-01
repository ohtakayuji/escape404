import {
  addItem,
  isSolved,
  markSolved,
  type GameState,
} from "../core/GameState";
import type { InventoryItemId, LogId, PuzzleId } from "../core/ids";
import { PUZZLES, getPuzzle, type PuzzleDef } from "../data/puzzles";
import { ITEMS } from "../inventory/items";

export type PuzzleResult =
  | {
      status: "solved";
      puzzle: PuzzleDef;
      grantedItems: InventoryItemId[];
      unlockedLogs: LogId[];
    }
  | { status: "already"; puzzle: PuzzleDef }
  | { status: "locked"; puzzle: PuzzleDef; reason: string }
  | { status: "wrong"; puzzle: PuzzleDef; attempts: number };

/** 前提を満たしていない時に画面へ出す説明。 */
const FLAG_REASONS: Partial<Record<string, string>> = {
  hiddenTextSeen: "認証情報が見つかっていない。壁の表示を先に読む必要がある。",
  pcUnlocked: "参照元のデータがまだ開けない。PC を先に解除する。",
  wallPanelOpened: "スロットは壁パネルの内側にある。パネルを先に開ける。",
  hiddenPassageOpened: "隠し通路がまだ開いていない。",
  finalTerminalUnlocked: "EXIT DOOR の認証が終わっていない。",
};

/**
 * 全 Puzzle の判定を 1 か所に集約する。
 * 3D オブジェクトや UI は「答え」を知らず、ここへ投げるだけ。
 */
export class PuzzleManager {
  private readonly attempts = new Map<PuzzleId, number>();

  constructor(private readonly state: GameState) {}

  list(): readonly PuzzleDef[] {
    return PUZZLES;
  }

  isSolved(id: PuzzleId): boolean {
    return isSolved(this.state, id);
  }

  /** 未達の前提があれば理由を返す。満たしていれば null。 */
  lockReason(id: PuzzleId): string | null {
    const puzzle = getPuzzle(id);
    for (const flag of puzzle.requiresFlags ?? []) {
      if (!this.state.flags[flag]) {
        return FLAG_REASONS[flag] ?? "まだ条件を満たしていない。";
      }
    }
    for (const item of puzzle.requiresItems ?? []) {
      if (!this.state.inventory.includes(item)) {
        return `${ITEMS[item].name} が必要だ。`;
      }
    }
    return null;
  }

  canAttempt(id: PuzzleId): boolean {
    return this.lockReason(id) === null;
  }

  attemptCount(id: PuzzleId): number {
    return this.attempts.get(id) ?? 0;
  }

  /**
   * 解答を投げる。answer は kind により文字列 (keypad/text) か
   * 形状スロットの配列 (shapes)。
   * 冪等: すでに解けている Puzzle は "already" を返すだけで副作用なし。
   */
  submit(id: PuzzleId, answer: unknown): PuzzleResult {
    const puzzle = getPuzzle(id);
    if (this.isSolved(id)) return { status: "already", puzzle };

    const reason = this.lockReason(id);
    if (reason !== null) return { status: "locked", puzzle, reason };

    if (!this.matches(puzzle, answer)) {
      const attempts = this.attemptCount(id) + 1;
      this.attempts.set(id, attempts);
      return { status: "wrong", puzzle, attempts };
    }

    return this.resolve(puzzle);
  }

  /** 正解扱いで確定させる (選択式の P7 など、判定を外で行う場合に使う)。 */
  resolve(puzzle: PuzzleDef): PuzzleResult {
    if (!markSolved(this.state, puzzle.id)) {
      return { status: "already", puzzle };
    }
    if (puzzle.flag) this.state.flags[puzzle.flag] = true;

    const grantedItems: InventoryItemId[] = [];
    for (const item of puzzle.grantsItems ?? []) {
      if (addItem(this.state, item)) grantedItems.push(item);
    }
    if (grantedItems.includes("flashlight")) {
      this.state.flags.flashlightFound = true;
    }
    if (grantedItems.includes("master-key")) {
      this.state.flags.masterKeyFound = true;
    }

    this.attempts.delete(puzzle.id);
    return {
      status: "solved",
      puzzle,
      grantedItems,
      unlockedLogs: [...(puzzle.unlocksLogs ?? [])],
    };
  }

  private matches(puzzle: PuzzleDef, answer: unknown): boolean {
    if (puzzle.kind === "shapes") {
      const expected = puzzle.shapeAnswer ?? [];
      if (!Array.isArray(answer) || answer.length !== expected.length) return false;
      return expected.every((shape, index) => answer[index] === shape);
    }
    if (typeof answer !== "string" || puzzle.answer === undefined) return false;
    return answer.trim().toUpperCase() === puzzle.answer.toUpperCase();
  }

  /** ヒント画面が開いた時に「今の謎」として提示する Puzzle。 */
  currentPuzzle(): PuzzleDef {
    const next = PUZZLES.find((puzzle) => !this.isSolved(puzzle.id));
    return next ?? PUZZLES[PUZZLES.length - 1]!;
  }
}
