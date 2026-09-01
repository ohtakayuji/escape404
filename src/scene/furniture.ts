import * as THREE from "three";
import {
  CAMERA_PROPS,
  CLOCK,
  EXIT_DOOR,
  FRAMES,
  FRAME_Y,
  FRAME_Z,
  FURNITURE,
  HIDDEN_ROOM,
  MAIN_ROOM,
  OBSERVE_MARK,
  WALL_PANEL,
  type Box,
} from "../data/layout";
import type { MaterialLibrary } from "./materials";
import type { MeshFactory } from "./MeshFactory";
import {
  clockFaceTexture,
  filterDigitTexture,
  floorMarkTexture,
  monitorTexture,
  paintingTexture,
  plateTexture,
  terminalTexture,
  textTexture,
} from "./textures";
import { wiredGlassTexture } from "./pbr";

export interface BuildContext {
  factory: MeshFactory;
  materials: MaterialLibrary;
  /** Raycast 対象として登録する */
  register(object: THREE.Object3D, id: string): void;
  /** 視線を遮る大物として登録する (壁越しの操作を防ぐ) */
  occlude(object: THREE.Object3D): void;
}

const aabb = (
  cx: number,
  cy: number,
  cz: number,
  sx: number,
  sy: number,
  sz: number,
): Box => ({ center: { x: cx, y: cy, z: cz }, size: { x: sx, y: sy, z: sz } });

function piece(id: string): Box {
  const found = FURNITURE.find((entry) => entry.id === id);
  if (!found) throw new Error(`unknown furniture: ${id}`);
  return found;
}

/** 板金の四隅にボルトを打つ。 */
function boltsAround(
  ctx: BuildContext,
  parent: THREE.Object3D,
  width: number,
  height: number,
  z: number,
  inset = 0.035,
): void {
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const bolt = ctx.factory.bolt(ctx.materials.metal);
      bolt.position.set((width / 2 - inset) * sx, (height / 2 - inset) * sy, z);
      parent.add(bolt);
    }
  }
}

/* ================================================================== */
/* 中央デスクと引き出し                                                */
/* ================================================================== */

export function buildMainDesk(ctx: BuildContext): {
  group: THREE.Group;
  drawer: THREE.Group;
  drawerContents: THREE.Group;
} {
  const { factory, materials } = ctx;
  const desk = piece("desk-main");
  const group = new THREE.Group();
  const topY = desk.center.y + desk.size.y / 2;

  // 天板 (面取りあり)
  const top = factory.rounded(desk.size.x, 0.045, desk.size.z, 0.008, materials.deskTop);
  top.position.set(desk.center.x, topY - 0.022, desk.center.z);
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);
  ctx.occlude(top);

  // 幕板
  const apron = factory.box(
    aabb(desk.center.x, topY - 0.11, desk.center.z - desk.size.z / 2 + 0.06, desk.size.x - 0.12, 0.12, 0.03),
    materials.metalDark,
  );
  group.add(apron);

  // 脚 (角パイプ)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = factory.box(
        aabb(
          desk.center.x + sx * (desk.size.x / 2 - 0.1),
          (topY - 0.05) / 2,
          desk.center.z + sz * (desk.size.z / 2 - 0.1),
          0.05,
          topY - 0.05,
          0.05,
        ),
        materials.metal,
      );
      leg.castShadow = true;
      group.add(leg);
    }
    // 脚をつなぐ貫
    const rail = factory.box(
      aabb(desk.center.x + sx * (desk.size.x / 2 - 0.1), 0.12, desk.center.z, 0.04, 0.03, desk.size.z - 0.2),
      materials.metal,
    );
    group.add(rail);
  }

  // 配線用グロメット
  const grommet = factory.torus(0.035, 0.008, materials.plastic, 20);
  grommet.rotation.x = Math.PI / 2;
  grommet.position.set(desk.center.x - 0.85, topY + 0.002, desk.center.z - 0.34);
  group.add(grommet);

  /* --- 引き出しユニット --- */
  const drawer = new THREE.Group();
  drawer.position.set(0.62, 0.44, 0.5);

  const front = factory.rounded(0.84, 0.3, 0.05, 0.01, materials.metalDark);
  front.position.set(0, 0, 0.06);
  front.castShadow = true;
  drawer.add(front);

  // 引き手
  const pull = factory.box(aabb(-0.16, 0.02, 0.095, 0.28, 0.022, 0.03), materials.metal);
  drawer.add(pull);
  for (const sx of [-1, 1]) {
    const bracket = factory.box(aabb(-0.16 + sx * 0.13, 0.005, 0.078, 0.02, 0.05, 0.02), materials.metal);
    drawer.add(bracket);
  }

  // 電子錠モジュール
  const lockBody = factory.rounded(0.19, 0.22, 0.03, 0.008, materials.plastic);
  lockBody.position.set(0.28, 0, 0.095);
  drawer.add(lockBody);
  const lockScreen = factory.plane(0.14, 0.05, materials.phosEmissive);
  lockScreen.position.set(0.28, 0.055, 0.112);
  drawer.add(lockScreen);
  const keys = factory.plane(0.13, 0.11, materials.textured(
    textTexture(["1 2 3", "4 5 6", "7 8 9"], {
      width: 256,
      height: 220,
      transparent: true,
      color: "#9fb0bd",
      fontSize: 46,
      lineHeight: 1.5,
    }),
    { transparent: true },
  ));
  keys.position.set(0.28, -0.045, 0.112);
  drawer.add(keys);

  // 箱本体
  const body = factory.box(aabb(0, -0.02, -0.12, 0.8, 0.26, 0.44), materials.metalDark);
  drawer.add(body);

  // 中身 (開くまで隠す)
  const drawerContents = new THREE.Group();
  drawerContents.visible = false;

  const flashlightBody = factory.cylinder(0.026, 0.032, 0.19, materials.metal, 16);
  flashlightBody.rotation.z = Math.PI / 2;
  flashlightBody.position.set(-0.12, 0.02, -0.12);
  const flashlightHead = factory.cylinder(0.036, 0.03, 0.04, materials.metalDark, 16);
  flashlightHead.rotation.z = Math.PI / 2;
  flashlightHead.position.set(0.0, 0.02, -0.12);
  const flashlightLens = factory.plane(0.05, 0.05, materials.whiteEmissive);
  flashlightLens.rotation.y = Math.PI / 2;
  flashlightLens.position.set(0.021, 0.02, -0.12);

  const memoA = factory.plane(0.16, 0.1, materials.textured(
    textTexture(["LIGHT REVEALS", "WHAT THE", "SYSTEM HIDES."], {
      width: 512,
      height: 320,
      background: "#e9e3d3",
      color: "#1d2126",
      fontSize: 46,
    }),
  ));
  memoA.rotation.x = -Math.PI / 2;
  memoA.rotation.z = 0.1;
  memoA.position.set(0.22, -0.085, -0.14);

  drawerContents.add(flashlightBody, flashlightHead, flashlightLens, memoA);
  drawer.add(drawerContents);
  group.add(drawer);
  ctx.register(drawer, "drawer");

  /* --- 天板の上の小物 --- */
  const card = factory.plane(0.17, 0.105, materials.textured(
    textTexture(["NEXUS LAB", "DR. K", "ID 0417"], {
      width: 512,
      height: 320,
      background: "#dfe4e8",
      color: "#1d2126",
      fontSize: 54,
      letterSpacing: 3,
    }),
  ));
  card.rotation.x = -Math.PI / 2;
  card.rotation.z = 0.22;
  card.position.set(-0.72, topY + 0.003, 0.16);
  group.add(card);
  ctx.register(card, "employee-card");

  const memoB = factory.plane(0.17, 0.23, materials.textured(
    textTexture(["STABILITY TEST", "", "NO EDGE", "ONE POINT", "ALL EDGES", "NO POINT"], {
      width: 384,
      height: 512,
      background: "#e9e3d3",
      color: "#1d2126",
      fontSize: 34,
      letterSpacing: 2,
    }),
  ));
  memoB.rotation.x = -Math.PI / 2;
  memoB.rotation.z = -0.14;
  memoB.position.set(0.6, topY + 0.003, -0.24);
  group.add(memoB);
  ctx.register(memoB, "memo-b");

  // 卓上ランプ
  const lampBase = factory.cylinder(0.055, 0.075, 0.02, materials.metalDark, 16);
  lampBase.position.set(-1.0, topY + 0.012, -0.3);
  const lampArm = factory.cylinder(0.011, 0.011, 0.36, materials.metal, 10);
  lampArm.position.set(-1.0, topY + 0.19, -0.3);
  const lampJoint = factory.sphere(0.02, materials.metalDark, 12);
  lampJoint.position.set(-1.0, topY + 0.37, -0.3);
  const lampHead = factory.cylinder(0.075, 0.045, 0.09, materials.metalDark, 18, true);
  lampHead.position.set(-1.0, topY + 0.35, -0.24);
  lampHead.rotation.x = 2.5;
  const lampBulb = factory.plane(0.07, 0.07, materials.whiteEmissive);
  lampBulb.rotation.x = -Math.PI / 2 + 0.65;
  lampBulb.position.set(-1.0, topY + 0.31, -0.21);
  group.add(lampBase, lampArm, lampJoint, lampHead, lampBulb);

  const lampLight = new THREE.PointLight(0xffd7a5, 6.5, 3.6, 2);
  lampLight.position.set(-0.95, topY + 0.28, -0.14);
  group.add(lampLight);

  // マグカップ (生活感)
  const mug = factory.cylinder(0.04, 0.036, 0.09, materials.plasticLight, 18);
  mug.position.set(-0.32, topY + 0.045, 0.3);
  const mugHandle = factory.torus(0.028, 0.007, materials.plasticLight, 16);
  mugHandle.position.set(-0.28, topY + 0.05, 0.3);
  mugHandle.rotation.y = Math.PI / 2;
  group.add(mug, mugHandle);

  return { group, drawer, drawerContents };
}

