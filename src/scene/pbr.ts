import * as THREE from "three";

/**
 * 手続き的な PBR マップ生成。
 *
 * 外部の画像アセットを持たない方針 (docs/decisions.md D-010) のまま
 * 実機 GPU 相応の質感を出すため、albedo / normal / roughness を
 * Canvas から作る。高さマップから Sobel で法線を求めるので、
 * 目地やルーバーが実際に凹凸として陰影を持つ。
 */

const created: THREE.Texture[] = [];

export interface SurfaceMaps {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
}

type Ctx = CanvasRenderingContext2D;

function canvas(size: number): [HTMLCanvasElement, Ctx] {
  const element = document.createElement("canvas");
  element.width = size;
  element.height = size;
  const ctx = element.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas context unavailable");
  return [element, ctx];
}

function register(texture: THREE.Texture, srgb: boolean): THREE.Texture {
  texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  created.push(texture);
  return texture;
}

/** 高さマップ (グレースケール) から法線マップを作る。 */
function heightToNormal(source: HTMLCanvasElement, strength = 2.2): THREE.Texture {
  const size = source.width;
  const sourceCtx = source.getContext("2d");
  if (!sourceCtx) throw new Error("2D canvas context unavailable");
  const height = sourceCtx.getImageData(0, 0, size, size).data;
  const [target, ctx] = canvas(size);
  const out = ctx.createImageData(size, size);

  const at = (x: number, y: number): number => {
    const px = ((x + size) % size) + ((y + size) % size) * size;
    return height[px * 4]! / 255;
  };

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // Sobel
      const dx =
        at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) -
        (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1));
      const dy =
        at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1) -
        (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1));

      let nx = dx * strength;
      let ny = dy * strength;
      const nz = 1;
      const length = Math.hypot(nx, ny, nz);
      nx /= length;
      ny /= length;

      const index = (x + y * size) * 4;
      out.data[index] = (nx * 0.5 + 0.5) * 255;
      out.data[index + 1] = (ny * 0.5 + 0.5) * 255;
      out.data[index + 2] = (nz / length) * 255;
      out.data[index + 3] = 255;
    }
  }
  ctx.putImageData(out, 0, 0);
  return register(new THREE.CanvasTexture(target), false);
}

/** 値ノイズ。ムラや汚れの下地に使う。 */
function blotches(ctx: Ctx, size: number, count: number, colors: string[], radius: [number, number]): void {
  for (let i = 0; i < count; i += 1) {
    const r = radius[0] + Math.random() * (radius[1] - radius[0]);
    const x = Math.random() * size;
    const y = Math.random() * size;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    const color = colors[Math.floor(Math.random() * colors.length)]!;
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function grain(ctx: Ctx, size: number, amount: number, alpha: number): void {
  for (let i = 0; i < amount; i += 1) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${alpha})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1);
  }
}

/* ------------------------------------------------------------------ */
/* 床: 研磨コンクリート + 1m 目地                                      */
/* ------------------------------------------------------------------ */

