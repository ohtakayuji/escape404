/**
 * 部屋の寸法・什器の位置をまとめた唯一の出典。
 * Scene 構築 (見た目) と CollisionWorld (当たり) の両方がここを読む。
 * 数値をコード中に直接書かないこと。
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** 中心と大きさで表す軸平行ボックス。 */
export interface Box {
  center: Vec3;
  size: Vec3;
}

export const WALL_THICKNESS = 0.2;

export const MAIN_ROOM = {
  minX: -6,
  maxX: 6,
  minZ: -4.5,
  maxZ: 4.5,
  height: 3.2,
} as const;

export const HIDDEN_ROOM = {
  minX: -10,
  maxX: -6,
  minZ: -2.5,
  maxZ: 2.5,
  height: 2.6,
} as const;

/** 共有壁 (x = -6) の 2 つの開口部 */
export const DOORWAY = { minZ: 0.9, maxZ: 2.1, height: 2.1 } as const;
export const WINDOW = {
  minZ: -1.6,
  maxZ: 0.4,
  minY: 0.95,
  maxY: 2.15,
} as const;

/** EXIT DOOR (南壁) の開口部 */
export const EXIT_DOOR = {
  minX: 0.9,
  maxX: 2.1,
  height: 2.1,
  z: MAIN_ROOM.maxZ,
} as const;

export const SPAWN: { position: Vec3; yaw: number; pitch: number } = {
  position: { x: 1.2, y: 0, z: 1.8 },
  /** カメラ既定の向きは -Z。+Z (南=EXIT DOOR) を向かせるため 180 度回す。 */
  yaw: Math.PI,
  pitch: -0.02,
};

export const PLAYER = {
  radius: 0.35,
  height: 1.75,
  eyeHeight: 1.62,
  walkSpeed: 3.2,
  acceleration: 18,
  deceleration: 22,
  mouseSensitivity: 0.002,
} as const;

const box = (
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
): Box => ({ center: { x: cx, y: cy, z: cz }, size: { x: sx, y: sy, z: sz } });

/**
 * 壁。開口部を作るため 1 枚の壁を複数のボックスに分割してある。
 * 見た目と当たりを同じ配列から作るのでズレない。
 */
export const WALLS: Box[] = [
  // 北壁
  box(0, 1.6, -4.6, 12.4, 3.2, WALL_THICKNESS),
  // 南壁 (EXIT DOOR の開口)
  box(-2.65, 1.6, 4.6, 7.1, 3.2, WALL_THICKNESS),
  box(4.15, 1.6, 4.6, 4.1, 3.2, WALL_THICKNESS),
  box(1.5, 2.65, 4.6, 1.2, 1.1, WALL_THICKNESS),
  // 東壁
  box(6.1, 1.6, 0, WALL_THICKNESS, 3.2, 9.2),
  // 西壁 = 共有壁 (観察窓と隠し通路の開口)
  box(-6.1, 1.6, -3.1, WALL_THICKNESS, 3.2, 3.0),
  box(-6.1, 0.475, -0.6, WALL_THICKNESS, 0.95, 2.0),
  box(-6.1, 2.675, -0.6, WALL_THICKNESS, 1.05, 2.0),
  box(-6.1, 1.6, 0.65, WALL_THICKNESS, 3.2, 0.5),
  box(-6.1, 2.65, 1.5, WALL_THICKNESS, 1.1, 1.2),
  box(-6.1, 1.6, 3.35, WALL_THICKNESS, 3.2, 2.5),
  // 隠し部屋の外壁
  box(-10.1, 1.3, 0, WALL_THICKNESS, 2.6, 5.2),
  box(-8, 1.3, -2.6, 4.2, 2.6, WALL_THICKNESS),
  box(-8, 1.3, 2.6, 4.2, 2.6, WALL_THICKNESS),
];

/** 什器。id 付きのものは開閉やスライドで当たりが変わる。 */
export interface FurniturePiece extends Box {
  id: string;
  /** 当たり判定を持つか (壁掛け・天吊りは false) */
  solid: boolean;
}

export const FURNITURE: FurniturePiece[] = [
  { id: "desk-main", ...box(0, 0.38, 0, 2.4, 0.76, 1.1), solid: true },
  { id: "desk-chair", ...box(-0.5, 0.45, 1.05, 0.5, 0.9, 0.5), solid: true },
  { id: "desk-pc", ...box(5.35, 0.38, -2.0, 1.1, 0.76, 2.0), solid: true },
  { id: "safe", ...box(-4.6, 0.5, 4.1, 0.9, 1.0, 0.7), solid: true },
  { id: "shelf-shapes", ...box(4.2, 0.9, 4.15, 1.6, 1.8, 0.5), solid: true },
  { id: "bookshelf", ...box(-5.62, 1.05, 1.5, 0.56, 2.1, 1.2), solid: true },
  { id: "pedestal", ...box(-8.0, 0.45, 1.55, 0.6, 0.9, 0.6), solid: true },
  { id: "terminal", ...box(-9.65, 0.6, 0, 0.5, 1.2, 1.0), solid: true },
  { id: "exit-door", ...box(1.5, 1.05, 4.55, 1.2, 2.1, 0.12), solid: true },
];

/** 本棚が P5 クリアで滑る距離 (+Z 方向) */
export const BOOKSHELF_SLIDE = 1.3;