/* ================================================================== */
/* 椅子                                                               */
/* ================================================================== */

export function buildChair(ctx: BuildContext): THREE.Group {
  const { factory, materials } = ctx;
  const chair = piece("desk-chair");
  const group = new THREE.Group();
  group.position.set(chair.center.x, 0, chair.center.z);
  group.rotation.y = -0.35;

  const column = factory.cylinder(0.03, 0.035, 0.34, materials.metal, 14);
  column.position.y = 0.24;
  group.add(column);

  // 5 本脚 + キャスター
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2;
    const leg = factory.box(aabb(0, 0.055, 0.13, 0.045, 0.03, 0.3), materials.plastic);
    const holder = new THREE.Group();
    holder.rotation.y = angle;
    holder.add(leg);
    const caster = factory.cylinder(0.025, 0.025, 0.02, materials.rubber, 12);
    caster.rotation.x = Math.PI / 2;
    caster.position.set(0, 0.025, 0.27);
    holder.add(caster);
    group.add(holder);
  }

  const seat = factory.rounded(0.46, 0.07, 0.44, 0.03, materials.plastic);
  seat.position.set(0, 0.45, 0);
  seat.castShadow = true;
  group.add(seat);

  const back = factory.rounded(0.42, 0.46, 0.06, 0.03, materials.plastic);
  back.position.set(0, 0.72, -0.21);
  back.rotation.x = -0.14;
  back.castShadow = true;
  group.add(back);

  const backStem = factory.box(aabb(0, 0.55, -0.19, 0.06, 0.2, 0.05), materials.metalDark);
  group.add(backStem);

  return group;
}

/* ================================================================== */
/* PC ワークステーション                                               */
/* ================================================================== */

