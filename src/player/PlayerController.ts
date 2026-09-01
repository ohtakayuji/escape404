import * as THREE from "three";
import { PLAYER, SPAWN } from "../data/layout";
import { clamp } from "../core/tween";
import type { CollisionWorld } from "./CollisionWorld";
import type { MoveInput } from "../core/InputManager";

const PITCH_LIMIT = Math.PI / 2 - 0.05;

export interface PlayerFrameInput {
  dt: number;
  move: MoveInput;
  look: { x: number; y: number };
  sensitivity: number;
  cameraBob: boolean;
}

/**
 * FPS の移動と視点。加速・減速を持たせて「軽い慣性」を出す。
 * ジャンプ・しゃがみ・段差は仕様通り実装しない。
 */
export class PlayerController {
  readonly position = new THREE.Vector3(SPAWN.position.x, 0, SPAWN.position.z);
  yaw = SPAWN.yaw;
  pitch = SPAWN.pitch;

  private readonly velocity = new THREE.Vector2(0, 0);
  private bobPhase = 0;
  private travelled = 0;
  private lastStepAt = 0;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly collision: CollisionWorld,
  ) {
    this.camera.rotation.order = "YXZ";
    this.applyToCamera(0);
  }

  reset(): void {
    this.position.set(SPAWN.position.x, 0, SPAWN.position.z);
    this.yaw = SPAWN.yaw;
    this.pitch = SPAWN.pitch;
    this.velocity.set(0, 0);
    this.bobPhase = 0;
    this.travelled = 0;
    this.lastStepAt = 0;
    this.applyToCamera(0);
  }

  /** 1 フレーム進める。歩いた距離が足音の閾値を越えたら true を返す。 */
  update(input: PlayerFrameInput): { stepped: boolean } {
    this.yaw -= input.look.x * PLAYER.mouseSensitivity * input.sensitivity;
    this.pitch = clamp(
      this.pitch - input.look.y * PLAYER.mouseSensitivity * input.sensitivity,
      -PITCH_LIMIT,
      PITCH_LIMIT,
    );

    // 入力をワールド座標の向きへ変換 (yaw のみ考慮)
    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    // camera 前方は yaw=0 のとき -Z。move.z = -1 が前進なので符号はこの形になる。
    const wishX = input.move.x * cos + input.move.z * sin;
    const wishZ = input.move.z * cos - input.move.x * sin;

    const hasInput = input.move.x !== 0 || input.move.z !== 0;
    const targetX = wishX * PLAYER.walkSpeed;
    const targetZ = wishZ * PLAYER.walkSpeed;
    const rate = hasInput ? PLAYER.acceleration : PLAYER.deceleration;
    const blend = Math.min(1, rate * input.dt);
    this.velocity.x += (targetX - this.velocity.x) * blend;
    this.velocity.y += (targetZ - this.velocity.y) * blend;

    if (Math.abs(this.velocity.x) < 0.005) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < 0.005) this.velocity.y = 0;

    const delta = { x: this.velocity.x * input.dt, z: this.velocity.y * input.dt };
    this.collision.moveAndCollide(this.position, delta);

    const speed = Math.hypot(this.velocity.x, this.velocity.y);
    this.travelled += speed * input.dt;
    this.bobPhase += speed * input.dt * 4.2;

    const bob = input.cameraBob ? Math.sin(this.bobPhase) * 0.012 * Math.min(1, speed / PLAYER.walkSpeed) : 0;
    this.applyToCamera(bob);

    let stepped = false;
    if (this.travelled - this.lastStepAt > 0.85) {
      this.lastStepAt = this.travelled;
      stepped = speed > 0.4;
    }
    return { stepped };
  }

  teleportToSpawn(): void {
    this.reset();
  }

  get forward(): THREE.Vector3 {
    return this.camera.getWorldDirection(new THREE.Vector3());
  }

  get eyePosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  private applyToCamera(bob: number): void {
    this.camera.position.set(
      this.position.x,
      PLAYER.eyeHeight + bob,
      this.position.z,
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }
}