export function concreteFloorMaps(): SurfaceMaps {
  const size = 1024;
  const cells = 4; // テクスチャ 1 枚に 4x4 タイル (= 4m 角で 1 周)
  const step = size / cells;

  const [albedoCanvas, albedo] = canvas(size);
  albedo.fillStyle = "#5d646c";
  albedo.fillRect(0, 0, size, size);
  blotches(albedo, size, 260, ["rgba(255,255,255,0.05)", "rgba(0,0,0,0.07)", "rgba(150,170,180,0.04)"], [30, 190]);
  grain(albedo, size, 90000, 0.05);

  // 目地
  albedo.strokeStyle = "rgba(24,28,33,0.85)";
  albedo.lineWidth = 4;
  for (let i = 0; i <= cells; i += 1) {
    albedo.beginPath();
    albedo.moveTo(i * step, 0);
    albedo.lineTo(i * step, size);
    albedo.moveTo(0, i * step);
    albedo.lineTo(size, i * step);
    albedo.stroke();
  }

  const [heightCanvas, height] = canvas(size);
  height.fillStyle = "#b4b4b4";
  height.fillRect(0, 0, size, size);
  blotches(height, size, 140, ["rgba(255,255,255,0.10)", "rgba(0,0,0,0.10)"], [40, 200]);
  height.strokeStyle = "#1a1a1a";
  height.lineWidth = 5;
  for (let i = 0; i <= cells; i += 1) {
    height.beginPath();
    height.moveTo(i * step, 0);
    height.lineTo(i * step, size);
    height.moveTo(0, i * step);
    height.lineTo(size, i * step);
    height.stroke();
  }
  grain(height, size, 60000, 0.08);

  const [roughCanvas, rough] = canvas(size);
  rough.fillStyle = "#8f8f8f"; // 研磨コンクリート: 濡れて見えない程度に抑える
  rough.fillRect(0, 0, size, size);
  blotches(rough, size, 200, ["rgba(255,255,255,0.16)", "rgba(0,0,0,0.12)"], [40, 220]);
  rough.strokeStyle = "rgba(230,230,230,0.9)"; // 目地はざらつく
  rough.lineWidth = 5;
  for (let i = 0; i <= cells; i += 1) {
    rough.beginPath();
    rough.moveTo(i * step, 0);
    rough.lineTo(i * step, size);
    rough.moveTo(0, i * step);
    rough.lineTo(size, i * step);
    rough.stroke();
  }

  return {
    map: register(new THREE.CanvasTexture(albedoCanvas), true),
    normalMap: heightToNormal(heightCanvas, 1.6),
    roughnessMap: register(new THREE.CanvasTexture(roughCanvas), false),
  };
}

/* ------------------------------------------------------------------ */
/* 壁: 塗装コンクリート                                                */
/* ------------------------------------------------------------------ */

export function paintedWallMaps(): SurfaceMaps {
  const size = 512;
  const [albedoCanvas, albedo] = canvas(size);
  albedo.fillStyle = "#7f878f";
  albedo.fillRect(0, 0, size, size);
  blotches(albedo, size, 120, ["rgba(255,255,255,0.045)", "rgba(0,0,0,0.05)"], [40, 180]);
  // 下端に向かう薄い汚れ
  const dirt = albedo.createLinearGradient(0, size * 0.7, 0, size);
  dirt.addColorStop(0, "rgba(0,0,0,0)");
  dirt.addColorStop(1, "rgba(20,24,28,0.20)");
  albedo.fillStyle = dirt;
  albedo.fillRect(0, size * 0.7, size, size * 0.3);
  grain(albedo, size, 30000, 0.045);
  // パネルの継ぎ目
  albedo.strokeStyle = "rgba(40,46,52,0.55)";
  albedo.lineWidth = 3;
  albedo.beginPath();
  albedo.moveTo(size - 2, 0);
  albedo.lineTo(size - 2, size);
  albedo.stroke();

  const [heightCanvas, height] = canvas(size);
  height.fillStyle = "#a8a8a8";
  height.fillRect(0, 0, size, size);
  // 塗装のゆず肌。粒を大きく・薄くして、荒い石壁に見えないようにする。
  for (let i = 0; i < 900; i += 1) {
    const r = 4 + Math.random() * 12;
    height.fillStyle = `rgba(255,255,255,${0.02 + Math.random() * 0.04})`;
    height.beginPath();
    height.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    height.fill();
  }
  height.strokeStyle = "#2a2a2a";
  height.lineWidth = 4;
  height.beginPath();
  height.moveTo(size - 2, 0);
  height.lineTo(size - 2, size);
  height.stroke();

  const [roughCanvas, rough] = canvas(size);
  rough.fillStyle = "#a6a6a6";
  rough.fillRect(0, 0, size, size);
  blotches(rough, size, 90, ["rgba(255,255,255,0.10)", "rgba(0,0,0,0.10)"], [50, 200]);

  return {
    map: register(new THREE.CanvasTexture(albedoCanvas), true),
    normalMap: heightToNormal(heightCanvas, 0.45),
    roughnessMap: register(new THREE.CanvasTexture(roughCanvas), false),
  };
}

/* ------------------------------------------------------------------ */
/* 天井: 目地入りの塗装パネル                                          */
/* ------------------------------------------------------------------ */

