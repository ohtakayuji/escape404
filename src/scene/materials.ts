import * as THREE from "three";
import {
  brushedMetalMaps,
  diffuserTexture,
  ceilingMaps,
  cloneMaps,
  concreteFloorMaps,
  keyboardMaps,
  paintedMetalMaps,
  paintedWallMaps,
  setRepeat,
  ventMaps,
  type SurfaceMaps,
} from "./pbr";

/**
 * 使い回すマテリアル。破棄漏れを防ぐため生成はここに集約する。
 * 手続き的に作った albedo / normal / roughness を割り当てるので、
 * すべての面が「材質」として陰影を持つ。
 */
export class MaterialLibrary {
  private readonly pool: THREE.Material[] = [];

  private readonly floorMaps = setRepeat(concreteFloorMaps(), 3, 2.25);
  /** 壁は MeshFactory.boxTiled が UV 側で密度を合わせるので repeat は 1 にする */
  private readonly wallMaps = setRepeat(paintedWallMaps(), 1, 1);
  private readonly ceilMaps = setRepeat(ceilingMaps(), 5, 3.75);
  private readonly brushed = setRepeat(brushedMetalMaps(), 2, 2);
  private readonly painted = setRepeat(paintedMetalMaps(), 2, 2);

  /* --- 躯体 --- */
  readonly floor = this.pbr(this.floorMaps, {
    color: 0xffffff,
    metalness: 0.03,
    envMapIntensity: 0.5,
    normalScale: new THREE.Vector2(0.7, 0.7),
  });
  readonly floorHidden = this.pbr(cloneMaps(this.floorMaps, 1, 1.25), {
    color: 0xe8e2dc,
    metalness: 0.03,
    envMapIntensity: 0.5,
    normalScale: new THREE.Vector2(0.7, 0.7),
  });
  readonly wall = this.pbr(this.wallMaps, {
    color: 0xffffff,
    metalness: 0.02,
    envMapIntensity: 0.35,
    normalScale: new THREE.Vector2(0.4, 0.4),
  });
  readonly wallDark = this.pbr(cloneMaps(this.wallMaps, 1, 1), {
    color: 0x4a5057,
    metalness: 0.04,
  });
  readonly ceiling = this.pbr(this.ceilMaps, { color: 0xffffff, metalness: 0.02 });
  readonly skirting = this.pbr(cloneMaps(this.painted, 1, 1), { color: 0x2c3238, metalness: 0.4 });

  /* --- 什器 --- */
  readonly metal = this.pbr(this.brushed, {
    color: 0x9aa4ac,
    metalness: 0.9,
    envMapIntensity: 0.65,
  });
  readonly metalDark = this.pbr(cloneMaps(this.painted, 1.5, 1.5), {
    color: 0x565f68,
    metalness: 0.65,
  });
  readonly metalWarm = this.pbr(cloneMaps(this.brushed, 1, 1), { color: 0xb9a78c, metalness: 0.9 });
  readonly deskTop = this.pbr(cloneMaps(this.painted, 3, 1.5), { color: 0x8b949c, metalness: 0.15 });
  readonly frame = this.pbr(cloneMaps(this.brushed, 1, 1), { color: 0x8d959d, metalness: 0.85 });
  readonly plastic = this.standard({ color: 0x22282e, roughness: 0.62, metalness: 0.05 });
  readonly plasticLight = this.standard({ color: 0xb9c3cb, roughness: 0.5, metalness: 0.05 });
  readonly rubber = this.standard({ color: 0x14181c, roughness: 0.92, metalness: 0.02 });
  readonly resin = this.standard({
    color: 0xd6dde3,
    roughness: 0.28,
    metalness: 0.02,
    envMapIntensity: 1.2,
  });
  readonly keyboard = this.pbr(setRepeat(keyboardMaps(), 1, 1), { color: 0xffffff, metalness: 0.1 });
  readonly vent = this.pbr(setRepeat(ventMaps(), 2, 1), { color: 0xffffff, metalness: 0.7 });

  /* --- ガラス・画面 --- */
  readonly glass = this.physical({
    color: 0xcfe0e8,
    transparent: true,
    opacity: 0.16,
    roughness: 0.03,
    metalness: 0,
    envMapIntensity: 2.2,
    side: THREE.DoubleSide,
  });
  readonly screenGlass = this.physical({
    color: 0x05080b,
    roughness: 0.08,
    metalness: 0.1,
    envMapIntensity: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });

  /* --- 発光 --- */
  readonly phosEmissive = this.emissive(0x5fd3b2, 2.6);
  readonly emberEmissive = this.emissive(0xe2603f, 2.4);
  readonly whiteEmissive = this.emissive(0xeaf4f6, 3.4);
  readonly panelEmissive = this.emissive(0xdbeaf2, 2.2);
  readonly warmEmissive = this.emissive(0xffd9a4, 1.4);
  /** P6 の影絵。陰影を持たない黒。 */
  readonly silhouette = this.basic({ color: 0x03050a, fog: false });
  /**
   * P6 の背景となる面光源。距離で沈まないよう fog を切る。
   * bloom のしきい値を越えない明度に抑えて、黒板の輪郭を保つ。
   */
  readonly backlight = this.basic({
    color: 0xffffff,
    map: diffuserTexture(),
    fog: false,
  });

  standard(params: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial {
    const material = new THREE.MeshStandardMaterial(params);
    this.pool.push(material);
    return material;
  }

  physical(params: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial(params);
    this.pool.push(material);
    return material;
  }

  basic(params: THREE.MeshBasicMaterialParameters): THREE.MeshBasicMaterial {
    const material = new THREE.MeshBasicMaterial(params);
    this.pool.push(material);
    return material;
  }

  emissive(color: number, intensity: number): THREE.MeshStandardMaterial {
    return this.standard({
      color: 0x000000,
      emissive: color,
      emissiveIntensity: intensity,
      roughness: 1,
    });
  }

  /** albedo / normal / roughness を割り当てた標準マテリアル。 */
  pbr(
    maps: SurfaceMaps,
    params: THREE.MeshStandardMaterialParameters = {},
  ): THREE.MeshStandardMaterial {
    return this.standard({
      map: maps.map,
      normalMap: maps.normalMap,
      roughnessMap: maps.roughnessMap,
      roughness: 1,
      normalScale: new THREE.Vector2(1, 1),
      ...params,
    });
  }

  textured(texture: THREE.Texture, options: { emissive?: boolean; transparent?: boolean } = {}) {
    if (options.emissive) {
      return this.standard({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveMap: texture,
        emissiveIntensity: 1.6,
        transparent: options.transparent ?? false,
        map: texture,
        roughness: 1,
      });
    }
    return this.standard({
      map: texture,
      roughness: 0.62,
      metalness: 0.05,
      transparent: options.transparent ?? false,
    });
  }

  dispose(): void {
    for (const material of this.pool) material.dispose();
    this.pool.length = 0;
  }
}
