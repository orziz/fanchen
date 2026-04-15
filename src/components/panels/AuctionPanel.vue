<template>
  <p class="panel-intro">拍场随时辰落槌。谁有家底、谁肯争、谁和你过不去，都会体现在价码上。</p>
  <div class="auction-list">
    <template v-if="sortedAuction.length">
      <div v-for="listing in sortedAuction" :key="listing.id" class="auction-card">
        <div class="auction-top">
          <div>
            <h3 class="auction-title">{{ itemOf(listing.itemId).name }}</h3>
            <p class="auction-meta">{{ itemOf(listing.itemId).desc }}</p>
          </div>
          <span :class="['rarity', RARITY_META[itemOf(listing.itemId).rarity].color]">{{ RARITY_META[itemOf(listing.itemId).rarity].label }}</span>
        </div>
        <div class="inline-list">
          <span class="auction-timer">当前价 {{ listing.currentBid }}</span>
          <span class="auction-timer">领先者 {{ getBidLeader(listing) }}</span>
          <span class="auction-timer">剩余 {{ listing.turnsLeft }} 回合</span>
        </div>
        <p class="auction-meta">卖家：{{ listing.seller }}</p>
        <div class="auction-actions">
          <button class="item-button" @click="doBid(listing.id)">加价 {{ listing.minimumRaise }}</button>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">拍卖场正在换批次，请稍后再看。</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RARITY_META, getItem } from '@/config'
import { placeBid } from '@/systems/auction'

const store = useGameStore()
const { auction } = storeToRefs(store)

const sortedAuction = computed(() =>
  [...auction.value].sort((a, b) => b.currentBid - a.currentBid)
)

function itemOf(itemId: string) { return getItem(itemId)! }

function getBidLeader(listing: { bidderId: string }) {
  if (listing.bidderId === 'player') return '你'
  if (listing.bidderId.startsWith('npc-')) {
    return store.getNpc(listing.bidderId)?.name || '某位修士'
  }
  return '神秘买家'
}

function doBid(id: string) { placeBid(id) }
</script>