/* ------------------------------------------------------------------ */
/* 壁付けオブジェクト                                                  */
/* ------------------------------------------------------------------ */

export const CLOCK = {
  position: { x: 4.0, y: 2.2, z: -4.45 },
  /** 針は 4:17 で停止 */
  hours: 4,
  minutes: 17,
} as const;

/** 4 枚の絵画。左 (西) から A / B / C / D。 */
export interface FrameSpec {
  id: "A" | "B" | "C" | "D";
  x: number;
  /** Optical Filter 越しに現れる数字 */
  digit: number;
  /** 額縁上部のライトの点滅回数 = 読む順番 */
  blinks: number;
}

export const FRAMES: FrameSpec[] = [
  { id: "A", x: -4.5, digit: 7, blinks: 3 },
  { id: "B", x: -3.0, digit: 1, blinks: 1 },
  { id: "C", x: -1.5, digit: 3, blinks: 4 },
  { id: "D", x: 0.0, digit: 6, blinks: 2 },
];

export const FRAME_Y = 1.72;
export const FRAME_Z = -4.46;

/** P2: 懐中電灯を当てた時だけ見える壁面文字 */
export const HIDDEN_TEXT = {
  word: "ORION",
  position: { x: 5.94, y: 1.55, z: -0.4 },
  /** 文字が反応する距離と視線の一致度 */
  revealDistance: 4.2,
  revealDot: 0.86,
} as const;

/** P4 で開く壁パネルと、その内側の 4 スロット (P5) */
/**
 * 壁パネル。南壁 (z = 4.5) の内側に取り付いた点検盤。
 * 手前 (z が小さい方) にカバー、奥に 4 スロットが並ぶので、
 * カバーが上へ滑るまでスロットは見えない。
 */
export const WALL_PANEL = {
  /** カバー本体 */
  center: { x: -1.5, y: 1.3, z: 4.22 },
  size: { x: 1.7, y: 1.5, z: 0.06 },
  /** P4 クリアで上へ滑る量 */
  slideY: 1.45,
  /** 背板 (壁面に密着) */
  backingZ: 4.45,
  /** スロット棚の中心 */
  slotY: 1.3,
  slotZ: 4.35,
  /** プレイヤーから見て左から 1→4 に並ぶよう、東 (x が大きい方) が 1 番 */
  slotStartX: -0.9,
  slotStepX: -0.4,
} as const;

/** 監視カメラ小物。PC の CAMERA アプリのラベルと対応。 */
export const CAMERA_PROPS = [
  { id: "CAM-1", position: { x: -5.4, y: 2.85, z: -4.1 } },
  { id: "CAM-2", position: { x: 5.4, y: 2.85, z: -4.1 } },
  { id: "CAM-3", position: { x: 5.4, y: 2.85, z: 4.1 } },
  { id: "CAM-4", position: { x: -5.4, y: 2.85, z: 4.1 } },
] as const;

/* ------------------------------------------------------------------ */
/* P6: 視点整列パズル                                                  */
/* ------------------------------------------------------------------ */

/**
 * 観察窓の「X」印。ここから +X 方向を見ると、
 * 天井から吊られた 4 つの黒いオブジェクトが重なって 404 に見える。
 */
export const OBSERVE_MARK = { x: -8.0, y: 1.62, z: -0.6 } as const;

/** グリフを定義する基準面までの距離 */
export const GLYPH_REFERENCE_DISTANCE = 7.0;

/** 4 つの吊りオブジェクトの奥行き (観測点からの距離) */
export const GLYPH_GROUP_DEPTHS = [4.6, 5.4, 6.2, 7.0] as const;

export interface GlyphRect {
  /** 水平方向オフセット (基準面上) */
  u: number;
  /** 垂直方向オフセット (基準面上・目の高さ基準) */
  v: number;
  width: number;
  height: number;
  /** どの吊りオブジェクトに属するか */
  group: 0 | 1 | 2 | 3;
}

const BAR = 0.15;
const CELL_H = 1.0;
const GLYPH_V = 1.0;

/** 「4」を構成する 3 本の板 */
function four(u0: number, group: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3]): GlyphRect[] {
  return [
    { u: u0 + 0.2, v: GLYPH_V, width: BAR, height: CELL_H, group: group[0] },
    { u: u0 - 0.22, v: GLYPH_V + 0.26, width: BAR, height: 0.48, group: group[1] },
    { u: u0, v: GLYPH_V, width: 0.72, height: BAR, group: group[2] },
  ];
}

/** 「0」を構成する 4 本の板 */
function zero(u0: number, group: [0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3, 0 | 1 | 2 | 3]): GlyphRect[] {
  return [
    { u: u0, v: GLYPH_V + 0.43, width: 0.72, height: BAR, group: group[0] },
    { u: u0, v: GLYPH_V - 0.43, width: 0.72, height: BAR, group: group[1] },
    { u: u0 - 0.28, v: GLYPH_V, width: BAR, height: CELL_H, group: group[2] },
    { u: u0 + 0.28, v: GLYPH_V, width: BAR, height: CELL_H, group: group[3] },
  ];
}

/**
 * 404 のグリフ。板は 4 グループへ意図的にばらしてあるので、
 * 単体では数字に見えない。
 */
export const GLYPH_RECTS: GlyphRect[] = [
  ...four(-0.95, [0, 2, 1]),
  ...zero(0.0, [3, 0, 1, 2]),
  ...four(0.95, [3, 1, 0]),
];
