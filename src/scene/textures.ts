import * as THREE from "three";

/**
 * 室内の文字・図版は Canvas から作る。
 * フォントファイルや画像を持たずに済み、読み込み待ちも起きない。
 */

const PALETTE = {
  void: "#05070a",
  slate: "#0d141c",
  mist: "#c4d2de",
  dim: "#7b8b9a",
  phos: "#5fd3b2",
  ember: "#e2603f",
  paper: "#e9e3d3",
  ink: "#1d2126",
} as const;

const created: THREE.Texture[] = [];

function canvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  return [element, ctx];
}

function toTexture(element: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  created.push(texture);
  return texture;
}

const MONO = '600 {size}px ui-monospace, "SF Mono", Menlo, Consolas, monospace';

function mono(size: number): string {
  return MONO.replace("{size}", String(size));
}

export interface TextTextureOptions {
  width?: number;
  height?: number;
  background?: string;
  color?: string;
  fontSize?: number;
  lineHeight?: number;
  letterSpacing?: number;
  align?: CanvasTextAlign;
  padding?: number;
  transparent?: boolean;
}

/** 複数行テキストのテクスチャ。壁の表示・ラベル・紙資料に使う。 */
export function textTexture(lines: string[], options: TextTextureOptions = {}): THREE.CanvasTexture {
  const {
    width = 512,
    height = 256,
    background = PALETTE.slate,
    color = PALETTE.mist,
    fontSize = 44,
    lineHeight = 1.35,
    letterSpacing = 2,
    align = "center",
    padding = 24,
    transparent = false,
  } = options;

  const [element, ctx] = canvas(width, height);
  if (!transparent) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.fillStyle = color;
  ctx.font = mono(fontSize);
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  if ("letterSpacing" in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${letterSpacing}px`;
  }

  const step = fontSize * lineHeight;
  const total = (lines.length - 1) * step;
  const x = align === "left" ? padding : align === "right" ? width - padding : width / 2;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, height / 2 - total / 2 + index * step);
  });
  return toTexture(element);
}

/** 4:17 で止まった壁時計の文字盤。 */
export function clockFaceTexture(hours: number, minutes: number): THREE.CanvasTexture {
  const size = 512;
  const [element, ctx] = canvas(size, size);
  const center = size / 2;

  ctx.fillStyle = "#dfe6ec";
  ctx.beginPath();
  ctx.arc(center, center, center - 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#8b98a5";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(center, center, center - 14, 0, Math.PI * 2);
  ctx.stroke();

  // 目盛り
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const long = i % 3 === 0;
    const outer = center - 32;
    const inner = outer - (long ? 40 : 22);
    ctx.strokeStyle = long ? PALETTE.ink : "#6d7a86";
    ctx.lineWidth = long ? 12 : 6;
    ctx.beginPath();
    ctx.moveTo(center + Math.sin(angle) * inner, center - Math.cos(angle) * inner);
    ctx.lineTo(center + Math.sin(angle) * outer, center - Math.cos(angle) * outer);
    ctx.stroke();
  }

  const hand = (angle: number, length: number, lineWidth: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.sin(angle) * length, center - Math.cos(angle) * length);
    ctx.stroke();
  };

  const minuteAngle = (minutes / 60) * Math.PI * 2;
  const hourAngle = ((hours % 12) / 12 + minutes / 720) * Math.PI * 2;
  hand(hourAngle, center * 0.5, 20, PALETTE.ink);
  hand(minuteAngle, center * 0.74, 14, PALETTE.ink);

  ctx.fillStyle = PALETTE.ember;
  ctx.beginPath();
  ctx.arc(center, center, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#8b98a5";
  ctx.font = mono(28);
  ctx.textAlign = "center";
  ctx.fillText("NEXUS", center, center * 1.45);

  return toTexture(element);
}

/**
 * 絵画。研究施設の校正チャートという設定で、
 * 4 枚それぞれ違うパターンを描く (装飾ではなく光学試験図版)。
 */
export function paintingTexture(index: number): THREE.CanvasTexture {
  const width = 384;
  const height = 512;
  const [element, ctx] = canvas(width, height);
  ctx.fillStyle = "#20293380";
  ctx.fillStyle = "#222b34";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#54677a";
  ctx.lineWidth = 2.5;
  const variants = [
    () => {
      for (let i = 1; i < 12; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, (height / 12) * i);
        ctx.lineTo(width, (height / 12) * i + (i % 2 ? 18 : -18));
        ctx.stroke();
      }
    },
    () => {
      for (let i = 1; i < 9; i += 1) {
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, i * 26, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
    () => {
      for (let i = 0; i < 10; i += 1) {
        ctx.beginPath();
        ctx.moveTo((width / 10) * i, 0);
        ctx.lineTo(width - (width / 10) * i, height);
        ctx.stroke();
      }
    },
    () => {
      for (let y = 0; y < 8; y += 1) {
        for (let x = 0; x < 6; x += 1) {
          if ((x + y) % 2 === 0) continue;
          ctx.strokeRect((width / 6) * x + 8, (height / 8) * y + 8, width / 6 - 16, height / 8 - 16);
        }
      }
    },
  ];
  variants[index % variants.length]?.();

  ctx.fillStyle = "#6d8091";
  ctx.font = mono(22);
  ctx.textAlign = "left";
  ctx.fillText(`PLATE ${String.fromCharCode(65 + index)}`, 18, height - 26);
  return toTexture(element);
}

/** Optical Filter 越しに見える数字。 */
export function filterDigitTexture(digit: number): THREE.CanvasTexture {
  const [element, ctx] = canvas(256, 340);
  ctx.clearRect(0, 0, 256, 340);
  ctx.fillStyle = PALETTE.phos;
  ctx.font = mono(220);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(digit), 128, 175);
  return toTexture(element);
}

/** 床の X 印 (P6 の立ち位置)。 */
export function floorMarkTexture(): THREE.CanvasTexture {
  const size = 256;
  const [element, ctx] = canvas(size, size);
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = PALETTE.ember;
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  const pad = 56;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(size - pad, size - pad);
  ctx.moveTo(size - pad, pad);
  ctx.lineTo(pad, size - pad);
  ctx.stroke();
  ctx.strokeStyle = "rgba(226,96,63,0.45)";
  ctx.lineWidth = 6;
  ctx.strokeRect(24, 24, size - 48, size - 48);
  ctx.fillStyle = "rgba(226,96,63,0.8)";
  ctx.font = mono(26);
  ctx.textAlign = "center";
  ctx.fillText("STAND HERE", size / 2, size - 14);
  return toTexture(element);
}

/** モニタ画面。ロック中とデスクトップで見た目を変える。 */
export function monitorTexture(unlocked: boolean): THREE.CanvasTexture {
  const [element, ctx] = canvas(512, 320);
  ctx.fillStyle = unlocked ? "#0b1a1a" : "#0a1118";
  ctx.fillRect(0, 0, 512, 320);

  ctx.fillStyle = "rgba(95,211,178,0.06)";
  for (let y = 0; y < 320; y += 4) ctx.fillRect(0, y, 512, 1);

  ctx.font = mono(26);
  ctx.textAlign = "left";
  if (unlocked) {
    ctx.fillStyle = PALETTE.phos;
    ctx.fillText("NEXUS OS", 32, 60);
    ctx.font = mono(20);
    ctx.fillStyle = PALETTE.mist;
    ctx.fillText("CHAT", 32, 130);
    ctx.fillText("FILES", 32, 170);
    ctx.fillText("CAMERA", 32, 210);
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText("SESSION: DR.K", 32, 280);
  } else {
    ctx.fillStyle = PALETTE.mist;
    ctx.fillText("LOCKED", 32, 60);
    ctx.font = mono(20);
    ctx.fillStyle = PALETTE.dim;
    ctx.fillText("PASSWORD REQUIRED", 32, 120);
    ctx.strokeStyle = "#243240";
    ctx.strokeRect(32, 150, 300, 44);
    ctx.fillStyle = PALETTE.phos;
    ctx.fillText("_", 44, 178);
  }
  return toTexture(element);
}

/** 端末画面 (隠し部屋)。 */
export function terminalTexture(lines: string[], accent: string = PALETTE.phos): THREE.CanvasTexture {
  const [element, ctx] = canvas(512, 384);
  ctx.fillStyle = "#081014";
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = "rgba(95,211,178,0.05)";
  for (let y = 0; y < 384; y += 4) ctx.fillRect(0, y, 512, 1);
  ctx.font = mono(24);
  ctx.textAlign = "left";
  ctx.fillStyle = accent;
  lines.forEach((line, index) => {
    ctx.fillText(line, 34, 64 + index * 42);
  });
  return toTexture(element);
}

/** EXIT サイン。 */
export function exitSignTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(256, 96);
  ctx.fillStyle = "#0b1418";
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = "#eaf4f6";
  ctx.font = mono(52);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("EXIT", 128, 50);
  return toTexture(element);
}

/** 床。1m ごとの目地でスケール感と奥行きを出す。 */
export function floorTexture(): THREE.CanvasTexture {
  const size = 256;
  const [element, ctx] = canvas(size, size);
  ctx.fillStyle = "#232a32";
  ctx.fillRect(0, 0, size, size);

  // 打ちっぱなしのムラ
  for (let i = 0; i < 900; i += 1) {
    const alpha = 0.02 + Math.random() * 0.05;
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${alpha})`;
    const r = 2 + Math.random() * 12;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(10,14,18,0.85)";
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, size, size);

  const texture = toTexture(element);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** 壁。縦の継ぎ目を薄く入れて平面に情報を持たせる。 */
export function wallTexture(): THREE.CanvasTexture {
  const width = 256;
  const height = 256;
  const [element, ctx] = canvas(width, height);
  ctx.fillStyle = "#39424c";
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 500; i += 1) {
    ctx.fillStyle = `rgba(0,0,0,${0.015 + Math.random() * 0.03})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 3 + Math.random() * 18, 2);
  }

  ctx.strokeStyle = "rgba(12,16,20,0.5)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width - 1, 0);
  ctx.lineTo(width - 1, height);
  ctx.stroke();

  const texture = toTexture(element);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** 設備のラベル板。ハザードストライプ付き。 */
export function plateTexture(
  lines: string[],
  options: { accent?: string; hazard?: boolean } = {},
): THREE.CanvasTexture {
  const width = 512;
  const height = 256;
  const [element, ctx] = canvas(width, height);
  const accent = options.accent ?? PALETTE.phos;

  ctx.fillStyle = "#333c45";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "rgba(10,14,18,0.6)";
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, width - 6, height - 6);

  if (options.hazard) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, height - 34, width, 34);
    ctx.clip();
    for (let x = -40; x < width + 40; x += 40) {
      ctx.fillStyle = x % 80 === 0 ? "#c9a13a" : "#20262c";
      ctx.beginPath();
      ctx.moveTo(x, height);
      ctx.lineTo(x + 20, height - 34);
      ctx.lineTo(x + 60, height - 34);
      ctx.lineTo(x + 40, height);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.fillStyle = accent;
  ctx.font = mono(40);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  lines.forEach((line, index) => {
    ctx.fillText(line, 34, 78 + index * 54);
  });

  // 固定ボルト
  ctx.fillStyle = "#8b98a5";
  for (const [x, y] of [[20, 20], [width - 20, 20], [20, height - 54], [width - 20, height - 54]]) {
    ctx.beginPath();
    ctx.arc(x!, y!, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  return toTexture(element);
}

/** 生成済みテクスチャの一括破棄。 */
/**
 * ネオンの表示。Canvas の shadowBlur で本物の滲みを作るので、
 * 発光マテリアルに載せるだけで管と同じ光り方になる。
 * 和文が要るためフォントは mono ではなくゴシック系を使う。
 */
const GOTHIC =
  '700 {size}px "Hiragino Sans", "Noto Sans JP", "Yu Gothic UI", "Meiryo", system-ui, sans-serif';

export function neonSignTexture(text: string, color: string, fontSize = 96): THREE.CanvasTexture {
  const padding = Math.round(fontSize * 0.55);
  const [element, ctx] = canvas(1024, Math.round(fontSize * 1.9 + padding));
  ctx.font = GOTHIC.replace("{size}", String(fontSize));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const x = element.width / 2;
  const y = element.height / 2;

  // 外側の滲み → 内側の芯、の順に重ねる
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  for (const blur of [fontSize * 0.9, fontSize * 0.45]) {
    ctx.shadowBlur = blur;
    ctx.fillText(text, x, y);
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.82;
  ctx.fillText(text, x, y);
  return toTexture(element);
}

/** 床に落ちる光の筋。長い平面に貼って管の映り込みにする。 */
export function neonStreakTexture(): THREE.CanvasTexture {
  const size = 256;
  const [element, ctx] = canvas(size, size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.92)");
  gradient.addColorStop(0.18, "rgba(255,255,255,0.42)");
  gradient.addColorStop(0.45, "rgba(255,255,255,0.14)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return toTexture(element);
}

/**
 * 水たまりの形 (アルファマスク)。輪郭が円だと嘘に見えるので、
 * 決まったオフセットの円を重ねて崩す (毎回同じ形にする)。
 */
export function puddleMaskTexture(): THREE.CanvasTexture {
  const size = 256;
  const [element, ctx] = canvas(size, size);
  const blobs: [number, number, number][] = [
    [0.5, 0.5, 0.34],
    [0.36, 0.44, 0.2],
    [0.64, 0.56, 0.22],
    [0.46, 0.66, 0.16],
    [0.58, 0.38, 0.14],
    [0.3, 0.58, 0.1],
  ];
  for (const [cx, cy, radius] of blobs) {
    const gradient = ctx.createRadialGradient(
      cx * size,
      cy * size,
      radius * size * 0.35,
      cx * size,
      cy * size,
      radius * size,
    );
    gradient.addColorStop(0, "rgba(255,255,255,0.95)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.5)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
  }
  return toTexture(element);
}

/** 機器の表示灯の列。点の並びで「動いている設備」に見せる。 */
export function indicatorTexture(color: string, rows = 6, columns = 3): THREE.CanvasTexture {
  const width = 128;
  const height = 256;
  const [element, ctx] = canvas(width, height);
  ctx.fillStyle = "#05070a";
  ctx.fillRect(0, 0, width, height);
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      // 3 つに 1 つは消灯させ、規則的な点滅盤に見えないようにする
      const lit = (row * columns + column) % 3 !== 1;
      ctx.fillStyle = lit ? color : "#141a20";
      ctx.beginPath();
      ctx.arc(
        ((column + 0.5) / columns) * width,
        ((row + 0.5) / rows) * height,
        width / (columns * 5),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
  return toTexture(element);
}

export function disposeTextures(): void {
  for (const texture of created) texture.dispose();
  created.length = 0;
}

export { PALETTE };
