import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { GTAOPass } from "three/examples/jsm/postprocessing/GTAOPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { VignetteShader } from "three/examples/jsm/shaders/VignetteShader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { FRAMES, HIDDEN_TEXT, MAIN_ROOM } from "../data/layout";
import { Environment } from "./Environment";
import { Glyph404 } from "./Glyph404";
import { Lighting } from "./Lighting";
import { monitorTexture, terminalTexture } from "./textures";

export interface EffectInput {
  dt: number;
  flashlightOn: boolean;
  cameraPosition: THREE.Vector3;
  cameraDirection: THREE.Vector3;
  motionEffects: boolean;
}

/** 描画品質。ソフトウェア描画の環境では重いパスを外す。 */
export type GraphicsQuality = "high" | "low";

export interface EffectOutput {
  /** 壁面文字が今はっきり見えているか (P2 の発見判定に使う) */
  hiddenTextVisible: boolean;
}

/** 3D 側の入り口。GameState は持たず、指示されたことだけをやる。 */
/**
 * ソフトウェア描画 (SwiftShader / llvmpipe) や明示指定を見て品質を決める。
 * `?gfx=high` / `?gfx=low` で上書きできる。
 */
function detectQuality(renderer: THREE.WebGLRenderer): GraphicsQuality {
  const forced = new URLSearchParams(window.location.search).get("gfx");
  if (forced === "high" || forced === "low") return forced;
  try {
    const gl = renderer.getContext();
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : "";
    if (/swiftshader|llvmpipe|software|basic render/i.test(name)) return "low";
  } catch {
    /* 取得できなければ高品質のまま扱う */
  }
  return "high";
}

export class SceneManager {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly environment = new Environment();
  readonly glyph = new Glyph404();
  readonly lighting: Lighting;

  private frameBlinkTime = 0;
  private hiddenTextOpacity = 0;
  private readonly textWorldPosition = new THREE.Vector3(
    HIDDEN_TEXT.position.x,
    HIDDEN_TEXT.position.y,
    HIDDEN_TEXT.position.z,
  );
  private readonly toText = new THREE.Vector3();
  private readonly onResize = () => this.resize();

  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass | null = null;
  private readonly ao: GTAOPass | null = null;
  readonly quality: GraphicsQuality;
  private readonly pmrem: THREE.PMREMGenerator;
  private environmentTexture: THREE.Texture | null = null;