export function buildWorkstation(ctx: BuildContext): { group: THREE.Group; monitor: THREE.Mesh } {
  const { factory, materials } = ctx;
  const desk = piece("desk-pc");
  const group = new THREE.Group();
  const topY = desk.center.y + desk.size.y / 2;

  const top = factory.rounded(desk.size.x, 0.04, desk.size.z, 0.008, materials.deskTop);
  top.position.set(desk.center.x, topY - 0.02, desk.center.z);
  top.receiveShadow = true;
  group.add(top);

  for (const sz of [-1, 1]) {
    const panel = factory.box(
      aabb(desk.center.x, (topY - 0.04) / 2, desk.center.z + sz * (desk.size.z / 2 - 0.05), desk.size.x - 0.08, topY - 0.04, 0.04),
      materials.metalDark,
    );
    group.add(panel);
  }

  // モニタ: 台座・支柱・ベゼル・画面
  const foot = factory.rounded(0.24, 0.02, 0.16, 0.008, materials.metalDark);
  foot.position.set(5.5, topY + 0.01, -2.0);
  const neck = factory.box(aabb(5.5, topY + 0.12, -2.0, 0.05, 0.22, 0.03), materials.metalDark);
  const hinge = factory.cylinder(0.02, 0.02, 0.06, materials.metal, 12);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(5.48, topY + 0.24, -2.0);

  const bezel = factory.rounded(0.045, 0.52, 0.88, 0.012, materials.plastic);
  bezel.position.set(5.44, 1.14, -2.0);
  bezel.castShadow = true;

  const screen = factory.plane(0.8, 0.46, materials.textured(monitorTexture(false), { emissive: true }));
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(5.415, 1.14, -2.0);

  // 画面のガラス面。映り込みだけを足すので薄く重ねる。
  const glassMaterial = materials.physical({
    color: 0x0a0f14,
    roughness: 0.06,
    metalness: 0.05,
    transparent: true,
    opacity: 0.22,
    envMapIntensity: 1.8,
  });
  const screenGlass = factory.plane(0.82, 0.48, glassMaterial);
  screenGlass.rotation.y = -Math.PI / 2;
  screenGlass.position.set(5.412, 1.14, -2.0);

  group.add(foot, neck, hinge, bezel, screen, screenGlass);
  ctx.register(screen, "pc");
  ctx.occlude(bezel);

  // キーボードとマウス
  const keyboardBase = factory.rounded(0.16, 0.018, 0.46, 0.006, materials.plastic);
  keyboardBase.position.set(5.12, topY + 0.012, -2.0);
  const keys = factory.plane(0.44, 0.14, materials.keyboard);
  keys.rotation.x = -Math.PI / 2;
  keys.rotation.z = Math.PI / 2;
  keys.position.set(5.12, topY + 0.022, -2.0);
  const mouse = factory.rounded(0.055, 0.025, 0.09, 0.02, materials.plastic);
  mouse.position.set(5.12, topY + 0.02, -1.62);
  group.add(keyboardBase, keys, mouse);

  // 本体 (デスク下)
  const tower = factory.rounded(0.2, 0.42, 0.44, 0.01, materials.metalDark);
  tower.position.set(5.42, 0.23, -1.3);
  const towerLed = factory.plane(0.03, 0.008, materials.phosEmissive);
  towerLed.rotation.y = -Math.PI / 2;
  towerLed.position.set(5.315, 0.38, -1.3);
  group.add(tower, towerLed);

  return { group, monitor: screen };
}

/* ================================================================== */
/* 金庫                                                               */
/* ================================================================== */

export function buildSafe(ctx: BuildContext): {
  group: THREE.Group;
  doorPivot: THREE.Group;
  contents: THREE.Group;
} {
  const { factory, materials } = ctx;
  const safe = piece("safe");
  const group = new THREE.Group();

  // 筐体 (前面は開口)
  const body = factory.rounded(safe.size.x, safe.size.y, safe.size.z, 0.012, materials.metalDark);
  body.position.set(safe.center.x, safe.center.y, safe.center.z);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  ctx.occlude(body);

  // 内側 (扉を開けたときに見える箱)
  const cavity = factory.box(
    aabb(safe.center.x, safe.center.y, safe.center.z + 0.06, safe.size.x - 0.12, safe.size.y - 0.12, safe.size.z - 0.1),
    materials.plastic,
  );
  group.add(cavity);

  const frontZ = safe.center.z - safe.size.z / 2;
  const doorPivot = new THREE.Group();
  doorPivot.position.set(safe.center.x - safe.size.x / 2 + 0.05, safe.center.y, frontZ);

  const door = factory.rounded(0.86, 0.9, 0.06, 0.01, materials.metal);
  door.position.set(0.4, 0, 0);
  door.castShadow = true;
  doorPivot.add(door);
  ctx.register(door, "safe");
  ctx.occlude(door);

  // 蝶番
  for (const sy of [-1, 1]) {
    const hinge = factory.cylinder(0.022, 0.022, 0.12, materials.metalDark, 12);
    hinge.position.set(0.0, sy * 0.32, -0.01);
    doorPivot.add(hinge);
  }

  // ハンドル
  const handleBase = factory.cylinder(0.045, 0.05, 0.04, materials.metalDark, 16);
  handleBase.rotation.x = Math.PI / 2;
  handleBase.position.set(0.72, -0.12, -0.045);
  const handleBar = factory.box(aabb(0.72, -0.12, -0.075, 0.03, 0.2, 0.03), materials.metal);
  doorPivot.add(handleBase, handleBar);

  // キーパッド
  const keypad = factory.rounded(0.2, 0.26, 0.03, 0.008, materials.plastic);
  keypad.position.set(0.5, 0.18, -0.04);
  const keypadScreen = factory.plane(0.15, 0.05, materials.phosEmissive);
  keypadScreen.position.set(0.5, 0.28, -0.057);
  keypadScreen.rotation.y = Math.PI;
  const keypadKeys = factory.plane(0.14, 0.13, materials.textured(
    textTexture(["1 2 3", "4 5 6", "7 8 9"], {
      width: 256,
      height: 240,
      transparent: true,
      color: "#9fb0bd",
      fontSize: 44,
      lineHeight: 1.5,
    }),
    { transparent: true },
  ));
  keypadKeys.position.set(0.5, 0.14, -0.057);
  keypadKeys.rotation.y = Math.PI;
  doorPivot.add(keypad, keypadScreen, keypadKeys);

  const plate = factory.plane(0.42, 0.2, materials.textured(
    plateTexture(["BACKUP STORE", "4-DIGIT"], { accent: "#8ea0b0" }),
  ));
  plate.position.set(0.4, -0.34, -0.032);
  plate.rotation.y = Math.PI;
  doorPivot.add(plate);
  boltsAround(ctx, doorPivot, 0.8, 0.84, -0.032);

  group.add(doorPivot);

  /* --- 中身 --- */
  const contents = new THREE.Group();
  contents.visible = false;

  const filterFrame = factory.rounded(0.13, 0.09, 0.008, 0.004, materials.frame);
  filterFrame.position.set(safe.center.x - 0.16, safe.center.y - 0.16, safe.center.z + 0.02);
  filterFrame.rotation.x = -Math.PI / 2 + 0.12;
  const filterGlass = factory.plane(0.1, 0.065, materials.glass);
  filterGlass.position.set(safe.center.x - 0.16, safe.center.y - 0.155, safe.center.z + 0.02);
  filterGlass.rotation.x = -Math.PI / 2 + 0.12;

  const keyShaft = factory.box(aabb(safe.center.x + 0.18, safe.center.y - 0.19, safe.center.z + 0.02, 0.016, 0.012, 0.1), materials.metalWarm);
  const keyHead = factory.torus(0.022, 0.006, materials.metalWarm, 14);
  keyHead.position.set(safe.center.x + 0.18, safe.center.y - 0.19, safe.center.z - 0.04);
  keyHead.rotation.y = Math.PI / 2;

  const tablet = factory.rounded(0.2, 0.14, 0.012, 0.005, materials.plasticLight);
  tablet.position.set(safe.center.x, safe.center.y + 0.2, safe.center.z + 0.02);
  tablet.rotation.x = -Math.PI / 2;
  const tabletFace = factory.plane(0.19, 0.13, materials.textured(
    textTexture(["ARCHIVE", "LOG 01"], {
      width: 256,
      height: 180,
      background: "#e9e3d3",
      color: "#1d2126",
      fontSize: 40,
    }),
  ));
  tabletFace.position.set(safe.center.x, safe.center.y + 0.207, safe.center.z + 0.02);
  tabletFace.rotation.x = -Math.PI / 2;

  contents.add(filterFrame, filterGlass, keyShaft, keyHead, tablet, tabletFace);
  ctx.register(tabletFace, "archive01");
  group.add(contents);

  return { group, doorPivot, contents };
}

