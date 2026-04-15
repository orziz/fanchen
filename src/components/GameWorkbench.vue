<template>
  <div class="v3-workbench">
    <!-- 山河图：全屏地图面板 -->
    <MapPanel v-if="activeTab === 'map'" class="v3-panel-full" />

    <!-- 其余常规面板 -->
    <div v-else class="v3-panel-body">
      <div v-show="activeTab === 'inventory'"><InventoryPanel /></div>
      <div v-show="activeTab === 'industry'"><IndustryPanel /></div>
      <div v-show="activeTab === 'market'"><MarketPanel /></div>
      <div v-show="activeTab === 'auction'"><AuctionPanel /></div>
      <div v-show="activeTab === 'combat'"><CombatPanel /></div>
      <div v-show="activeTab === 'npcs'"><NpcPanel /></div>
      <div v-show="activeTab === 'sect'"><SectPanel /></div>
      <div v-show="activeTab === 'world'"><WorldPanel /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useStage } from '@/composables/useStage'
import MapPanel from './MapPanel.vue'
import InventoryPanel from './panels/InventoryPanel.vue'
import IndustryPanel from './panels/IndustryPanel.vue'
import MarketPanel from './panels/MarketPanel.vue'
import AuctionPanel from './panels/AuctionPanel.vue'
import CombatPanel from './panels/CombatPanel.vue'
import NpcPanel from './panels/NpcPanel.vue'
import SectPanel from './panels/SectPanel.vue'
import WorldPanel from './panels/WorldPanel.vue'

const { activeTab } = useStage()
</script>
