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
    <div v-for="loc in LOCATIONS" :key="loc.id" :class="['world-card', { standout: isRealmHere(loc.id), 'is-current-card': player.locationId === loc.id }]">
      <div class="world-card-head">
        <div>
          <p class="section-kicker">地点</p>
          <h3 class="world-card-title">{{ loc.name }}</h3>
          <p class="item-meta">{{ loc.region }} · {{ loc.terrain }} · 市集 {{ loc.marketTier || 0 }} 阶</p>
        </div>
        <div class="world-card-status">
          <span v-if="player.locationId === loc.id" class="trait-chip current-chip">你在此地</span>
          <span v-else class="trait-chip route-chip">可前往</span>
          <span v-if="isRealmHere(loc.id)" class="rarity epic">异象活跃</span>
        </div>
      </div>
      <p class="item-meta">灵气 {{ loc.aura }}，风险 {{ loc.danger }}，可在此处理 {{ getActionLine(loc.actions) }}</p>
      <div class="item-actions">
        <button class="item-button" @click="doFocus(loc.id)">查看地图</button>
        <button class="item-button" :class="player.locationId === loc.id ? 'is-current' : 'is-route'" :disabled="player.locationId === loc.id" @click="doTravel(loc.id)">
          {{ player.locationId === loc.id ? '你在此地' : `前往${loc.name}` }}
        </button>
        <button v-if="isRealmHere(loc.id) && activeRealm" class="item-button" :class="{ 'is-route': player.locationId !== loc.id }" @click="doChallenge(activeRealm.id)">
          {{ player.locationId === loc.id ? '挑战秘境' : '赶赴并挑战' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { ACTION_META, LOCATIONS, LOCATION_MAP, REALM_TEMPLATES } from '@/config'
import { round } from '@/utils'
import { useStage } from '@/composables/useStage'
import { travelTo } from '@/systems/world'
import { challengeRealm } from '@/systems/combat'

const store = useGameStore()
const { player, world, selectedLocationId } = storeToRefs(store)
const { setTab } = useStage()

const activeRealm = computed(() => {
  const id = world.value.realm.activeRealmId
  return id ? REALM_TEMPLATES.find(r => r.id === id) || null : null
})

function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }

function isRealmHere(locId: string) {
  return activeRealm.value?.locationId === locId
}

function getActionLine(actions: string[]) {
  return actions.map(action => ACTION_META[action]?.label || action).join('、')
}

function doFocus(locId: string) {
  selectedLocationId.value = locId
  store.appendLog(`山河图已标出${getLocationName(locId)}。`, 'action')
  setTab('map')
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
