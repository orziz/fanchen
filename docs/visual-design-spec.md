# 凡尘立道录 · 视觉设计规范

> 本文档是所有 UI/UX/视觉变更的强制参考。AI 与人工均须以此为准，不可自行发明色值、字号或间距。
> 主题来源：`src/styles/base.css` `:root` 变量表。任何新增色值必须先加变量，再在组件中引用。
> 涉及题材定位、世界规则与系统演进时，以 [修真题材长期总纲](./修真题材长期总纲.md) 为准；本文只约束视觉气质与表现层口径。

---

## 1. 主题：素雅水墨 / 宣纸轻量风 (Light Ink)

### 1.1 设计气质

凡尘修真题材、纸上跃然。轻质感、低对比、淡阴影、虚线勾勒。
拒绝深色暗底、浓重阴影、霓虹高饱和、扁平纯白、后台管理系统感。

### 1.2 视觉锚点

- 宣纸底 + 墨色字 = 阅读主线
- 琉璃黄 (gold) = 高亮激活 / 关键资源
- 翠玉绿 (jade) = 稳态 / 推荐
- 朱砂红 (cinnabar) = 警示 / 战斗
- 苍石蓝 (sky) = 信息 / 修行

---

## 2. 配色体系

### 2.1 CSS 变量（唯一真相源）

| 变量名 | 值 | 用途 |
|--------|------|------|
| `--bg-ink` | `#f2ebd9` | 亮宣纸色，Shell 主背景 |
| `--bg-deep` | `#e8decc` | 深宣纸色，辅助背景 |
| `--mist` | `rgba(0,0,0,0.04)` | 极淡遮罩 |
| `--card` | `rgba(255,255,255,0.9)` | 卡片/面板主背景 |
| `--card-soft` | `rgba(248,245,238,0.7)` | 次级卡片/柔和背景 |
| `--border` | `rgba(0,0,0,0.08)` | 标准边框 |
| `--line` | `rgba(0,0,0,0.05)` | 更轻的分割线 / 虚线 |
| `--text-main` | `#2b2823` | 主文字（墨色） |
| `--text-dim` | `#5c5850` | 次要文字 |
| `--text-faint` | `#8e897f` | 微弱标签 / 辅助说明 |
| `--gold` | `#b3852b` | 暗琉璃黄（状态色） |
| `--gold-bright` | `#d4a340` | 亮琉璃黄（激活、数值高亮） |
| `--jade` | `#427e61` | 翠玉绿（稳态、推荐） |
| `--cinnabar` | `#b44a42` | 朱砂红（警示、战斗） |
| `--sky` | `#4682b4` | 苍石蓝（信息、修行进度） |

### 2.2 阴影

| 变量名 | 值 | 说明 |
|--------|------|------|
| `--shadow` | `0 16px 32px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.02)` | 标准卡片阴影（极轻） |

规则：
- 卡片用 `var(--shadow)` 或比它更轻的值。
- hover 态阴影上限 `0 6px 20px rgba(0,0,0,0.05)`。
- 禁止 `rgba(0,0,0,0.15)` 以上的阴影值。

### 2.3 配色禁区

- 禁止硬编码深色系背景（`rgba(31,47,41,...)` 等暗值）。
- 禁止 `color-scheme: dark`、`prefers-color-scheme: dark`。
- 禁止纯白背景 `#fff`（用 `var(--card)` 替代）。
- 禁止纯黑文字 `#000`（用 `var(--text-main)` 替代）。
- 所有色值必须通过 CSS 变量引用，不可在组件中直接写色码。

---

## 3. 字体体系

### 3.1 字体族

| 变量名 | 值 | 用途 |
|--------|------|------|
| `--font-title` | `"STKaiti", "KaiTi", "FangSong", "Times New Roman", serif` | 标题、人名、章节名 |
| `--font-body` | `"Georgia", "STSong", "SimSun", serif` | 正文、说明、标签 |

- `body` 统一使用 `var(--font-body)`。
- 所有 heading（h1-h3）、人名、卡片大标题使用 `var(--font-title)` + `font-weight: 700`。
- 按钮、标签等不重新指定字体，继承 body。

### 3.2 字号层级

