import * as THREE from "three";
import {
  CABINETS,
  CONDUITS,
  COOLING_RACK,
  FLOOR_STREAKS,
  NEON_COLORS,
  NEON_SIGNS,
  NEON_TUBES,
  PUDDLES,
  type Cabinet,
  type FloorStreak,
  type NeonSign,
  type NeonTube,
} from "../data/neon";
import type { Box } from "../data/layout";
import type { BuildContext } from "./furniture";
import {
  indicatorTexture,
  neonSignTexture,
  neonStreakTexture,
  puddleMaskTexture,
  textTexture,
} from "./textures";

const aabb = (
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
): Box => ({ center: { x: cx, y: cy, z: cz }, size: { x: sx, y: sy, z: sz } });

/** 管の太さ (直径) と、器具の受け金具の厚み。 */
const TUBE_THICKNESS = 0.045;
const HOUSING_THICKNESS = 0.05;
/**
 * 管の発光量。上げすぎると bloom で白く飛んで「白い棒」になり、色が消える。
 * 色として読める上限がこの値。
 */
const TUBE_EMISSIVE = 1.2;

interface Flicker {
  material: THREE.MeshStandardMaterial;
  light: THREE.PointLight | null;
  baseEmissive: number;
  baseIntensity: number;
  seed: number;
}

/**
 * ちらつき。ほとんどの時間は安定していて、数秒に一度だけ短く乱れる。
 * 常時点滅させると「壊れた演出」ではなく「うるさい画面」になる。
 */
function flickerFactor(time: number, seed: number): number {
  const CYCLE = 5.5;
  const BURST = 0.4;
  const phase = (time + seed) % CYCLE;
  if (phase > BURST) return 1;
  const noise = Math.sin(phase * 78) * Math.sin(phase * 31);
  return noise > 0 ? 1 : 0.28;
}

/**
 * サイバー区画。躯体 (Environment) からは独立していて、
 * 「どこに何色の管を置くか」は src/data/neon.ts が持つ。
 *
 * 主室の白い天井灯・額縁のライト・P6 の背景パネルには触れない。
 * 謎を読むための明るさは既存のままにして、色被りだけを足す。
 */
export class NeonZone {
  readonly group = new THREE.Group();

  /** 隠し通路が開くまで消しておくもの (管・光・床の筋) */
  private readonly passage = new THREE.Group();
  private readonly spills: THREE.PointLight[] = [];
  private readonly flickers: Flicker[] = [];
  private readonly streakTexture = neonStreakTexture();
  private readonly puddleMask = puddleMaskTexture();
  private time = 0;

  constructor(private readonly ctx: BuildContext) {
    this.passage.visible = false;
    this.group.add(this.passage);

    for (const tube of NEON_TUBES) this.addTube(tube);
    for (const streak of FLOOR_STREAKS) this.addFloorStreak(streak);
    for (const puddle of PUDDLES) this.addPuddle(puddle);
    for (const sign of NEON_SIGNS) this.addSign(sign);
    for (const cabinet of CABINETS) this.addCabinet(cabinet);
    this.addConduits();
    this.addCoolingRack();
  }

  /** 区画ごとの親。passage だけまとめて消灯できるようにする。 */
  private parent(zone: NeonTube["zone"]): THREE.Object3D {
    return zone === "passage" ? this.passage : this.group;
  }

  /* ---------------------------------------------------------------- */
  /* ネオン管                                                          */
  /* ---------------------------------------------------------------- */

  private addTube(tube: NeonTube): void {
    const { factory, materials } = this.ctx;
    const color = NEON_COLORS[tube.color];
    const parent = this.parent(tube.zone);
    const { center, length } = tube;

    const size = {
      x: tube.axis === "x" ? length : TUBE_THICKNESS,
      y: tube.axis === "y" ? length : TUBE_THICKNESS,
      z: tube.axis === "z" ? length : TUBE_THICKNESS,
    };

    const material = materials.emissive(color, TUBE_EMISSIVE);
    const glass = factory.box(aabb(0, 0, 0, size.x, size.y, size.z), material);
    const holder = new THREE.Group();
    holder.add(glass);

    /*
     * 器具の金具。天井の管は背面に受け板を置き、壁の縦管は端の口金だけにする。
     * 縦管に受け板を回すと管を包んでしまい、光が見えなくなる。
     */
    if (tube.axis === "y") {
      for (const sy of [-1, 1]) {
        const cap = factory.cylinder(0.032, 0.032, 0.05, materials.fixtureShell, 12);
        cap.position.y = (sy * length) / 2;
        holder.add(cap);
      }
    } else {
      const backing = factory.box(
        aabb(
          0,
          HOUSING_THICKNESS,
          0,
          tube.axis === "x" ? length * 0.96 : HOUSING_THICKNESS * 1.6,
          HOUSING_THICKNESS,
          tube.axis === "z" ? length * 0.96 : HOUSING_THICKNESS * 1.6,
        ),
        materials.fixtureShell,
      );
      holder.add(backing);
    }

    holder.position.set(center.x, center.y, center.z);
    holder.rotation.y = tube.yaw ?? 0;
    parent.add(holder);

    const light = tube.spill ? this.addSpill(tube, color, parent) : null;
    if (!tube.flicker) return;
    this.flickers.push({
      material,
      light,
      baseEmissive: TUBE_EMISSIVE,
      baseIntensity: tube.spill?.intensity ?? 0,
      seed: this.flickers.length * 1.7,
    });
  }

