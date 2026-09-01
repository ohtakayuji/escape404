import { createInitialState, type GameState } from "../core/GameState";
import type { EndingId } from "../core/ids";
import { InputManager, type GameAction } from "../core/InputManager";
import { SaveManager } from "../core/SaveManager";
import {
  loadSettings,
  normalizeSettings,
  saveSettings,
  type Settings,
} from "../core/Settings";
import { Animator } from "../core/tween";
import { INTRO_LINES, EVE } from "../data/dialogue";
import { AudioManager } from "../audio/AudioManager";
import { InventoryManager } from "../inventory/InventoryManager";
import { createInteractables } from "../interaction/registry";
import { InteractionManager } from "../interaction/InteractionManager";
import type { GameContext } from "../interaction/Interactable";
import { CollisionWorld } from "../player/CollisionWorld";
import { PlayerController } from "../player/PlayerController";
import { PuzzleManager } from "../puzzles/PuzzleManager";
import { SceneManager } from "../scene/SceneManager";
import { UIManager } from "../ui/UIManager";
import { Progression } from "./Progression";

type Scene = "title" | "game";

const AUTOSAVE_INTERVAL = 15;

/**
 * アプリ本体。各システムを組み立て、ゲームループを回す。
 * ここに Puzzle の答えや部屋の寸法は書かない (data/ と puzzles/ が持つ)。
 */
export class GameApp {
  private readonly canvas: HTMLCanvasElement;
  private readonly startScreen: HTMLElement;

  private settings: Settings;
  private state: GameState;
  private readonly save = new SaveManager();
  private readonly animator = new Animator();
  private readonly collision = new CollisionWorld();

  private scene: SceneManager;
  private player: PlayerController;
  private input: InputManager;
  private audio: AudioManager;
  private puzzles: PuzzleManager;
  private inventory: InventoryManager;
  private ui: UIManager;
  private progression: Progression;
  private interaction: InteractionManager;

