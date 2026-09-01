import * as THREE from "three";
import type { GameState } from "../core/GameState";
import { markDocumentRead } from "../core/GameState";
import type { EndingId, LogId, ShapeItemId } from "../core/ids";
import { Animator, easeInOutQuad, easeOutCubic } from "../core/tween";
import { BOOKSHELF_SLIDE, WALL_PANEL } from "../data/layout";
import { EVE } from "../data/dialogue";
import { getPuzzle } from "../data/puzzles";
import type { InventoryManager } from "../inventory/InventoryManager";
import { getItem } from "../inventory/items";
import type { ProgressionFacade } from "../interaction/Interactable";
import type { PuzzleManager, PuzzleResult } from "../puzzles/PuzzleManager";
import type { CollisionWorld } from "../player/CollisionWorld";
import type { SceneManager } from "../scene/SceneManager";
import type { AudioManager } from "../audio/AudioManager";
import type { UIManager } from "../ui/UIManager";

export interface ProgressionDeps {
  state: GameState;
  scene: SceneManager;
  collision: CollisionWorld;
  animator: Animator;
  audio: AudioManager;
  ui: UIManager;
  inventory: InventoryManager;
  puzzles: PuzzleManager;
  save: () => void;
  onEnding: (ending: EndingId) => void;
}

const DRAWER_OPEN_OFFSET = 0.42;

/**
 * 「Puzzle が解けた」を世界の変化へ翻訳する層。
 * Puzzle 判定 (PuzzleManager) と見た目 (SceneManager) の間に置くことで、
 * どちらも相手のことを知らずに済む。
 */
export class Progression implements ProgressionFacade {
  private readonly placedShapes = new Map<number, THREE.Object3D>();

  constructor(private readonly deps: ProgressionDeps) {}

  /* -------------------------------------------------------------- */
  /* Puzzle 結果の適用                                               */
  /* -------------------------------------------------------------- */

  applyPuzzleResult(result: PuzzleResult): void {
    if (result.status !== "solved") return;
    const { puzzle } = result;

    for (const item of result.grantedItems) {
      this.deps.inventory.add(item);
      this.deps.ui.toast(`${getItem(item).name} 取得`);
    }

    const handlers: Record<string, () => void> = {
      "p1-drawer": () => this.openDrawer(true),
      "p2-login": () => {
        this.deps.scene.setPcUnlocked(true);
        this.deps.audio.play("terminal");
      },
      "p3-safe": () => this.openSafe(true),
      "p4-frames": () => this.openWallPanel(true),
      "p5-shapes": () => this.openHiddenPassage(true),
      "p6-perspective": () => this.openPedestal(true),
    };
    handlers[puzzle.id]?.();

    const line = EVE[puzzle.id];
    if (line) this.deps.ui.speak(line);
    this.pulseFrame();
    this.deps.ui.refreshHud();
    this.deps.save();
  }

  /* -------------------------------------------------------------- */
  /* 個別の世界変化                                                  */
  /* -------------------------------------------------------------- */

  private openDrawer(animate: boolean): void {
    const drawer = this.deps.scene.environment.parts.drawer;
    this.deps.scene.environment.parts.drawerContents.visible = true;
    if (!animate) {
      drawer.position.z = 0.5 + DRAWER_OPEN_OFFSET;
      return;
    }
    this.deps.audio.play("drawer");
    const from = drawer.position.z;
    this.deps.animator.tween({
      duration: 0.5,
      ease: easeOutCubic,
      onUpdate: (t) => {
        drawer.position.z = from + DRAWER_OPEN_OFFSET * t;
      },
    });
  }

  private openSafe(animate: boolean): void {
    const pivot = this.deps.scene.environment.parts.safeDoorPivot;
    this.deps.scene.environment.parts.safeContents.visible = true;
    const target = -Math.PI / 2 + 0.25;
    if (!animate) {
      pivot.rotation.y = target;
      return;
    }
    this.deps.audio.play("safe");
    this.deps.animator.tween({
      duration: 0.9,
      ease: easeOutCubic,
      onUpdate: (t) => {
        pivot.rotation.y = target * t;
      },
    });
  }

