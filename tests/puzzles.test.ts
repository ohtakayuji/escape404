import { describe, expect, it } from "vitest";
import { createInitialState, canAskWhoIAm, type GameState } from "../src/core/GameState";
import { PuzzleManager } from "../src/puzzles/PuzzleManager";
import { PUZZLES } from "../src/data/puzzles";

function newGame(): { state: GameState; puzzles: PuzzleManager } {
  const state = createInitialState(0);
  return { state, puzzles: new PuzzleManager(state) };
}

/** 仕様の正解 (11_ACCEPTANCE_TEST.md) */
const ANSWERS = {
  "p1-drawer": "0417",
  "p2-login": "ORION",
  "p3-safe": "5892",
  "p4-frames": "1673",
  "p6-perspective": "404",
} as const;

describe("Puzzle の正解", () => {
  it("P1 は 0417 で開く", () => {
    const { puzzles, state } = newGame();
    expect(puzzles.submit("p1-drawer", "0417").status).toBe("solved");
    expect(state.flags.drawerOpened).toBe(true);
    expect(state.inventory).toContain("flashlight");
    expect(state.flags.flashlightFound).toBe(true);
  });

  it("P1 は誤答を受け付けない", () => {
    const { puzzles, state } = newGame();
    const result = puzzles.submit("p1-drawer", "1234");
    expect(result.status).toBe("wrong");
    expect(state.flags.drawerOpened).toBe(false);
  });

  it("誤答の回数を数える", () => {
    const { puzzles } = newGame();
    puzzles.submit("p1-drawer", "0000");
    puzzles.submit("p1-drawer", "1111");
    const third = puzzles.submit("p1-drawer", "2222");
    expect(third.status === "wrong" && third.attempts).toBe(3);
  });

  it("P2 は ORION、大文字小文字と前後の空白を無視する", () => {
    const { puzzles, state } = newGame();
    puzzles.submit("p1-drawer", ANSWERS["p1-drawer"]);
    state.flags.hiddenTextSeen = true;
    expect(puzzles.submit("p2-login", " orion ").status).toBe("solved");
    expect(state.flags.pcUnlocked).toBe(true);
  });

  it("P3 は 5892 で金庫が開き、フィルタと鍵が手に入る", () => {
    const { puzzles, state } = newGame();
    state.flags.pcUnlocked = true;
    expect(puzzles.submit("p3-safe", "5892").status).toBe("solved");
    expect(state.inventory).toEqual(expect.arrayContaining(["optical-filter", "small-key"]));
  });

  it("P4 は 1673 で壁パネルが開く", () => {
    const { puzzles, state } = newGame();
    state.inventory.push("small-key");
    expect(puzzles.submit("p4-frames", "1673").status).toBe("solved");
    expect(state.flags.wallPanelOpened).toBe(true);
  });

  it("P5 は Sphere / Cone / Cube / Cylinder の順だけ通る", () => {
    const { puzzles, state } = newGame();
    state.flags.wallPanelOpened = true;
    expect(puzzles.submit("p5-shapes", ["cube", "cone", "sphere", "cylinder"]).status).toBe("wrong");
    expect(puzzles.submit("p5-shapes", ["sphere", "cone", "cube", "cylinder"]).status).toBe("solved");
    expect(state.flags.hiddenPassageOpened).toBe(true);
  });

  it("P5 はスロットが 4 つ埋まっていないと通らない", () => {
    const { puzzles, state } = newGame();
    state.flags.wallPanelOpened = true;
    expect(puzzles.submit("p5-shapes", ["sphere", "cone", "cube"]).status).toBe("wrong");
  });

  it("P6 は 404 で MASTER KEY が出る", () => {
    const { puzzles, state } = newGame();
    state.flags.hiddenPassageOpened = true;
    expect(puzzles.submit("p6-perspective", "404").status).toBe("solved");
    expect(state.inventory).toContain("master-key");
    expect(state.flags.masterKeyFound).toBe(true);
  });
});

