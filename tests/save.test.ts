import { beforeEach, describe, expect, it } from "vitest";
import { createInitialState } from "../src/core/GameState";
import { SAVE_KEY, SaveManager, migrate } from "../src/core/SaveManager";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length(): number {
    return this.map.size;
  }
  clear(): void {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.get(key) ?? null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
}

describe("migrate", () => {
  it("空・不正な入力でも初期状態を返す", () => {
    for (const input of [null, undefined, 1, "x", [], {}]) {
      const state = migrate(input);
      expect(state.solvedPuzzles).toEqual([]);
      expect(state.inventory).toEqual([]);
      expect(state.flags.drawerOpened).toBe(false);
    }
  });

  it("未知の Puzzle / アイテム id を捨てる", () => {
    const state = migrate({
      solvedPuzzles: ["p1-drawer", "p99-nope"],
      inventory: ["flashlight", "rocket-launcher"],
    });
    expect(state.solvedPuzzles).toEqual(["p1-drawer"]);
    expect(state.inventory).toEqual(["flashlight"]);
  });

  it("重複したアイテムを 1 つにまとめる", () => {
    const state = migrate({ inventory: ["flashlight", "flashlight"] });
    expect(state.inventory).toEqual(["flashlight"]);
  });

  it("持っていないアイテムは選択状態にしない", () => {
    const state = migrate({ inventory: [], selectedItem: "master-key" });
    expect(state.selectedItem).toBeNull();
  });

  it("形状スロットは 4 枠に正規化する", () => {
    const state = migrate({ shapeSlots: ["sphere", "banana", null] });
    expect(state.shapeSlots).toEqual(["sphere", null, null, null]);
  });

  it("経過時間の異常値を 0 に落とす", () => {
    expect(migrate({ elapsedSeconds: Number.NaN }).elapsedSeconds).toBe(0);
    expect(migrate({ elapsedSeconds: -50 }).elapsedSeconds).toBe(0);
    expect(migrate({ elapsedSeconds: 120.5 }).elapsedSeconds).toBeCloseTo(120.5);
  });

  it("ヒント使用数を 0〜3 に収める", () => {
    const state = migrate({ hintsUsed: { "p1-drawer": 9, "p2-login": -2 } });
    expect(state.hintsUsed["p1-drawer"]).toBe(3);
    expect(state.hintsUsed["p2-login"]).toBe(0);
  });
});

describe("SaveManager", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
  });

  it("保存して読み戻せる", () => {
    const manager = new SaveManager(storage);
    const state = createInitialState(1000);
    state.flags.drawerOpened = true;
    state.inventory.push("flashlight");
    state.elapsedSeconds = 42;
    expect(manager.save(state)).toBe(true);
    expect(manager.hasSave()).toBe(true);

    const result = manager.load();
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.state.flags.drawerOpened).toBe(true);
    expect(result.state.inventory).toEqual(["flashlight"]);
    expect(result.state.elapsedSeconds).toBe(42);
  });

  it("壊れた JSON でも例外を投げず corrupt を返す", () => {
    storage.setItem(SAVE_KEY, "{ not json");
    const result = new SaveManager(storage).load();
    expect(result.status).toBe("corrupt");
  });

  it("セーブが無ければ empty", () => {
    expect(new SaveManager(storage).load().status).toBe("empty");
  });

  it("localStorage が使えない環境でも動く", () => {
    const manager = new SaveManager(null);
    expect(manager.available).toBe(false);
    expect(manager.save(createInitialState(0))).toBe(false);
    expect(manager.load().status).toBe("empty");
    expect(manager.hasSave()).toBe(false);
  });

  it("clear でセーブが消える", () => {
    const manager = new SaveManager(storage);
    manager.save(createInitialState(0));
    manager.clear();
    expect(manager.hasSave()).toBe(false);
  });
});
