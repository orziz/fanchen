<template>
  <p class="panel-intro">行囊里装着兵刃、护具、功法和契物，随时能拿来撑住你的修行、营生与山门根基。</p>

  <div class="inventory-grid">
    <div v-for="(slot, key) in player.equipment" :key="key" class="item-card">
      <div class="item-top">
        <div>
          <p class="section-kicker">{{ equipLabel[key as string] }}</p>
          <h3 class="item-title">{{ equipItem(slot)?.name || '未装备' }}</h3>
          <p class="item-meta">{{ equipItem(slot)?.desc || '对应类型的物品可以在这里装备或参悟。' }}</p>
        </div>
        <span :class="['rarity', equipItem(slot) ? RARITY_META[equipItem(slot)!.rarity].color : 'common']">
          {{ equipItem(slot) ? RARITY_META[equipItem(slot)!.rarity].label : '空位' }}
        </span>
      </div>
      <p class="item-meta">{{ describeItemEffect(equipItem(slot)) }}</p>
    </div>
  </div>

  <h3 class="subsection-title">行囊</h3>
  <div class="inventory-grid">
    <template v-if="sortedInventory.length">
      <div v-for="entry in sortedInventory" :key="entry.itemId" class="item-card">
        <div class="item-top">
          <div>
            <h3 class="item-title">{{ itemOf(entry).name }} x{{ entry.quantity }}</h3>
            <p class="item-meta">{{ itemOf(entry).desc }}</p>
          </div>
          <span :class="['rarity', RARITY_META[itemOf(entry).rarity].color]">{{ RARITY_META[itemOf(entry).rarity].label }}</span>
        </div>
        <p class="item-meta">效果：{{ describeItemEffect(itemOf(entry)) || '可在交易、建宗或战斗中使用。' }}</p>
        <div class="item-actions">
          <button class="item-button" @click="doConsume(entry.itemId)">
            {{ ['weapon', 'armor', 'manual'].includes(itemOf(entry).type) ? '装备 / 参悟' : '使用' }}
          </button>
          <button class="item-button" @click="doSell(entry.itemId)">出售一件</button>
          <button v-if="player.sect && itemOf(entry).type === 'manual'" class="item-button" @click="doStash(entry.itemId)">收入藏经阁</button>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">你的行囊暂时空空如也，出去历练或做生意吧。</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RARITY_META, getItem } from '@/config'
import { describeItemEffect } from '@/composables/useUIHelpers'
import { consumeItem, sellItem, stashManualToSect } from '@/systems/player'

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
