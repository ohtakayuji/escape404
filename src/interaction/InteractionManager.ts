import * as THREE from "three";
import type { GameState } from "../core/GameState";
import type { GameContext, Interactable } from "./Interactable";

const DEFAULT_MAX_DISTANCE = 2.2;
/** 遮蔽判定の許容差 (自分自身の面を遮蔽物と誤認しないため) */
const OCCLUSION_EPSILON = 0.03;

export interface FocusInfo {
  interactable: Interactable;
  label: string;
  verb: string;
  /** 選択中アイテムを使える相手か */
  canUseItem: boolean;
}

/**
 * 画面中央からの Raycast で「今操作できるもの」を 1 つだけ決める。
 *
 * - 操作対象は Group で登録されることもあるので、再帰的に判定して
 *   ヒットした子メッシュから祖先方向へ id を辿る。
 * - 壁や什器 (occluders) が手前にある場合は操作できない。
 *   壁越しに調べられてしまうのを防ぐ。
 */
export class InteractionManager {
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2(0, 0);
  private readonly byId = new Map<string, Interactable>();
  private focus: FocusInfo | null = null;
  private updateCount = 0;
  private lastError: string | null = null;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly targets: THREE.Object3D[],
    private readonly occluders: THREE.Object3D[],
    interactables: Interactable[],
  ) {
    for (const interactable of interactables) this.byId.set(interactable.id, interactable);
    this.raycaster.far = 6;
  }

  get current(): FocusInfo | null {
    return this.focus;
  }

  /** 毎フレーム呼ぶ。フォーカスが変わったら true。 */
  update(context: GameContext): boolean {
    this.updateCount += 1;
    let next: FocusInfo | null = null;
    try {
      next = this.pick(context);
    } catch (error) {
      this.lastError = String(error);
    }
    const changed =
      next?.interactable.id !== this.focus?.interactable.id ||
      next?.label !== this.focus?.label ||
      next?.canUseItem !== this.focus?.canUseItem;
    this.focus = next;
    return changed;
  }

  /** E キー。 */
  interact(context: GameContext): boolean {
    const focus = this.focus;
    if (!focus) return false;
    focus.interactable.interact(context);
    return true;
  }

  /** F キー。使えるアイテムを持っていれば使う。 */
  useSelectedItem(context: GameContext): boolean {
    const focus = this.focus;
    const item = context.state.selectedItem;
    if (!focus || !item || !focus.canUseItem) return false;
    focus.interactable.useItem?.(item, context);
    return true;
  }

  /** 診断用: 画面中央のレイが何に当たっているかを返す。 */
  debugRay(): {
    camera: { x: number; y: number; z: number; yaw: number; pitch: number };
    hits: { id: string | null; name: string; distance: number }[];
    blockers: { name: string; distance: number }[];
    updateCount: number;
    lastError: string | null;
  } {
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.targets, true).slice(0, 6);
    const blockers = this.raycaster.intersectObjects(this.occluders, true).slice(0, 4);
    return {
      camera: {
        x: this.camera.position.x,
        y: this.camera.position.y,
        z: this.camera.position.z,
        yaw: this.camera.rotation.y,
        pitch: this.camera.rotation.x,
      },
      hits: hits.map((hit) => ({
        id: this.findOwner(hit.object)?.id ?? null,
        name: hit.object.name || hit.object.type,
        distance: Number(hit.distance.toFixed(3)),
      })),
      blockers: blockers.map((hit) => ({
        name: hit.object.name || hit.object.type,
        distance: Number(hit.distance.toFixed(3)),
      })),
      updateCount: this.updateCount,
      lastError: this.lastError,
    };
  }

  private pick(context: GameContext): FocusInfo | null {
    // カメラの matrixWorld は描画時にしか更新されないため、
    // ここで更新しないと Raycast が 1 フレーム前の視点を使ってしまう。
    this.camera.updateMatrixWorld();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.targets, true);

    for (const hit of hits) {
      const owner = this.findOwner(hit.object);
      if (!owner) continue;
      const interactable = this.byId.get(owner.id);
      if (!interactable) continue;
      if (!this.isEnabled(interactable, context.state)) continue;
      if (!this.isVisibleInTree(hit.object)) continue;
      if (hit.distance > (interactable.maxDistance ?? DEFAULT_MAX_DISTANCE)) continue;
      if (this.isBlocked(hit.distance, owner.object)) return null;

      const selected = context.state.selectedItem;
      return {
        interactable,
        label: interactable.label(context),
        verb: interactable.verb?.(context) ?? "調べる",
        canUseItem:
          selected !== null && (interactable.acceptsItem?.(selected, context) ?? false),
      };
    }
    return null;
  }

  /** ヒットしたメッシュから祖先方向へ interactableId を探す。 */
  private findOwner(object: THREE.Object3D): { id: string; object: THREE.Object3D } | null {
    let node: THREE.Object3D | null = object;
    while (node) {
      const id = node.userData["interactableId"];
      if (typeof id === "string") return { id, object: node };
      node = node.parent;
    }
    return null;
  }

  /** 手前に壁や什器があるか。 */
  private isBlocked(distance: number, owner: THREE.Object3D): boolean {
    const blockers = this.raycaster.intersectObjects(this.occluders, true);
    for (const blocker of blockers) {
      if (blocker.distance >= distance - OCCLUSION_EPSILON) return false;
      if (blocker.object === owner || this.isDescendantOf(blocker.object, owner)) continue;
      return true;
    }
    return false;
  }

  private isDescendantOf(object: THREE.Object3D, ancestor: THREE.Object3D): boolean {
    let node: THREE.Object3D | null = object.parent;
    while (node) {
      if (node === ancestor) return true;
      node = node.parent;
    }
    return false;
  }

  private isEnabled(interactable: Interactable, state: GameState): boolean {
    try {
      return interactable.enabled(state);
    } catch {
      return false;
    }
  }

  /**
   * 見えていない対象は操作させない。
   * ヒットしたメッシュ自身は当たり判定専用の不可視メッシュ (スロット等) が
   * あり得るので、親から上を見る。
   */
  private isVisibleInTree(object: THREE.Object3D): boolean {
    let node: THREE.Object3D | null = object.parent;
    while (node) {
      if (!node.visible) return false;
      node = node.parent;
    }
    return true;
  }
}
