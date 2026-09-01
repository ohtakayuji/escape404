import { describe, expect, it } from "vitest";
import { CollisionWorld } from "../src/player/CollisionWorld";
import {
  BOOKSHELF_SLIDE,
  DOORWAY,
  HIDDEN_ROOM,
  MAIN_ROOM,
  OBSERVE_MARK,
  PLAYER,
  SPAWN,
} from "../src/data/layout";

/** 0.1m 刻みのグリッドで到達可能性を調べる (進行不能の検出) */
function reachable(world: CollisionWorld, from: { x: number; z: number }): Set<string> {
  const STEP = 0.1;
  const key = (x: number, z: number) => `${x},${z}`;
  const toCell = (value: number) => Math.round(value / STEP);
  const seen = new Set<string>();
  const start = [toCell(from.x), toCell(from.z)] as const;
  const queue: [number, number][] = [[start[0], start[1]]];
  seen.add(key(start[0], start[1]));

  while (queue.length > 0) {
    const [cx, cz] = queue.shift()!;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = cx + dx;
      const nz = cz + dz;
      const id = key(nx, nz);
      if (seen.has(id)) continue;
      const point = { x: nx * STEP, z: nz * STEP };
      if (point.x < HIDDEN_ROOM.minX - 0.5 || point.x > MAIN_ROOM.maxX + 0.5) continue;
      if (point.z < MAIN_ROOM.minZ - 0.5 || point.z > MAIN_ROOM.maxZ + 0.5) continue;
      if (!world.isClear(point)) continue;
      seen.add(id);
      queue.push([nx, nz]);
    }
  }
  return seen;
}

function canReach(set: Set<string>, x: number, z: number): boolean {
  const cell = (value: number) => Math.round(value / 0.1);
  // 目標そのものが什器の内側でも、隣接 0.5m 以内に立てれば操作できる
  for (let dx = -5; dx <= 5; dx += 1) {
    for (let dz = -5; dz <= 5; dz += 1) {
      if (set.has(`${cell(x) + dx},${cell(z) + dz}`)) return true;
    }
  }
  return false;
}

describe("当たり判定", () => {
  it("スポーン地点は何にも埋まっていない", () => {
    const world = new CollisionWorld();
    expect(world.isClear(SPAWN.position)).toBe(true);
  });

  it("北の壁を通り抜けられない", () => {
    const world = new CollisionWorld();
    const position = { x: 0, z: 0 };
    for (let i = 0; i < 200; i += 1) {
      world.moveAndCollide(position, { x: 0, z: -0.05 });
    }
    expect(position.z).toBeGreaterThan(MAIN_ROOM.minZ);
  });

  it("東の壁を通り抜けられない", () => {
    const world = new CollisionWorld();
    const position = { x: 0, z: 2.0 };
    for (let i = 0; i < 300; i += 1) {
      world.moveAndCollide(position, { x: 0.05, z: 0 });
    }
    expect(position.x).toBeLessThan(MAIN_ROOM.maxX);
  });

  it("中央デスクにめり込まない", () => {
    const world = new CollisionWorld();
    const position = { x: 0, z: 2.2 };
    for (let i = 0; i < 100; i += 1) {
      world.moveAndCollide(position, { x: 0, z: -0.05 });
    }
    expect(position.z).toBeGreaterThan(0.55);
  });

  it("本棚が動く前は隠し部屋へ入れない", () => {
    const world = new CollisionWorld();
    const set = reachable(world, SPAWN.position);
    expect(canReach(set, OBSERVE_MARK.x, OBSERVE_MARK.z)).toBe(false);
  });

  it("本棚が動いた後は隠し部屋へ入れる", () => {
    const world = new CollisionWorld();
    world.offsetZ("bookshelf", BOOKSHELF_SLIDE);
    const set = reachable(world, SPAWN.position);
    expect(canReach(set, OBSERVE_MARK.x, OBSERVE_MARK.z)).toBe(true);
  });

  it("主要な操作対象すべてに歩いて近づける", () => {
    const world = new CollisionWorld();
    world.offsetZ("bookshelf", BOOKSHELF_SLIDE);
    const set = reachable(world, SPAWN.position);
    const targets: [string, number, number][] = [
      ["中央デスク", 0, 1.0],
      ["時計", 4.0, -3.8],
      ["絵画 A", -4.5, -3.8],
      ["絵画 D", 0.0, -3.8],
      ["PC", 4.6, -2.0],
      ["金庫", -4.6, 3.2],
      ["形状サンプルの棚", 4.2, 3.4],
      ["壁パネル", -1.5, 3.6],
      ["EXIT DOOR", 1.5, 3.6],
      ["本棚", -5.0, 0.4],
      ["観察窓", -6.6, -0.6],
      ["観測点 X", OBSERVE_MARK.x, OBSERVE_MARK.z],
      ["台座", -8.0, 0.9],
      ["端末", -9.0, 0.0],
    ];
    for (const [name, x, z] of targets) {
      expect(canReach(set, x, z), `${name} へ到達できない`).toBe(true);
    }
  });

  it("隠し通路はプレイヤーの幅より広い", () => {
    const width = DOORWAY.maxZ - DOORWAY.minZ;
    expect(width).toBeGreaterThan(PLAYER.radius * 2 + 0.3);
  });

  it("EXIT DOOR を無効化すると外へ出られる", () => {
    const world = new CollisionWorld();
    world.setEnabled("exit-door", false);
    const position = { x: 1.5, z: 3.0 };
    for (let i = 0; i < 60; i += 1) {
      world.moveAndCollide(position, { x: 0, z: 0.05 });
    }
    expect(position.z).toBeGreaterThan(MAIN_ROOM.maxZ);
  });
});
