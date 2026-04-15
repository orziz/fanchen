<template>
  <p class="panel-intro">天机簿汇总天气、异象、各地资源与秘境动向，方便你决定挂机策略和路线。</p>

  <div class="summary-grid">
    <div class="summary-box"><span>今日天候</span><strong>{{ world.weather }}</strong></div>
    <div class="summary-box"><span>异象征兆</span><strong>{{ world.omen }}</strong></div>
    <div class="summary-box"><span>商帮好感</span><strong>{{ round(world.factionFavor.merchants, 1) }}</strong></div>
    <div class="summary-box"><span>朝廷声望</span><strong>{{ round(world.factionFavor.court, 1) }}</strong></div>
    <div class="summary-box"><span>本地声望</span><strong>{{ round(store.getRegionStanding(player.locationId), 1) }}</strong></div>
    <div class="summary-box"><span>活跃地点</span><strong>{{ LOCATIONS.length }}</strong></div>
  </div>

  <!-- Active realm -->
  <template v-if="activeRealm">
    <h3 class="subsection-title">活跃秘境</h3>
    <div class="combat-card standout">
      <div class="auction-top">
        <div>
          <h3 class="auction-title">{{ activeRealm.name }}</h3>
          <p class="auction-meta">{{ activeRealm.desc }}</p>
        </div>
        <span class="rarity epic">{{ getLocationName(activeRealm.locationId) }}</span>
      </div>
      <div class="auction-actions">
        <button class="item-button" @click="doChallenge(activeRealm.id)">
          {{ player.locationId === activeRealm.locationId ? '立即挑战' : '赶赴并挑战' }}
        </button>
      </div>
    </div>
  </template>

  <!-- All locations -->
  <h3 class="subsection-title">九州总览</h3>
  <div class="world-grid">
    <div v-for="loc in LOCATIONS" :key="loc.id" :class="['world-card', { standout: isRealmHere(loc.id) }]">
      <span>{{ loc.name }}</span>
      <strong>{{ loc.region }}</strong>
      <p class="item-meta">灵气 {{ loc.aura }}，风险 {{ loc.danger }}，市集 {{ loc.marketTier || 0 }} 阶</p>
      <div class="item-actions">
        <button class="item-button" @click="doFocus(loc.id)">查看地图</button>
        <button class="item-button" :disabled="player.locationId === loc.id" @click="doTravel(loc.id)">
          {{ player.locationId === loc.id ? '你在此地' : `前往${loc.short}` }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATIONS, LOCATION_MAP, REALM_TEMPLATES } from '@/config'
import { round } from '@/utils'
import { useWindows } from '@/composables/useWindows'
import { travelTo } from '@/systems/world'
import { challengeRealm } from '@/systems/combat'

const store = useGameStore()
const { player, world, selectedLocationId } = storeToRefs(store)
const { openWindow } = useWindows()

const activeRealm = computed(() => {
  const id = world.value.realm.activeRealmId
  return id ? REALM_TEMPLATES.find(r => r.id === id) || null : null
})

function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }

function isRealmHere(locId: string) {
  return activeRealm.value?.locationId === locId
}

function doFocus(locId: string) {
  selectedLocationId.value = locId
  openWindow('map')
}

function doTravel(locId: string) {
  travelTo(locId)
}

function doChallenge(realmId: string) {
  const realm = REALM_TEMPLATES.find(r => r.id === realmId)
  if (!realm) return
  if (player.value.locationId !== realm.locationId) travelTo(realm.locationId)
  challengeRealm(realmId)
}
</script>
