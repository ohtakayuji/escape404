import type { ShapeItemId } from "../core/ids";
import { OBSERVATIONS, getDocument } from "../data/documents";
import { CAMERA_PROPS, FRAMES } from "../data/layout";
import { SHAPE_LABELS } from "../inventory/items";
import type { GameContext, Interactable } from "./Interactable";

/** 観察テキストを開く共通処理。 */
function observe(context: GameContext, id: string): void {
  const doc = OBSERVATIONS[id];
  if (!doc) return;
  context.audio.play("interact");
  context.ui.openDocument(doc);
}

function read(context: GameContext, id: string): void {
  context.audio.play("interact");
  context.ui.openDocument(getDocument(id));
  context.progression.requestSave();
}

const SHAPES: ShapeItemId[] = ["sphere", "cone", "cube", "cylinder"];

/**
 * 室内の操作対象。1 つの Interactable が状態に応じて振る舞いを変える。
 * 答えは PuzzleManager 側にあり、ここには持たせない。
 */
export function createInteractables(): Interactable[] {
  const list: Interactable[] = [
    /* --- 中央デスク ------------------------------------------------ */
    {
      id: "employee-card",
      label: () => "社員カード",
      enabled: () => true,
      maxDistance: 1.6,
      interact: (context) => read(context, "employee-card"),
    },
    {
      id: "memo-b",
      label: () => "MEMO B",
      enabled: () => true,
      maxDistance: 1.6,
      interact: (context) => read(context, "memo-b"),
    },
    {
      id: "drawer",
      label: (context) => (context.state.flags.drawerOpened ? "MEMO A" : "ロックされた引き出し"),
      verb: (context) => (context.state.flags.drawerOpened ? "読む" : "解除する"),
      enabled: () => true,
      maxDistance: 1.8,
      interact: (context) => {
        if (context.state.flags.drawerOpened) {
          read(context, "memo-a");
          return;
        }
        context.audio.play("keypad");
        context.ui.openKeypad({
          puzzleId: "p1-drawer",
          title: "DRAWER LOCK",
          digits: 4,
          caption: "4 桁の数字を入力",
        });
      },
    },
    {
      id: "wall-clock",
      label: () => "止まった時計",
      enabled: () => true,
      maxDistance: 2.2,
      interact: (context) => observe(context, "wall-clock"),
    },

    /* --- PC -------------------------------------------------------- */
    {
      id: "pc",
      label: (context) => (context.state.flags.pcUnlocked ? "NEXUS OS" : "ロックされた PC"),
      verb: (context) => (context.state.flags.pcUnlocked ? "操作する" : "ログインする"),
      enabled: () => true,
      maxDistance: 1.9,
      interact: (context) => {
        if (context.state.flags.pcUnlocked) {
          context.audio.play("terminal");
          context.ui.openPc();
          return;
        }
        const reason = context.puzzles.lockReason("p2-login");
        if (reason) {
          context.audio.play("denied");
          context.ui.toast(reason, "warn");
          return;
        }
        context.audio.play("terminal");
        context.ui.openTextEntry({
          puzzleId: "p2-login",
          title: "NEXUS OS — LOGIN",
          caption: "PASSWORD",
          maxLength: 12,
        });
      },
    },

    /* --- 金庫 ------------------------------------------------------ */
    {
      id: "safe",
      label: (context) => (context.state.flags.safeOpened ? "金庫 (開)" : "金庫"),
      verb: (context) => (context.state.flags.safeOpened ? "調べる" : "解除する"),
      enabled: () => true,
      maxDistance: 1.9,
      interact: (context) => {
        if (context.state.flags.safeOpened) {
          observe(context, "safe-empty");
          return;
        }
        const reason = context.puzzles.lockReason("p3-safe");
        if (reason) {
          context.audio.play("denied");
          context.ui.toast(reason, "warn");
          return;
        }
        context.audio.play("keypad");
        context.ui.openKeypad({
          puzzleId: "p3-safe",
          title: "SAFE KEYPAD",
          digits: 4,
          caption: "4 桁の数字を入力",
        });
      },
    },
    {
      id: "archive01",
      label: () => "ARCHIVE LOG 01",
      verb: () => "読む",
      enabled: (state) => state.flags.safeOpened,
      maxDistance: 1.8,
      interact: (context) => {
        context.progression.readLog("archive01");
        read(context, "archive01");
      },
    },

    /* --- 本棚 ------------------------------------------------------ */
    {
      id: "book-order",
      label: () => "OPTICAL CALIBRATION",
      verb: () => "読む",
      enabled: () => true,
      maxDistance: 1.8,
      interact: (context) => read(context, "book-order"),
    },

    /* --- 壁パネル -------------------------------------------------- */
    {
      id: "wall-panel",
      label: (context) => (context.state.flags.wallPanelOpened ? "露出したスロット" : "壁パネル"),
      enabled: () => true,
      maxDistance: 2.0,
      interact: (context) =>
        observe(context, context.state.flags.wallPanelOpened ? "wall-panel-open" : "wall-panel-closed"),
    },
    {
      id: "wall-panel-keypad",
      label: (context) => (context.state.flags.wallPanelOpened ? "パネル制御盤" : "金属カバー付きキーパッド"),
      verb: (context) => (context.state.flags.wallPanelOpened ? "調べる" : "解除する"),
      enabled: () => true,
      maxDistance: 1.8,
      interact: (context) => {
        if (context.state.flags.wallPanelOpened) {
          context.ui.toast("パネルはもう開いている");
          return;
        }
        const reason = context.puzzles.lockReason("p4-frames");
        if (reason) {
          context.audio.play("denied");
          context.ui.toast(reason, "warn");
          return;
        }
        context.audio.play("keypad");
        context.ui.openKeypad({
          puzzleId: "p4-frames",
          title: "WALL PANEL",
          digits: 4,
          caption: "六角キーでカバーを外した。4 桁の数字を入力",
        });
      },
    },

    /* --- EXIT DOOR ------------------------------------------------- */
    {
      id: "exit-door",
      label: () => "EXIT DOOR",
      enabled: () => true,
      maxDistance: 2.2,
      interact: (context) =>
        observe(
          context,
          context.state.flags.finalTerminalUnlocked ? "exit-door-armed" : "exit-door-locked",
        ),
      acceptsItem: (item, context) =>
        item === "master-key" && !context.state.flags.finalTerminalUnlocked,
      useItem: (_item, context) => {
        context.progression.useItemOnExitDoor();
      },
    },

    /* --- 隠し部屋 -------------------------------------------------- */
    {
      id: "observe-mark",
      label: () => "床の X 印",
      enabled: () => true,
      maxDistance: 2.4,
      interact: (context) => observe(context, "observe-mark"),
    },
    {
      id: "terminal",
      label: (context) =>
        context.state.flags.finalTerminalUnlocked
          ? "IDENTITY VALIDATION"
          : context.state.flags.observationSolved
            ? "観察端末"
            : "観察端末 — CODE",
      verb: () => "操作する",
      enabled: () => true,
      maxDistance: 1.9,
      interact: (context) => {
        if (context.state.flags.finalTerminalUnlocked) {
          context.audio.play("terminal");
          context.ui.openFinalTerminal();
          return;
        }
        if (context.state.flags.observationSolved) {
          context.audio.play("denied");
          context.ui.toast("OBSERVATION COMPLETE — EXIT DOOR の認証待ち", "warn");
          return;
        }
        context.audio.play("terminal");
        context.ui.openTextEntry({
          puzzleId: "p6-perspective",
          title: "OBSERVATION CODE",
          caption: "観察窓から見えたものを入力",
          maxLength: 4,
        });
      },
    },
    {
      id: "pedestal",
      label: (context) => (context.state.flags.observationSolved ? "台座 (開)" : "台座"),
      enabled: () => true,
      maxDistance: 1.8,
      interact: (context) => {
        if (!context.state.flags.observationSolved) {
          observe(context, "pedestal");
          return;
        }
        context.progression.readLog("archive02");
        read(context, "archive02");
      },
    },
  ];

  /* --- 絵画 4 枚 --------------------------------------------------- */
  for (const frame of FRAMES) {
    list.push({
      id: `painting-${frame.id}`,
      label: () => `光学校正チャート ${frame.id}`,
      enabled: () => true,
      maxDistance: 2.4,
      interact: (context) => {
        const filtered = context.state.solvedPuzzles.includes("p4-frames") ||
          context.inventory.has("optical-filter");
        observe(context, filtered ? "painting-filtered" : "painting");
      },
      acceptsItem: (item) => item === "optical-filter",
      useItem: (_item, context) => {
        context.audio.play("interact");
        context.progression.revealFilterDigits();
        context.ui.toast("フィルタ越しに数字が見えた");
      },
    });
  }

  /* --- 形状サンプル ------------------------------------------------ */
  for (const shape of SHAPES) {
    list.push({
      id: `shape-${shape}`,
      label: () => SHAPE_LABELS[shape],
      verb: () => "拾う",
      enabled: (state) => !state.inventory.includes(shape) && !state.shapeSlots.includes(shape),
      maxDistance: 1.7,
      interact: (context) => context.progression.pickUpShape(shape),
    });
  }

  /* --- 4 つのスロット --------------------------------------------- */
  for (let index = 0; index < 4; index += 1) {
    list.push({
      id: `slot-${index}`,
      label: (context) => {
        const placed = context.state.shapeSlots[index];
        return placed ? `SLOT ${index + 1} — ${placed.toUpperCase()}` : `SLOT ${index + 1} — 空`;
      },
      verb: () => "置く",
      enabled: (state) => state.flags.wallPanelOpened && !state.flags.hiddenPassageOpened,
      maxDistance: 1.8,
      interact: (context) => {
        context.audio.play("interact");
        context.ui.openShapePlacement(index);
      },
    });
  }

  /* --- 監視カメラ -------------------------------------------------- */
  for (const prop of CAMERA_PROPS) {
    list.push({
      id: `camera-${prop.id}`,
      label: () => `監視カメラ ${prop.id}`,
      enabled: () => true,
      maxDistance: 3.2,
      interact: (context) => observe(context, "camera"),
    });
  }

  return list;
}