| 级别 | 大小 | 适用场景 | 示例类名 |
|------|------|---------|---------|
| **Display** | `clamp(28px, 4vw, 36px)` | 策略盘主标题 | `.command-hero-title` |
| **H1** | `34px` | 角色名 | `.player-name` |
| **H2** | `22px` | 面板内标题、子章节标题、toolbar 标题 | `.subsection-title`, `.window-toolbar h3` |
| **H3** | `18px` | 卡片标题、pin-card 标题、状态徽章 | `.pin-card-head h3`, `.status-badge strong` |
| **Body large** | `16px` | 状态栏数值 | `.status-pill strong` |
| **Body** | `15px` | 正文、面板说明 | `body`（基线） |
| **HUD name** | `17px` | 顶栏角色名 | `.hud-name` |
| **HUD realm** | `14px` | 顶栏境界 | `.hud-realm` |
| **Body small** | `14px` | 按钮、meter 标签 | `.control-button`, `.meter-label` |
| **Caption** | `13px` | HUD 指标标签、chip | `.hud-chip`, `.hud-meter-label`, `.command-chip` |
| **Micro** | `12px` | 标签、品阶、读数说明、时间戳 | `.rarity`, `.log-item time`, `.micro-label` |
| **Kicker** | `11px` | 栏目眉题（eyebrow）、策略标记 | `.section-kicker`, `.command-pill` |

规则：
- 正文最小不低于 `13px`，标签/眉题允许 `11-12px`。
- 禁止在面板正文区域使用 `10px` 或以下字号。
- `body` 基线 `font-size: 15px; line-height: 1.6`。

---

## 4. 圆角体系

| 变量名 | 值 | 适用场景 |
|--------|------|---------|
| `--radius-xl` | `22px` | Shell 主面板、大卡片 |
| `--radius-lg` | `16px` | 普通卡片、面板内容区 |
| `--radius-md` | `10px` | Dock 按钮、小卡片、overlay-stat |
| `--radius-sm` | `6px` | 内嵌小元素 |
| `999px` | 胶囊（药丸）形 | 按钮、tag、rarity、chip、pill |

规则：
- 主面板外壳用 `--radius-xl`。
- 面板内卡片用 `--radius-lg`。
- 所有按钮默认 `999px`（胶囊形）；仅 Dock 按钮和 mode-button-card 例外用 `--radius-md`。
- 禁止使用 `0` 圆角造成尖角矩形。

---

## 5. 间距体系

### 5.1 全局间距

| 场景 | 值 | 说明 |
|------|------|------|
| Shell padding | `0`（由内部子区域各自 padding） | v3-shell 本身不加 padding |
| HudBar padding | `10px 18px` | 水平贯通 |
| Stage-wrap padding | `12px` | 主内容区外围 |
| Panel-body padding | `18px 20px` | 面板内容区 |
| Dock padding | `8px 14px` | 底栏 |
| Pin-rail padding | `12px 12px 12px 0` | 右导轨（左侧不需要间距，紧贴 stage） |

### 5.2 卡片间距

| 属性 | 值 | 说明 |
|------|------|------|
| 卡片内 padding | `16px` | 通用 `.stat-box`, `.item-card` 等 |
| pin-card-head padding | `12px 14px` | pin 卡头部 |
| pin-card-body padding | `14px` | pin 卡内容 |
| grid gap | `12-14px` | 大部分 grid 使用 `12px` 或 `14px` |
| section 间 margin | `24px 0 12px` | `.subsection-title` 默认上间距 |

### 5.3 按钮间距

| 属性 | 值 |
|------|------|
| 通用按钮 padding | `10px 16px` |
| 小按钮 padding | `9px 12px` |
| Dock tab padding | `7px 16px` |
| Speed 按钮 padding | `5px 12px` |
| HUD pin 按钮 padding | `5px 11px` |

---

## 6. 边框风格

| 场景 | border 值 | 说明 |
|------|-----------|------|
| 卡片标准 | `1px solid var(--border)` | `.item-card` 等大部分卡片 |
| 分割线 | `1px solid var(--line)` | 较轻，用于卡片内部 |
| 虚线勾勒 | `1px dashed var(--line)` | canvas-shell、pin-card-head 底部 |
| 虚线边界 | `1px dashed rgba(0,0,0,0.1)` | empty-state、command-chip |
| 点线 | `1px dotted var(--border)` | command-section、策略卡 |
| 激活态 | `border-color: rgba(208,171,108,0.3)` | Dock tab、active card |
| 日志色边 | `border-left: 3px solid [色]` | `.log-item` 类型指示条 |

