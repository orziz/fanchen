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
- 当前主要承载源码运行时启动与启动状态管理。

### src/runtime

- 放统一游戏运行时源码。
- bootstrap.ts 负责静态导入模块并启动运行时。
- styles.css 负责聚合游戏样式入口。

### src/runtime/app、config、systems、ui

- app：命名空间与基础工具。
- config：配置表与模板数据。
- systems：玩法系统与规则循环。
- ui：当前渲染和交互层。

### src/runtime/styles

- 放全局样式、窗口样式、面板样式和启动覆盖层样式。
- 开发态由 index.html 直接引用，发布态由 Vite build 复制到 dist。

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
- 不再把运行时脚本目录原样复制到 dist 作为对外执行入口。
