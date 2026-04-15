# 凡尘立道录 · 项目维护规则

> 本文档约束所有代码变更，AI 或人工均须遵守。与 `copilot-instructions.md` 并行生效，前者偏游戏内容与文案，本文偏工程与架构。

---

## 1. 分层架构

### 1.1 三层边界

| 层 | 目录 | 职责 | 禁止 |
|---|---|---|---|
| **数据层** | `src/stores/`, `src/config/` | 状态定义、配置表、存档读写 | 不触碰 DOM / 组件 API |
| **操作层** | `src/systems/`, `src/composables/` | 游戏规则、回合逻辑、公式计算 | 不引用 Vue 组件、不操作样式 |
| **表现层** | `src/components/`, `src/styles/` | 渲染、交互、动画 | 不内联业务公式、不直接修改 store 深层字段 |

- 操作层通过 Pinia action / composable 函数暴露给表现层，表现层只调用，不复制逻辑。
- 未来 CLI 或脚本接口可以只引用「数据层 + 操作层」运行完整游戏循环，不需要 Vue。

### 1.2 文件拆分

- 单文件不超过 **500 行**（硬规则，见 `copilot-instructions.md`）。
- 拆分优先按「一个系统 / 一个面板 / 一个配置主题」，不做横切的 utils 大文件。
- 新增系统前先在 `docs/` 放一份简要设计，说明：输入、输出、日结/回合钩子、与已有系统的交互点。

---

## 2. Vue 组件规范

### 2.1 单根元素

- 所有组件 `<template>` 必须有且仅有 **一个根元素**（`<div>`、`<section>` 等）。
- 禁止 fragment root（多根并列）。原因：`v-show` 对 fragment 只隐藏第一个元素，曾导致面板内容全局串显。

### 2.2 面板切换

- `GameWorkbench` 使用 `<div v-show>` 包裹每个面板做快速切换（保留 DOM）。
- 地图面板例外，使用 `v-if` 按需挂载/卸载 Pixi.js 实例。

### 2.3 组件通信

- 跨组件状态统一走 Pinia store，不用 `provide/inject` 传游戏数据。
- 父子间纯 UI 状态（弹窗开关、折叠态）用 `defineEmits` / `v-model`，不塞 store。

---

## 3. 样式与视觉一致性

### 3.1 主题

- 当前唯一主题：**素雅水墨 / 宣纸轻量风**（Light Ink）。
- 所有可见色值必须通过 `var(--xxx)` 引用 `base.css` 中的 CSS 变量，禁止硬编码 `#333`、`rgba(0,0,0,0.x)` 等暗色系值。
- 背景使用 `var(--card)` / `var(--card-soft)` / `var(--bg-ink)`，不使用纯白或深灰。

### 3.2 CSS 文件职责

| 文件 | 内容 |
|---|---|
| `base.css` | 变量表、全局重置、字体、滚动条 |
| `layout.css` | Shell / HudBar / Body / Stage / Dock 骨架 |
| `windows.css` | Pin-rail、pin-card、canvas-shell、toolbar |
| `panels.css` | 面板内公用结构（card / grid / summary / actions） |
| `command.css` | 策略盘专用 |
| `responsive.css` | 所有 `@media` 断点，以宽度渐进降级 |
| `runtime-overlay.css` | 首屏启动覆盖层 |

- 禁止在 `.vue` 文件的 `<style>` 块中写全局样式，所有全局规则统一进 `src/styles/`。
- 组件如需私有样式可用 `<style scoped>`，但不应与全局类名冲突。

### 3.3 响应式

- 断点从 **宽度大到小** 依次降级：`≤1380px` → `≤1120px` → `≤960px` → `≤720px`。
- 额外有一条高度断点 `≤680px` 处理矮屏。
- 降级策略：
  1. 先缩紧 padding/gap。
  2. 再隐藏 context 副栏。
  3. 再隐藏 pin-rail。
  4. 最后简化 HudBar 到仅保留核心操作。
- 所有横屏分辨率（1024×768 到 3840×2160）必须可用，不出现内容溢出或空白死区。

---

## 4. 存档兼容

### 4.1 存档位置

- `localStorage`，key = `shanhai_save`（或当前实际使用的 key）。
- 存档结构 = Pinia store 的 `$state` 序列化快照。

### 4.2 向后兼容

- 任何 store 字段变更（改名 / 删除 / 类型变化）必须附带**迁移函数**，在 `state-hydration.ts` 中处理旧存档 → 新字段的映射。
- 新增字段必须有合理默认值，旧存档加载后自动补全。
- 不允许静默丢弃旧存档数据；若确认某字段永久废弃，需在迁移注释中说明。

### 4.3 版本号

- 存档带 `saveVersion: number`。
- 每次结构性变更递增版本号，迁移函数逐版本链式升级。

---

## 5. 功能完整性

- **不做半截功能**：新面板 / 新系统必须至少能完成一轮完整操作循环（展示 → 操作 → 结果反馈 → 状态更新）后才允许合入。
- 如果某功能尚未完成，用 `v-if="false"` 或 config flag 整体关闭入口，不在 UI 上暴露不可用按钮。
- 玩法联动（如市场→背包、宗门→产业→NPC）必须在两端都能正确响应，不允许只做「发起端」不做「接收端」。

---

## 6. 地图（山河图）

- 地图渲染使用 Pixi.js，挂载于 `MapPanel` 的 `canvas-shell` 容器。
- 地图叠加信息（当前地点、挂机模式、当前行动）放在 **toolbar 区域**，不叠在 canvas 上阻挡交互。
- 地图面板使用 `v-if` 切换（挂载时创建、卸载时销毁 Pixi 实例），不用 `v-show`。

---

## 7. 构建与发布

- `npm run dev`：Vite 开发服务器。
- `npm run build`：产物输出到 `dist/`。
- **硬约束**：`dist/index.html` 必须能双击直接打开游玩，不依赖本地 server。
- TypeScript 严格模式，`vue-tsc --noEmit` 通过后才可提交。

---

## 8. 变更检查清单

每次代码变更后，请按以下顺序验证：

1. `npx vite build` 通过（0 error）。
2. 所有面板切换后只显示当前面板内容，无串显/残影。
3. Pin-rail 单卡展开撑满高度，三卡等分。
4. 地图 overlay 信息不遮盖 canvas。
5. 在 1024px、1280px、1920px 宽度下无溢出。
6. 存档加载兼容（若涉及 store 变更）。
7. 游戏内无开发备注、调试信息、AI 痕迹文本。
