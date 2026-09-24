# 源码目录结构

## 目标

- 所有可维护源码都纳入新架构，不再散落在根目录。
- 开发态和发布态各自职责明确。
- 规则层（config / core / stores / systems）不依赖 Vue 组件，可在 Node 里直接驱动完整游戏循环（测试与数值模拟都这样做）；表现层只渲染与交互。

## 当前目录约定

### src/components

- `GameRoot.vue`：按画面阶段切换标题页与游戏画面，挂载设置、悬停提示与横置提示。
- `shell/`：游戏画面外壳——`GameScreen`（热键与整体布局）、`TopBar`、`CharacterCard`、`ObjectiveCard`、`ChronicleFeed`、`ActionDock`、`StrategyPopover`、`SettingsDialog`、`TitleScreen`、`NewLifeDialog`。
- `scene/`：`SceneView`（画布与人物层、屏震、横幅）、`HeroFigure`、`EnemyFigure`、`LocationPlate`、`CombatHud`。
- `books/`：八本书册。`BookHost` 负责挂载当前书册，`BookFrame` 是统一的书册框（标题、页签、关闭）；每本书的子视图放在同名子目录（`bag/`、`map/`、`market/`、`industry/`、`faction/`、`people/`）。
- `common/`：跨处复用的小件——`GameIcon`、`InkBar`、`SealAvatar`、`ItemTile`、`TooltipLayer`（读取 `data-tip` / `data-tip-title`）。
- `StoryOverlay.vue`、`StoryScene.vue`：剧情遮罩与剧情节点渲染；`ToastStack.vue`：飘出提示。

### src/art

- 程序化美术，只依赖 Canvas2D 与 SVG 路径，不引用位图。
- `scene/`：地貌原型推导（`archetype.ts`）、分层构图（`compose.ts`）、人烟（`settlements.ts`）、光照与天气调色（`palette.ts`）、粒子与气旋（`effects.ts`）、逐帧渲染器（`renderer.ts`）。
- `paint/`：笔触、山、水、草木、建筑、地面等绘制原语。
- `figures/`：主角姿态与妖物剪影；`icons.ts`：界面图标路径；`rng.ts`：可复现随机数。

### src/audio

- WebAudio 合成：`engine.ts`（音频上下文与总线）、`synth.ts`（拨弦与音色）、`music.ts`（生成式配乐）、`ambience.ts`（环境声）、`sfx.ts`（音效）。

### src/composables

- `useGameLoop`：定时推进、倍速、暂停与自动存档；`useBooks`：书册开合、页签、热键与教程锁（`useStage` 为旧 `setTab` 调用的兼容层）。
- `useFx`、`useGameFeedback`：把事件总线翻译成飘字、横幅、屏震与音效；`useAudio`：声音开关与解锁；`useSettings`：玩家设置；`useGamePhase`：标题 / 游戏阶段；`useUIHelpers`：界面辅助。

### src/config

- 放配置表、常量和模板数据；`origins.ts` 为开局出身。

### src/core

- 不依赖 Vue 的纯规则：上下文适配（`context.ts`）、事件总线（`events.ts`）、整数进位（`integerProgress.ts`）、当前要务决策（`guidance.ts`）。

### src/stores

- 放 Pinia 状态、派生视图和存读档逻辑；`game/hydration.ts` 是存档迁移入口，`game/origin.ts` 处理新一世的出身与导入校验。

### src/systems

- 放世界推进、挂机决策、战斗、修行路标、产业、势力和 NPC 等规则系统。
- `world.ts` 负责行动分发、赶路与时辰推进；`autoplay.ts` 负责挂机时每一跳该做什么（`gameStep` 是主循环入口）。
- 涉及地方商况的长期状态，统一落到 `worldEconomy.ts`，由贸易、产业、NPC 行为与领地公式共同读写，避免每个系统各自维护一套平行经济值。
- `milestones.ts`：修行路标；`rumors.ts`：茶馆酒馆风闻；`industryOrders.ts`：行会订单。

### src/styles

- 全局样式统一由 `index.css` 聚合：`tokens.css`（设计变量与整屏缩放）、`base.css`、`ui.css`（按钮、标签等基元）、`shell.css`、`dock.css`、`scene.css`、`books.css` 以及各书册专用样式、`responsive.css`。
- 编辑器样式（`tools.css`、`story-editor.css`）只供 `tools/` 页面使用。

### src/types

- 放全局声明和运行时类型。

## 工具链约定

- npm run dev：Vite 开发入口，读取根目录 index.html 和 src/main.ts。
- npm run build：Vite 8 发布构建，输出 dist/index.html、classic bundle 与样式资源。
- npm run dev:release：Vite build 监听模式，只用于发布侧调试。
- npm test：vitest 规则回归；npm run test:visual：本机 Chrome 可视化冒烟。
- tools/：内容编辑器与场景画室（`scene-lab.html`），经开发服务器打开。

## 路径原则

- 开发态只直接引用 src 下源码。
- 发布态只消费 dist 下产物。
- 不再把根目录 scripts、styles、game.js 作为源码入口。
- 不再保留旧 runtime 目录作为脚本或样式入口。
