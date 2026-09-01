# 08 TECHNICAL DESIGN

## 採用構成

```text
Vite
TypeScript
Three.js
Vitest
Playwright
```

## 採用しない
初版では:
- React
- Next.js
- Redux
- DB
- API server
- Multiplayer
- ECS framework
- Heavy physics engine

理由:
1-room脱出ゲームでは過剰。
Claude Codeが追跡する状態を減らす。

## Directory

```text
src/
  main.ts
  app/
    GameApp.ts
    GameLoop.ts

  core/
    EventBus.ts
    GameState.ts
    SaveManager.ts
    InputManager.ts

  scene/
    SceneManager.ts
    Environment.ts
    Lighting.ts

  player/
    PlayerController.ts
    CollisionController.ts
    CameraController.ts

  interaction/
    InteractionManager.ts
    Interactable.ts
    interactables/

  puzzles/
    PuzzleManager.ts
    puzzle01.ts
    puzzle02.ts
    ...

  inventory/
    InventoryManager.ts
    items.ts

  ui/
    UIManager.ts
    hud/
    keypad/
    pc/
    inventory/
    hints/

  audio/
    AudioManager.ts

  data/
    puzzles.ts
    interactables.ts

  styles/
    main.css

public/
  models/
  textures/
  audio/
```

## Rendering
- WebGLRenderer
- antialias true
- pixelRatio cap 1.5〜2
- shadows限定使用
- physicallyCorrect lightingにこだわりすぎない
- fog軽量利用可

## FPS
PointerLock API。

`PointerLockControls`を参考にしてもよいが、
移動とcollisionは自前Controllerへ分離。

## Collision
初版はStatic AABB方式を推奨。

対象:
- walls
- desks
- shelves
- safe
- closed doors

プレイヤーをcapsule/box近似。

複雑なphysicsは不要。

### 将来
物理挙動が必要になった時だけRapier導入。

## Interactions
Raycasterを毎frame実行。

最適化:
interaction layerのみraycast。

## Puzzle Data
可能な範囲でdata-driven。

```ts
const keypadPuzzles = {
  drawer: {
    answer: "0417",
    flag: "drawerOpened"
  },
  safe: {
    answer: "5892",
    flag: "safeOpened"
  }
}
```

## Animation
GSAPを入れず、
簡単なlerp/tween utilityを自作するか
Three.js loop内でtime-based animation。

外部依存を増やさない。

## Assets
最初はThree.js primitiveで完成させる。

Phase 2:
GLB差し替え。

## GLTF
`GLTFLoader`

モデル命名規約:
```text
ENV_Wall_North
PROP_Desk_Main
INT_Safe
INT_PC
PUZ_Frame_A
```

## Performance Target
Desktop:
60fps目標
30fps未満を不可。

Draw calls:
初版100〜250程度目標。

Textures:
原則 1K。
重要小物のみ2K可。

## Lighting
- HemisphereLight or low Ambient
- 2〜4 point/spot
- Exit area emissive
- flashlight SpotLight

Shadow castingは主要ライト1つ程度。

## Save
localStorage。
ネットワーク不要。

## Security
ゲームなので機密性は不要だが、
答えがJS bundleから見えることは許容。
サーバー検証はしない。

## Mobile
初版対象外。
画面には:
`PC browser recommended`

将来Virtual joystick対応可能な構造にする。

## Browser
Chrome / Edge 最新。
Firefoxはbest effort。
Safariは初版対象外でもよい。

## Error Handling
- WebGL unavailable
- Pointer Lock unavailable
- localStorage failure
をユーザー向けに表示。
