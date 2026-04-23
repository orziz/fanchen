<template>
  <div class="v3-shell-wrapper">
    <div class="v3-shell">
      <!-- 顶部 HUD 栏 -->
      <HudBar />

      <!-- 中间内容区：主场景 + 右侧导轨 -->
      <div class="v3-body">
        <div class="v3-stage-wrap" :class="{ 'has-context': contextPanels.length > 0 }">
          <!-- 上下文关联副栏（市场/拍卖行 → 背包；战斗/势力 → 角色状态）-->
          <aside v-if="contextPanels.length" class="v3-context-col">
            <PlayerPanel v-if="contextPanels.includes('player-stats')" />
            <InventoryPanel v-if="contextPanels.includes('inventory')" class="v3-ctx-inventory" />
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStage } from '@/composables/useStage'
import HudBar from '@/components/v1/HudBar.vue'
import GameWorkbench from '@/components/v1/GameWorkbench.vue'
import GameDock from '@/components/v1/GameDock.vue'
import PinRail from '@/components/v1/PinRail.vue'
import PlayerPanel from '@/components/v1/PlayerPanel.vue'
import InventoryPanel from '@/components/panels/InventoryPanel.vue'

const { contextPanels } = useStage()
</script>
