import type { GameFlags } from "../core/GameState";
import type { InventoryItemId, LogId, PuzzleId, ShapeItemId } from "../core/ids";

/**
 * 7 つの謎の定義。答え・前提条件・報酬・ヒントはすべてここに集約する。
 * 3D オブジェクト側に答えを書かないこと (CLAUDE.md)。
 */
export type PuzzleKind = "keypad" | "text" | "shapes" | "choice";

export interface PuzzleDef {
  id: PuzzleId;
  /** ヒント画面や実績表示に出す名前 */
  label: string;
  kind: PuzzleKind;
  /** keypad / text の正解。shapes と choice は別フィールド。 */
  answer?: string;
  /** shapes の正解 (スロット 1〜4) */
  shapeAnswer?: readonly ShapeItemId[];
  /** 解いたら立てるフラグ */
  flag?: keyof GameFlags;
  /** 挑戦するのに必要なフラグ */
  requiresFlags?: readonly (keyof GameFlags)[];
  /** 挑戦するのに必要なアイテム */
  requiresItems?: readonly InventoryItemId[];
  /** 正解時に得るアイテム */
  grantsItems?: readonly InventoryItemId[];
  /** 正解時に読めるようになるログ */
  unlocksLogs?: readonly LogId[];
  hints: readonly [string, string, string];
}

export const PUZZLES: readonly PuzzleDef[] = [
  {
    id: "p1-drawer",
    label: "P1 — 引き出しの 4 桁",
    kind: "keypad",
    answer: "0417",
    flag: "drawerOpened",
    grantsItems: ["flashlight"],
    hints: [
      "デスクと時計を確認してください。",
      "同じ 4 桁の数字が 2 か所にあります。",
      "0417 を引き出しに入力してください。",
    ],
  },
  {
    id: "p2-login",
    label: "P2 — PC のパスワード",
    kind: "text",
    answer: "ORION",
    flag: "pcUnlocked",
    requiresItems: ["flashlight"],
    requiresFlags: ["hiddenTextSeen"],
    hints: [
      "新しく手に入れた物を部屋で使ってください。",
      "暗い壁、特に PC 付近を照らしてください。",
      "壁に出る ORION が PC のパスワードです。",
    ],
  },
  {
    id: "p3-safe",
    label: "P3 — 金庫の 4 桁",
    kind: "keypad",
    answer: "5892",
    flag: "safeOpened",
    requiresFlags: ["pcUnlocked"],
    grantsItems: ["optical-filter", "small-key"],
    unlocksLogs: ["archive01"],
    hints: [
      "CHAT の数字だけでは答えになりません。",
      "CAMERA の 4 つのラベルを CHAT の順番で並べます。",
      "CAM3 → CAM1 → CAM4 → CAM2 = 5892",
    ],
  },
  {
    id: "p4-frames",
    label: "P4 — 壁パネルの 4 桁",
    kind: "keypad",
    answer: "1673",
    flag: "wallPanelOpened",
    requiresItems: ["small-key"],
    hints: [
      "絵画の数字と額縁のライトの両方を使います。",
      "ライトの点滅回数が読む順番です。",
      "B → D → A → C = 1673",
    ],
  },
  {
    id: "p5-shapes",
    label: "P5 — 4 つのスロット",
    kind: "shapes",
    shapeAnswer: ["sphere", "cone", "cube", "cylinder"],
    flag: "hiddenPassageOpened",
    requiresFlags: ["wallPanelOpened"],
    hints: [
      "Memo B は 4 つの形状を説明しています。",
      "上から順に、説明と形を対応させます。",
      "Sphere → Cone → Cube → Cylinder の順に置きます。",
    ],
  },
  {
    id: "p6-perspective",
    label: "P6 — 観測コード",
    kind: "text",
    answer: "404",
    flag: "observationSolved",
    requiresFlags: ["hiddenPassageOpened"],
    grantsItems: ["master-key"],
    unlocksLogs: ["archive02"],
    hints: [
      "観察窓の床には「立つ場所」を示す X があります。",
      "X の上に立って、メイン研究室の黒い物体を見てください。",
      "4 つの物体は重なって 404 に見えます。404 と入力します。",
    ],
  },
  {
    id: "p7-final",
    label: "P7 — 最終判断",
    kind: "choice",
    requiresFlags: ["finalTerminalUnlocked"],
    hints: [
      "MASTER KEY を EXIT DOOR で使ってから、隠し部屋の端末へ戻ります。",
      "OPEN EXIT を選べば脱出できます (END A)。",
      "3 つのログをすべて読んでいれば ASK WHO I AM が選べます (END B)。",
    ],
  },
] as const;

const byId = new Map<PuzzleId, PuzzleDef>(PUZZLES.map((p) => [p.id, p]));

export function getPuzzle(id: PuzzleId): PuzzleDef {
  const puzzle = byId.get(id);
  if (!puzzle) throw new Error(`unknown puzzle: ${id}`);
  return puzzle;
}

/** ヒント画面が「今どの謎のヒントを出すか」を決める順番。 */
export const PUZZLE_ORDER: readonly PuzzleId[] = PUZZLES.map((p) => p.id);