/* ================================================================== */
/* 形状サンプルの棚                                                    */
/* ================================================================== */

export function buildSampleShelf(ctx: BuildContext): {
  group: THREE.Group;
  shapes: Map<string, THREE.Object3D>;
} {
  const { factory, materials } = ctx;
  const shelf = piece("shelf-shapes");
  const group = new THREE.Group();
  const shapes = new Map<string, THREE.Object3D>();

  // 側板
  for (const sx of [-1, 1]) {
    const side = factory.box(
      aabb(shelf.center.x + sx * (shelf.size.x / 2 - 0.02), shelf.center.y, shelf.center.z, 0.04, shelf.size.y, shelf.size.z),
      materials.metalDark,
    );
    side.castShadow = true;
    group.add(side);
    ctx.occlude(side);
  }
  // 背板
  const back = factory.box(
    aabb(shelf.center.x, shelf.center.y, shelf.center.z + shelf.size.z / 2 - 0.01, shelf.size.x, shelf.size.y, 0.02),
    materials.metalDark,
  );
  group.add(back);
  ctx.occlude(back);

  // 棚板 (前縁に立ち上がり)
  for (const y of [0.36, 0.82, 1.28, 1.72]) {
    const board = factory.box(aabb(shelf.center.x, y, shelf.center.z, shelf.size.x - 0.06, 0.02, shelf.size.z - 0.04), materials.metal);
    board.receiveShadow = true;
    group.add(board);
    const lip = factory.box(aabb(shelf.center.x, y + 0.015, shelf.center.z - shelf.size.z / 2 + 0.04, shelf.size.x - 0.06, 0.03, 0.012), materials.metal);
    group.add(lip);
  }

  const specs: { id: string; object: THREE.Mesh; x: number; y: number }[] = [
    { id: "sphere", object: factory.sphere(0.085, materials.resin, 28), x: 3.82, y: 1.4 },
    { id: "cone", object: factory.cone(0.085, 0.19, materials.resin, 28), x: 4.58, y: 1.4 },
    { id: "cube", object: factory.rounded(0.15, 0.15, 0.15, 0.006, materials.resin), x: 3.82, y: 0.91 },
    { id: "cylinder", object: factory.cylinder(0.075, 0.075, 0.18, materials.resin, 26), x: 4.58, y: 0.925 },
  ];

  for (const spec of specs) {
    spec.object.position.set(spec.x, spec.y, shelf.center.z);
    spec.object.castShadow = true;
    group.add(spec.object);
    shapes.set(spec.id, spec.object);
    ctx.register(spec.object, `shape-${spec.id}`);

    // サンプル台
    const pad = factory.cylinder(0.1, 0.1, 0.008, materials.plastic, 20);
    pad.position.set(spec.x, spec.y - 0.1, shelf.center.z);
    group.add(pad);
  }

  const label = factory.plane(0.5, 0.25, materials.textured(
    plateTexture(["SAMPLE SET", "RESIN / A-D"], { accent: "#8ea0b0" }),
  ));
  label.position.set(shelf.center.x, 1.86, shelf.center.z - shelf.size.z / 2 - 0.005);
  label.rotation.y = Math.PI;
  group.add(label);

  return { group, shapes };
}

/* ================================================================== */
/* 本棚 (P5 でスライドする)                                            */
/* ================================================================== */

