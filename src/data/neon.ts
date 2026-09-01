/**
 * 「サイバー区画」の定義（データのみ）。
 *
 * 世界観: B4-17 は無菌の観察室だが、その裏側 (隠し通路と隠し部屋) は
 * EVE を動かし続けるための機械室である。配線が剥き出しで、状態表示が
 * ネオン管で置き換えられている。主室にはその色被りだけが漏れてくる。
 *
 * 色に意味を持たせる (装飾として色を増やさない):
 *   magenta = 稼働中の負荷 / cyan = 冷却と配線 / violet = 通路の抜け
 *
 * 数字は一切書かない。室内の数字はすべて謎の手がかりなので、
 * 意味のない数字を増やすと誤った手がかりになる。
 */

import type { Vec3 } from "./layout";

export type NeonColorId = "magenta" | "cyan" | "violet";

export const NEON_COLORS: Record<NeonColorId, number> = {
  magenta: 0xff2f7d,
  cyan: 0x23d7ff,
  violet: 0x7b4bff,
};

/** 区画。passage は隠し通路が開くまで消灯している。 */
export type NeonZoneId = "hidden" | "passage" | "main";

export interface NeonTube {
  id: string;
  zone: NeonZoneId;
  color: NeonColorId;
  /** 管の伸びる方向 */
  axis: "x" | "y" | "z";
  center: Vec3;
  length: number;
  /** 天井へ「手で付けた」感じを出すための水平回転 (rad) */
  yaw?: number;
  /** 周囲へこぼす光。null なら発光面だけ (低品質時は全て無効) */
  spill?: { intensity: number; distance: number };
  /** 経年劣化のちらつき。1 本だけに付ける。 */
  flicker?: boolean;
}

/**
 * ネオン管。隠し部屋 = 機械室の本体、通路 = 開通の合図、
 * 主室 = 色被りだけ (謎を読む照明は白のまま残す)。
 */
export const NEON_TUBES: NeonTube[] = [
  {
    id: "hidden-load",
    zone: "hidden",
    color: "magenta",
    axis: "x",
    center: { x: -8.5, y: 2.48, z: 1.85 },
    length: 2.6,
    yaw: 0.12,
    spill: { intensity: 3.4, distance: 3.8 },
    flicker: true,
  },
  {
    id: "hidden-cooling",
    zone: "hidden",
    color: "cyan",
    axis: "z",
    center: { x: -9.5, y: 2.42, z: -1.0 },
    length: 2.2,
    yaw: -0.08,
    spill: { intensity: 3.0, distance: 3.4 },
  },
  {
    id: "hidden-riser",
    zone: "hidden",
    color: "violet",
    axis: "y",
    center: { x: -8.7, y: 1.45, z: -2.44 },
    length: 1.5,
  },
  {
    id: "passage-jamb-north",
    zone: "passage",
    color: "magenta",
    axis: "y",
    center: { x: -6.1, y: 1.15, z: 0.97 },
    length: 1.6,
  },
  {
    id: "passage-jamb-south",
    zone: "passage",
    color: "magenta",
    axis: "y",
    center: { x: -6.1, y: 1.15, z: 2.03 },
    length: 1.6,
    spill: { intensity: 3.6, distance: 4.0 },
  },
  {
    id: "main-south",
    zone: "main",
    color: "violet",
    axis: "x",
    center: { x: -3.4, y: 3.04, z: 3.15 },
    length: 2.4,
    yaw: -0.22,
    spill: { intensity: 3.2, distance: 4.6 },
  },
  {
    id: "main-cooling",
    zone: "main",
    color: "cyan",
    axis: "z",
    center: { x: 5.4, y: 3.04, z: -3.8 },
    length: 1.8,
    yaw: 0.16,
    spill: { intensity: 2.6, distance: 3.4 },
  },
];

/**
 * 床に伸びる光の筋。濡れたコンクリートに映った管の像として置く。
 * 平面反射は使わない (docs/decisions.md D-023)。
 */
