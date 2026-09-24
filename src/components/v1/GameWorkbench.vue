<template>
  <div class="v3-workbench">
    <MapPanel v-if="activeTab === 'map'" class="v3-panel-full" />
    <div v-else class="v3-panel-body">
      <component :is="activePanel" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useStage, type StageTab } from '@/composables/useStage'
import StoryTaskPanel from '@/components/panels/StoryTaskPanel.vue'
import InventoryPanel from '@/components/panels/InventoryPanel.vue'
import IndustryPanel from '@/components/panels/IndustryPanel.vue'
import MarketPanel from '@/components/panels/MarketPanel.vue'
import AuctionPanel from '@/components/panels/AuctionPanel.vue'
import CombatPanel from '@/components/panels/CombatPanel.vue'
import NpcPanel from '@/components/panels/NpcPanel.vue'
import SectPanel from '@/components/panels/SectPanel.vue'
import WorldPanel from '@/components/panels/WorldPanel.vue'
import MapPanel from '@/components/panels/MapPanel.vue'

const PANEL_COMPONENTS: Record<Exclude<StageTab, 'map'>, Component> = {
  story: StoryTaskPanel,
  inventory: InventoryPanel,
  industry: IndustryPanel,
  market: MarketPanel,
  auction: AuctionPanel,
  combat: CombatPanel,
  npcs: NpcPanel,
  sect: SectPanel,
  world: WorldPanel,
}

const { activeTab } = useStage()
const activePanel = computed(() => PANEL_COMPONENTS[activeTab.value as Exclude<StageTab, 'map'>])
</script>
