/**
 * ゲーム内 ID の一覧。マジックストリングをコード中に散らさないため、
 * 参照はすべてこのモジュール経由にする。
 */

export const PUZZLE_IDS = [
  "p1-drawer",
  "p2-login",
  "p3-safe",
  "p4-frames",
  "p5-shapes",
  "p6-perspective",
  "p7-final",
] as const;
export type PuzzleId = (typeof PUZZLE_IDS)[number];

export const ITEM_IDS = [
  "flashlight",
  "optical-filter",
  "small-key",
  "sphere",
  "cone",
  "cube",
  "cylinder",
  "master-key",
] as const;
export type InventoryItemId = (typeof ITEM_IDS)[number];

export const SHAPE_ITEM_IDS = ["sphere", "cone", "cube", "cylinder"] as const;
export type ShapeItemId = (typeof SHAPE_ITEM_IDS)[number];

export const LOG_IDS = ["archive01", "archive02", "subject17"] as const;
export type LogId = (typeof LOG_IDS)[number];

export type EndingId = "A" | "B";
