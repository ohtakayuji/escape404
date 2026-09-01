import { describe, expect, it } from "vitest";
import {
  GLYPH_GROUP_DEPTHS,
  GLYPH_RECTS,
  GLYPH_REFERENCE_DISTANCE,
  MAIN_ROOM,
  OBSERVE_MARK,
  PLAYER,
  WINDOW,
} from "../src/data/layout";

interface Slab {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  group: number;
}

/** Glyph404 と同じ式でワールド座標を求める (実装と一致していること前提) */
const SLABS: Slab[] = GLYPH_RECTS.map((rect) => {
  const depth = GLYPH_GROUP_DEPTHS[rect.group]!;
  const scale = depth / GLYPH_REFERENCE_DISTANCE;
  return {
    x: OBSERVE_MARK.x + depth,
    y: OBSERVE_MARK.y + rect.v * scale,
    z: OBSERVE_MARK.z + rect.u * scale,
    width: rect.width * scale,
    height: rect.height * scale,
    group: rect.group,
  };
});

/** 観測点から見た角度 (tan) へ射影する */
function project(slab: Slab, eye: { x: number; y: number; z: number }) {
  const depth = slab.x - eye.x;
  return {
    u: ((slab.z - eye.z) / depth) * GLYPH_REFERENCE_DISTANCE,
    v: ((slab.y - eye.y) / depth) * GLYPH_REFERENCE_DISTANCE,
    width: (slab.width / depth) * GLYPH_REFERENCE_DISTANCE,
    height: (slab.height / depth) * GLYPH_REFERENCE_DISTANCE,
  };
}

describe("P6 の 404 (アナモルフィック)", () => {
  it("観測点から見ると基準グリフと一致する", () => {
    GLYPH_RECTS.forEach((rect, index) => {
      const projected = project(SLABS[index]!, OBSERVE_MARK);
      expect(projected.u).toBeCloseTo(rect.u, 6);
      expect(projected.v).toBeCloseTo(rect.v, 6);
      expect(projected.width).toBeCloseTo(rect.width, 6);
      expect(projected.height).toBeCloseTo(rect.height, 6);
    });
  });

  it("立ち位置が 1.5m ずれると重なりが崩れる", () => {
    const offEye = { x: OBSERVE_MARK.x, y: OBSERVE_MARK.y, z: OBSERVE_MARK.z + 1.5 };
    const drift = GLYPH_RECTS.map((rect, index) => {
      const projected = project(SLABS[index]!, offEye);
      return Math.abs(projected.u - rect.u);
    });
    // 少なくとも一部の板は板の太さ以上ずれる = 数字として読めない
    expect(Math.max(...drift)).toBeGreaterThan(0.3);
  });

  it("板は 4 つのグループに分かれ、どのグループも単独では数字を作らない", () => {
    const counts = new Map<number, number>();
    for (const rect of GLYPH_RECTS) {
      counts.set(rect.group, (counts.get(rect.group) ?? 0) + 1);
    }
    expect(counts.size).toBe(GLYPH_GROUP_DEPTHS.length);
    for (const count of counts.values()) {
      expect(count).toBeGreaterThanOrEqual(2);
      // 1 グループに 1 桁分 (3〜4 枚) が固まっていないこと
      expect(count).toBeLessThanOrEqual(3);
    }
  });

  it("板はプレイヤーの頭上にあり、天井を突き抜けない", () => {
    for (const slab of SLABS) {
      expect(slab.y - slab.height / 2).toBeGreaterThan(PLAYER.height + 0.1);
      expect(slab.y + slab.height / 2).toBeLessThan(MAIN_ROOM.height);
    }
  });

  it("板はメイン研究室の内側にある", () => {
    for (const slab of SLABS) {
      expect(slab.x).toBeGreaterThan(MAIN_ROOM.minX);
      expect(slab.x).toBeLessThan(MAIN_ROOM.maxX);
      expect(slab.z - slab.width / 2).toBeGreaterThan(MAIN_ROOM.minZ);
      expect(slab.z + slab.width / 2).toBeLessThan(MAIN_ROOM.maxZ);
    }
  });

  it("グリフ全体が観察窓の枠の中に収まって見える", () => {
    const windowDistance = MAIN_ROOM.minX - OBSERVE_MARK.x;
    const tanRight = (WINDOW.maxZ - OBSERVE_MARK.z) / windowDistance;
    const tanLeft = (WINDOW.minZ - OBSERVE_MARK.z) / windowDistance;
    const tanTop = (WINDOW.maxY - OBSERVE_MARK.y) / windowDistance;
    const tanBottom = (WINDOW.minY - OBSERVE_MARK.y) / windowDistance;

    for (const rect of GLYPH_RECTS) {
      const uMin = (rect.u - rect.width / 2) / GLYPH_REFERENCE_DISTANCE;
      const uMax = (rect.u + rect.width / 2) / GLYPH_REFERENCE_DISTANCE;
      const vMin = (rect.v - rect.height / 2) / GLYPH_REFERENCE_DISTANCE;
      const vMax = (rect.v + rect.height / 2) / GLYPH_REFERENCE_DISTANCE;
      expect(uMin).toBeGreaterThan(tanLeft);
      expect(uMax).toBeLessThan(tanRight);
      expect(vMin).toBeGreaterThan(tanBottom);
      expect(vMax).toBeLessThan(tanTop);
    }
  });

  it("グリフは 404 の 3 桁ぶんの幅を持つ", () => {
    const left = Math.min(...GLYPH_RECTS.map((r) => r.u - r.width / 2));
    const right = Math.max(...GLYPH_RECTS.map((r) => r.u + r.width / 2));
    expect(right - left).toBeGreaterThan(2.0);
  });
});