export function buildBookshelf(ctx: BuildContext): THREE.Group {
  const { factory, materials } = ctx;
  const shelf = piece("bookshelf");
  const group = new THREE.Group();
  group.position.set(shelf.center.x, 0, shelf.center.z);

  // 本棚は隠し通路の前に立つ。開口部 (西) が背面、部屋側 (東) が正面。
  const halfDepth = shelf.size.x / 2;
  const halfWidth = shelf.size.z / 2;
  const frontX = halfDepth; // +X が部屋側

  for (const sz of [-1, 1]) {
    const side = factory.box(aabb(0, shelf.size.y / 2, sz * (halfWidth - 0.01), shelf.size.x, shelf.size.y, 0.02), materials.metalDark);
    side.castShadow = true;
    group.add(side);
    ctx.occlude(side);
  }
  for (const y of [0.01, shelf.size.y - 0.01]) {
    const board = factory.box(aabb(0, y, 0, shelf.size.x, 0.02, shelf.size.z), materials.metalDark);
    group.add(board);
  }
  // 背板は壁側 (-X)
  const back = factory.box(aabb(-halfDepth + 0.01, shelf.size.y / 2, 0, 0.02, shelf.size.y, shelf.size.z), materials.metalDark);
  group.add(back);
  ctx.occlude(back);

  const bookColors = [0x3d4a55, 0x4a3f38, 0x2f3a42, 0x5a4a3a, 0x36424c];
  const bookMaterials = bookColors.map((color) =>
    materials.standard({ color, roughness: 0.78, metalness: 0.02 }),
  );

  /*
   * 本の寸法は固定表から取る。乱数にすると P4 のヒント本の位置が毎回変わり、
   * 「棚のこの本を見て E」を確かめる操作テストが不安定になる。
   */
  const THICKNESS = [0.05, 0.042, 0.06, 0.055, 0.038, 0.07, 0.045, 0.052, 0.058, 0.04];
  const HEIGHT = [0.3, 0.26, 0.33, 0.28, 0.24, 0.31, 0.27, 0.29, 0.25, 0.32];
  const DEPTH = [0.34, 0.3, 0.38, 0.32, 0.36, 0.31, 0.35, 0.33, 0.37, 0.3];

  for (let level = 0; level < 4; level += 1) {
    const y = 0.28 + level * 0.5;
    const board = factory.box(aabb(0, y, 0, shelf.size.x - 0.06, 0.022, shelf.size.z - 0.05), materials.metal);
    board.receiveShadow = true;
    group.add(board);

    // 棚下の間接照明。P4 のヒント本が暗くて読めないのを防ぐ。
    if (level > 0) {
      const strip = factory.plane(shelf.size.z - 0.12, 0.02, materials.warmEmissive);
      strip.rotation.x = Math.PI / 2;
      strip.rotation.z = Math.PI / 2;
      strip.position.set(frontX - 0.06, y - 0.016, 0);
      group.add(strip);
    }

    let z = -halfWidth + 0.1;
    let index = 0;
    while (z < halfWidth - 0.12 && index < THICKNESS.length) {
      const offset = (level * 3 + index) % THICKNESS.length;
      const thickness = THICKNESS[offset]!;
      const height = HEIGHT[offset]!;
      const depth = DEPTH[offset]!;
      const isTarget = level === 1 && index === 2;
      const material = isTarget
        ? materials.metalWarm
        : bookMaterials[index % bookMaterials.length]!;
      // 背表紙を部屋側 (+X) に揃えて並べる
      const bookX = frontX - 0.03 - depth / 2;
      const book = factory.box(aabb(bookX, y + 0.011 + height / 2, z + thickness / 2, depth, height, thickness), material);
      book.castShadow = true;
      if (!isTarget && offset % 7 === 3) book.rotation.x = 0.07;
      group.add(book);

      if (isTarget) {
        ctx.register(book, "book-order");
        const spine = factory.plane(0.2, thickness * 0.85, materials.textured(
          textTexture(["OPTICAL"], { width: 256, height: 64, transparent: true, color: "#e8dfc8", fontSize: 40 }),
          { transparent: true },
        ));
        spine.rotation.y = Math.PI / 2;
        spine.rotation.z = Math.PI / 2;
        spine.position.set(bookX + depth / 2 + 0.003, y + 0.011 + height / 2, z + thickness / 2);
        group.add(spine);
      }
      z += thickness + 0.004;
      index += 1;
    }
  }

  // 棚全体を弱く照らす
  const shelfLight = new THREE.PointLight(0xffe2b4, 2.2, 1.7, 2);
  shelfLight.position.set(frontX - 0.12, 1.35, 0);
  group.add(shelfLight);

  return group;
}

/* ================================================================== */
/* 壁パネルと 4 スロット                                               */
/* ================================================================== */