  private openWallPanel(animate: boolean): void {
    const panel = this.deps.scene.environment.parts.wallPanel;
    const target = WALL_PANEL.center.y + WALL_PANEL.slideY;
    if (!animate) {
      panel.position.y = target;
      return;
    }
    this.deps.audio.play("wall");
    const from = panel.position.y;
    this.deps.animator.tween({
      duration: 1.1,
      ease: easeInOutQuad,
      onUpdate: (t) => {
        panel.position.y = from + (target - from) * t;
      },
    });
  }

  private openHiddenPassage(animate: boolean): void {
    const shelf = this.deps.scene.environment.parts.bookshelf;
    const closedZ = Number(shelf.userData["closedZ"] ?? shelf.position.z);
    const openZ = Number(shelf.userData["openZ"] ?? closedZ + BOOKSHELF_SLIDE);
    this.deps.collision.offsetZ("bookshelf", BOOKSHELF_SLIDE);
    this.deps.scene.setEmergencyLight(true);
    if (!animate) {
      shelf.position.z = openZ;
      return;
    }
    this.deps.audio.play("wall");
    this.deps.animator.tween({
      duration: 1.6,
      ease: easeInOutQuad,
      onUpdate: (t) => {
        shelf.position.z = closedZ + (openZ - closedZ) * t;
      },
    });
  }

  private openPedestal(animate: boolean): void {
    this.deps.scene.showMasterKey();
    this.deps.scene.setTerminalLines(["OBSERVATION", "CONFIRMED", "404 OK"]);
    if (animate) {
      this.deps.audio.play("safe");
      this.deps.ui.speak(EVE.masterKey!);
    }
  }

  /* -------------------------------------------------------------- */
  /* アイテム操作                                                    */
  /* -------------------------------------------------------------- */

  pickUpShape(id: ShapeItemId): void {
    if (!this.deps.inventory.add(id)) return;
    const mesh = this.deps.scene.environment.parts.shelfShapes.get(id);
    if (mesh) mesh.visible = false;
    this.deps.audio.play("pickup");
    this.deps.ui.toast(`${getItem(id).name} 取得`);
    this.deps.ui.refreshHud();
    this.deps.save();
  }

  placeShape(slotIndex: number, shape: ShapeItemId): void {
    if (this.deps.state.shapeSlots[slotIndex]) return;
    if (!this.deps.inventory.remove(shape)) return;
    this.deps.state.shapeSlots[slotIndex] = shape;
    this.spawnSlotMesh(slotIndex, shape);
    this.deps.audio.play("interact");
    this.deps.ui.toast(`SLOT ${slotIndex + 1} に ${getItem(shape).name} を置いた`);
    this.deps.ui.refreshHud();
    this.evaluateShapePuzzle();
    this.deps.save();
  }

  clearSlot(slotIndex: number): void {
    const shape = this.deps.state.shapeSlots[slotIndex];
    if (!shape) return;
    this.deps.state.shapeSlots[slotIndex] = null;
    this.deps.inventory.add(shape);
    const mesh = this.placedShapes.get(slotIndex);
    if (mesh) {
      mesh.removeFromParent();
      this.placedShapes.delete(slotIndex);
    }
    this.deps.audio.play("interact");
    this.deps.ui.refreshHud();
    this.deps.save();
  }

  /** 4 つ埋まったら判定する。埋まるまでは何も起きない。 */
  private evaluateShapePuzzle(): void {
    const slots = this.deps.state.shapeSlots;
    if (slots.some((slot) => slot === null)) return;
    const result = this.deps.puzzles.submit("p5-shapes", slots);
    if (result.status === "solved") {
      this.deps.audio.play("correct");
      this.applyPuzzleResult(result);
      return;
    }
    if (result.status === "wrong") {
      this.deps.audio.play("incorrect");
      this.deps.ui.speak(result.attempts >= 3 ? EVE.wrongAgain! : EVE.wrong!);
      this.deps.ui.toast("配置が違う。並びを見直す", "warn");
    }
  }

  private spawnSlotMesh(slotIndex: number, shape: ShapeItemId): void {
    const source = this.deps.scene.environment.parts.shelfShapes.get(shape);
    if (!source) return;
    const clone = source.clone(true);
    clone.visible = true;
    clone.position.set(
      WALL_PANEL.slotStartX + slotIndex * WALL_PANEL.slotStepX,
      WALL_PANEL.slotY - 0.04,
      WALL_PANEL.slotZ,
    );
    this.deps.scene.environment.parts.slotContents.add(clone);
    this.placedShapes.set(slotIndex, clone);
  }

