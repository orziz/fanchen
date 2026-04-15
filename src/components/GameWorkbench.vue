<template>
  <div class="workbench-head">
    <div>
      <p class="section-kicker">行程总览</p>
      <h2>凡尘谋局台</h2>
      <p class="workbench-subtitle">先看行囊、商路、门路与官契，再决定是远游九州、闯秘境，还是把今天这一趟生意做透。</p>
    </div>
    <div class="workbench-tools">
      <div class="tool-row">
        <button class="control-button ghost" data-open-window="command" type="button" @click="toggleWindow('command')">{{ getModeLabel(player.mode) }}</button>
        <button class="control-button ghost" type="button" @click="toggleWindow('map')">打开山河图</button>
        <button class="control-button ghost" type="button" @click="toggleWindow('journal')">打开纪事</button>
        <button class="control-button ghost" type="button" @click="toggleWindow('profile')">打开人物簿</button>
        <button class="control-button ghost" type="button" @click="focusPlayer">定位主角</button>
      </div>
    </div>
  </div>

  <nav class="tab-strip">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="tab-button"
      :class="{ active: selectedTab === tab.id }"
      type="button"
      @click="selectedTab = tab.id"
    >{{ tab.label }}</button>
  </nav>

  <section class="tab-panels">
    <article :class="['tab-panel', { active: selectedTab === 'inventory' }]">
      <InventoryPanel />
    </article>
    <article :class="['tab-panel', { active: selectedTab === 'industry' }]">
      <IndustryPanel />
    </article>
    <article :class="['tab-panel', { active: selectedTab === 'market' }]">
      <MarketPanel />
    </article>
    <article :class="['tab-panel', { active: selectedTab === 'auction' }]">
      <AuctionPanel />
    </article>
    <article :class="['tab-panel', { active: selectedTab === 'combat' }]">
      <CombatPanel />
    </article>
    <article :class="['tab-panel', { active: selectedTab === 'npcs' }]">
      <NpcPanel />
    </article>
    <article :class="['tab-panel', { active: selectedTab === 'sect' }]">
      <SectPanel />
    </article>
    <article :class="['tab-panel', { active: selectedTab === 'world' }]">
      <WorldPanel />
    </article>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useWindows } from '@/composables/useWindows'
import { getModeLabel } from '@/composables/useUIHelpers'
import InventoryPanel from './panels/InventoryPanel.vue'
import IndustryPanel from './panels/IndustryPanel.vue'
import MarketPanel from './panels/MarketPanel.vue'
import AuctionPanel from './panels/AuctionPanel.vue'
import CombatPanel from './panels/CombatPanel.vue'
import NpcPanel from './panels/NpcPanel.vue'
import SectPanel from './panels/SectPanel.vue'
import WorldPanel from './panels/WorldPanel.vue'

const store = useGameStore()
const { player, selectedLocationId } = storeToRefs(store)
const { toggleWindow, openWindow } = useWindows()

const selectedTab = ref('inventory')

const tabs = [
  { id: 'inventory', label: '行囊与功法' },
  { id: 'industry', label: '产业经营' },
  { id: 'market', label: '商店与行商' },
  { id: 'auction', label: '拍卖行' },
  { id: 'combat', label: '战斗与秘境' },
  { id: 'npcs', label: '江湖群像' },
  { id: 'sect', label: '势力与山门' },
  { id: 'world', label: '天机簿' },
]

function focusPlayer() {
  selectedLocationId.value = player.value.locationId
  openWindow('map')
}

defineExpose({ selectedTab })
</script>
