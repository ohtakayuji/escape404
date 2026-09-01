import * as THREE from "three";
import {
  EXIT_DOOR,
  HIDDEN_ROOM,
  HIDDEN_TEXT,
  MAIN_ROOM,
  WALLS,
  WALL_THICKNESS,
  WINDOW,
  type Box,
} from "../data/layout";
import { MaterialLibrary } from "./materials";
import { MeshFactory } from "./MeshFactory";
import { NeonZone } from "./NeonZone";
import {
  buildBookshelf,
  buildCameras,
  buildChair,
  buildClock,
  buildExitDoor,
  buildHiddenRoomProps,
  buildMainDesk,
  buildPaintings,
  buildSafe,
  buildSampleShelf,
  buildWallPanel,
  buildWorkstation,
  type BuildContext,
} from "./furniture";
import {
  disposePbrTextures,
  floorSheenTexture,
  hazardStripTexture,
  stencilTexture,
} from "./pbr";
import { disposeTextures, exitSignTexture, textTexture } from "./textures";

/** 動かす・切り替える必要のあるオブジェクトへの参照。 */
export interface EnvironmentParts {
  drawer: THREE.Group;
  drawerContents: THREE.Group;
  exitDoorPivot: THREE.Group;
  exitGlow: THREE.Mesh;
  bookshelf: THREE.Group;
  wallPanel: THREE.Mesh;
  frameLights: THREE.Mesh[];
  frameDigits: THREE.Mesh[];
  hiddenText: THREE.Mesh;
  monitor: THREE.Mesh;
  terminalScreen: THREE.Mesh;
  safeDoorPivot: THREE.Group;
  safeContents: THREE.Group;
  shelfShapes: Map<string, THREE.Object3D>;
  slotMarkers: THREE.Mesh[];
  slotContents: THREE.Group;
  masterKey: THREE.Object3D;
  emergencyLight: THREE.PointLight;
}

const aabb = (
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
): Box => ({ center: { x: cx, y: cy, z: cz }, size: { x: sx, y: sy, z: sz } });

/**
 * 部屋そのものの構築。進行状態は一切持たず、
 * 「見た目」と「動かせる部品への参照」だけを提供する。
 * 什器の造形は furniture.ts に分けてある。
 */
export class Environment {
  readonly group = new THREE.Group();
  readonly materials = new MaterialLibrary();
  readonly parts: EnvironmentParts;
  /** サイバー区画 (隠し通路・機械室のネオンと主室の色被り) */
  readonly neon: NeonZone;
  /** Raycast 対象にするオブジェクト (装飾は含めない) */
  readonly interactionMeshes: THREE.Object3D[] = [];
  /** 視線を遮る大物。壁越しの操作を防ぐために使う。 */
  readonly occluders: THREE.Object3D[] = [];

  private readonly factory = new MeshFactory();
  private readonly context: BuildContext;

  constructor() {
    this.context = {
      factory: this.factory,
      materials: this.materials,
      register: (object, id) => this.registerInteractable(object, id),
      occlude: (object) => this.occluders.push(object),
    };

    this.buildShell();
    this.buildInfrastructure();

    this.neon = new NeonZone(this.context);
    this.group.add(this.neon.group);

    const desk = buildMainDesk(this.context);
    const workstation = buildWorkstation(this.context);
    const safe = buildSafe(this.context);
    const shelf = buildSampleShelf(this.context);
    const bookshelf = buildBookshelf(this.context);
    const panel = buildWallPanel(this.context);
    const door = buildExitDoor(this.context);
    const paintings = buildPaintings(this.context);
    const hidden = buildHiddenRoomProps(this.context);

    this.group.add(
      desk.group,
      buildChair(this.context),
      workstation.group,
      safe.group,
      shelf.group,
      bookshelf,
      panel.group,
      door.group,
      paintings.group,
      buildClock(this.context),
      buildCameras(this.context),
      hidden.group,
    );

    const bookshelfPiece = { closedZ: bookshelf.position.z };
    bookshelf.userData["closedZ"] = bookshelfPiece.closedZ;
    bookshelf.userData["openZ"] = bookshelfPiece.closedZ + 1.3;

    this.parts = {
      drawer: desk.drawer,
      drawerContents: desk.drawerContents,
      exitDoorPivot: door.pivot,
      exitGlow: door.glow,
      bookshelf,
      wallPanel: panel.panel,
      frameLights: paintings.lights,
      frameDigits: paintings.digits,
      hiddenText: this.buildHiddenText(),
      monitor: workstation.monitor,
      terminalScreen: hidden.terminalScreen,
      safeDoorPivot: safe.doorPivot,
      safeContents: safe.contents,
      shelfShapes: shelf.shapes,
      slotMarkers: panel.slotMarkers,
      slotContents: panel.slotContents,
      masterKey: hidden.masterKey,
      emergencyLight: hidden.emergencyLight,
    };
  }