export function ceilingMaps(): SurfaceMaps {
  const size = 512;
  const step = size / 2;
  const [albedoCanvas, albedo] = canvas(size);
  albedo.fillStyle = "#8f979e";
  albedo.fillRect(0, 0, size, size);
  blotches(albedo, size, 60, ["rgba(0,0,0,0.05)"], [60, 200]);
  albedo.strokeStyle = "rgba(48,54,60,0.75)";
  albedo.lineWidth = 6;
  for (let i = 0; i <= 2; i += 1) {
    albedo.beginPath();
    albedo.moveTo(i * step, 0);
    albedo.lineTo(i * step, size);
    albedo.moveTo(0, i * step);
    albedo.lineTo(size, i * step);
    albedo.stroke();
  }

  const [heightCanvas, height] = canvas(size);
  height.fillStyle = "#c0c0c0";
  height.fillRect(0, 0, size, size);
  height.strokeStyle = "#202020";
  height.lineWidth = 8;
  for (let i = 0; i <= 2; i += 1) {
    height.beginPath();
    height.moveTo(i * step, 0);
    height.lineTo(i * step, size);
    height.moveTo(0, i * step);
    height.lineTo(size, i * step);
    height.stroke();
  }

  const [roughCanvas, rough] = canvas(size);
  rough.fillStyle = "#c4c4c4";
  rough.fillRect(0, 0, size, size);

  return {
    map: register(new THREE.CanvasTexture(albedoCanvas), true),
    normalMap: heightToNormal(heightCanvas, 1.1),
    roughnessMap: register(new THREE.CanvasTexture(roughCanvas), false),
  };
}

/* ------------------------------------------------------------------ */
/* 金属: ヘアライン仕上げ / 塗装金属                                   */
/* ------------------------------------------------------------------ */