规则：
- 线条透明度不超过 `0.15`（常态）。
- hover 态允许到 `0.15`，active 态允许到 `0.3-0.4`。
- 禁止 `2px` 以上粗边框（日志左色条 `3px` 除外）。

---

## 7. 组件风格

### 7.1 按钮

```
默认态：  border: 1px solid rgba(0,0,0,0.1)
          background: rgba(0,0,0,0.03)
          color: var(--text-main)
          border-radius: 999px

hover态： background: rgba(0,0,0,0.06)
          border-color: rgba(0,0,0,0.15)
          transform: translateY(-1px)

active态：background: linear-gradient(135deg, rgba(208,171,108,0.2), rgba(127,178,148,0.22))
          border-color: rgba(242,214,162,0.28)
          color: var(--gold-bright)

disabled：opacity: 0.72
          border-style: dashed
          color: var(--text-dim)
          无 hover 动效
```

### 7.2 卡片

```
默认态：  border-radius: var(--radius-lg)
          border: 1px solid var(--line)
          background: var(--card-soft)
          box-shadow: 0 2px 8px rgba(0,0,0,0.02)

hover态： transform: translateY(-2px)
          box-shadow: 0 4px 12px rgba(0,0,0,0.05)
          border-color: rgba(0,0,0,0.15)
          background: var(--card)
```

### 7.3 Tag / Rarity / Chip

```
默认态：  border-radius: 999px
          padding: 7px 12px
          font-size: 12px
          background: rgba(0,0,0,0.03)
          border: 1px solid rgba(0,0,0,0.08)
          color: var(--text-dim)

品阶色：  .common  → #8e897f
          .uncommon → var(--jade) #427e61
          .rare    → var(--sky) #4682b4
          .epic    → var(--gold) #b3852b
          .legendary → var(--cinnabar) #b44a42
```

### 7.4 Meter / 进度条

```
轨道：    height: 12px, border-radius: 999px, background: rgba(0,0,0,0.06)
HUD 轨道：height: 8px, width: 80px

填充渐变：
  默认  → linear-gradient(90deg, rgba(127,178,148,0.9), rgba(208,171,108,0.96))
  HP    → linear-gradient(90deg, rgba(180,92,71,0.95), rgba(208,171,108,0.95))
  QI    → linear-gradient(90deg, rgba(125,178,200,0.9), rgba(127,178,148,0.9))
  体力  → linear-gradient(90deg, rgba(208,171,108,0.92), rgba(242,214,162,0.92))
  突破  → linear-gradient(90deg, rgba(180,92,71,0.85), rgba(125,178,200,0.9))
```

### 7.5 Toast / 通知

```
底层：    background: rgba(255,255,255,0.95)
          border: 1px solid var(--border)
          border-radius: 18px
          box-shadow: 0 14px 28px rgba(0,0,0,0.08)
          backdrop-filter: blur(12px)

warn态：  border-color: rgba(180,92,71,0.38)
loot态：  border-color: rgba(208,171,108,0.38)

徽章：    background: rgba(179,133,43,0.1)
          color: var(--gold)
          font-size: 12px
```

### 7.6 日志条

```
容器：    border-radius: var(--radius-lg)
          border: 1px solid var(--line)
          background: var(--card-soft)
          padding: 16px

类型色条（左 3px）：
  info → rgba(127,178,148,0.8)
  loot → rgba(208,171,108,0.86)
  warn → rgba(180,92,71,0.86)
  npc  → rgba(125,178,200,0.86)
```

---

## 8. 动效与过渡

### 8.1 通用过渡

| 属性 | 时长 | 缓动 | 适用 |
|------|------|------|------|
| `transform` | `0.18-0.2s` | `ease` | 按钮 hover、卡片 hover |
| `background`, `border-color`, `color` | `0.15-0.18s` | `ease` | 按钮状态切换 |
| `opacity`, `transform` | `0.2s` | `ease` | Toast 进出 |
| `width` (meter fill) | `0.4s` | `ease` | 进度条变化 |

