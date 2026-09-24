<template>
  <div class="auction-view">
    <p class="sheet__note">拍场随时辰落槌。谁家底厚、谁肯争、谁同你过不去，都写在价码上。你领先的拍品，灵石会被暂扣到落槌。</p>
    <div v-if="lots.length" class="lot-grid">
      <article v-for="lot in lots" :key="lot.id" class="lot-card" :class="[`rarity--${lot.item.rarity}`, { 'is-leading': lot.leading }]">
        <header>
          <span class="lot-card__icon"><GameIcon :name="lot.icon" /></span>
          <div>
            <strong>{{ lot.item.name }}<span v-if="lot.quantity > 1" class="num"> ×{{ lot.quantity }}</span></strong>
            <span class="rarity-label">{{ lot.rarityLabel }}</span>
          </div>
          <span class="lot-card__timer" :class="{ 'is-urgent': lot.turnsLeft <= 2 }">余 {{ lot.turnsLeft }} 轮</span>
        </header>
        <p class="lot-card__desc">{{ lot.item.desc }}</p>
        <dl class="lot-card__facts">
          <div><dt>现价</dt><dd class="num">{{ lot.currentBid }}</dd></div>
          <div><dt>领先</dt><dd :class="{ 'is-you': lot.leading }">{{ lot.leader }}</dd></div>
          <div><dt>卖家</dt><dd>{{ lot.seller }}</dd></div>
        </dl>
        <button class="ink-btn ink-btn--small" :class="{ 'ink-btn--primary': !lot.reason && !lot.leading }" type="button" :aria-disabled="Boolean(lot.reason)" :data-tip="lot.reason || undefined" @click="bid(lot.id, lot.reason)">
          {{ lot.leading ? '再加' : '加价' }} {{ lot.minimumRaise }}
        </button>
      </article>
    </div>
    <p v-else class="empty-note">拍场正在换一批货，稍后再来。</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RARITY_META, getItem } from '@/config'
import { iconForItemType } from '@/art/icons'
import { getBidShortfall, placeBid } from '@/systems/auction'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { auction, player } = storeToRefs(store)

const lots = computed(() => [...auction.value].sort((a, b) => b.currentBid - a.currentBid).flatMap(lot => {
  const item = getItem(lot.itemId)
  if (!item) return []
  const leading = lot.bidderId === 'player'
  void player.value.money
  const shortfall = getBidShortfall(lot.id)
  const reason = shortfall > 0 ? `灵石不够抬价，还差 ${shortfall}` : ''
  const leader = leading ? '你' : lot.bidderId.startsWith('npc-') ? store.getNpc(lot.bidderId)?.name || '某位修士' : '神秘买家'
  return [{ ...lot, item, icon: iconForItemType(item.type), rarityLabel: RARITY_META[item.rarity]?.label || '', leading, leader, reason }]
}))

function bid(id: string, reason: string) {
  if (reason) {
    sfx.deny()
    return
  }
  sfx.coin()
  placeBid(id)
}
</script>
