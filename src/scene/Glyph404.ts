import * as THREE from "three";
import {
  GLYPH_GROUP_DEPTHS,
  GLYPH_RECTS,
  GLYPH_REFERENCE_DISTANCE,
  MAIN_ROOM,
  OBSERVE_MARK,
} from "../data/layout";

/**
 * P6 のアナモルフィック (歪像) 装置。
 *
 * 観測点 (隠し部屋の X 印) から +X 方向を見たときだけ、
 * 天井から吊られた 4 つの黒い板の集合が「404」に重なる。
 * 各板は「基準面 (観測点から GLYPH_REFERENCE_DISTANCE の距離) に描いた
 * グリフ」を、そのグループの奥行きへ射影して配置している。
 * つまり錯視は本物で、立ち位置がずれると崩れる。
 */
export class Glyph404 {
  readonly group = new THREE.Group();
  readonly objects: THREE.Group[] = [];

  private readonly geometries: THREE.BufferGeometry[] = [];
  private readonly slabMaterial: THREE.MeshBasicMaterial;
  private readonly cableMaterial: THREE.MeshBasicMaterial;

  constructor() {
    // 影絵として読ませたいので陰影のない黒 (Basic) を使う
    this.slabMaterial = new THREE.MeshBasicMaterial({ color: 0x04060a, fog: false });
    this.cableMaterial = new THREE.MeshBasicMaterial({ color: 0x0b1016, fog: false });

    for (let i = 0; i < GLYPH_GROUP_DEPTHS.length; i += 1) {
      const object = new THREE.Group();
      this.objects.push(object);
      this.group.add(object);
    }

    for (const rect of GLYPH_RECTS) {
      const depth = GLYPH_GROUP_DEPTHS[rect.group];
      if (depth === undefined) continue;
      const scale = depth / GLYPH_REFERENCE_DISTANCE;

      const width = rect.width * scale;
      const height = rect.height * scale;
      const x = OBSERVE_MARK.x + depth;
      const y = OBSERVE_MARK.y + rect.v * scale;
      const z = OBSERVE_MARK.z + rect.u * scale;

      const geometry = new THREE.BoxGeometry(0.05, height, width);
      this.geometries.push(geometry);
      const slab = new THREE.Mesh(geometry, this.slabMaterial);
      slab.position.set(x, y, z);
      this.objects[rect.group]?.add(slab);

      // 天井からの吊りワイヤ
      const cableLength = MAIN_ROOM.height - (y + height / 2);
      if (cableLength > 0.02) {
        const cableGeometry = new THREE.CylinderGeometry(0.006, 0.006, cableLength, 6);
        this.geometries.push(cableGeometry);
        const cable = new THREE.Mesh(cableGeometry, this.cableMaterial);
        cable.position.set(x, y + height / 2 + cableLength / 2, z);
        this.objects[rect.group]?.add(cable);
      }
    }
  }

  /** 観測点にどれだけ近いか (0〜1)。1 が完全に一致。 */
  static alignment(position: THREE.Vector3): number {
    const dx = position.x - OBSERVE_MARK.x;
    const dz = position.z - OBSERVE_MARK.z;
    const distance = Math.hypot(dx, dz);
    return Math.max(0, 1 - distance / 0.6);
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.geometries.length = 0;
    this.slabMaterial.dispose();
    this.cableMaterial.dispose();
  }
}
