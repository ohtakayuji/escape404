import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import { MAIN_ROOM } from "../data/layout";
import { dustSprite } from "./pbr";
import type { MaterialLibrary } from "./materials";

interface Troffer {
  x: number;
  z: number;
  /** 影を落とす主光源にするか (性能のため 1 灯だけ) */
  shadow: boolean;
}

const TROFFERS: Troffer[] = [
  { x: -3.4, z: -3.0, shadow: false },
  { x: 2.0, z: -0.2, shadow: true },
  { x: -2.4, z: 3.2, shadow: false },
  { x: 4.4, z: 2.6, shadow: false },
];

/**
 * 照明。天井埋め込み灯は面光源 (RectAreaLight) で柔らかく当て、
 * 接地影のために 1 灯だけ SpotLight で影を落とす。
 * 隠し部屋の非常灯は Environment 側が持つ。
 */
export class Lighting {
  readonly group = new THREE.Group();
  /** 手に持った懐中電灯 (点灯中だけ視界に出す) */
  readonly heldFlashlight = new THREE.Group();
  /** 中心の強い芯 */
  readonly flashlight: THREE.SpotLight;
  /** 周囲に広がる弱い光。2 灯にすると懐中電灯らしい減衰になる。 */
  readonly flashlightHalo: THREE.SpotLight;

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly materials: THREE.Material[] = [];
  private dust: THREE.Points | null = null;
  private dustVelocity: Float32Array | null = null;

  constructor(materials: MaterialLibrary) {
    RectAreaLightUniformsLib.init();

    this.group.add(new THREE.HemisphereLight(0x7f95a5, 0x1b2128, 0.35));

    for (const troffer of TROFFERS) {
      this.addTroffer(troffer, materials);
    }

    /*
     * 東側の発光パネル群 (P6 の背景) に対応する実光源。
     * パネルだけ光らせて周囲が暗いと「壁に穴」に見えるので、
     * 面光源で実際に東側を照らす。
     */
    const ceilingBank = new THREE.RectAreaLight(0xdeeaf0, 3.6, 6.6, 5.4);
    ceilingBank.position.set(2.4, MAIN_ROOM.height - 0.05, -0.6);
    ceilingBank.rotation.x = -Math.PI / 2;
    this.group.add(ceilingBank);

    const wallBank = new THREE.RectAreaLight(0xdeeaf0, 3.2, 8.2, 0.66);
    wallBank.position.set(5.85, 2.82, 0);
    wallBank.rotation.y = -Math.PI / 2;
    this.group.add(wallBank);

    // 出口方向の弱い足元灯 (視線誘導)
    const exitWash = new THREE.SpotLight(0xdfe9ee, 22, 7, 0.55, 0.9, 2);
    exitWash.position.set(1.5, 2.6, 2.9);
    exitWash.target.position.set(1.5, 1.1, 4.6);
    this.group.add(exitWash, exitWash.target);

    this.flashlight = new THREE.SpotLight(0xfff2da, 0, 14, Math.PI / 9, 0.6, 1.5);
    this.flashlight.position.set(0.06, -0.05, 0);
    this.flashlight.target.position.set(0, 0, -1);

    this.flashlightHalo = new THREE.SpotLight(0xffeed2, 0, 9, Math.PI / 4.2, 0.95, 1.8);
    this.flashlightHalo.position.set(0.06, -0.05, 0);
    this.flashlightHalo.target.position.set(0, 0, -1);

    this.addDust();
    this.buildHeldFlashlight(materials);
  }

