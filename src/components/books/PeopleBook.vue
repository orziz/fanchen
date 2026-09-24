<template>
  <BookFrame title="人情" icon="people">
    <template #head>
      <button class="ink-btn ink-btn--small" type="button" :aria-disabled="!venues.teahouse.ok" :data-tip="venues.teahouse.reason" @click="rumor('teahouse')">茶馆听闲话</button>
      <button class="ink-btn ink-btn--small" type="button" :aria-disabled="!venues.tavern.ok" :data-tip="venues.tavern.reason" @click="rumor('tavern')">酒馆探热闹</button>
    </template>
    <div v-if="people.length" class="split-view">
      <ul class="split-view__list">
        <li v-for="person in people" :key="person.id">
          <button class="list-row" :class="{ 'is-selected': person.id === selectedId }" type="button" @click="select(person.id)">
            <SealAvatar :name="person.known ? person.name : '？'" :seed="person.id" size="sm" />
            <span class="list-row__main">
              <strong>{{ person.known ? person.name : '面生之人' }}</strong>
              <span>{{ person.met ? `${person.profession} · ${person.locationName}` : person.known ? `只闻其名 · ${person.locationName}` : `眼下在${person.locationName}` }}</span>
            </span>
            <span v-if="person.role !== 'none'" class="tag tag--gold">{{ person.roleLabel }}</span>
            <span v-else-if="person.here" class="tag tag--jade">在此</span>
          </button>
        </li>
      </ul>
      <NpcDetail v-if="selectedId" :key="selectedId" class="split-view__detail" :npc-id="selectedId" />
    </div>
    <div v-else class="empty-hero">
      <GameIcon name="people" />
      <h3>尚未结识什么人</h3>
      <p>赶到人前照个面，或去茶馆酒肆打听几句，江湖上的人物便会渐渐记在这里。</p>
    </div>
  </BookFrame>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP } from '@/config'
import { getRoleLabel } from '@/composables/useUIHelpers'
import { canGatherNpcRumors, explainNpcRumors } from '@/systems/npc'
import { gatherVenueRumors } from '@/systems/rumors'
import { sfx } from '@/audio/sfx'
import BookFrame from '@/components/books/BookFrame.vue'
import GameIcon from '@/components/common/GameIcon.vue'
import SealAvatar from '@/components/common/SealAvatar.vue'
import NpcDetail from '@/components/books/people/NpcDetail.vue'

const store = useGameStore()
const { npcs, player, world } = storeToRefs(store)
const selectedId = ref<string | null>(null)

/** 见过的人都在册；没见过但此刻就在眼前的人，以“面生之人”列出。 */
const people = computed(() => npcs.value
  .filter(npc => npc.alive && (player.value.npcIntel[npc.id] === 'met' || player.value.npcIntel[npc.id] === 'heard' || npc.locationId === player.value.locationId))
  .map(npc => {
    const relation = player.value.relations[npc.id]
    const role = relation?.role || 'none'
    return {
      id: npc.id,
      name: npc.name,
      met: player.value.npcIntel[npc.id] === 'met',
      known: Boolean(player.value.npcIntel[npc.id]),
      profession: npc.profession || npc.title,
      locationName: LOCATION_MAP.get(npc.locationId)?.name || npc.locationId,
      here: npc.locationId === player.value.locationId,
      role,
      roleLabel: getRoleLabel(role),
      affinity: relation?.affinity || 0,
    }
  })
  .sort((a, b) => Number(b.here) - Number(a.here) || Number(b.met) - Number(a.met) || b.affinity - a.affinity))

watch(people, list => {
  if (!list.some(person => person.id === selectedId.value)) selectedId.value = list[0]?.id || null
}, { immediate: true })

const venues = computed(() => {
  void world.value.hour
  void player.value.money
  return {
    teahouse: { ok: canGatherNpcRumors('teahouse'), reason: explainNpcRumors('teahouse') },
    tavern: { ok: canGatherNpcRumors('tavern'), reason: explainNpcRumors('tavern') },
  }
})

function select(id: string) {
  sfx.page()
  selectedId.value = id
}

function rumor(venue: 'teahouse' | 'tavern') {
  if (!venues.value[venue].ok) {
    sfx.deny()
    return
  }
  sfx.coin()
  gatherVenueRumors(venue)
}
</script>
