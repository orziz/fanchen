# 源码目录结构

## 目标

- 所有可维护源码都纳入新架构，不再散落在根目录。
- 开发态和发布态各自职责明确。
- Vue 壳层与统一运行时源码边界清楚，便于继续内聚和强类型化。

## 当前目录约定

### src/components

- 放 Vue 组件。
- 当前主要承载页面壳层、启动覆盖层和游戏 DOM 骨架。

### src/composables

- 放组合式逻辑。
- 当前主要承载舞台切换、窗口状态和界面辅助逻辑。

### src/config

- 放配置表、常量和模板数据。

### src/stores

- 放 Pinia 状态、派生视图和存读档逻辑。

### src/systems

- 放世界推进、战斗、产业、势力和 NPC 等规则系统。

### src/styles

- 放全局样式、布局样式、面板样式、响应式样式和启动覆盖层样式。
- 开发态与发布态统一由 src/main.ts 导入聚合入口，不再由 index.html 单独挂旧 runtime 样式。

### src/types

- 放全局声明和运行时类型。

## 工具链约定

- npm run dev：Vite 开发入口，读取根目录 index.html 和 src/main.ts。
- npm run build：Vite 8 发布构建，输出 dist/index.html、classic bundle 与样式资源。
- npm run dev:release：Vite build 监听模式，只用于发布侧调试。

## 路径原则

- 开发态只直接引用 src 下源码。
- 发布态只消费 dist 下产物。
- 不再把根目录 scripts、styles、game.js 作为源码入口。
- 不再保留旧 runtime 目录作为脚本或样式入口。