  /** メッシュを登録し、raycast 対象に含める。 */
  registerInteractable(object: THREE.Object3D, id: string): void {
    object.userData["interactableId"] = id;
    this.interactionMeshes.push(object);
  }

  /* ---------------------------------------------------------------- */
  /* 躯体                                                              */
  /* ---------------------------------------------------------------- */

  private buildShell(): void {
    for (const wall of WALLS) {
      const mesh = this.factory.boxTiled(wall, this.materials.wall, 2.2);
      mesh.receiveShadow = true;
      this.group.add(mesh);
      this.occluders.push(mesh);
    }

    const mainWidth = MAIN_ROOM.maxX - MAIN_ROOM.minX;
    const mainDepth = MAIN_ROOM.maxZ - MAIN_ROOM.minZ;

    const floor = this.factory.plane(mainWidth, mainDepth, this.materials.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.group.add(floor);
    this.occluders.push(floor);

    const ceiling = this.factory.plane(mainWidth, mainDepth, this.materials.ceiling);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = MAIN_ROOM.height;
    this.group.add(ceiling);

    const hiddenWidth = HIDDEN_ROOM.maxX - HIDDEN_ROOM.minX;
    const hiddenDepth = HIDDEN_ROOM.maxZ - HIDDEN_ROOM.minZ;
    const hiddenCenterX = (HIDDEN_ROOM.minX + HIDDEN_ROOM.maxX) / 2;

    const hiddenFloor = this.factory.plane(hiddenWidth, hiddenDepth, this.materials.floorHidden);
    hiddenFloor.rotation.x = -Math.PI / 2;
    hiddenFloor.position.set(hiddenCenterX, 0, 0);
    hiddenFloor.receiveShadow = true;
    this.group.add(hiddenFloor);

    const hiddenCeiling = this.factory.plane(hiddenWidth, hiddenDepth, this.materials.ceiling);
    hiddenCeiling.rotation.x = Math.PI / 2;
    hiddenCeiling.position.set(hiddenCenterX, HIDDEN_ROOM.height, 0);
    this.group.add(hiddenCeiling);

    this.buildSkirting();
    this.buildBumperRails();
    this.buildDoorway();
    this.buildObservationWindow();
    this.buildLuminousPanels();
    this.buildFloorSheen();
  }

  /** 幅木。床と壁の境界を締めると空間の寸法が読み取りやすくなる。 */
  private buildSkirting(): void {
    const strips: Box[] = [
      aabb(0, 0.06, -4.45, 12.0, 0.12, 0.1),
      aabb(-2.65, 0.06, 4.45, 7.1, 0.12, 0.1),
      aabb(4.15, 0.06, 4.45, 4.1, 0.12, 0.1),
      aabb(5.95, 0.06, 0, 0.1, 0.12, 9.0),
      aabb(-5.95, 0.06, -3.1, 0.1, 0.12, 3.0),
      aabb(-5.95, 0.06, 3.35, 0.1, 0.12, 2.5),
      aabb(-9.95, 0.06, 0, 0.1, 0.12, 5.0),
      aabb(-8, 0.06, -2.45, 4.0, 0.12, 0.1),
      aabb(-8, 0.06, 2.45, 4.0, 0.12, 0.1),
    ];
    for (const strip of strips) {
      const mesh = this.factory.box(strip, this.materials.skirting);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  /** 腰高の緩衝レール。壁が単調にならず、寸法の手がかりにもなる。 */
  private buildBumperRails(): void {
    // 北壁は絵画と銘板があるので付けない
    const runs: Box[] = [
      aabb(5.94, 0.9, 0, 0.035, 0.11, 9.0),
      aabb(-2.65, 0.9, 4.44, 7.1, 0.11, 0.035),
      aabb(4.15, 0.9, 4.44, 4.1, 0.11, 0.035),
    ];
    for (const run of runs) {
      const rail = this.factory.box(run, this.materials.rubber);
      this.group.add(rail);
      // 上下のアルミ押さえ
      for (const sy of [-1, 1]) {
        const trim = this.factory.box(
          aabb(
            run.center.x,
            run.center.y + sy * 0.062,
            run.center.z,
            run.size.x,
            0.014,
            run.size.z * 1.2,
          ),
          this.materials.metal,
        );
        this.group.add(trim);
      }
    }
  }

  /** 隠し通路の三方枠。本棚が退いたときに「扉だった」ことが分かる。 */
  private buildDoorway(): void {
    const { factory, materials } = this;
    for (const z of [0.9, 2.1]) {
      const jamb = factory.box(
        aabb(MAIN_ROOM.minX - 0.1, 1.05, z, 0.22, 2.1, 0.08),
        materials.metalDark,
      );
      this.group.add(jamb);
      this.occluders.push(jamb);
    }
    const head = factory.box(
      aabb(MAIN_ROOM.minX - 0.1, 2.14, 1.5, 0.22, 0.08, 1.28),
      materials.metalDark,
    );
    this.group.add(head);
  }

  /** 床の艶 (天井灯の滲み)。 */
  private buildFloorSheen(): void {
    const sheenMaterial = this.materials.basic({
      map: floorSheenTexture(),
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    for (const [x, z] of [
      [-3.4, -3.0],
      [2.0, -0.2],
      [-2.4, 3.2],
      [4.4, 2.6],
    ] as const) {
      const sheen = this.factory.plane(1.9, 3.4, sheenMaterial);
      sheen.rotation.x = -Math.PI / 2;
      sheen.position.set(x, 0.013, z);
      this.group.add(sheen);
    }
  }

  /** 観察窓: 枠 + ガラス。 */
  private buildObservationWindow(): void {
    const width = WINDOW.maxZ - WINDOW.minZ;
    const height = WINDOW.maxY - WINDOW.minY;
    const centerZ = (WINDOW.minZ + WINDOW.maxZ) / 2;
    const centerY = (WINDOW.minY + WINDOW.maxY) / 2;

    const glass = this.factory.plane(width, height, this.materials.glass);
    glass.rotation.y = Math.PI / 2;
    glass.position.set(MAIN_ROOM.minX, centerY, centerZ);
    this.group.add(glass);

    // 枠 (両面から見えるので厚みを持たせる)
    for (const sy of [-1, 1]) {
      const bar = this.factory.box(
        aabb(MAIN_ROOM.minX, centerY + sy * (height / 2 + 0.04), centerZ, WALL_THICKNESS + 0.06, 0.08, width + 0.16),
        this.materials.metalDark,
      );
      this.group.add(bar);
    }
    for (const sz of [-1, 1]) {
      const bar = this.factory.box(
        aabb(MAIN_ROOM.minX, centerY, centerZ + sz * (width / 2 + 0.04), WALL_THICKNESS + 0.06, height + 0.16, 0.08),
        this.materials.metalDark,
      );
      this.group.add(bar);
    }
  }

  /**
   * P6 の背景。観察窓から見上げる仰角 (4〜12 度) に入るのは
   * 「東側の天井」と「東壁の上端」だけなので、その 2 面を発光パネルの
   * 面光源にする。黒い吊り板がここに重なって影絵として読める。
   *
   * 板 1 枚では室内から見たとき「壁に穴が空いている」ように見えるため、
   * 実際の照明設備らしく枠付きのパネル群として組む。
   */
  private buildLuminousPanels(): void {
    const { factory, materials } = this;

    // 東側の天井: 3 x 3 の埋め込みパネル
    const ceilingRegion = { x: 2.4, z: -0.6, width: 7.2, depth: 6.0 };
    const cols = 3;
    const rows = 3;
    const gap = 0.07;
    const panelWidth = ceilingRegion.width / cols - gap;
    const panelDepth = ceilingRegion.depth / rows - gap;

    for (let col = 0; col < cols; col += 1) {
      for (let row = 0; row < rows; row += 1) {
        const x = ceilingRegion.x - ceilingRegion.width / 2 + (col + 0.5) * (ceilingRegion.width / cols);
        const z = ceilingRegion.z - ceilingRegion.depth / 2 + (row + 0.5) * (ceilingRegion.depth / rows);
        const panel = factory.plane(panelWidth, panelDepth, materials.backlight);
        panel.rotation.x = Math.PI / 2;
        panel.position.set(x, MAIN_ROOM.height - 0.012, z);
        this.group.add(panel);
      }
    }
    // T バー (パネルの枠)
    for (let col = 0; col <= cols; col += 1) {
      const x = ceilingRegion.x - ceilingRegion.width / 2 + col * (ceilingRegion.width / cols);
      const bar = factory.box(
        aabb(x, MAIN_ROOM.height - 0.02, ceilingRegion.z, gap, 0.03, ceilingRegion.depth),
        materials.metalDark,
      );
      this.group.add(bar);
    }
    for (let row = 0; row <= rows; row += 1) {
      const z = ceilingRegion.z - ceilingRegion.depth / 2 + row * (ceilingRegion.depth / rows);
      const bar = factory.box(
        aabb(ceilingRegion.x, MAIN_ROOM.height - 0.02, z, ceilingRegion.width + gap, 0.03, gap),
        materials.metalDark,
      );
      this.group.add(bar);
    }

    // 東壁の上端: 横一列のライトボックス
    const wallPanels = 6;
    const wallWidth = 8.6;
    const wallPanelWidth = wallWidth / wallPanels - 0.08;
    for (let i = 0; i < wallPanels; i += 1) {
      const z = -wallWidth / 2 + (i + 0.5) * (wallWidth / wallPanels);
      const panel = factory.plane(wallPanelWidth, 0.66, materials.backlight);
      panel.rotation.y = -Math.PI / 2;
      panel.position.set(MAIN_ROOM.maxX - 0.02, 2.82, z);
      this.group.add(panel);
    }
    for (let i = 0; i <= wallPanels; i += 1) {
      const z = -wallWidth / 2 + i * (wallWidth / wallPanels);
      const mullion = factory.box(
        aabb(MAIN_ROOM.maxX - 0.03, 2.82, z, 0.05, 0.74, 0.08),
        materials.metalDark,
      );
      this.group.add(mullion);
    }
    for (const sy of [-1, 1]) {
      const rail = factory.box(
        aabb(MAIN_ROOM.maxX - 0.03, 2.82 + sy * 0.37, 0, 0.05, 0.06, wallWidth + 0.08),
        materials.metalDark,
      );
      this.group.add(rail);
    }
  }

  /* ---------------------------------------------------------------- */
  /* 設備 (空調・配線・消火器・表示)                                    */
  /* ---------------------------------------------------------------- */

  private buildInfrastructure(): void {
    const { factory, materials } = this;

    /* --- 空調ダクト (北側の天井を横断) --- */
    const duct = factory.box(aabb(0, 2.92, -3.75, 11.4, 0.4, 0.5), materials.metalDark);
    this.group.add(duct);
    for (const x of [-4.6, -1.6, 1.4, 4.4]) {
      const flange = factory.box(aabb(x, 2.92, -3.75, 0.06, 0.46, 0.56), materials.metalDark);
      this.group.add(flange);
    }
    for (const x of [-5.2, -2.2, 0.8, 3.8]) {
      const hanger = factory.box(aabb(x, 3.06, -3.75, 0.03, 0.28, 0.03), materials.metalDark);
      this.group.add(hanger);
    }
    // 吹き出し口
    for (const x of [-3.4, 2.6]) {
      const grille = factory.plane(0.6, 0.4, materials.vent);
      grille.rotation.x = Math.PI / 2;
      grille.position.set(x, 2.715, -3.75);
      this.group.add(grille);
      const collar = factory.box(aabb(x, 2.73, -3.75, 0.66, 0.04, 0.46), materials.metalDark);
      this.group.add(collar);
    }

    /* --- ケーブルラック (南側の天井) --- */
    for (const sz of [-0.16, 0.16]) {
      const rail = factory.box(aabb(0, 3.0, 2.4 + sz, 11.0, 0.05, 0.03), materials.metalDark);
      this.group.add(rail);
    }
    for (let x = -5.2; x <= 5.2; x += 0.4) {
      const rung = factory.box(aabb(x, 3.0, 2.4, 0.02, 0.012, 0.34), materials.metalDark);
      this.group.add(rung);
    }
    // 束ねたケーブル
    for (const [offset, color] of [
      [-0.05, 0x1c2126],
      [0.0, 0x2a2118],
      [0.05, 0x18242a],
    ] as const) {
      const cable = factory.cylinder(0.016, 0.016, 11.0, materials.standard({ color, roughness: 0.85 }), 8);
      cable.rotation.z = Math.PI / 2;
      cable.position.set(0, 2.975, 2.4 + offset);
      this.group.add(cable);
    }

    /* --- 壁の電線管とコンセント --- */
    const conduitMaterial = materials.metal;
    const conduits: [number, number, number, number][] = [
      // x, z, y, length(縦)
      [5.9, -3.6, 1.55, 3.1],
      [-5.9, -2.2, 1.55, 3.1],
    ];
    for (const [x, z, y, length] of conduits) {
      const pipe = factory.cylinder(0.022, 0.022, length, conduitMaterial, 12);
      pipe.position.set(x, y, z);
      this.group.add(pipe);
      for (const cy of [y - length / 2 + 0.3, y + length / 2 - 0.3]) {
        const clamp = factory.box(aabb(x, cy, z, 0.05, 0.03, 0.07), materials.metalDark);
        this.group.add(clamp);
      }
    }
    for (const [x, z, ry] of [
      [5.94, -3.0, -Math.PI / 2],
      [-1.0, -4.44, 0],
    ] as const) {
      const socket = factory.box(aabb(x, 0.35, z, 0.12, 0.16, 0.03), materials.plasticLight);
      socket.rotation.y = ry;
      this.group.add(socket);
    }

    /* --- 消火器 --- */
    const extinguisherMaterial = materials.standard({ color: 0x8e2b1e, roughness: 0.42, metalness: 0.35 });
    const bottle = factory.cylinder(0.075, 0.075, 0.36, extinguisherMaterial, 20);
    bottle.position.set(5.78, 0.66, 1.9);
    const shoulder = factory.sphere(0.075, extinguisherMaterial, 18);
    shoulder.scale.y = 0.5;
    shoulder.position.set(5.78, 0.85, 1.9);
    const neck = factory.cylinder(0.02, 0.02, 0.08, materials.metal, 12);
    neck.position.set(5.78, 0.92, 1.9);
    const handle = factory.box(aabb(5.78, 0.97, 1.9, 0.09, 0.02, 0.05), materials.metalDark);
    const bracket = factory.box(aabb(5.9, 0.72, 1.9, 0.06, 0.05, 0.2), materials.metalDark);
    this.group.add(bottle, shoulder, neck, handle, bracket);

    /* --- 床のハザードストライプ (EXIT DOOR 前) --- */
    const hazard = factory.plane(1.6, 0.4, materials.textured(hazardStripTexture()));
    hazard.rotation.x = -Math.PI / 2;
    hazard.position.set((EXIT_DOOR.minX + EXIT_DOOR.maxX) / 2, 0.008, MAIN_ROOM.maxZ - 0.42);
    this.group.add(hazard);

    /* --- 床の排水口 --- */
    const drainRing = factory.torus(0.09, 0.012, materials.metalDark, 22);
    drainRing.rotation.x = Math.PI / 2;
    drainRing.position.set(-4.6, 0.01, -1.4);
    const drainMesh = factory.plane(0.16, 0.16, materials.vent);
    drainMesh.rotation.x = -Math.PI / 2;
    drainMesh.position.set(-4.6, 0.006, -1.4);
    this.group.add(drainRing, drainMesh);

    /* --- 壁のステンシル表示 --- */
    const labels: [string, number, number, number, number][] = [
      // text, x, y, z, rotationY
      ["NEXUS LAB / B4", 2.6, 2.35, -4.44, 0],
      ["EVALUATION ROOM", -3.0, 2.35, 4.44, Math.PI],
      ["OBSERVATION", -8.0, 2.0, -2.44, 0],
    ];
    for (const [text, x, y, z, ry] of labels) {
      const stencil = this.factory.plane(1.9, 0.36, this.materials.textured(stencilTexture(text), { transparent: true }));
      stencil.position.set(x, y, z);
      stencil.rotation.y = ry;
      this.group.add(stencil);
    }

    /* --- EXIT サイン (箱型・両面発光) --- */
    const signHousing = factory.rounded(0.56, 0.22, 0.08, 0.012, materials.metalDark);
    signHousing.position.set(1.5, 2.44, 4.38);
    this.group.add(signHousing);
    const sign = factory.plane(0.5, 0.18, materials.textured(exitSignTexture(), { emissive: true }));
    sign.position.set(1.5, 2.44, 4.335);
    sign.rotation.y = Math.PI;
    this.group.add(sign);
    const signLight = new THREE.PointLight(0xdff0f4, 2.0, 3.6, 2);
    signLight.position.set(1.5, 2.3, 4.0);
    this.group.add(signLight);

    /* --- 室名プレート --- */
    const plate = factory.plane(0.42, 0.12, materials.textured(
      textTexture(["B4-17"], {
        width: 256,
        height: 72,
        background: "#2a3138",
        color: "#9fb0bd",
        fontSize: 40,
        letterSpacing: 6,
      }),
    ));
    plate.position.set(2.4, 1.75, 4.44);
    plate.rotation.y = Math.PI;
    this.group.add(plate);
  }

  /* ---------------------------------------------------------------- */
  /* P2 の壁面文字                                                     */
  /* ---------------------------------------------------------------- */

  private buildHiddenText(): THREE.Mesh {
    const texture = textTexture([HIDDEN_TEXT.word], {
      width: 512,
      height: 192,
      transparent: true,
      color: "#8fe6c8",
      fontSize: 130,
      letterSpacing: 14,
    });
    const material = this.materials.textured(texture, { emissive: true, transparent: true });
    material.opacity = 0;
    const text = this.factory.plane(1.5, 0.56, material);
    text.rotation.y = -Math.PI / 2;
    text.position.set(HIDDEN_TEXT.position.x, HIDDEN_TEXT.position.y, HIDDEN_TEXT.position.z);
    text.visible = false;
    this.group.add(text);
    return text;
  }

  dispose(): void {
    this.factory.dispose();
    this.materials.dispose();
    disposeTextures();
    disposePbrTextures();
    this.group.clear();
  }
}