  private currentScene: Scene = "title";
  private flashlightOn = false;
  /** 一度でもポインタロックを取得できたか (取れない環境の判定に使う) */
  private lockEverAcquired = false;
  private lockErrorNotified = false;
  private lockRequestPending = false;
  private lastFrame = 0;
  private sinceSave = 0;
  private rafHandle = 0;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement, startScreen: HTMLElement) {
    this.canvas = canvas;
    this.startScreen = startScreen;

    this.settings = loadSettings();
    this.state = createInitialState();

    this.scene = new SceneManager(canvas, this.settings.fov);
    this.player = new PlayerController(this.scene.camera, this.collision);
    this.input = new InputManager(canvas);
    this.audio = new AudioManager(this.settings);
    this.puzzles = new PuzzleManager(this.state);
    this.inventory = new InventoryManager(this.state);

    this.ui = new UIManager({
      root: uiRoot,
      state: this.state,
      puzzles: this.puzzles,
      inventory: this.inventory,
      audio: this.audio,
      progression: {
        // Progression の生成前に UI から参照されないよう、遅延で束ねる
        applyPuzzleResult: (result) => this.progression.applyPuzzleResult(result),
        pickUpShape: (id) => this.progression.pickUpShape(id),
        placeShape: (slot, shape) => this.progression.placeShape(slot, shape),
        clearSlot: (slot) => this.progression.clearSlot(slot),
        readLog: (id) => this.progression.readLog(id),
        revealFilterDigits: () => this.progression.revealFilterDigits(),
        useItemOnExitDoor: () => this.progression.useItemOnExitDoor(),
        chooseEnding: (ending) => this.progression.chooseEnding(ending),
        requestSave: () => this.progression.requestSave(),
      },
      getSettings: () => this.settings,
      onSettingsChange: (patch) => this.updateSettings(patch),
      onModalChange: (open) => this.handleModalChange(open),
      onRequestLook: () => void this.tryPointerLock(),
      onReset: () => this.resetAndReload(),
      onTitle: () => this.returnToTitle(),
      onRestart: () => this.resetAndReload(),
    });

    this.progression = new Progression({
      state: this.state,
      scene: this.scene,
      collision: this.collision,
      animator: this.animator,
      audio: this.audio,
      ui: this.ui,
      inventory: this.inventory,
      puzzles: this.puzzles,
      save: () => this.persist(),
      onEnding: (ending) => this.showEnding(ending),
    });

    this.interaction = new InteractionManager(
      this.scene.camera,
      this.scene.environment.interactionMeshes,
      this.scene.environment.occluders,
      createInteractables(),
    );

    this.bindEvents();
    this.applySettingsToSystems();
  }

  /* -------------------------------------------------------------- */
  /* 起動                                                            */
  /* -------------------------------------------------------------- */

  boot(): void {
    document.body.dataset["scene"] = "title";
    document.body.dataset["touch"] = String(this.isTouchDevice());
    const continueButton = document.getElementById("btn-continue") as HTMLButtonElement | null;
    if (continueButton) continueButton.disabled = !this.save.hasSave();
    if (!this.save.available) {
      this.ui.toast("この環境では進行を保存できない", "warn");
    }
    this.scene.render();
    this.loop(performance.now());
  }

  startNewGame(): void {
    this.audio.unlock();
    this.audio.startAmbient();
    this.save.clear();
    this.adoptState(createInitialState());
    this.enterGame();
    this.ui.cinematic.playIntro(INTRO_LINES, () => {
      this.ui.speak(EVE.boot!);
      // スキップ操作 (クリック / キー) の直後ならここでロックが取れる。
      // 取れなければ案内を出す。
      void this.tryPointerLock();
      this.animator.after(7, () => {
        if (this.state.solvedPuzzles.length === 0) this.ui.speak(EVE.firstLook!);
      });
    });
  }

  continueGame(): void {
    this.audio.unlock();
    this.audio.startAmbient();
    const result = this.save.load();
    if (result.status === "ok") {
      this.adoptState(result.state);
      this.enterGame();
      this.progression.syncFromState();
      this.ui.toast("進行を復元した");
      void this.tryPointerLock();
      return;
    }
    if (result.status === "corrupt") {
      this.ui.showNotice(
        "セーブデータを読めません",
        `${result.reason}\n新しくゲームを始めることはできます。`,
      );
      return;
    }
    this.startNewGame();
  }

  openSettingsFromTitle(): void {
    this.ui.openSettings();
  }

  /* -------------------------------------------------------------- */
  /* シーン遷移                                                      */
  /* -------------------------------------------------------------- */

  private enterGame(): void {
    this.currentScene = "game";
    document.body.dataset["scene"] = "game";
    this.startScreen.hidden = true;
    this.ui.hud.setVisible(true);
    this.ui.refreshHud();
    this.player.teleportToSpawn();
    this.input.attach();
    this.input.movementEnabled = true;
    this.setFlashlight(false);
    this.syncLookPrompt();
  }

  private returnToTitle(): void {
    this.persist();
    window.location.reload();
  }

  private resetAndReload(): void {
    this.save.clear();
    window.location.reload();
  }

  private showEnding(ending: EndingId): void {
    this.input.releasePointerLock();
    this.input.movementEnabled = false;
    this.ui.showEnding(ending);
    this.syncLookPrompt();
  }

  /**
   * 新規開始 / ロード時に state を「同じオブジェクトのまま」入れ替える。
   * 各 Manager は生成時の参照を持つので、オブジェクトを作り直すと
   * UI が二重に生成される。参照は保ったまま中身だけ差し替える。
   */
  private adoptState(next: GameState): void {
    const state = this.state;
    state.version = next.version;
    state.startedAt = next.startedAt;
    state.elapsedSeconds = next.elapsedSeconds;
    state.selectedItem = next.selectedItem;
    state.ending = next.ending;

    Object.assign(state.flags, next.flags);
    Object.assign(state.logs, next.logs);

    state.solvedPuzzles.length = 0;
    state.solvedPuzzles.push(...next.solvedPuzzles);
    state.inventory.length = 0;
    state.inventory.push(...next.inventory);
    state.readDocuments.length = 0;
    state.readDocuments.push(...next.readDocuments);

    for (let i = 0; i < state.shapeSlots.length; i += 1) {
      state.shapeSlots[i] = next.shapeSlots[i] ?? null;
    }
    for (const key of Object.keys(state.hintsUsed)) delete state.hintsUsed[key];
    Object.assign(state.hintsUsed, next.hintsUsed);

    this.ui.hud.setCrosshairSize(this.settings.crosshairSize);
  }

  /* -------------------------------------------------------------- */
  /* 入力                                                            */
  /* -------------------------------------------------------------- */

  private bindEvents(): void {
    this.input.events.on("action", (action) => this.handleAction(action));
    this.input.events.on("pointerlock:change", (locked) => {
      document.body.dataset["pointerLocked"] = String(locked);
      if (locked) this.lockEverAcquired = true;
      if (!locked && this.currentScene === "game" && !this.ui.isModalOpen && !this.state.ending) {
        this.ui.openPause();
      }
      this.syncLookPrompt();
    });
    this.input.events.on("pointerlock:error", () => {
      // Chrome は Esc 解除の直後しばらく再取得を拒む。取得実績があるなら
      // 環境の非対応ではないので、警告ではなく案内の再表示だけにする。
      if (!this.lockEverAcquired && !this.lockErrorNotified) {
        this.lockErrorNotified = true;
        this.ui.toast("この環境ではマウス視点固定が使えない", "warn");
      }
      this.syncLookPrompt();
    });

    this.canvas.addEventListener("click", () => void this.tryPointerLock());

    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.currentScene === "game") this.persist();
    });

    window.addEventListener("beforeunload", () => {
      if (this.currentScene === "game") this.persist();
    });
  }

  private handleAction(action: GameAction): void {
    if (this.currentScene !== "game" || this.ui.cinematic.isPlaying) {
      if (action === "pause" && this.ui.isModalOpen) this.ui.closeModal();
      return;
    }

    const handlers: Record<GameAction, () => void> = {
      pause: () => {
        if (this.ui.isModalOpen) this.ui.closeModal();
        else this.ui.openPause();
      },
      inventory: () => {
        if (this.ui.isModalOpen && this.ui.modalId !== "inventory") return;
        this.ui.toggleInventory();
      },
      hint: () => {
        if (this.ui.isModalOpen && this.ui.modalId !== "hints") return;
        if (this.ui.modalId === "hints") this.ui.closeModal();
        else this.ui.openHints();
      },
      interact: () => {
        if (this.ui.isModalOpen) return;
        if (!this.interaction.interact(this.context())) {
          this.audio.play("denied");
        }
      },
      "use-item": () => {
        if (this.ui.isModalOpen) return;
        if (!this.interaction.useSelectedItem(this.context())) {
          this.audio.play("denied");
          this.ui.toast("ここでは使えない", "warn");
        }
      },
      flashlight: () => {
        if (this.ui.isModalOpen) return;
        if (!this.inventory.has("flashlight")) {
          this.audio.play("denied");
          this.ui.toast("明かりになる物を持っていない", "warn");
          return;
        }
        this.setFlashlight(!this.flashlightOn);
      },
    };
    handlers[action]();
  }

  private setFlashlight(on: boolean): void {
    this.flashlightOn = on;
    this.scene.setFlashlight(on);
    this.audio.play("flashlight");
  }

  private handleModalChange(open: boolean): void {
    this.input.movementEnabled = !open;
    if (open) {
      this.input.releasePointerLock();
      this.syncLookPrompt();
      return;
    }
    // 閉じた操作 (クリック / Esc) の流れでロックを取り直す。
    // 取れなければ案内が出るので、マウスが効かないまま放置されない。
    void this.tryPointerLock();
  }

  /**
   * ポインタロックを要求する。Pointer Lock はユーザー操作からしか取得できず
   * 自動では取れないため、失敗したら案内 (LookPrompt) を出して次の操作を待つ。
   */
  private async tryPointerLock(): Promise<void> {
    // 要求が重なると Chrome が先の要求を取り消してロックが外れる。1 つずつ通す。
    if (this.lockRequestPending) return;
    if (!this.canLook()) {
      this.syncLookPrompt();
      return;
    }
    this.audio.unlock();
    this.lockRequestPending = true;
    try {
      const locked = await this.input.requestPointerLock();
      if (locked) this.lockEverAcquired = true;
    } finally {
      this.lockRequestPending = false;
    }
    this.syncLookPrompt();
  }

  /** 視点操作をしていて良い場面か (モーダル・演出・エンディング中は違う) */
  private canLook(): boolean {
    return (
      this.currentScene === "game" &&
      !this.ui.isModalOpen &&
      !this.ui.cinematic.isPlaying &&
      this.state.ending === null
    );
  }

  private syncLookPrompt(): void {
    this.ui.setLookPromptVisible(this.canLook() && !this.input.pointerLocked);
  }

  private context(): GameContext {
    return {
      state: this.state,
      puzzles: this.puzzles,
      inventory: this.inventory,
      ui: this.ui,
      audio: this.audio,
      progression: this.progression,
    };
  }

  /* -------------------------------------------------------------- */
  /* 設定                                                            */
  /* -------------------------------------------------------------- */

  private updateSettings(patch: Partial<Settings>): void {
    this.settings = normalizeSettings({ ...this.settings, ...patch });
    saveSettings(this.settings);
    this.applySettingsToSystems();
  }

  private applySettingsToSystems(): void {
    this.scene.setFov(this.settings.fov);
    this.audio.applySettings(this.settings);
    this.ui.hud.setCrosshairSize(this.settings.crosshairSize);
  }

  /* -------------------------------------------------------------- */
  /* ループ                                                          */
  /* -------------------------------------------------------------- */

  private loop = (now: number): void => {
    this.rafHandle = requestAnimationFrame(this.loop);
    const dt = this.lastFrame === 0 ? 0 : Math.min(0.05, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    if (dt === 0) return;

    this.animator.update(dt);
    this.ui.update(dt);

    if (this.currentScene === "game") this.updateGame(dt);
    this.scene.render();
  };

  private updateGame(dt: number): void {
    const paused =
      this.ui.cinematic.isPlaying ||
      this.state.ending !== null ||
      ["pause", "settings", "reset"].includes(this.ui.modalId ?? "");

    if (!paused) {
      this.state.elapsedSeconds += dt;
      this.sinceSave += dt;
      if (this.sinceSave >= AUTOSAVE_INTERVAL) {
        this.sinceSave = 0;
        this.persist();
      }
    }

    if (!this.ui.isModalOpen && !paused) {
      const { stepped } = this.player.update({
        dt,
        move: this.input.readMove(),
        look: this.input.readLook(),
        sensitivity: this.settings.mouseSensitivity,
        cameraBob: this.settings.cameraBob,
      });
      if (stepped) this.audio.play("footstep");

      if (this.interaction.update(this.context())) this.renderFocus();
    }

    const effects = this.scene.updateEffects({
      dt,
      flashlightOn: this.flashlightOn,
      cameraPosition: this.scene.camera.position,
      cameraDirection: this.player.forward,
      motionEffects: this.settings.motionEffects,
    });

    if (effects.hiddenTextVisible && !this.state.flags.hiddenTextSeen) {
      this.state.flags.hiddenTextSeen = true;
      this.ui.toast("壁面の表示を確認した");
      this.persist();
    }
  }

  private renderFocus(): void {
    const focus = this.interaction.current;
    if (!focus) {
      this.ui.hud.setPrompt(null);
      this.ui.hud.setCrosshair("idle");
      return;
    }
    this.ui.hud.setPrompt(focus.label, focus.verb, focus.canUseItem);
    this.ui.hud.setCrosshair(focus.canUseItem ? "use" : "interact");
  }

  private persist(): void {
    this.save.save(this.state);
  }

  private isTouchDevice(): boolean {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  }

  /**
   * E2E テスト用のハンドル。UI が使うのと同じ経路 (PuzzleManager →
   * Progression) を呼ぶだけで、判定を迂回する近道は作らない。
   */
  testApi() {
    return {
      getState: () => JSON.parse(JSON.stringify(this.state)) as GameState,
      scene: () => this.currentScene,
      submit: (puzzleId: Parameters<PuzzleManager["submit"]>[0], answer: unknown) => {
        const result = this.puzzles.submit(puzzleId, answer);
        if (result.status === "solved") this.progression.applyPuzzleResult(result);
        return result.status;
      },
      pickShape: (id: Parameters<Progression["pickUpShape"]>[0]) => this.progression.pickUpShape(id),
      placeShape: (slot: number, shape: Parameters<Progression["pickUpShape"]>[0]) =>
        this.progression.placeShape(slot, shape),
      clearSlot: (slot: number) => this.progression.clearSlot(slot),
      readLog: (id: Parameters<Progression["readLog"]>[0]) => this.progression.readLog(id),
      revealFilterDigits: () => this.progression.revealFilterDigits(),
      useMasterKey: () => this.progression.useItemOnExitDoor(),
      chooseEnding: (ending: EndingId) => this.progression.chooseEnding(ending),
      openKeypad: (puzzleId: Parameters<PuzzleManager["submit"]>[0], digits = 4) =>
        this.ui.openKeypad({ puzzleId, title: "TEST", digits }),
      openPc: () => this.ui.openPc(),
      openFinalTerminal: () => this.ui.openFinalTerminal(),
      teleport: (x: number, z: number, yaw?: number, pitch?: number) => {
        this.player.position.set(x, 0, z);
        if (yaw !== undefined) this.player.yaw = yaw;
        if (pitch !== undefined) this.player.pitch = pitch;
      },
      /** 今フォーカスしている対象 (Raycast の結果) */
      focus: () => {
        const focus = this.interaction.current;
        return focus ? { id: focus.interactable.id, label: focus.label, verb: focus.verb } : null;
      },
      /** 診断用: 画面中央のレイの当たり内容 */
      debugRay: () => this.interaction.debugRay(),
      /** E キー相当 */
      pressInteract: () => this.handleAction("interact"),
      /** F キー相当 */
      pressUseItem: () => this.handleAction("use-item"),
      selectItem: (id: Parameters<InventoryManager["select"]>[0]) => {
        this.inventory.select(id);
        this.ui.refreshHud();
      },
      position: () => ({ x: this.player.position.x, z: this.player.position.z }),
      /** 衝突込みで移動を試す (壁抜けテスト用) */
      walk: (dx: number, dz: number, steps = 60) => {
        for (let i = 0; i < steps; i += 1) {
          this.collision.moveAndCollide(this.player.position, { x: dx / steps, z: dz / steps });
        }
        return { x: this.player.position.x, z: this.player.position.z };
      },
      setFlashlight: (on: boolean) => this.setFlashlight(on),
      flashlightOn: () => this.flashlightOn,
      modalId: () => this.ui.modalId,
      /** 視点操作の案内が出ているか */
      lookPromptVisible: () => this.ui.isLookPromptVisible,
      renderStats: () => ({
        triangles: this.scene.renderer.info.render.triangles,
        calls: this.scene.renderer.info.render.calls,
        frame: this.scene.renderer.info.render.frame,
      }),
    };
  }

  dispose(): void {
    cancelAnimationFrame(this.rafHandle);
    this.input.dispose();
    this.audio.dispose();
    this.scene.dispose();
  }
}
