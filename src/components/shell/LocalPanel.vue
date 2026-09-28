<template>
  <section class="side-panel local-panel" :aria-label="`${location.name}的机缘与熟人`">
    <header class="local-panel__head">
      <span class="local-panel__kicker">此地</span>
      <strong>{{ location.name }}</strong>
      <span class="local-panel__meta num">灵气 {{ location.aura }} · 险 {{ location.danger }}</span>
    </header>

    <div class="local-panel__section">
      <h4>本旬机缘</h4>
      <p v-if="!cards.length" class="local-panel__empty">这一旬此地风平浪静。</p>
      <button
        v-for="card in cards"
        :key="card.id"
        class="opportunity-card"
        type="button"
        :aria-disabled="busy"
        :data-tip="`${card.desc}${card.days ? ` 先耗 ${card.days} 日。` : ''}`"
        :data-tip-title="card.title"
        @click="take(card.id)"
      >
        <span class="opportunity-card__title">{{ card.title }}</span>
        <span class="opportunity-card__reward">{{ card.reward }}</span>
        <span class="opportunity-card__meta num">{{ card.days ? `${card.days}日 · ` : '' }}{{ expiry(card.expiresDay) }}</span>
      </button>
    </div>

    <div class="local-panel__section">
      <h4>此地熟人</h4>
      <p v-if="!people.length" class="local-panel__empty">此地还没有相熟的人。</p>
      <button
        v-for="person in people"
        :key="person.id"
        class="person-row"
        type="button"
        :aria-disabled="busy"
        :data-tip="`${person.title}，${person.age}岁。拜访一次耗一日。`"
        :data-tip-title="person.name"
        @click="visit(person.id)"
      >
        <SealAvatar :name="person.name" size="sm" />
        <span class="person-row__name">{{ person.name }}</span>
        <span class="person-row__meta">{{ person.affinity >= 30 ? '交好' : person.affinity >= 10 ? '相熟' : '初识' }}</span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { opportunitiesAt } from '@/systems/life/opportunities'
import { takeOpportunity, visitPerson } from '@/systems/life/activities'
import { sfx } from '@/audio/sfx'
import SealAvatar from '@/components/common/SealAvatar.vue'

const store = useGameStore()
const { currentLocation: location, world, player } = storeToRefs(store)

const busy = computed(() => Boolean(store.game.life.runner || store.game.life.event || store.combat.currentEnemy || store.game.life.ended))

const cards = computed(() => {
  void world.value.day
  void store.game.life.opportunities[player.value.locationId]?.length
  return opportunitiesAt(player.value.locationId)
})

const people = computed(() => store.npcs
  .filter(npc => npc.alive && npc.locationId === player.value.locationId && player.value.npcIntel[npc.id] === 'met')
  .slice(0, 4)
  .map(npc => ({ id: npc.id, name: npc.name, title: npc.title, age: npc.age, affinity: player.value.relations[npc.id]?.affinity || 0 })))

function expiry(expiresDay: number) {
  const left = expiresDay - world.value.day + 1
  return left <= 10 ? `还剩${left}日` : '两旬内有效'
}

function take(id: string) {
  if (busy.value) { sfx.deny(); return }
  sfx.action()
  takeOpportunity(id)
}

function visit(id: string) {
  if (busy.value) { sfx.deny(); return }
  sfx.page()
  visitPerson(id)
}
</script>
