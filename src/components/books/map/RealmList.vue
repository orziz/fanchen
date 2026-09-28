<template>
  <div class="realm-list">
    <p class="sheet__note">秘境随天象时隐时现，一处显世时方可闯入；首领守关，退路封死，胜则满载而归。</p>
    <article v-for="realm in realms" :key="realm.id" class="realm-row" :class="{ 'is-active': realm.active, 'is-locked': realm.locked }">
      <div class="realm-row__seal"><GameIcon :name="realm.active ? 'storm' : 'relic'" /></div>
      <div class="realm-row__body">
        <header>
          <strong>{{ realm.name }}</strong>
          <span class="tag" :class="realm.active ? 'tag--danger' : ''">{{ realm.active ? '正在显世' : realm.cleared ? `已破 ${realm.cleared} 回` : '沉寂' }}</span>
          <span class="tag">{{ realm.locationName }}</span>
          <span class="tag" :class="realm.locked ? 'tag--gold' : 'tag--jade'">声望 {{ realm.unlockRep }}</span>
        </header>
        <p>{{ realm.desc }}</p>
        <p class="realm-row__boss">守关：{{ realm.bossName }} · 战利：{{ realm.rewards }}</p>
      </div>
      <button v-if="realm.active" class="ink-btn ink-btn--danger" type="button" :aria-disabled="realm.locked" :data-tip="realm.locked ? `声望需 ${realm.unlockRep}，眼下还进不去` : realm.here ? '去“此地”一栏里闯入' : undefined" @click="challenge(realm.locationId, realm.locked, realm.here)">
        {{ realm.here ? '就在此地' : '赶赴' }}
      </button>
    </article>
    <p v-if="lastResult" class="realm-list__last">最近一战：{{ lastResult.outcome === 'victory' ? '胜' : '败' }} · {{ lastResult.enemy }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP, REALM_TEMPLATES, getItem } from '@/config'
import { startTravel } from '@/systems/life/activities'
import { useBooks } from '@/composables/useBooks'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { player, world, combat } = storeToRefs(store)
const lastResult = computed(() => combat.value.lastResult)
const { closeBook } = useBooks()

const realms = computed(() => REALM_TEMPLATES.map(realm => ({
  id: realm.id,
  name: realm.name,
  desc: realm.desc,
  unlockRep: realm.unlockRep,
  bossName: realm.boss.name,
  locationId: realm.locationId,
  locationName: LOCATION_MAP.get(realm.locationId)?.name || realm.locationId,
  rewards: [`灵石 ${realm.rewards.money}`, ...realm.rewards.items.map(id => getItem(id)?.name || id)].join('、'),
  active: world.value.realm.activeRealmId === realm.id,
  here: player.value.locationId === realm.locationId,
  locked: player.value.reputation < realm.unlockRep,
  cleared: world.value.realm.bossVictories.filter(id => id === realm.id).length,
})))

function challenge(locationId: string, locked: boolean, here: boolean) {
  if (locked) {
    sfx.deny()
    return
  }
  sfx.confirm()
  closeBook()
  if (!here) startTravel(locationId)
}
</script>
