<template>
  <p class="panel-intro">拍场随时辰落槌。谁有家底、谁肯争、谁和你过不去，都会体现在价码上。</p>
  <div class="auction-list">
    <template v-if="sortedAuction.length">
      <UiPanelCard v-for="listing in sortedAuction" :key="listing.id" tone="auction">
        <UiCardHeader :title="itemOf(listing.itemId).name" title-class="auction-title">
          <template #aside>
            <UiPill variant="rarity" :tone="RARITY_META[itemOf(listing.itemId).rarity].color">{{ RARITY_META[itemOf(listing.itemId).rarity].label }}</UiPill>
          </template>
        </UiCardHeader>
        <p class="auction-meta">{{ itemOf(listing.itemId).desc }}</p>
        <UiPillRow>
          <UiPill variant="timer">当前价 {{ listing.currentBid }}</UiPill>
          <UiPill variant="timer">领先者 {{ getBidLeader(listing) }}</UiPill>
          <UiPill variant="timer">剩余 {{ listing.turnsLeft }} 回合</UiPill>
        </UiPillRow>
        <p class="auction-meta">卖家：{{ listing.seller }}</p>
        <UiActionGroup variant="auction">
          <button class="item-button" @click="doBid(listing.id)">加价 {{ listing.minimumRaise }}</button>
        </UiActionGroup>
      </UiPanelCard>
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
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

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
