import { FURNITURE, PLAYER, WALLS, type Box } from "../data/layout";

interface Collider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  enabled: boolean;
}

function toCollider(id: string, box: Box): Collider {
  return {
    id,
    minX: box.center.x - box.size.x / 2,
    maxX: box.center.x + box.size.x / 2,
    minZ: box.center.z - box.size.z / 2,
    maxZ: box.center.z + box.size.z / 2,
    minY: box.center.y - box.size.y / 2,
    maxY: box.center.y + box.size.y / 2,
    enabled: true,
  };
}

/**
 * 静的 AABB による当たり判定。
 * 段差も斜面もない 1 フロア構成なので、XZ 平面だけで解けば足りる。
 * 本棚やドアのように動く物は id で参照して差し替える。
 */
export class CollisionWorld {
  private readonly colliders: Collider[] = [];

  constructor() {
    WALLS.forEach((wall, index) => this.colliders.push(toCollider(`wall-${index}`, wall)));
    for (const piece of FURNITURE) {
      if (!piece.solid) continue;
      this.colliders.push(toCollider(piece.id, piece));
    }
  }

  setEnabled(id: string, enabled: boolean): void {
    for (const collider of this.colliders) {
      if (collider.id === id) collider.enabled = enabled;
    }
  }

  /** 動いた什器の当たりを追従させる (Z 方向のスライドのみ想定)。 */
  offsetZ(id: string, offset: number): void {
    const source = FURNITURE.find((piece) => piece.id === id);
    if (!source) return;
    for (const collider of this.colliders) {
      if (collider.id !== id) continue;
      collider.minZ = source.center.z - source.size.z / 2 + offset;
      collider.maxZ = source.center.z + source.size.z / 2 + offset;
    }
  }

  /**
   * 1 軸ずつ動かして押し戻す。壁抜けを起こさないよう、
   * 移動後に必ず重なりを解消してから次の軸へ進む。
   */
  moveAndCollide(
    position: { x: number; z: number },
    delta: { x: number; z: number },
    radius = PLAYER.radius,
  ): void {
    position.x += delta.x;
    this.resolveX(position, delta.x, radius);
    position.z += delta.z;
    this.resolveZ(position, delta.z, radius);
  }

  private overlaps(collider: Collider, position: { x: number; z: number }, radius: number): boolean {
    if (!collider.enabled) return false;
    if (collider.maxY <= 0.02 || collider.minY >= PLAYER.height) return false;
    return (
      position.x > collider.minX - radius &&
      position.x < collider.maxX + radius &&
      position.z > collider.minZ - radius &&
      position.z < collider.maxZ + radius
    );
  }

  private resolveX(position: { x: number; z: number }, delta: number, radius: number): void {
    for (const collider of this.colliders) {
      if (!this.overlaps(collider, position, radius)) continue;
      if (delta > 0) position.x = collider.minX - radius;
      else if (delta < 0) position.x = collider.maxX + radius;
      else {
        position.x =
          Math.abs(position.x - collider.minX) < Math.abs(position.x - collider.maxX)
            ? collider.minX - radius
            : collider.maxX + radius;
      }
    }
  }

  private resolveZ(position: { x: number; z: number }, delta: number, radius: number): void {
    for (const collider of this.colliders) {
      if (!this.overlaps(collider, position, radius)) continue;
      if (delta > 0) position.z = collider.minZ - radius;
      else if (delta < 0) position.z = collider.maxZ + radius;
      else {
        position.z =
          Math.abs(position.z - collider.minZ) < Math.abs(position.z - collider.maxZ)
            ? collider.minZ - radius
            : collider.maxZ + radius;
      }
    }
  }

  /** 指定位置が何かに埋まっていないか (スポーン位置の検証用)。 */
  isClear(position: { x: number; z: number }, radius = PLAYER.radius): boolean {
    return !this.colliders.some((collider) => this.overlaps(collider, position, radius));
  }
}