export function buildWallPanel(ctx: BuildContext): {
  group: THREE.Group;
  panel: THREE.Mesh;
  slotMarkers: THREE.Mesh[];
  slotContents: THREE.Group;
} {
  const { factory, materials } = ctx;
  const group = new THREE.Group();
  const slotMarkers: THREE.Mesh[] = [];
  const slotContents = new THREE.Group();

  // 背板と枠 (壁に取り付いた点検盤)
  const backing = factory.box(
    aabb(WALL_PANEL.center.x, WALL_PANEL.center.y, WALL_PANEL.backingZ, 1.84, 1.64, 0.1),
    materials.wallDark,
  );
  group.add(backing);

  for (const sx of [-1, 1]) {
    const jamb = factory.box(
      aabb(WALL_PANEL.center.x + sx * 0.92, WALL_PANEL.center.y, WALL_PANEL.center.z + 0.1, 0.05, 1.72, 0.26),
      materials.metalDark,
    );
    group.add(jamb);
  }
  for (const sy of [-1, 1]) {
    const head = factory.box(
      aabb(WALL_PANEL.center.x, WALL_PANEL.center.y + sy * 0.86, WALL_PANEL.center.z + 0.1, 1.89, 0.05, 0.26),
      materials.metalDark,
    );
    group.add(head);
  }

  for (let index = 0; index < 4; index += 1) {
    const x = WALL_PANEL.slotStartX + index * WALL_PANEL.slotStepX;

    const plate = factory.rounded(0.3, 0.028, 0.17, 0.006, materials.metal);
    plate.position.set(x, WALL_PANEL.slotY - 0.16, WALL_PANEL.slotZ);
    plate.receiveShadow = true;
    group.add(plate);

    const cradle = factory.torus(0.075, 0.008, materials.metalDark, 20);
    cradle.rotation.x = Math.PI / 2;
    cradle.position.set(x, WALL_PANEL.slotY - 0.144, WALL_PANEL.slotZ);
    group.add(cradle);

    const bracket = factory.box(aabb(x, WALL_PANEL.slotY - 0.24, WALL_PANEL.backingZ - 0.06, 0.06, 0.14, 0.06), materials.metalDark);
    group.add(bracket);

    const marker = factory.plane(0.2, 0.028, materials.phosEmissive.clone());
    marker.position.set(x, WALL_PANEL.slotY - 0.34, WALL_PANEL.backingZ - 0.055);
    marker.rotation.y = Math.PI;
    group.add(marker);
    slotMarkers.push(marker);

    const label = factory.plane(0.12, 0.12, materials.textured(
      textTexture([String(index + 1)], {
        width: 128,
        height: 128,
        transparent: true,
        color: "#9fb0bd",
        fontSize: 96,
      }),
      { transparent: true },
    ));
    label.position.set(x, WALL_PANEL.slotY + 0.3, WALL_PANEL.backingZ - 0.055);
    label.rotation.y = Math.PI;
    group.add(label);

    const hit = factory.box(
      aabb(x, WALL_PANEL.slotY, WALL_PANEL.slotZ, 0.3, 0.34, 0.18),
      materials.silhouette,
    );
    hit.visible = false;
    group.add(hit);
    ctx.register(hit, `slot-${index}`);
  }
  group.add(slotContents);

  // 外側カバー
  const panel = factory.rounded(WALL_PANEL.size.x, WALL_PANEL.size.y, WALL_PANEL.size.z, 0.012, materials.metal);
  panel.position.set(WALL_PANEL.center.x, WALL_PANEL.center.y, WALL_PANEL.center.z);
  panel.castShadow = true;
  const panelLabel = factory.plane(0.86, 0.43, materials.textured(
    plateTexture(["SHAPE PROTOCOL", "SLOT ARRAY 1-4", "SEALED"], { accent: "#93a4b1", hazard: true }),
  ));
  panelLabel.position.set(0, 0.42, -WALL_PANEL.size.z / 2 - 0.004);
  panelLabel.rotation.y = Math.PI;
  panel.add(panelLabel);
  const grip = factory.box(aabb(0, -0.5, -WALL_PANEL.size.z / 2 - 0.02, 0.5, 0.035, 0.035), materials.metalDark);
  panel.add(grip);
  boltsAround(ctx, panel, WALL_PANEL.size.x, WALL_PANEL.size.y, -WALL_PANEL.size.z / 2 - 0.004, 0.06);
  group.add(panel);
  ctx.register(panel, "wall-panel");
  ctx.occlude(panel);

  // 横のキーパッド (SMALL KEY で開ける金属カバー付き)
  const keypadHousing = factory.rounded(0.26, 0.32, 0.07, 0.01, materials.metalDark);
  keypadHousing.position.set(-0.4, 1.3, 4.44);
  group.add(keypadHousing);
  ctx.register(keypadHousing, "wall-panel-keypad");

  const keypadScreen = factory.plane(0.16, 0.04, materials.phosEmissive);
  keypadScreen.position.set(-0.4, 1.4, 4.402);
  keypadScreen.rotation.y = Math.PI;
  group.add(keypadScreen);

  const keypadKeys = factory.plane(0.16, 0.15, materials.textured(
    textTexture(["1 2 3", "4 5 6", "7 8 9"], {
      width: 256,
      height: 240,
      transparent: true,
      color: "#93a4b1",
      fontSize: 44,
      lineHeight: 1.5,
    }),
    { transparent: true },
  ));
  keypadKeys.position.set(-0.4, 1.26, 4.402);
  keypadKeys.rotation.y = Math.PI;
  group.add(keypadKeys);

  return { group, panel, slotMarkers, slotContents };
}

/* ================================================================== */
/* EXIT DOOR                                                          */
/* ================================================================== */

export function buildExitDoor(ctx: BuildContext): {
  group: THREE.Group;
  pivot: THREE.Group;
  glow: THREE.Mesh;
} {
  const { factory, materials } = ctx;
  const group = new THREE.Group();
  const centerX = (EXIT_DOOR.minX + EXIT_DOOR.maxX) / 2;
  const faceZ = MAIN_ROOM.maxZ;

  // 三方枠
  for (const sx of [-1, 1]) {
    const jamb = factory.box(
      aabb(centerX + sx * 0.68, EXIT_DOOR.height / 2, faceZ - 0.04, 0.12, EXIT_DOOR.height + 0.12, 0.16),
      materials.metalDark,
    );
    group.add(jamb);
  }
  const head = factory.box(
    aabb(centerX, EXIT_DOOR.height + 0.06, faceZ - 0.04, 1.48, 0.12, 0.16),
    materials.metalDark,
  );
  group.add(head);

  const pivot = new THREE.Group();
  pivot.position.set(EXIT_DOOR.minX, 0, faceZ + 0.05);

  const door = factory.rounded(1.2, EXIT_DOOR.height, 0.1, 0.008, materials.metal);
  door.position.set(0.6, EXIT_DOOR.height / 2, 0);
  door.castShadow = true;
  pivot.add(door);
  ctx.register(door, "exit-door");
  ctx.occlude(door);

  for (const y of [0.55, 1.55]) {
    const groove = factory.box(aabb(0.6, y, -0.051, 1.04, 0.012, 0.006), materials.metalDark);
    pivot.add(groove);
  }

  // 網入りガラスの小窓
  const windowFrame = factory.box(aabb(0.6, 1.62, -0.05, 0.56, 0.3, 0.012), materials.metalDark);
  pivot.add(windowFrame);
  const windowGlass = factory.plane(0.5, 0.24, materials.textured(wiredGlassTexture(), { transparent: true }));
  windowGlass.position.set(0.6, 1.62, -0.058);
  windowGlass.rotation.y = Math.PI;
  const windowGlassMaterial = windowGlass.material as THREE.MeshStandardMaterial;
  windowGlassMaterial.transparent = true;
  windowGlassMaterial.opacity = 0.8;
  pivot.add(windowGlass);

  const stripe = factory.box(aabb(0.6, 1.24, -0.053, 0.92, 0.05, 0.004), materials.emberEmissive);
  pivot.add(stripe);

  // プッシュバー
  const bar = factory.cylinder(0.022, 0.022, 0.96, materials.metal, 16);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0.6, 1.0, -0.1);
  pivot.add(bar);
  for (const sx of [-1, 1]) {
    const mount = factory.box(aabb(0.6 + sx * 0.4, 1.0, -0.075, 0.05, 0.09, 0.06), materials.metalDark);
    pivot.add(mount);
  }

  const kick = factory.box(aabb(0.6, 0.2, -0.053, 1.08, 0.3, 0.006), materials.metal);
  pivot.add(kick);

  const plate = factory.plane(0.5, 0.25, materials.textured(
    plateTexture(["EXIT / B4", "EXTERNAL LOCK", "ENGAGED"], { accent: "#e2603f", hazard: true }),
  ));
  plate.position.set(0.6, 0.72, -0.054);
  plate.rotation.y = Math.PI;
  pivot.add(plate);

  group.add(pivot);

  // ドアの向こうの光 (開くまで暗い)
  const glow = factory.plane(1.3, EXIT_DOOR.height + 0.1, materials.whiteEmissive.clone());
  glow.position.set(centerX, EXIT_DOOR.height / 2, faceZ + 0.22);
  glow.rotation.y = Math.PI;
  (glow.material as THREE.MeshStandardMaterial).emissiveIntensity = 0;
  group.add(glow);

  return { group, pivot, glow };
}