  /**
   * 管がこぼす光。管より少し下げて置く。管と同じ高さだと受け金具だけが
   * 強く照らされ、天井に光る箱が張り付いたように見える。
   */
  private addSpill(tube: NeonTube, color: number, parent: THREE.Object3D): THREE.PointLight {
    const spill = tube.spill!;
    const drop = tube.axis === "y" ? 0 : 0.22;
    const light = new THREE.PointLight(color, spill.intensity, spill.distance, 2);
    light.position.set(tube.center.x, tube.center.y - drop, tube.center.z);
    parent.add(light);
    this.spills.push(light);
    return light;
  }

  /* ---------------------------------------------------------------- */
  /* 濡れた床                                                          */
  /* ---------------------------------------------------------------- */

  /** 管の像。加算合成なので床の材質を上書きしない。 */
  private addFloorStreak(streak: FloorStreak): void {
    // 濃さが筋ごとに違うので、マテリアルは筋ごとに作る (テクスチャは共有)
    const material = this.ctx.materials.basic({
      map: this.streakTexture,
      color: NEON_COLORS[streak.color],
      transparent: true,
      opacity: streak.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });

    const mesh = this.ctx.factory.plane(streak.width, streak.length, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = streak.yaw ?? 0;
    mesh.position.set(streak.x, 0.016, streak.z);
    this.parent(streak.zone).add(mesh);
  }

  /**
   * 水たまり。周囲の光を映す薄い膜として置く。
   * 平面反射は使わない (2 パス描画のコストに対して得るものが少ない)。
   */
  private addPuddle(puddle: { x: number; z: number; width: number; length: number }): void {
    /*
     * 水は「暗い穴」ではなく「映り込む膜」。色を落としすぎると床に穴が開いて
     * 見えるので、明度は床に近づけ、金属質と環境マップで艶だけを足す。
     */
    const material = this.ctx.materials.physical({
      color: 0x1d2a38,
      roughness: 0.08,
      metalness: 0.55,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.4,
      transparent: true,
      opacity: 0.42,
      alphaMap: this.puddleMask,
      depthWrite: false,
    });
    const mesh = this.ctx.factory.plane(puddle.width, puddle.length, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(puddle.x, 0.011, puddle.z);
    this.group.add(mesh);
  }

  /* ---------------------------------------------------------------- */
  /* 表示・設備                                                        */
  /* ---------------------------------------------------------------- */

  private addSign(sign: NeonSign): void {
    const texture = neonSignTexture(sign.text, `#${NEON_COLORS[sign.color].toString(16).padStart(6, "0")}`, sign.fontSize);
    const material = this.ctx.materials.standard({
      color: 0x000000,
      emissive: 0xffffff,
      emissiveMap: texture,
      emissiveIntensity: 1.9,
      map: texture,
      transparent: true,
      roughness: 1,
    });
    const group = new THREE.Group();
    // 台座。文字だけが浮くと投影に見えるので、必ず器物として置く。
    const plate = this.ctx.factory.box(
      aabb(0, 0, -0.012, sign.width * 1.12, sign.height * 1.5, 0.024),
      this.ctx.materials.metalDark,
    );
    group.add(plate);
    group.add(this.ctx.factory.plane(sign.width, sign.height, material));
    group.position.set(sign.position.x, sign.position.y, sign.position.z);
    group.rotation.y = sign.rotationY;
    this.group.add(group);
  }

  /** 配電盤。扉・蝶番・表示灯の 3 点だけで「触れない設備」に見せる。 */
  private addCabinet(cabinet: Cabinet): void {
    const { factory, materials } = this.ctx;
    const group = new THREE.Group();

    const body = factory.box(
      aabb(0, 0, 0, cabinet.width, cabinet.height, cabinet.depth),
      materials.metalDark,
    );
    group.add(body);

    const door = factory.box(
      aabb(0, 0, -cabinet.depth / 2 - 0.008, cabinet.width * 0.88, cabinet.height * 0.9, 0.016),
      materials.metal,
    );
    group.add(door);

    for (const sy of [-1, 1]) {
      const hinge = factory.cylinder(0.012, 0.012, cabinet.height * 0.12, materials.metal, 10);
      hinge.position.set(-cabinet.width * 0.42, sy * cabinet.height * 0.3, -cabinet.depth / 2 - 0.014);
      group.add(hinge);
    }

    const indicators = factory.plane(
      cabinet.width * 0.08,
      cabinet.height * 0.34,
      materials.standard({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveMap: indicatorTexture(
          `#${NEON_COLORS[cabinet.color].toString(16).padStart(6, "0")}`,
          8,
          1,
        ),
        emissiveIntensity: 1.3,
        roughness: 1,
      }),
    );
    indicators.position.set(cabinet.width * 0.33, cabinet.height * 0.1, -cabinet.depth / 2 - 0.018);
    indicators.rotation.y = Math.PI;
    group.add(indicators);

    group.position.set(cabinet.x, cabinet.height / 2 + 0.35, cabinet.z);
    group.rotation.y = cabinet.rotationY;
    this.group.add(group);
  }

  /** 機械室から通路へ抜ける配線。区画のつながりを示す。 */
  private addConduits(): void {
    const { factory, materials } = this.ctx;
    for (const conduit of CONDUITS) {
      const length = Math.abs(conduit.toX - conduit.fromX);
      const pipe = factory.cylinder(conduit.radius, conduit.radius, length, materials.rubber, 10);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set((conduit.fromX + conduit.toX) / 2, conduit.y, conduit.z);
      this.group.add(pipe);

      // 吊りバンド
      for (let i = 0; i <= 3; i += 1) {
        const band = factory.torus(conduit.radius + 0.008, 0.006, materials.metalDark, 12);
        band.position.set(conduit.fromX + (length / 3) * i, conduit.y, conduit.z);
        band.rotation.y = Math.PI / 2;
        this.group.add(band);
      }
    }
  }

  /** 主室北東の冷却盤。主室に「裏側の設備」を 1 点だけ見せる。 */
  private addCoolingRack(): void {
    const { factory, materials } = this.ctx;
    const { position, size } = COOLING_RACK;

    const body = factory.box(
      aabb(position.x, position.y, position.z, size.x, size.y, size.z),
      materials.metalDark,
    );
    this.group.add(body);

    const louver = factory.plane(size.z * 0.86, size.y * 0.5, materials.vent);
    louver.rotation.y = -Math.PI / 2;
    louver.position.set(position.x - size.x / 2 - 0.004, position.y + 0.24, position.z);
    this.group.add(louver);

    const indicators = factory.plane(
      size.z * 0.07,
      size.y * 0.26,
      materials.standard({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveMap: indicatorTexture(
          `#${NEON_COLORS[COOLING_RACK.color].toString(16).padStart(6, "0")}`,
          6,
          1,
        ),
        emissiveIntensity: 1.2,
        roughness: 1,
      }),
    );
    indicators.rotation.y = -Math.PI / 2;
    indicators.position.set(position.x - size.x / 2 - 0.004, position.y - 0.42, position.z + size.z * 0.28);
    this.group.add(indicators);

    const label = factory.plane(
      0.3,
      0.075,
      materials.textured(
        textTexture([COOLING_RACK.label], {
          width: 256,
          height: 64,
          background: "#161d24",
          color: "#8fa4b3",
          fontSize: 34,
          letterSpacing: 5,
        }),
      ),
    );
    label.rotation.y = -Math.PI / 2;
    label.position.set(position.x - size.x / 2 - 0.006, position.y + 0.62, position.z);
    this.group.add(label);
  }

  /* ---------------------------------------------------------------- */
  /* 切り替え・更新                                                    */
  /* ---------------------------------------------------------------- */

  /** 隠し通路が開いたら通路のネオンを点ける (開通の合図)。 */
  setPassageOn(on: boolean): void {
    this.passage.visible = on;
  }

  /**
   * 低品質時は光源を落として発光面だけ残す。
   * 見えない光源は three.js の集計から外れるので、シェーダのコストも下がる。
   */
  setSpillEnabled(enabled: boolean): void {
    for (const light of this.spills) light.visible = enabled;
  }

  update(dt: number, motionEffects: boolean): void {
    if (this.flickers.length === 0) return;
    this.time += dt;
    for (const entry of this.flickers) {
      const factor = motionEffects ? flickerFactor(this.time, entry.seed) : 1;
      entry.material.emissiveIntensity = entry.baseEmissive * factor;
      if (entry.light) entry.light.intensity = entry.baseIntensity * factor;
    }
  }
}
