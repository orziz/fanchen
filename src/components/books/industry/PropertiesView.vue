<template>
  <div class="task-board">
    <p class="sheet__note">{{ currentLocation.name }}能落到你名下的产业。置业要看此地风气与门路，有的只认特定势力的人。</p>
    <div v-if="properties.length" class="task-grid">
      <article v-for="prop in properties" :key="prop.id" class="task-card" :class="{ 'is-ready': prop.ok }">
        <header>
          <GameIcon :name="prop.icon" />
          <strong>{{ prop.label }}</strong>
          <span class="tag tag--gold num">{{ prop.cost }} 灵石</span>
        </header>
        <p class="task-card__desc">{{ prop.desc }}</p>
        <p v-if="!prop.ok" class="task-card__gap">{{ prop.issue }}</p>
        <footer>
          <span class="task-card__reward">{{ prop.kindLabel }}</span>
          <button class="ink-btn ink-btn--small" :class="{ 'ink-btn--primary': prop.ok }" type="button" :aria-disabled="!prop.ok" :data-tip="prop.ok ? undefined : prop.issue" @click="buy(prop.id, prop.ok)">置办</button>
        </footer>
      </article>
    </div>
    <p v-else class="empty-note">此地没有可置办的产业，到市镇、州府或工坊聚集处看看。</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { canPurchaseProperty, explainPropertyPurchase, getLocalProperties, purchaseProperty } from '@/systems/industry'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { player, currentLocation } = storeToRefs(store)

const KIND: Record<string, { label: string; icon: string }> = {
  farm: { label: '田产', icon: 'grain' },
  workshop: { label: '工坊', icon: 'tool' },
  shop: { label: '铺面', icon: 'market' },
  warehouse: { label: '仓房', icon: 'bag' },
}

const properties = computed(() => {
  void player.value.money
  void currentLocation.value.id
  return getLocalProperties().map(prop => ({
    ...prop,
    icon: KIND[prop.kind]?.icon || 'industry',
    kindLabel: KIND[prop.kind]?.label || '产业',
    ok: canPurchaseProperty(prop.id),
    issue: explainPropertyPurchase(prop.id),
  }))
})

function buy(id: string, ok: boolean) {
  if (!ok) { sfx.deny(); return }
  sfx.coin()
  purchaseProperty(id)
}
</script>
