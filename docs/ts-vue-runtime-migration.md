# TS + Vue3 迁移主路

## 目标

- 把后续源码维护入口统一到 TypeScript。
- 让页面骨架、启动流程和后续 UI 重写有稳定宿主。
- 保留“编译产物双击 index.html 即可游玩”的离线约束。

## 成功标准

- 构建后产物落在 dist 目录。
- 双击 dist/index.html 时，不依赖本地 server，也能正常进入游戏。
- 新入口负责页面骨架与运行时启动，页面不再依赖顺序脚本注入链。
- 当前玩法源码全部归入 src/config、src/stores、src/systems、src/components 与 src/styles，并被打进统一 bundle，发布目录不再暴露 dist/scripts 与 game.js 这类旧式运行时入口。
- 旧 runtime 目录已经彻底退场；后续演进重点转为显式接口、界面打磨与玩法扩展，而不再是语言层过渡问题。

## 硬约束

- 运行时不能要求 dev server、Node 服务或后端接口。
- 构建产物不能依赖 ES module HTML 入口，因为 file 协议下模块脚本并不稳妥。
- 现有玩法循环必须持续可玩，不能先为迁移停服。
- 新架构必须去掉外部顺序脚本加载链，运行时只能从源码模块图启动。

## 路线裁决

### 选型

- 语言：TypeScript。
- UI 宿主：Vue3。
- 开发：Vite dev server。
- 发布：Vite 8 build 输出 classic IIFE bundle。
- 图形层：暂不引入 PixiJS 作为全局宿主。

### 为什么统一到 Vite 8，而不是继续双构建链

- Vite 更适合日常 Vue3 + TS 开发，热更新、入口管理和 SFC 体验明显更好。
- Vite 的 build 仍能输出 classic IIFE bundle，所以没有必要再额外维护一份独立 Rollup 配置。
- 统一到一套正式工具链后，开发与发布配置不再分叉，后续迁移成本更低。

### 为什么不改用 rolldown-vite 预览链

- 当前硬约束是 dist/index.html 必须稳定 file 直开，优先级高于构建器速度。
- rolldown-vite 仍是预览定位，不值得在这一步把交付链切到预览工具上。
- 因此这轮采用 Vite 8 正式链路，先把架构统一和源码迁移做完。

### 为什么不是直接用 Vite app 模式发布

- 默认产物是 module graph，更适合通过 HTTP 访问。
- 当前硬约束是双击 index.html 直接运行，所以优先选择 classic script 输出，而不是让构建产物依赖模块加载语义。

### 为什么暂不全面上 PixiJS

- 当前项目的复杂度主要在状态、规则、面板和经营循环，不在高频实时渲染。
- 地图和战斗后面可以局部引入 PixiJS，但不应该让整个项目先为渲染引擎重写一遍。

## 现阶段架构

### 1. Vue 壳层

- 负责渲染页面 DOM 骨架。
- 负责启动时的加载态、错误态和重试入口。
- 负责后续把单个窗口或页签改写成原生 Vue 组件。

### 2. App Bootstrap

- 由 src/main.ts 启动 Vue 应用并导入统一样式入口。
- Vue 外壳挂载完成后，由 Pinia、composables 和 systems 接管游戏状态与交互。
- 启动态只负责呈现应用的启动状态，不再承担旧脚本链装配职责。

### 3. Domain Source Tree

- src/config、src/stores、src/systems、src/components 与 src/styles 共同承载经营、战斗、社交、宗门、地图等玩法系统。
- 这些模块已经整体迁入 TS + Vue 源码树，不再保留独立 runtime 目录。
- dist 只保留 classic bundle 与样式资源，不再复制旧脚本目录作为对外运行入口。

## 未来演进边界

### 先迁出的内容

- 页面骨架
- 顶层窗口系统
- 高层启动流程
- 加载态、错误态、挂载调度

### 后迁出的内容

- 各页签渲染函数
- 浮窗细节
- 游戏状态读模型
- 世界与经济系统

### 最后迁出的内容

- 旧的 DOM 拼接渲染函数
- 旧的全局命名空间依赖
- 旧脚本顺序加载链

## 分期建议

### Phase 1

- 建立 TS + Vue3 + Vite 开发链。
- 建立可 file 直开的 Vite classic bundle 发布链。
- 让 dist/index.html 可以 file 直开。
- 用 Vue 托管现有 HTML 骨架和启动流程。
- 把旧的脚本顺序加载链收束为源码级静态模块启动。

### Phase 2

- 以面板为单位，把 renderPlayerPanel、renderMarketPanel 一类函数逐个迁到 Vue 组件。
- 把运行时公共状态和派生数据从 window.ShanHai 逐步收束到显式接口。

### Phase 3

- 给 world、industry、social 建立 TS 域模块。
- 把只读派生数据和可变状态边界收束到明确接口。

### Phase 4

- 删除残余的全局命名空间耦合和旧 DOM 拼接面板。
- 仅保留 TS 域内核和 Vue 组件树。