/* ================================================================== */
/* 絵画 (光学校正チャート) と時計                                       */
/* ================================================================== */

export function buildPaintings(ctx: BuildContext): {
  group: THREE.Group;
  digits: THREE.Mesh[];
  lights: THREE.Mesh[];
} {
  const { factory, materials } = ctx;
  const group = new THREE.Group();
  const digits: THREE.Mesh[] = [];
  const lights: THREE.Mesh[] = [];

  FRAMES.forEach((spec, index) => {
    const frame = factory.rounded(1.02, 1.32, 0.07, 0.01, materials.frame);
    frame.position.set(spec.x, FRAME_Y, FRAME_Z - 0.02);
    frame.castShadow = true;
    group.add(frame);

    const mat = factory.box(aabb(spec.x, FRAME_Y, FRAME_Z + 0.012, 0.88, 1.18, 0.01), materials.plastic);
    group.add(mat);

    const art = factory.plane(0.84, 1.12, materials.textured(paintingTexture(index)));
    art.position.set(spec.x, FRAME_Y, FRAME_Z + 0.02);
    group.add(art);
    ctx.register(art, `painting-${spec.id}`);

    const glass = factory.plane(0.9, 1.2, materials.glass);
    glass.position.set(spec.x, FRAME_Y, FRAME_Z + 0.028);
    group.add(glass);

    // Optical Filter で現れる数字
    const digit = factory.plane(0.42, 0.58, materials.textured(filterDigitTexture(spec.digit), {
      emissive: true,
      transparent: true,
    }));
    digit.position.set(spec.x, FRAME_Y, FRAME_Z + 0.032);
    digit.visible = false;
    group.add(digit);
    digits.push(digit);

    // 額縁上部の表示灯 (点滅回数が読む順番)
    const housing = factory.rounded(0.38, 0.07, 0.08, 0.012, materials.metalDark);
    housing.position.set(spec.x, FRAME_Y + 0.76, FRAME_Z + 0.02);
    group.add(housing);
    const led = factory.plane(0.3, 0.035, materials.phosEmissive.clone());
    led.position.set(spec.x, FRAME_Y + 0.745, FRAME_Z + 0.062);
    group.add(led);
    lights.push(led);

    const label = factory.plane(0.26, 0.06, materials.textured(
      textTexture([`PLATE ${spec.id}`], {
        width: 256,
        height: 64,
        background: "#2a3138",
        color: "#9fb0bd",
        fontSize: 34,
        letterSpacing: 4,
      }),
    ));
    label.position.set(spec.x, FRAME_Y - 0.73, FRAME_Z + 0.02);
    group.add(label);
  });

  return { group, digits, lights };
}

export function buildClock(ctx: BuildContext): THREE.Group {
  const { factory, materials } = ctx;
  const group = new THREE.Group();

  const body = factory.cylinder(0.3, 0.3, 0.06, materials.frame, 32);
  body.rotation.x = Math.PI / 2;
  body.position.set(CLOCK.position.x, CLOCK.position.y, CLOCK.position.z - 0.02);
  body.castShadow = true;
  group.add(body);

  const rim = factory.torus(0.29, 0.014, materials.metal, 40);
  rim.position.set(CLOCK.position.x, CLOCK.position.y, CLOCK.position.z + 0.015);
  group.add(rim);

  const face = factory.plane(0.54, 0.54, materials.textured(clockFaceTexture(CLOCK.hours, CLOCK.minutes)));
  face.position.set(CLOCK.position.x, CLOCK.position.y, CLOCK.position.z + 0.012);
  group.add(face);
  ctx.register(face, "wall-clock");

  const glass = factory.plane(0.56, 0.56, materials.glass);
  glass.position.set(CLOCK.position.x, CLOCK.position.y, CLOCK.position.z + 0.02);
  group.add(glass);

  return group;
}

/* ================================================================== */
/* 監視カメラ                                                          */
/* ================================================================== */

