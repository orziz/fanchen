<template>
  <div class="inventory-panel">
    <p class="panel-intro">行囊里装着兵刃、护具、功法和契物，随时能拿来撑住你的修行、营生与宗门根基。</p>

    <div class="inventory-grid">
      <UiPanelCard v-for="(slot, key) in player.equipment" :key="key" tone="item">
        <UiCardHeader :kicker="equipLabel[key as string]" :title="equipItem(slot)?.name || '未装备'" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" :tone="equipItem(slot) ? RARITY_META[equipItem(slot)!.rarity].color : 'common'">
              {{ equipItem(slot) ? RARITY_META[equipItem(slot)!.rarity].label : '空位' }}
            </UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">{{ equipItem(slot)?.desc || '对应类型的物品可以在这里装备或参悟。' }}</p>
        <p class="item-meta">{{ describeItemEffect(equipItem(slot)) }}</p>
      </UiPanelCard>
    </div>

    <h3 class="subsection-title">行囊</h3>
    <div class="inventory-grid">
      <template v-if="sortedInventory.length">
        <UiPanelCard v-for="entry in sortedInventory" :key="entry.itemId" tone="item">
          <UiCardHeader :title="`${itemOf(entry).name} x${entry.quantity}`" title-class="item-title">
            <template #aside>
              <UiPill variant="rarity" :tone="RARITY_META[itemOf(entry).rarity].color">{{ RARITY_META[itemOf(entry).rarity].label }}</UiPill>
            </template>
          </UiCardHeader>
          <p class="item-meta">{{ itemOf(entry).desc }}</p>
          <p class="item-meta">效果：{{ describeItemEffect(itemOf(entry)) || '可在交易、建宗或战斗中使用。' }}</p>
          <UiActionGroup>
            <button class="item-button" @click="doConsume(entry.itemId)">
              {{ ['weapon', 'armor', 'manual'].includes(itemOf(entry).type) ? '装备 / 参悟' : '使用' }}
            </button>
            <button class="item-button" @click="doSell(entry.itemId)">出售一件</button>
            <button v-if="player.sect && itemOf(entry).type === 'manual'" class="item-button" @click="doStash(entry.itemId)">收入藏经阁</button>
          </UiActionGroup>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">你的行囊暂时空空如也，出去历练或做生意吧。</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RARITY_META, getItem } from '@/config'
import { describeItemEffect } from '@/composables/useUIHelpers'
import { consumeItem, sellItem, stashManualToSect } from '@/systems/player'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'

const store = useGameStore()
const { player } = storeToRefs(store)

const equipLabel: Record<string, string> = { weapon: '兵器', armor: '护甲', manual: '功法' }

function equipItem(itemId: string | null) {
  return itemId ? getItem(itemId) : null
}

function itemOf(entry: { itemId: string }) {
  return getItem(entry.itemId)!
}

const sortedInventory = computed(() =>
  [...player.value.inventory].sort((a, b) => (getItem(b.itemId)?.baseValue || 0) - (getItem(a.itemId)?.baseValue || 0))
)

function doConsume(itemId: string) { consumeItem(itemId) }
function doSell(itemId: string) { sellItem(itemId) }
function doStash(itemId: string) { stashManualToSect(itemId) }
</script>