export interface FloorStreak {
  zone: NeonZoneId;
  color: NeonColorId;
  x: number;
  z: number;
  /** 管と直交する幅 / 管に沿った長さ */
  width: number;
  length: number;
  opacity: number;
  yaw?: number;
}

export const FLOOR_STREAKS: FloorStreak[] = [
  { zone: "hidden", color: "magenta", x: -8.5, z: 1.7, width: 3.1, length: 1.9, opacity: 0.5, yaw: 0.12 },
  { zone: "hidden", color: "cyan", x: -9.3, z: -1.0, width: 1.5, length: 2.6, opacity: 0.42 },
  { zone: "passage", color: "magenta", x: -5.7, z: 1.5, width: 1.3, length: 1.5, opacity: 0.55 },
  { zone: "main", color: "violet", x: -3.4, z: 3.0, width: 2.9, length: 1.7, opacity: 0.34, yaw: -0.22 },
  { zone: "main", color: "cyan", x: 5.1, z: -3.7, width: 1.3, length: 2.2, opacity: 0.32 },
];

/** 濡れた床のたまり。周囲の光を映して「湿っている」ことを示す。 */
export interface Puddle {
  x: number;
  z: number;
  width: number;
  length: number;
}

export const PUDDLES: Puddle[] = [
  // 排水口の周り
  { x: -4.6, z: -1.4, width: 1.9, length: 1.6 },
  // 通路の手前 (ネオンが映り込む位置)
  { x: -5.5, z: 1.4, width: 1.5, length: 1.7 },
  { x: -3.2, z: 2.7, width: 2.1, length: 1.4 },
  // 機械室
  { x: -8.6, z: 1.3, width: 2.2, length: 1.8 },
];

/** 壁付けの表示。文字は EVE と設備の語彙だけを使う。 */
export interface NeonSign {
  text: string;
  color: NeonColorId;
  position: Vec3;
  rotationY: number;
  width: number;
  height: number;
  fontSize: number;
}

export const NEON_SIGNS: NeonSign[] = [
  {
    text: "稼働中",
    color: "magenta",
    position: { x: -9.97, y: 1.98, z: 1.5 },
    rotationY: Math.PI / 2,
    width: 0.86,
    height: 0.34,
    fontSize: 120,
  },
  {
    text: "観測は継続する",
    color: "cyan",
    position: { x: -8.6, y: 1.18, z: -2.47 },
    rotationY: 0,
    width: 0.92,
    height: 0.16,
    fontSize: 58,
  },
];

/**
 * 配電盤。機械室の南壁に並ぶ。壁付けなので当たり判定は持たない
 * (壁の当たりで手前に立てないため、めり込まない)。
 */
export interface Cabinet {
  x: number;
  z: number;
  rotationY: number;
  width: number;
  height: number;
  depth: number;
  /** 表示灯の色 */
  color: NeonColorId;
}

export const CABINETS: Cabinet[] = [
  { x: -9.4, z: 2.44, rotationY: 0, width: 0.8, height: 1.15, depth: 0.16, color: "cyan" },
  { x: -8.5, z: 2.44, rotationY: 0, width: 0.8, height: 1.15, depth: 0.16, color: "magenta" },
  { x: -7.6, z: 2.44, rotationY: 0, width: 0.8, height: 1.15, depth: 0.16, color: "cyan" },
];

/** 機械室から主室へ抜ける配線。区画がつながっていることを示す。 */
export interface Conduit {
  y: number;
  z: number;
  fromX: number;
  toX: number;
  radius: number;
}

export const CONDUITS: Conduit[] = [
  { y: 2.36, z: 2.28, fromX: -9.6, toX: -6.1, radius: 0.03 },
  { y: 2.3, z: 2.14, fromX: -9.2, toX: -6.1, radius: 0.022 },
];

/** 主室北東の冷却盤。主室側にサイバー区画の存在をにじませる。 */
export const COOLING_RACK = {
  position: { x: 5.9, y: 1.15, z: -3.85 },
  size: { x: 0.22, y: 1.5, z: 1.05 },
  color: "cyan" as NeonColorId,
  label: "COOLING",
} as const;