  /**
   * 点灯中に視界の右下へ出す懐中電灯。
   * カメラの子として置くので、カメラ揺れにそのまま追従する。
   */
  private buildHeldFlashlight(materials: MaterialLibrary): void {
    const body = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(0.022, 0.026, 0.15, 16)),
      materials.metal,
    );
    body.rotation.x = Math.PI / 2 - 0.12;
    body.position.set(0, 0, 0.02);

    const head = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(0.032, 0.024, 0.045, 16)),
      materials.metalDark,
    );
    head.rotation.x = Math.PI / 2 - 0.12;
    head.position.set(0, 0.011, -0.075);

    const lens = new THREE.Mesh(
      this.track(new THREE.CircleGeometry(0.026, 16)),
      materials.whiteEmissive,
    );
    lens.rotation.x = -0.12;
    lens.position.set(0, 0.014, -0.096);

    const grip = new THREE.Mesh(
      this.track(new THREE.CylinderGeometry(0.024, 0.024, 0.05, 16)),
      materials.rubber,
    );
    grip.rotation.x = Math.PI / 2 - 0.12;
    grip.position.set(0, -0.004, 0.055);

    this.heldFlashlight.add(body, head, lens, grip);
    this.heldFlashlight.position.set(0.34, -0.3, -0.52);
    this.heldFlashlight.rotation.set(-0.05, -0.26, 0.14);
    this.heldFlashlight.scale.setScalar(0.9);
    this.heldFlashlight.visible = false;
  }

  private addTroffer(troffer: Troffer, materials: MaterialLibrary): void {
    const y = MAIN_ROOM.height - 0.06;

    const area = new THREE.RectAreaLight(0xd6e6ef, 8, 1.15, 0.32);
    area.position.set(troffer.x, y, troffer.z);
    area.rotation.x = -Math.PI / 2;
    this.group.add(area);

    // 発光面
    const geometry = new THREE.PlaneGeometry(1.15, 0.32);
    this.geometries.push(geometry);
    const panel = new THREE.Mesh(geometry, materials.panelEmissive);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(troffer.x, MAIN_ROOM.height - 0.045, troffer.z);
    this.group.add(panel);

    // 器具の枠
    const housing = new THREE.Mesh(
      this.track(new THREE.BoxGeometry(1.32, 0.1, 0.48)),
      materials.metalDark,
    );
    housing.position.set(troffer.x, MAIN_ROOM.height - 0.05, troffer.z);
    this.group.add(housing);

    if (!troffer.shadow) return;

    const spot = new THREE.SpotLight(0xd6e6ef, 32, 13, 1.0, 0.85, 2);
    spot.position.set(troffer.x, y, troffer.z);
    spot.target.position.set(troffer.x, 0, troffer.z);
    spot.castShadow = true;
    spot.shadow.mapSize.set(2048, 2048);
    spot.shadow.bias = -0.0012;
    spot.shadow.normalBias = 0.02;
    spot.shadow.radius = 3;
    this.group.add(spot, spot.target);
  }

  /** 空気中の埃。光を受けて微かに動くだけの粒。 */
  private addDust(): void {
    const count = 420;
    const positions = new Float32Array(count * 3);
    const velocity = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = -6 + Math.random() * 12;
      positions[i * 3 + 1] = 0.4 + Math.random() * 2.6;
      positions[i * 3 + 2] = -4.4 + Math.random() * 8.8;
      velocity[i * 3] = (Math.random() - 0.5) * 0.02;
      velocity[i * 3 + 1] = -0.004 - Math.random() * 0.008;
      velocity[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    this.geometries.push(geometry);

    const material = new THREE.PointsMaterial({
      size: 0.012,
      map: dustSprite(),
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      fog: false,
    });
    this.materials.push(material);

    this.dust = new THREE.Points(geometry, material);
    this.dustVelocity = velocity;
    this.group.add(this.dust);
  }

  /** 埃をゆっくり漂わせる。 */
  update(dt: number): void {
    if (!this.dust || !this.dustVelocity) return;
    const attribute = this.dust.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const velocity = this.dustVelocity;
    for (let i = 0; i < array.length; i += 3) {
      array[i] = (array[i] ?? 0) + (velocity[i] ?? 0) * dt;
      const nextY = (array[i + 1] ?? 0) + (velocity[i + 1] ?? 0) * dt;
      array[i + 1] = nextY < 0.25 ? 3.0 : nextY;
      array[i + 2] = (array[i + 2] ?? 0) + (velocity[i + 2] ?? 0) * dt;
    }
    attribute.needsUpdate = true;
  }

  setDustVisible(visible: boolean): void {
    if (this.dust) this.dust.visible = visible;
  }

  private track(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    this.geometries.push(geometry);
    return geometry;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.geometries.length = 0;
    for (const material of this.materials) material.dispose();
    this.materials.length = 0;
  }
}