  revealFilterDigits(): void {
    this.deps.scene.revealFrameDigits();
    this.deps.save();
  }

  readLog(id: LogId): void {
    if (this.deps.state.logs[id]) return;
    this.deps.state.logs[id] = true;
    markDocumentRead(this.deps.state, id);
    this.deps.audio.play("pickup");
    if (id === "archive01") {
      this.deps.ui.toast("PC の FILES に新しいファイルが現れた");
    } else {
      this.deps.ui.toast(`${id.toUpperCase()} を記録した`);
    }
    this.deps.save();
  }

  useItemOnExitDoor(): boolean {
    if (!this.deps.inventory.has("master-key")) return false;
    if (this.deps.state.flags.finalTerminalUnlocked) return false;
    this.deps.state.flags.finalTerminalUnlocked = true;
    this.deps.audio.play("door");
    this.deps.ui.toast("MASTER KEY 受理 — 最終端末が有効化された");
    this.deps.ui.speak(EVE.doorArmed!);
    this.deps.scene.setTerminalLines(["IDENTITY", "VALIDATION", "READY"], "#e2603f");
    this.pulseFrame();
    this.deps.save();
    return true;
  }

  /* -------------------------------------------------------------- */
  /* エンディング                                                    */
  /* -------------------------------------------------------------- */

  chooseEnding(ending: EndingId): void {
    if (this.deps.state.ending) return;
    this.deps.state.ending = ending;
    this.deps.puzzles.resolve(getPuzzle("p7-final"));
    this.deps.audio.play("ending");
    this.deps.save();

    // エンディングへの遷移は実時間で待つ。フレーム時間依存にすると
    // 描画が重い環境でクリア画面がいつまでも出ない。
    if (ending === "A") {
      this.openExitDoor();
      window.setTimeout(() => this.deps.onEnding("A"), 1600);
      return;
    }
    this.deps.ui.speak(EVE.endingB!);
    window.setTimeout(() => this.deps.onEnding("B"), 3400);
  }

  private openExitDoor(): void {
    const pivot = this.deps.scene.environment.parts.exitDoorPivot;
    this.deps.collision.setEnabled("exit-door", false);
    this.deps.audio.play("door");
    this.deps.animator.tween({
      duration: 1.2,
      ease: easeInOutQuad,
      onUpdate: (t) => {
        pivot.rotation.y = -1.45 * t;
        this.deps.scene.setExitGlow(t);
      },
    });
  }

  requestSave(): void {
    this.deps.save();
  }

  /* -------------------------------------------------------------- */
  /* セーブから復元                                                  */
  /* -------------------------------------------------------------- */

  /** ロード直後に、状態と見た目を一致させる (アニメーションなし)。 */
  syncFromState(): void {
    const { flags } = this.deps.state;
    if (flags.drawerOpened) this.openDrawer(false);
    if (flags.pcUnlocked) this.deps.scene.setPcUnlocked(true);
    if (flags.safeOpened) this.openSafe(false);
    if (flags.wallPanelOpened) this.openWallPanel(false);
    if (flags.hiddenPassageOpened) this.openHiddenPassage(false);
    if (flags.observationSolved) this.openPedestal(false);
    if (flags.finalTerminalUnlocked) {
      this.deps.scene.setTerminalLines(["IDENTITY", "VALIDATION", "READY"], "#e2603f");
    }
    if (this.deps.inventory.has("optical-filter")) {
      this.deps.scene.revealFrameDigits();
    }

    // 棚から持ち出した / スロットに置いた形状サンプルを反映
    for (const [id, mesh] of this.deps.scene.environment.parts.shelfShapes) {
      const shape = id as ShapeItemId;
      const taken =
        this.deps.inventory.has(shape) || this.deps.state.shapeSlots.includes(shape);
      mesh.visible = !taken;
    }
    this.deps.state.shapeSlots.forEach((shape, index) => {
      if (shape) this.spawnSlotMesh(index, shape);
    });
  }

  /** 観察フレームを一瞬締める (署名演出)。 */
  private pulseFrame(): void {
    const frame = document.getElementById("observation-frame");
    if (!frame) return;
    frame.dataset["pulse"] = "true";
    window.setTimeout(() => {
      frame.dataset["pulse"] = "false";
    }, 620);
  }
}