### 8.2 hover 动效

- 按钮 hover：`translateY(-1px)` — 微浮动。
- 卡片 hover：`translateY(-2px)` + 加深阴影 — 轻跃起。
- 无 hover 态的元素不加 transition（节省性能）。

### 8.3 禁止的动效

- 禁止 `scale` 放大效果（偏扁平 UI，不合凡尘修真书卷气质）。
- 禁止 `rotate` 旋转（除 loading spinner 外）。
- 禁止超过 `0.4s` 的过渡时长（"胜不贵久"）。
- 禁止连续弹跳 / 呼吸动画（分散注意力）。

### 8.4 未来扩展方向

- 数值飘字（金币获得、经验增长）：`translateY(-20px)` + `opacity: 0`，时长 `0.5s`。
- 物品获得高亮：卡片短暂 `border-color: var(--gold)` 闪烁一次。
- 战斗命中反馈：目标卡片短暂 `shake` 微颤。

---

## 9. 图标与插画指引

### 9.1 当前状态

项目目前**不使用图标库**。所有状态信息通过文字标签、色彩和结构表达。

### 9.2 未来图标方向

若引入图标，须遵守：

- **风格**：线性描边（1.5-2px stroke），不填充，古典线条感。参考宋/明刻本插画的勾勒风格。
- **色彩**：默认 `var(--text-faint)` 描边，激活态 `var(--gold)` / 对应状态色。
- **尺寸**：16px（内联）、20px（按钮内）、24px（标题旁）。统一 viewBox `0 0 24 24`。
- **格式**：内联 SVG 或 SVG sprite，不用图片文件。不用 icon font。
- **命名**：`icon-[主题]-[动作]`，如 `icon-sword-attack`、`icon-scroll-read`。

### 9.3 插画 / 氛围图

- 不使用照片或写实插画。
- 允许 SVG 噪点/渐变纹理作背景氛围（已有：body 宣纸纹、shell 噪点层）。
- 未来地图节点图标可用简笔山水风 SVG。
- 角色头像区域预留，但当前以文字+境界信息代替。

---

## 10. 滚动条

```css
全局：    scrollbar-width: thin
          scrollbar-color: rgba(179,133,43,0.25) transparent
Webkit：  width/height: 7px
          thumb: rgba(179,133,43,0.22), hover → rgba(179,133,43,0.38)
          track: transparent
          border-radius: 999px
```

规则：
- 所有可滚动容器自动继承全局滚动条，不需要单独声明。
- `scrollbar-gutter: stable` 用于需要避免内容跳动的区域。
- Dock 和 HudBar 使用 `scrollbar-width: none` 完全隐藏（横向滚动靠拖拽）。

---

## 11. CSS 文件职责索引

| 文件 | 行数 | 职责 |
|------|------|------|
| `base.css` | ~320 | 变量表、全局重置、字体、滚动条、按钮通用态、tag/rarity |
| `layout.css` | ~480 | Shell / HudBar / Body / Stage / Dock / Map 布局骨架 |
| `windows.css` | ~180 | Pin-rail、pin-card、canvas-shell、toolbar |
| `panels.css` | ~350 | 面板内公用结构（card / grid / summary / meter / toast） |
| `command.css` | ~340 | 策略盘专用组件 |
| `responsive.css` | ~100 | 所有 `@media` 断点 |
| `runtime-overlay.css` | ~60 | 首屏启动覆盖层 |

导入顺序（`src/styles/index.css`）：
```
base → layout → windows → panels → command → responsive → runtime-overlay
```

变更新增类名时，先确认应放在哪个文件中，对照本表归类。

---

## 12. 变更检查清单

视觉相关改动后，按此清单逐条过：

1. 新增色值是否已加 `:root` 变量？
2. 新增色值是否符合"素雅水墨"气质（低饱和、偏暖灰）？
3. 新增字号是否在 11-36px 层级表内？
4. 是否有硬编码色码未走变量？
5. 边框透明度是否在限定范围内？
6. 动效时长是否 ≤ 0.4s？
7. 卡片、按钮的 hover/active/disabled 态是否覆盖？
8. 响应式降级是否在 responsive.css 中处理？
9. 构建通过？无 CSS 语法错误？
