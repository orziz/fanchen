<template>
  <div class="task-board">
    <p class="sheet__note">各地行会挂出的收货单，备齐了货就能交付领赏。单子过些时日会换一批。</p>
    <div v-if="orders.length" class="task-grid">
      <article v-for="order in orders" :key="order.id" class="task-card" :class="{ 'is-ready': order.ok }">
        <header>
          <GameIcon name="scroll" />
          <strong>{{ order.title }}</strong>
          <span class="tag" :class="order.ok ? 'tag--jade' : ''">{{ order.ok ? '可交' : '未齐' }}</span>
        </header>
        <p class="task-card__desc">{{ order.factionName }} · {{ order.desc }}</p>
        <ul class="req-list">
          <li v-for="req in order.reqs" :key="req.itemId" :class="{ 'is-met': req.have >= req.need }">
            <GameIcon :name="req.have >= req.need ? 'check' : 'close'" />
            <span>{{ req.name }}</span>
            <span class="req-list__value num">{{ req.have }}/{{ req.need }}</span>
          </li>
        </ul>
        <footer>
          <span class="task-card__reward">灵石 +{{ order.rewardMoney }} · 声望 +{{ order.rewardReputation }}</span>
          <button class="ink-btn ink-btn--small" :class="{ 'ink-btn--primary': order.ok }" type="button" :aria-disabled="!order.ok" :data-tip="order.ok ? undefined : order.issue" @click="fulfill(order.id, order.ok)">交付</button>
        </footer>
      </article>
    </div>
    <p v-else class="empty-note">行会正在换单，过几个时辰再来。</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { getItem } from '@/config'
import { canFulfillIndustryOrder, explainIndustryOrder, fulfillIndustryOrder, refreshIndustryOrders } from '@/systems/industryOrders'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { player, world } = storeToRefs(store)

const orders = computed(() => {
  void player.value.inventory
  void world.value.day
  return refreshIndustryOrders().map(order => ({
    ...order,
    ok: canFulfillIndustryOrder(order.id),
    issue: explainIndustryOrder(order.id),
    reqs: order.requirements.map(r => ({ itemId: r.itemId, name: getItem(r.itemId)?.name || r.itemId, need: r.quantity, have: store.findInventoryEntry(r.itemId)?.quantity || 0 })),
  }))
})

function fulfill(id: string, ok: boolean) {
  if (!ok) { sfx.deny(); return }
  sfx.coin()
  fulfillIndustryOrder(id)
}
</script>