export function buildCameras(ctx: BuildContext): THREE.Group {
  const { factory, materials } = ctx;
  const group = new THREE.Group();

  for (const prop of CAMERA_PROPS) {
    const holder = new THREE.Group();
    holder.position.set(prop.position.x, prop.position.y, prop.position.z);
    holder.lookAt(0, 1.3, 0);

    const bracket = factory.box(aabb(0, 0.07, 0.06, 0.05, 0.14, 0.05), materials.metalDark);
    holder.add(bracket);

    const body = factory.rounded(0.14, 0.11, 0.26, 0.03, materials.plasticLight);
    holder.add(body);
    ctx.register(body, `camera-${prop.id}`);

    const hood = factory.cylinder(0.055, 0.055, 0.06, materials.plastic, 20, true);
    hood.rotation.x = Math.PI / 2;
    hood.position.set(0, 0, -0.15);
    holder.add(hood);

    const lens = factory.cylinder(0.04, 0.04, 0.02, materials.screenGlass, 20);
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0, -0.16);
    holder.add(lens);

    const led = factory.plane(0.016, 0.016, materials.emberEmissive);
    led.position.set(0.05, 0.04, -0.13);
    holder.add(led);

    const label = factory.plane(0.22, 0.06, materials.textured(
      textTexture([prop.id], { width: 256, height: 72, transparent: true, color: "#9fb0bd", fontSize: 48 }),
      { transparent: true },
    ));
    label.position.set(0, -0.09, 0.0);
    holder.add(label);

    group.add(holder);
  }

  return group;
}

/* ================================================================== */
/* 隠し部屋の什器                                                      */
/* ================================================================== */

export function buildHiddenRoomProps(ctx: BuildContext): {
  group: THREE.Group;
  masterKey: THREE.Group;
  terminalScreen: THREE.Mesh;
  emergencyLight: THREE.PointLight;
} {
  const { factory, materials } = ctx;
  const group = new THREE.Group();
  const pedestal = piece("pedestal");

  /* --- 台座 --- */
  const base = factory.cylinder(0.3, 0.36, 0.86, materials.metalDark, 28);
  base.position.set(pedestal.center.x, 0.43, pedestal.center.z);
  base.castShadow = true;
  group.add(base);
  ctx.occlude(base);

  const collar = factory.torus(0.3, 0.018, materials.metal, 32);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(pedestal.center.x, 0.86, pedestal.center.z);
  group.add(collar);

  const topPlate = factory.cylinder(0.31, 0.31, 0.05, materials.metal, 28);
  topPlate.position.set(pedestal.center.x, 0.9, pedestal.center.z);
  topPlate.receiveShadow = true;
  group.add(topPlate);
  ctx.register(topPlate, "pedestal");

  const hatchSeam = factory.torus(0.16, 0.006, materials.metalDark, 28);
  hatchSeam.rotation.x = Math.PI / 2;
  hatchSeam.position.set(pedestal.center.x, 0.926, pedestal.center.z);
  group.add(hatchSeam);

  /* --- MASTER KEY --- */
  const masterKey = new THREE.Group();
  const keyShaft = factory.box(aabb(0, 0, 0, 0.035, 0.022, 0.22), materials.metalWarm);
  const keyHead = factory.torus(0.05, 0.014, materials.metalWarm, 26);
  keyHead.rotation.y = Math.PI / 2;
  keyHead.position.z = -0.15;
  const keyTeeth = factory.box(aabb(0, -0.02, 0.08, 0.035, 0.03, 0.05), materials.metalWarm);
  masterKey.add(keyShaft, keyHead, keyTeeth);
  masterKey.position.set(pedestal.center.x, 1.02, pedestal.center.z);
  masterKey.visible = false;
  group.add(masterKey);

  /* --- 端末 --- */
  const terminal = piece("terminal");
  const stand = factory.box(
    aabb(terminal.center.x - 0.05, 0.36, terminal.center.z, 0.4, 0.72, 0.9),
    materials.metalDark,
  );
  group.add(stand);
  ctx.occlude(stand);

  const deskTop = factory.rounded(0.52, 0.04, 1.0, 0.008, materials.deskTop);
  deskTop.position.set(terminal.center.x + 0.02, 0.74, terminal.center.z);
  group.add(deskTop);

  const housing = factory.rounded(0.16, 0.42, 0.56, 0.02, materials.plastic);
  housing.position.set(terminal.center.x + 0.12, 1.08, terminal.center.z);
  housing.rotation.z = -0.16;
  group.add(housing);

  const terminalScreen = factory.plane(0.44, 0.33, materials.textured(
    terminalTexture(["OBSERVATION", "CODE", "[   ]"]),
    { emissive: true },
  ));
  terminalScreen.rotation.y = Math.PI / 2;
  terminalScreen.rotation.z = -0.16;
  terminalScreen.position.set(terminal.center.x + 0.2, 1.08, terminal.center.z);
  group.add(terminalScreen);
  ctx.register(terminalScreen, "terminal");

  const terminalKeys = factory.plane(0.36, 0.12, materials.keyboard);
  terminalKeys.rotation.x = -Math.PI / 2;
  terminalKeys.rotation.z = Math.PI / 2;
  terminalKeys.position.set(terminal.center.x + 0.14, 0.765, terminal.center.z);
  group.add(terminalKeys);

  /* --- 床の X 印 --- */
  const mark = factory.plane(0.82, 0.82, materials.textured(floorMarkTexture(), { transparent: true }));
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(OBSERVE_MARK.x, 0.014, OBSERVE_MARK.z);
  group.add(mark);
  ctx.register(mark, "observe-mark");

  /* --- 非常灯 --- */
  const emergencyLight = new THREE.PointLight(0xe2603f, 0, 8, 2);
  emergencyLight.position.set(-8.2, 2.3, 0.2);
  group.add(emergencyLight);

  const cage = factory.cylinder(0.11, 0.11, 0.1, materials.metalDark, 14, true);
  cage.position.set(-8.2, HIDDEN_ROOM.height - 0.07, 0.2);
  group.add(cage);
  const dome = factory.sphere(0.09, materials.emberEmissive, 16);
  dome.scale.y = 0.6;
  dome.position.set(-8.2, HIDDEN_ROOM.height - 0.12, 0.2);
  group.add(dome);
  for (let i = 0; i < 4; i += 1) {
    const bar = factory.box(aabb(-8.2, HIDDEN_ROOM.height - 0.12, 0.2, 0.005, 0.1, 0.22), materials.metalDark);
    bar.rotation.y = (i / 4) * Math.PI;
    group.add(bar);
  }

  return { group, masterKey, terminalScreen, emergencyLight };
}
