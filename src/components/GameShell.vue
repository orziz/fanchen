<template>
  <div class="backdrop"></div>
  <div class="v3-shell-wrapper">
    <div class="v3-shell">
      <!-- 顶部 HUD 栏 -->
      <HudBar />

      <!-- 中间内容区：主场景 + 右侧导轨 -->
      <div class="v3-body">
        <div class="v3-stage-wrap" :class="{ 'has-context': !!contextType }">
          <!-- 上下文关联副栏（市场/拍卖行 → 背包；战斗/势力 → 角色状态）-->
          <aside v-if="contextType" class="v3-context-col">
            <PlayerPanel v-if="contextType === 'player-stats'" />
            <InventoryPanel v-else-if="contextType === 'inventory'" class="v3-ctx-inventory" />
          </aside>

          <!-- 主舞台 -->
          <section class="v3-stage">
            <GameWorkbench />
          </section>
        </div>

        <!-- 右侧导轨挂载区 -->
        <PinRail />
      </div>

      <!-- 底部导航 Dock -->
      <GameDock />

      <StoryOverlay />

      <!-- 全局提示 -->
      <ToastStack />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStage } from '@/composables/useStage'
import HudBar from './HudBar.vue'
import GameWorkbench from './GameWorkbench.vue'
import GameDock from './GameDock.vue'
import PinRail from './PinRail.vue'
import PlayerPanel from './PlayerPanel.vue'
import StoryOverlay from './StoryOverlay.vue'
import ToastStack from './ToastStack.vue'
import InventoryPanel from './panels/InventoryPanel.vue'

const { contextType } = useStage()
</script>