describe("前提条件のロック", () => {
  it("Flashlight なしでは P2 に挑戦できない", () => {
    const { puzzles } = newGame();
    const result = puzzles.submit("p2-login", "ORION");
    expect(result.status).toBe("locked");
    expect(puzzles.canAttempt("p2-login")).toBe(false);
  });

  it("壁面文字を見ていなければ P2 に挑戦できない", () => {
    const { puzzles, state } = newGame();
    puzzles.submit("p1-drawer", ANSWERS["p1-drawer"]);
    expect(state.flags.hiddenTextSeen).toBe(false);
    expect(puzzles.submit("p2-login", "ORION").status).toBe("locked");
  });

  it("PC 解除前は P3 に挑戦できない", () => {
    const { puzzles } = newGame();
    expect(puzzles.submit("p3-safe", "5892").status).toBe("locked");
  });

  it("SMALL KEY なしでは P4 に挑戦できない", () => {
    const { puzzles } = newGame();
    expect(puzzles.submit("p4-frames", "1673").status).toBe("locked");
  });

  it("壁パネル開放前は P5 に挑戦できない", () => {
    const { puzzles } = newGame();
    expect(puzzles.submit("p5-shapes", ["sphere", "cone", "cube", "cylinder"]).status).toBe("locked");
  });

  it("隠し通路開放前は P6 に挑戦できない", () => {
    const { puzzles } = newGame();
    expect(puzzles.submit("p6-perspective", "404").status).toBe("locked");
  });

  it("EXIT DOOR の認証前は P7 に挑戦できない", () => {
    const { puzzles } = newGame();
    expect(puzzles.canAttempt("p7-final")).toBe(false);
  });
});

describe("冪等性", () => {
  it("同じ Puzzle を二重に解いてもアイテムは増えない", () => {
    const { puzzles, state } = newGame();
    puzzles.submit("p1-drawer", "0417");
    const again = puzzles.submit("p1-drawer", "0417");
    expect(again.status).toBe("already");
    expect(state.inventory.filter((id) => id === "flashlight")).toHaveLength(1);
    expect(state.solvedPuzzles.filter((id) => id === "p1-drawer")).toHaveLength(1);
  });
});

describe("エンディング条件", () => {
  it("ログ 3 つを読むまで ASK WHO I AM は選べない", () => {
    const state = createInitialState(0);
    expect(canAskWhoIAm(state)).toBe(false);
    state.logs.archive01 = true;
    state.logs.archive02 = true;
    expect(canAskWhoIAm(state)).toBe(false);
    state.logs.subject17 = true;
    expect(canAskWhoIAm(state)).toBe(true);
  });
});

describe("通し進行", () => {
  it("START から P7 まで、想定順で一度も詰まらずに進める", () => {
    const { puzzles, state } = newGame();

    expect(puzzles.submit("p1-drawer", "0417").status).toBe("solved");
    state.flags.hiddenTextSeen = true; // 懐中電灯で壁面文字を確認した相当
    expect(puzzles.submit("p2-login", "ORION").status).toBe("solved");
    expect(puzzles.submit("p3-safe", "5892").status).toBe("solved");
    expect(puzzles.submit("p4-frames", "1673").status).toBe("solved");
    expect(puzzles.submit("p5-shapes", ["sphere", "cone", "cube", "cylinder"]).status).toBe("solved");
    expect(puzzles.submit("p6-perspective", "404").status).toBe("solved");

    state.flags.finalTerminalUnlocked = true;
    expect(puzzles.canAttempt("p7-final")).toBe(true);
    expect(state.solvedPuzzles).toHaveLength(6);
  });

  it("ヒント画面は未解決の最初の Puzzle を出す", () => {
    const { puzzles } = newGame();
    expect(puzzles.currentPuzzle().id).toBe("p1-drawer");
    puzzles.submit("p1-drawer", "0417");
    expect(puzzles.currentPuzzle().id).toBe("p2-login");
  });

  it("すべての Puzzle にヒントが 3 段階ある", () => {
    for (const puzzle of PUZZLES) {
      expect(puzzle.hints).toHaveLength(3);
      for (const hint of puzzle.hints) expect(hint.length).toBeGreaterThan(0);
    }
  });
});
