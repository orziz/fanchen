# 凡尘立道录 · Copilot 仓库指令

本文件是本仓库的仓库级 Copilot 自动生效指令源。面向 AI 代理时，优先信任这里和 [docs/project-rules.md](../docs/project-rules.md) 的规则；只有当这两份信息不足或与代码现实冲突时，才继续搜索。

## 项目定位

- 这是一个本地运行的修真经营与挂机游戏，核心循环围绕修炼、跑商、置业、势力经营、宗门成长和地图探索展开。
- 涉及题材定位、世界规则、高阶内容扩展或长期系统演进时，先看 `docs/修真题材长期总纲.md`；若与其他设计文档的局部措辞冲突，以该文档为准。
- 涉及系统分期、当前阶段优先级、功能应前置还是后置时，再看 `docs/修真系统分期总表.md`。
- 当前源码主线在 `src/`，技术栈是 Vue 3 + Pinia + TypeScript + Vite 8；场景、人物、图标由 `src/art/` 用 Canvas2D 与 SVG 程序化绘制，声音由 `src/audio/` 用 WebAudio 合成，不依赖位图、音频素材或画布引擎。
- 本轮网页游戏化重构的评估结论、表现层架构与数值口径见 `docs/网页游戏重构说明.md`。
- 发布目标不是本地 server，而是可直接双击 `dist/index.html` 游玩；任何改动都不能破坏这一点。

## 关键命令

- 开发：`npm run dev`
- 构建：`npm run build`
- 类型检查：`npm run typecheck`
- 预览：`npm run preview`
- 规则回归：`npm test`（vitest）；可视化冒烟：`npm run test:visual`（本机 Chrome，默认以 file 协议打开 `dist/index.html`）。
- 当前仓库没有 lint 脚本；涉及代码改动时，至少跑 `npm test`、`npm run typecheck` 和 `npm run build`。
- 当前 `tsconfig.json` 未开启 strict；除非用户明确要求，不要把整仓顺手抬到严格模式。
- 在 Windows PowerShell 下如果 `npm run ...` 命中执行策略拦截，改用 `npm.cmd run ...`。

## 目录与分层

- `src/main.ts` 是 Vue 入口，挂载 `App.vue`（内含 `components/GameRoot.vue`）并注入 Pinia。
- `src/config/` 放常量、世界表、物品、功法、经济等配置。
- `src/stores/` 放 Pinia 状态、派生数据、存档读写与 hydration。
- `src/core/` 放不依赖 Vue 的纯规则与事件总线；`src/systems/` 放世界循环、挂机决策（`autoplay.ts`）、战斗、修行路标、产业、社交、功法等规则模块。
- `src/components/` 放界面组件（`shell/` 外壳、`scene/` 场景、`books/` 八本书册、`common/` 通用小件），`src/art/`、`src/audio/` 放程序化美术与声音，`src/styles/` 放全局样式与设计变量。
- `docs/` 放架构、设计和维护说明；改动项目规则时优先续写现有文档，不随意新开平行文档。

## 核心硬规则

- 游戏内禁止出现开发备注、版本说明、布局解释、AI 或工具来源说明、调试信息、临时占位文本。
- 游戏内新增文本只能属于世界内表达、玩法结果反馈或最短必要操作提示。
- 手写源码文件禁止超过 500 行；接近上限时优先按功能或内容边界拆分。
- 新系统必须做成可闭环玩法，不做只展示不运转的占位结构。
- 与经济相关的改动优先限制挂机滚雪球，再通过门路、地盘、委派和投入形成中后期成长。
- 与宗门、势力、产业相关的改动优先接入现有日结与地点系统，避免平行资源池。

## 实现偏好

- 新源码与新架构统一落在 `src/`，不要再引入旧式顺序脚本注入链、兼容桥或第二套源码入口。
- 保持当前的 TypeScript + Vue 3 + classic bundle 方向，不要把入口改成只能通过 module server 运行的方案。
- 表现层只负责渲染和交互；业务公式、规则推进、状态迁移分别留在 `src/systems/`、`src/stores/` 和 `src/config/`。
- 组件通信优先走 Pinia；不要把跨面板游戏状态塞进 `provide/inject` 或组件私有副本。
- 全局样式统一落在 `src/styles/`；不要在 `.vue` 里写大段全局样式或与全局类名冲突的 scoped 样式。

## 物品、功法与文档回写

- 任何物品、装备、秘籍、学识、已学功法、悟道配方相关改动，都必须同步更新 `docs/item.md`。
- 任何项目规则、架构约束、构建约束变更，都要同步更新 `docs/project-rules.md`。
- 如果改动了玩家可见的玩法口径，代码、文档和游戏内文案必须一致，不能出现“代码已改、文档还是旧说法”。

## 存档与兼容

- 存档主 key 是 `fanchen_save`，备份 key 与设置 key（`fanchen_save-settings`）从这个前缀派生；设置不进入游戏存档。
- 存档迁移入口在 `src/stores/game/hydration.ts`，不是其他历史文件名；改 store 结构时必须补迁移和默认值。
- 不要静默丢弃旧存档字段；若废弃字段，至少在迁移逻辑或文档里说明去向。

## UI 与视觉

- 表现层只有一条视觉轨道：深墨水墨舞台。场景铺满全屏，界面是浮在场景上的墨色半透明面板；功能入口统一做成书册，不另开浮窗或第二套壳层。细则见 `docs/visual-design-spec.md`。
- 不要做成页游金装风、重发光描边或手游化入口堆叠；点睛色只少量用于关键状态。
- 颜色、字号、间距优先走 `src/styles/tokens.css` 的变量，不要把色值散落硬编码在组件里；界面尺寸用 rem，跟随整屏等比缩放。
- 画面美术只用代码生成，不引入位图素材；新增地点先看 `src/art/scene/archetype.ts` 的自动推导，不合意再加覆盖项，并用 `tools/scene-lab.html` 检查。
- 适配以桌面为主、手机横屏可玩；矮屏与手机规则只写在 `src/styles/responsive.css`，改动后检查 1280×720、1920×1080 与 844×390 是否溢出。

## 修改后验证

- 先看改动是否违反游戏内文案规则和 500 行硬限制。
- 再跑 `npm test`、`npm run typecheck` 和 `npm run build`；Windows PowerShell 被拦时改用 `npm.cmd run ...`。
- 涉及画面、书册、地图、剧情、行囊、功法或存档时，先构建再跑 `npm run test:visual`，并做对应运行态检查。
- 涉及挂机、战斗、修行或经济公式时，重跑挂机数值模拟（方法见 `docs/网页游戏重构说明.md`），确认各打算节奏没有失衡。

## 优先阅读顺序

- 题材定位与长期演进：`docs/修真题材长期总纲.md`
- 系统阶段与扩展顺序：`docs/修真系统分期总表.md`
- 规则与工程边界：`docs/project-rules.md`
- 项目概览与目录：`README.md`
- 物品、秘籍与悟道：`docs/item.md`
- 表现层与数值口径：`docs/网页游戏重构说明.md`、`docs/visual-design-spec.md`
- 设计与架构补充：`docs/source-architecture.md`