export function brushedMetalMaps(): SurfaceMaps {
  const size = 512;
  const [albedoCanvas, albedo] = canvas(size);
  albedo.fillStyle = "#9aa3ab";
  albedo.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i += 1) {
    const y = Math.random() * size;
    albedo.strokeStyle = `rgba(${Math.random() > 0.5 ? "255,255,255" : "0,0,0"},${0.02 + Math.random() * 0.05})`;
    albedo.lineWidth = 1;
    albedo.beginPath();
    albedo.moveTo(Math.random() * size, y);
    albedo.lineTo(Math.random() * size, y + (Math.random() - 0.5) * 2);
    albedo.stroke();
  }

  const [heightCanvas, height] = canvas(size);
  height.fillStyle = "#808080";
  height.fillRect(0, 0, size, size);
  for (let i = 0; i < 3400; i += 1) {
    const y = Math.random() * size;
    height.strokeStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.14})`;
    height.lineWidth = 1;
    height.beginPath();
    height.moveTo(0, y);
    height.lineTo(size, y + (Math.random() - 0.5) * 3);
    height.stroke();
  }

  const [roughCanvas, rough] = canvas(size);
  rough.fillStyle = "#4e4e4e";
  rough.fillRect(0, 0, size, size);
  for (let i = 0; i < 1800; i += 1) {
    const y = Math.random() * size;
    rough.strokeStyle = `rgba(255,255,255,${0.06 + Math.random() * 0.12})`;
    rough.lineWidth = 1 + Math.random() * 2;
    rough.beginPath();
    rough.moveTo(0, y);
    rough.lineTo(size, y);
    rough.stroke();
  }

  return {
    map: register(new THREE.CanvasTexture(albedoCanvas), true),
    normalMap: heightToNormal(heightCanvas, 0.7),
    roughnessMap: register(new THREE.CanvasTexture(roughCanvas), false),
  };
}

export function paintedMetalMaps(): SurfaceMaps {
  const size = 512;
  const [albedoCanvas, albedo] = canvas(size);
  albedo.fillStyle = "#6d757d";
  albedo.fillRect(0, 0, size, size);
  blotches(albedo, size, 70, ["rgba(255,255,255,0.04)", "rgba(0,0,0,0.06)"], [40, 160]);
  // 使用感 (角の擦れ)
  for (let i = 0; i < 90; i += 1) {
    albedo.strokeStyle = `rgba(180,190,200,${0.05 + Math.random() * 0.12})`;
    albedo.lineWidth = 1 + Math.random();
    const x = Math.random() * size;
    const y = Math.random() * size;
    albedo.beginPath();
    albedo.moveTo(x, y);
    albedo.lineTo(x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 30);
    albedo.stroke();
  }
  grain(albedo, size, 22000, 0.04);

  const [heightCanvas, height] = canvas(size);
  height.fillStyle = "#a0a0a0";
  height.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i += 1) {
    height.fillStyle = `rgba(255,255,255,${0.05 + Math.random() * 0.1})`;
    height.beginPath();
    height.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 2.4, 0, Math.PI * 2);
    height.fill();
  }

  const [roughCanvas, rough] = canvas(size);
  rough.fillStyle = "#8c8c8c";
  rough.fillRect(0, 0, size, size);
  blotches(rough, size, 80, ["rgba(255,255,255,0.12)", "rgba(0,0,0,0.10)"], [40, 180]);

  return {
    map: register(new THREE.CanvasTexture(albedoCanvas), true),
    normalMap: heightToNormal(heightCanvas, 0.6),
    roughnessMap: register(new THREE.CanvasTexture(roughCanvas), false),
  };
}

/* ------------------------------------------------------------------ */
/* 小物用                                                             */
/* ------------------------------------------------------------------ */

/** キーボードのキー面。 */
export function keyboardMaps(): SurfaceMaps {
  const size = 512;
  const cols = 15;
  const rows = 6;
  const [albedoCanvas, albedo] = canvas(size);
  albedo.fillStyle = "#22272c";
  albedo.fillRect(0, 0, size, size);
  const [heightCanvas, height] = canvas(size);
  height.fillStyle = "#3a3a3a";
  height.fillRect(0, 0, size, size);

  const cw = size / cols;
  const ch = size / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = c * cw + 2;
      const y = r * ch + 2;
      albedo.fillStyle = "#2e343a";
      albedo.fillRect(x, y, cw - 4, ch - 4);
      albedo.fillStyle = "rgba(255,255,255,0.06)";
      albedo.fillRect(x, y, cw - 4, 2);
      height.fillStyle = "#d0d0d0";
      height.fillRect(x, y, cw - 4, ch - 4);
    }
  }

  const [roughCanvas, rough] = canvas(size);
  rough.fillStyle = "#b0b0b0";
  rough.fillRect(0, 0, size, size);

  return {
    map: register(new THREE.CanvasTexture(albedoCanvas), true),
    normalMap: heightToNormal(heightCanvas, 2.6),
    roughnessMap: register(new THREE.CanvasTexture(roughCanvas), false),
  };
}

/** 通気口のルーバー。 */
export function ventMaps(): SurfaceMaps {
  const size = 256;
  const [albedoCanvas, albedo] = canvas(size);
  albedo.fillStyle = "#4a5158";
  albedo.fillRect(0, 0, size, size);
  const [heightCanvas, height] = canvas(size);
  height.fillStyle = "#909090";
  height.fillRect(0, 0, size, size);
  for (let y = 6; y < size; y += 18) {
    albedo.fillStyle = "rgba(10,12,15,0.85)";
    albedo.fillRect(0, y, size, 9);
    albedo.fillStyle = "rgba(255,255,255,0.08)";
    albedo.fillRect(0, y + 9, size, 2);
    height.fillStyle = "#181818";
    height.fillRect(0, y, size, 9);
  }
  const [roughCanvas, rough] = canvas(size);
  rough.fillStyle = "#7a7a7a";
  rough.fillRect(0, 0, size, size);

  return {
    map: register(new THREE.CanvasTexture(albedoCanvas), true),
    normalMap: heightToNormal(heightCanvas, 3.0),
    roughnessMap: register(new THREE.CanvasTexture(roughCanvas), false),
  };
}

/** 床のハザードストライプ (EXIT DOOR 前の安全表示)。 */
export function hazardStripTexture(): THREE.Texture {
  const width = 512;
  const height = 128;
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.fillStyle = "#1d2227";
  ctx.fillRect(0, 0, width, height);
  for (let x = -height; x < width + height; x += 64) {
    ctx.fillStyle = "#8a6f2c";
    ctx.beginPath();
    ctx.moveTo(x, height);
    ctx.lineTo(x + 32, 0);
    ctx.lineTo(x + 64, 0);
    ctx.lineTo(x + 32, height);
    ctx.closePath();
    ctx.fill();
  }
  // 擦れ
  for (let i = 0; i < 400; i += 1) {
    ctx.fillStyle = `rgba(35,40,46,${0.05 + Math.random() * 0.25})`;
    ctx.fillRect(Math.random() * width, Math.random() * height, 2 + Math.random() * 26, 1 + Math.random() * 3);
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  created.push(texture);
  return texture;
}

/** 壁のステンシル文字 (透過)。 */
export function stencilTexture(text: string, color = "#aab6c0"): THREE.Texture {
  const width = 512;
  const height = 128;
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  const ctx = element.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable");
  ctx.clearRect(0, 0, width, height);
  ctx.font = '700 74px ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = 0.55;
  ctx.fillText(text, width / 2, height / 2);
  // ステンシルらしく所々欠ける
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 90; i += 1) {
    ctx.fillStyle = "#000";
    ctx.fillRect(Math.random() * width, Math.random() * height, 2 + Math.random() * 10, 1 + Math.random() * 5);
  }
  ctx.globalCompositeOperation = "source-over";
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  created.push(texture);
  return texture;
}

/**
 * 発光パネルの面。中央がわずかに明るい乳白色のディフューザ。
 * P6 の影絵の背景になるので、bloom のしきい値は越えない明度に抑える。
 */
export function diffuserTexture(): THREE.Texture {
  const size = 256;
  const [element, ctx] = canvas(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.72);
  gradient.addColorStop(0, "#e6f1f6");
  gradient.addColorStop(0.65, "#cddde6");
  gradient.addColorStop(1, "#a8bcc8");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  // ディフューザのドット
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  for (let y = 4; y < size; y += 9) {
    for (let x = 4; x < size; x += 9) {
      ctx.beginPath();
      ctx.arc(x, y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  created.push(texture);
  return texture;
}

/**
 * 磨いた床に映る天井灯の滲み。
 * 実反射は使わず、加算合成の面で「艶」だけを足す。
 */
export function floorSheenTexture(): THREE.Texture {
  const size = 256;
  const [element, ctx] = canvas(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(210,232,244,0.55)");
  gradient.addColorStop(0.35, "rgba(190,215,230,0.20)");
  gradient.addColorStop(1, "rgba(190,215,230,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  created.push(texture);
  return texture;
}

/** 埃の粒 (Points 用の丸いスプライト)。 */
export function dustSprite(): THREE.Texture {
  const size = 64;
  const [element, ctx] = canvas(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,0.9)");
  gradient.addColorStop(0.4, "rgba(255,255,255,0.25)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  created.push(texture);
  return texture;
}

/** 網入りガラス (EXIT DOOR の小窓)。 */
export function wiredGlassTexture(): THREE.Texture {
  const size = 256;
  const [element, ctx] = canvas(size);
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(190,205,215,0.32)";
  ctx.lineWidth = 2;
  for (let i = 0; i <= size; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(element);
  texture.colorSpace = THREE.SRGBColorSpace;
  created.push(texture);
  return texture;
}

export function setRepeat(maps: SurfaceMaps, x: number, y: number): SurfaceMaps {
  for (const texture of [maps.map, maps.normalMap, maps.roughnessMap]) {
    texture.repeat.set(x, y);
  }
  return maps;
}

/** マップを共有したまま別 repeat で使うためのクローン。 */
export function cloneMaps(maps: SurfaceMaps, x: number, y: number): SurfaceMaps {
  const clone = {
    map: maps.map.clone(),
    normalMap: maps.normalMap.clone(),
    roughnessMap: maps.roughnessMap.clone(),
  };
  for (const texture of Object.values(clone)) {
    texture.needsUpdate = true;
    created.push(texture);
  }
  return setRepeat(clone, x, y);
}

export function disposePbrTextures(): void {
  for (const texture of created) texture.dispose();
  created.length = 0;
}
