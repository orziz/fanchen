# UI Component Baseline

## 目标

- 把主交互面板里重复最多的卡片骨架收口成共享基元，减少同类改动分散在多个页面重复维护。
- 明确标题行、标签行、说明行和操作区的结构边界，避免再回到“标题和介绍包在同一块里”的写法。
- 给后续新页面一个可直接复用的最小 UI 组件基线，而不是继续堆页面级类名。
- 把 tag、chip、pill、动作按钮组这层也收口，避免卡片内部仍然散着写容器类和状态类。

## 公共基元

### UiPanelCard

- 路径：src/components/ui/UiPanelCard.vue
- 作用：统一卡片外壳、语义标签和常用状态类。
- 当前支持的 tone：item、market、auction、npc、world、combat。
- 常用状态：standout、muted、class-name。

### UiCardHeader

- 路径：src/components/ui/UiCardHeader.vue
- 作用：统一卡片头部结构。
- 结构约束：
  - 标题和右侧标签尽量同一行。
  - 介绍、说明、状态文案放在头部下方单独成行。
  - 头部左侧只承载 kicker 和 title，不再混入说明段落。
- 常用插槽：aside。

### UiMetricGrid

- 路径：src/components/ui/UiMetricGrid.vue
- 作用：统一摘要指标、状态指标和小型 badge 面板。
- 当前支持的 variant：summary、stat、badge。

### UiPill

- 路径：src/components/ui/UiPill.vue
- 作用：统一 tag、trait-chip、route-pill、rarity、auction-timer、command-chip、command-pill。
- 当前支持的 variant：tag、trait、route、rarity、timer、command-chip、command-pill。
- 当前支持的 tone：common、uncommon、rare、epic、legendary、current、route、cooldown、warning、active、good、steady、warn、recommended。

### UiPillRow

- 路径：src/components/ui/UiPillRow.vue
- 作用：统一 pill 行容器，替代直接手写 inline-list。

### UiActionGroup

- 路径：src/components/ui/UiActionGroup.vue
- 作用：统一卡片内的按钮组容器。
- 当前支持的 variant：item、market、auction、npc、teaching、combat、quick。

### UiActionCardButton

- 路径：src/components/ui/UiActionCardButton.vue
- 作用：统一“主题 + 标题 + 描述”的动作卡按钮。
- 当前主要用于 CommandDetail 和 DockPanel 的手动动作区。

## 已接入范围

- 角色页：PlayerPanel 的 badge 区和 stat 区。
- 人物详情：ProfileDetail 的主卡片头、人物 chip 行和个人记录指标区。
- 主面板：InventoryPanel、MarketPanel、AuctionPanel、IndustryPanel、NpcPanel、WorldPanel、CombatPanel、SectPanel。
- 地图侧栏：LocationDetail 中的秘境卡片、地点 tag 行和门路 route-pill 行。
- 非主面板区域：CommandDetail、DockPanel、PinRail 头部、PlayerPanel 的 tag 行。

## 例外边界

- LocationDetail 的整体信息版式仍是复合信息面板，不强行改成通用卡片列表。
- ProfileDetail 的 profile-fact-grid 仍保留专用布局，因为它承载的是人物事实网格，不是标准摘要卡片。
- PlayerPanel 的 player-header 仍保留专用布局，因为它混合了人物主信息、标签行和进度条，不适合降格成普通卡片头。
- GameDock 的底部热键栏仍保留专用实现，因为它本质上是导航与热键混合控件，不是普通 pill 或卡片动作组。
- HUD 顶栏的 hud-chip 仍保留专用实现，因为它们带有状态仪表语义，不属于面板内 pill 体系。

## 复用规则

1. 只要是“标题 + 右侧标签 + 说明 + 操作区”的卡片，优先使用 UiPanelCard + UiCardHeader。
2. 只要是“标签 + 数值”的摘要区域，优先使用 UiMetricGrid，不再直接手写 summary-grid、stat-grid、badge-row。
3. 只要是标签、chip、状态 pill、计时 pill，优先使用 UiPill + UiPillRow，不再直接手写 tag、trait-chip、route-pill、inline-list。
4. 只要是卡片底部按钮组，优先使用 UiActionGroup，不再直接手写 item-actions、auction-actions、market-actions、npc-actions、teaching-actions、combat-actions。
5. 只要是“主题 + 标题 + 描述”的动作卡按钮，优先使用 UiActionCardButton。
6. 需要页面特例时，优先通过 class-name、head-class、aside-class、button-class 做局部扩展，不新增平行骨架。
7. 若一个区域同时承担复杂版式和多段信息编排，应先判断它是不是复合面板；复合面板允许保留页面级布局，但其内部独立卡片仍应复用公共基元。

## 迁移后的最小写法

```vue
<UiPanelCard tone="item">
  <UiCardHeader title="卡片标题" title-class="item-title">
    <template #aside>
      <UiPill variant="rarity" tone="uncommon">右侧标签</UiPill>
    </template>
  </UiCardHeader>
  <p class="item-meta">说明单独一行。</p>
  <UiActionGroup>
    <button class="item-button">操作</button>
  </UiActionGroup>
</UiPanelCard>
```

```vue
<UiMetricGrid
  variant="summary"
  :items="[
    { label: '本地声望', value: standing },
    { label: '现银', value: money },
  ]"
/>
```

```vue
<UiPillRow>
  <UiPill variant="trait">灵石 120</UiPill>
  <UiPill variant="trait" tone="warning">还差 12</UiPill>
  <UiPill variant="route">可前往</UiPill>
</UiPillRow>
```

```vue
<UiActionGroup variant="quick" class-name="command-action-grid">
  <UiActionCardButton
    button-class="command-action-card"
    theme-class="command-action-theme"
    theme="探风闻"
    title="追查机缘"
    description="跑一趟差事，碰碰风闻与奇遇。"
  />
</UiActionGroup>
```