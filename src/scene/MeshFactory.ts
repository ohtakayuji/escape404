import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Box } from "../data/layout";

/**
 * ジオメトリの生成と破棄をまとめて面倒を見る工場。
 * 部屋の組み立て側 (Environment / furniture) はここ経由でメッシュを作る。
 */
export class MeshFactory {
  private readonly geometries: THREE.BufferGeometry[] = [];

  mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    this.geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = true;
    return mesh;
  }

  /** 中心と大きさで置くボックス。 */
  box(box: Box, material: THREE.Material): THREE.Mesh {
    const mesh = this.mesh(
      new THREE.BoxGeometry(box.size.x, box.size.y, box.size.z),
      material,
    );
    mesh.position.set(box.center.x, box.center.y, box.center.z);
    return mesh;
  }

  /**
   * 壁のように大きさがまちまちなボックスでも、テクスチャの密度を揃えて置く。
   * BoxGeometry の UV は面ごとに 0〜1 なので、そのまま貼ると
   * 12m の壁と 0.5m の壁でタイルの細かさが変わってしまう。
   */
  boxTiled(box: Box, material: THREE.Material, tile = 2): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(box.size.x, box.size.y, box.size.z);
    const uv = geometry.getAttribute("uv") as THREE.BufferAttribute;
    const scaleU = Math.max(box.size.x, box.size.z) / tile;
    const scaleV = box.size.y / tile;
    for (let i = 0; i < uv.count; i += 1) {
      uv.setXY(i, uv.getX(i) * scaleU, uv.getY(i) * scaleV);
    }
    uv.needsUpdate = true;
    const mesh = this.mesh(geometry, material);
    mesh.position.set(box.center.x, box.center.y, box.center.z);
    return mesh;
  }

  /** 角に丸みのあるボックス。什器の「板金っぽさ」はほぼこれで出る。 */
  rounded(
    width: number,
    height: number,
    depth: number,
    radius: number,
    material: THREE.Material,
    segments = 2,
  ): THREE.Mesh {
    const safeRadius = Math.min(radius, width / 2.05, height / 2.05, depth / 2.05);
    return this.mesh(
      new RoundedBoxGeometry(width, height, depth, segments, safeRadius),
      material,
    );
  }

  plane(width: number, height: number, material: THREE.Material): THREE.Mesh {
    return this.mesh(new THREE.PlaneGeometry(width, height), material);
  }

  cylinder(
    radiusTop: number,
    radiusBottom: number,
    height: number,
    material: THREE.Material,
    segments = 20,
    open = false,
  ): THREE.Mesh {
    return this.mesh(
      new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, open),
      material,
    );
  }

  torus(radius: number, tube: number, material: THREE.Material, segments = 24): THREE.Mesh {
    return this.mesh(new THREE.TorusGeometry(radius, tube, 10, segments), material);
  }

  sphere(radius: number, material: THREE.Material, segments = 20): THREE.Mesh {
    return this.mesh(new THREE.SphereGeometry(radius, segments, segments / 2), material);
  }

  cone(radius: number, height: number, material: THREE.Material, segments = 22): THREE.Mesh {
    return this.mesh(new THREE.ConeGeometry(radius, height, segments), material);
  }

  /** ネジ・ボルト。板金の四隅に置くと一気に「機材」になる。 */
  bolt(material: THREE.Material): THREE.Mesh {
    const bolt = this.cylinder(0.008, 0.008, 0.006, material, 8);
    bolt.rotation.x = Math.PI / 2;
    return bolt;
  }

  dispose(): void {
    for (const geometry of this.geometries) geometry.dispose();
    this.geometries.length = 0;
  }
}