  constructor(canvas: HTMLCanvasElement, fov: number) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false, // EffectComposer 側で MSAA を掛ける
      powerPreference: "high-performance",
    });
    this.quality = detectQuality(this.renderer);
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this.quality === "high" ? 2 : 1),
    );
    this.renderer.shadowMap.enabled = this.quality === "high";
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // フィルミックトーンマッピング: ハイライトが飛ばず、暗部が潰れない
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.setClearColor(0x05070a, 1);
    /*
     * 既定では render() ごとに統計がリセットされるため、ポストプロセスを
     * 通すと最後のパス分しか残らない。フレーム単位で見たいので手動管理にする。
     */
    this.renderer.info.autoReset = false;

    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 60);
    // 空気の色。サイバー区画のネオンが霧に乗るよう、わずかに紫へ寄せる
    this.scene.fog = new THREE.Fog(0x0a0d18, 11, 34);

    // 室内の間接光・金属の映り込み用の環境マップ
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.environmentTexture = this.pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    this.scene.environment = this.environmentTexture;
    this.scene.environmentIntensity = 0.28;

    this.lighting = new Lighting(this.environment.materials);
    // ネオンのこぼれ光は光源が増えるので、ソフトウェア描画では発光面だけ残す
    this.environment.neon.setSpillEnabled(this.quality === "high");
    this.scene.add(this.environment.group, this.glyph.group, this.lighting.group);
    this.camera.add(
      this.lighting.flashlight,
      this.lighting.flashlight.target,
      this.lighting.flashlightHalo,
      this.lighting.flashlightHalo.target,
      this.lighting.heldFlashlight,
    );
    this.scene.add(this.camera);

    // ポストプロセス: MSAA → Bloom → Vignette → トーンマッピング
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: this.quality === "high" ? 4 : 0,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    if (this.quality === "high") {
      // 環境遮蔽: 隅と接地部が締まり、物が空間に「置かれて」見える
      this.ao = new GTAOPass(this.scene, this.camera, 1, 1);
      this.ao.blendIntensity = 0.8;
      this.ao.updateGtaoMaterial({
        radius: 0.4,
        distanceExponent: 1.3,
        thickness: 0.5,
        scale: 1.0,
        samples: 16,
        screenSpaceRadius: false,
      });
      this.composer.addPass(this.ao);

      /*
       * しきい値 0.95 は動かさない。P6 の背景パネルはこの下に収まる明るさで
       * 作ってあり、上げると黒板の輪郭が滲んで錯視が崩れる。
       * ネオン管はしきい値を越えるので、強さだけ上げれば管だけが光る。
       */
      this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.42, 0.56, 0.95);
      this.composer.addPass(this.bloom);
    }
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms["offset"]!.value = 1.1;
    vignette.uniforms["darkness"]!.value = 1.15;
    this.composer.addPass(vignette);
    this.composer.addPass(new OutputPass());

    window.addEventListener("resize", this.onResize);
    this.resize();
  }

  resize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.ao?.setSize(width, height);
    this.bloom?.setSize(width, height);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setFov(fov: number): void {
    this.camera.fov = fov;
    this.camera.updateProjectionMatrix();
  }

  render(): void {
    this.renderer.info.reset();
    this.composer.render();
  }

  /* -------------------------------------------------------------- */
  /* 見た目の切り替え                                                */
  /* -------------------------------------------------------------- */

  setFlashlight(on: boolean): void {
    this.lighting.flashlight.intensity = on ? 26 : 0;
    this.lighting.flashlightHalo.intensity = on ? 6 : 0;
    this.lighting.heldFlashlight.visible = on;
  }

  setPcUnlocked(unlocked: boolean): void {
    const material = this.environment.parts.monitor.material as THREE.MeshStandardMaterial;
    const texture = monitorTexture(unlocked);
    material.map = texture;
    material.emissiveMap = texture;
    material.needsUpdate = true;
  }

  setTerminalLines(lines: string[], accent?: string): void {
    const material = this.environment.parts.terminalScreen.material as THREE.MeshStandardMaterial;
    const texture = terminalTexture(lines, accent);
    material.map = texture;
    material.emissiveMap = texture;
    material.needsUpdate = true;
  }

  revealFrameDigits(): void {
    for (const digit of this.environment.parts.frameDigits) digit.visible = true;
  }

  setEmergencyLight(on: boolean): void {
    this.environment.parts.emergencyLight.intensity = on ? 15 : 0;
    // 通路が開いた合図として、通路のネオンも同時に点ける
    this.environment.neon.setPassageOn(on);
  }

  setExitGlow(value: number): void {
    const material = this.environment.parts.exitGlow.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = value * 3.2;
  }

  showMasterKey(): void {
    this.environment.parts.masterKey.visible = true;
  }

  /* -------------------------------------------------------------- */
  /* 毎フレームの演出                                                */
  /* -------------------------------------------------------------- */

  updateEffects(input: EffectInput): EffectOutput {
    this.updateFrameLights(input.dt, input.motionEffects);
    const showDust = input.motionEffects && this.quality === "high";
    if (showDust) this.lighting.update(input.dt);
    this.lighting.setDustVisible(showDust);
    this.environment.neon.update(input.dt, input.motionEffects);
    return { hiddenTextVisible: this.updateHiddenText(input) };
  }

  /**
   * 額縁のライトを点滅させる。回数が P4 の読む順番になる。
   * 6 秒周期で、0.9 秒の休止を挟んで規定回数だけ光る。
   */
  private updateFrameLights(dt: number, motionEffects: boolean): void {
    const CYCLE = 6;
    const BLINK = 0.42;
    this.frameBlinkTime = (this.frameBlinkTime + dt) % CYCLE;
    const t = this.frameBlinkTime;

    FRAMES.forEach((spec, index) => {
      const mesh = this.environment.parts.frameLights[index];
      if (!mesh) return;
      const material = mesh.material as THREE.MeshStandardMaterial;
      if (!motionEffects) {
        material.emissiveIntensity = 0.7;
        return;
      }
      const window = spec.blinks * BLINK * 2;
      const on = t < window && Math.floor(t / BLINK) % 2 === 0;
      material.emissiveIntensity = on ? 1.5 : 0.06;
    });
  }

  /** 懐中電灯を当てている間だけ壁面文字を浮かび上がらせる。 */
  private updateHiddenText(input: EffectInput): boolean {
    const text = this.environment.parts.hiddenText;
    const material = text.material as THREE.MeshStandardMaterial;

    this.toText.copy(this.textWorldPosition).sub(input.cameraPosition);
    const distance = this.toText.length();
    const facing = this.toText.normalize().dot(input.cameraDirection);
    const lit =
      input.flashlightOn &&
      distance < HIDDEN_TEXT.revealDistance &&
      facing > HIDDEN_TEXT.revealDot;

    const target = lit ? 1 : 0;
    const speed = lit ? 6 : 3;
    this.hiddenTextOpacity += (target - this.hiddenTextOpacity) * Math.min(1, input.dt * speed);
    material.opacity = this.hiddenTextOpacity;
    material.emissiveIntensity = this.hiddenTextOpacity * 1.6;
    text.visible = this.hiddenTextOpacity > 0.02;
    return this.hiddenTextOpacity > 0.75;
  }

  /** 天井の高さ (デバッグ表示や配置検証に使う) */
  get ceilingHeight(): number {
    return MAIN_ROOM.height;
  }

  dispose(): void {
    window.removeEventListener("resize", this.onResize);
    this.composer.dispose();
    this.environmentTexture?.dispose();
    this.pmrem.dispose();
    this.environment.dispose();
    this.glyph.dispose();
    this.lighting.dispose();
    this.renderer.dispose();
  }
}
