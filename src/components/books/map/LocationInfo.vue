<template>
  <aside class="location-info">
    <header class="location-info__head">
      <h3 class="location-info__name">{{ selected.name }}</h3>
      <p class="location-info__sub">{{ selected.region }} · {{ selected.terrain }}</p>
      <div class="location-info__tags">
        <span class="tag tag--azure" data-tip="灵气越浓，修炼与冲关越顺">灵气 {{ selected.aura }}</span>
        <span class="tag" :class="selected.danger >= 5 ? 'tag--danger' : selected.danger >= 3 ? 'tag--gold' : ''" data-tip="险度越高，收获与遭遇越多">险 {{ selected.danger }}</span>
        <span class="tag">市集 {{ selected.marketTier || 0 }} 阶</span>
        <span v-if="selected.actions.includes('breakthrough')" class="tag tag--jade" data-tip="此地可冲击下一重境界">可冲关</span>
      </div>
    </header>

    <p class="location-info__desc">{{ selected.desc }}</p>

    <section class="journey-card" :class="{ 'is-current': isCurrent, 'is-blocked': !isCurrent && !reachable }">
      <span class="journey-card__kicker">{{ journeyTag }}</span>
      <p class="journey-card__text">{{ journeySummary }}</p>
      <button v-if="!isCurrent" class="ink-btn ink-btn--primary" type="button" :aria-disabled="!reachable" :data-tip="reachable ? undefined : journeySummary" @click="travel">
        <GameIcon name="travel" />{{ travelLabel }}
      </button>
    </section>

    <section v-if="activeRealm" class="realm-card">
      <span class="realm-card__kicker">异象显世</span>
      <strong class="realm-card__name">{{ activeRealm.name }}</strong>
      <p class="realm-card__desc">{{ activeRealm.desc }}</p>
      <button class="ink-btn ink-btn--danger" type="button" :aria-disabled="!canEnterRealm" :data-tip="realmReason || undefined" @click="challenge">
        {{ isCurrent ? '闯入秘境' : '赶赴并闯入' }}
      </button>
    </section>

    <section class="location-info__section">
      <h4 class="sheet__heading">可做之事</h4>
      <div class="location-info__actions">
        <button v-for="action in selected.actions" :key="action" class="ink-btn ink-btn--small" type="button" :data-tip="isCurrent ? '就地去做' : '赶到后便去做'" @click="doAction(action)">
          <GameIcon :name="iconFor(action)" />{{ actionLabel(action) }}
        </button>
      </div>
    </section>

    <dl class="location-info__facts">
      <div><dt>特产</dt><dd>{{ selected.resource }}</dd></div>
      <div><dt>驻地门路</dt><dd>{{ factionsHere.length ? factionsHere.map(f => f.name).join('、') : '暂无' }}</dd></div>
      <div><dt>地头</dt><dd>{{ territoryHolder }}</dd></div>
      <div><dt>熟面孔</dt><dd>{{ residents.length ? residents.join('、') : '尚无' }}</dd></div>
    </dl>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { ACTION_META, FACTIONS, LOCATION_MAP, REALM_TEMPLATES } from '@/config'
import { iconForAction } from '@/art/icons'
import { getTerritoryState } from '@/systems/social'
import { getTravelPreview, performAction, travelAndAct, travelAndChallengeRealm, travelTo } from '@/systems/world'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { player, world, currentLocation, selectedLocation: selected } = storeToRefs(store)

const preview = computed(() => {
  void world.value.hour
  void player.value.locationId
  return getTravelPreview(selected.value.id)
})
const isCurrent = computed(() => selected.value.id === currentLocation.value.id)
const isHeading = computed(() => player.value.travelPlan?.destinationId === selected.value.id)
const reachable = computed(() => isCurrent.value || Boolean(preview.value.route))

const journeyTag = computed(() => (isCurrent.value ? '身在此地' : isHeading.value ? '正在赶路' : reachable.value ? '可以前往' : '前路受阻'))
const journeySummary = computed(() => {
  if (isCurrent.value) return '此地诸事都可就地去做。'
  if (!reachable.value) return preview.value.blockedReason || '眼下没有能走通的路。'
  const via = preview.value.viaIds.map(id => LOCATION_MAP.get(id)?.name || id).join('、')
  const segments = preview.value.segments <= 1 ? '一程可到' : `共 ${preview.value.segments} 程`
  return via ? `${segments}，途经${via}。每程约半个时辰。` : `${segments}。`
})
const travelLabel = computed(() => (isHeading.value ? '继续赶路' : reachable.value ? `前往${selected.value.name}` : '前路受阻'))

const activeRealm = computed(() => {
  const realmId = selected.value.realmId
  if (!realmId || world.value.realm.activeRealmId !== realmId) return null
  return REALM_TEMPLATES.find(r => r.id === realmId) || null
})
const realmReason = computed(() => (activeRealm.value && player.value.reputation < activeRealm.value.unlockRep ? `声望需 ${activeRealm.value.unlockRep}` : ''))
const canEnterRealm = computed(() => Boolean(activeRealm.value) && !realmReason.value && (isCurrent.value || reachable.value))

const factionsHere = computed(() => FACTIONS.filter(f => selected.value.factionIds?.includes(f.id)))
const territoryHolder = computed(() => {
  const t = getTerritoryState(selected.value.id)
  if (!t) return '无主'
  const pf = player.value.playerFaction
  if (pf && t.controllerId === pf.id) return pf.name
  return FACTIONS.find(f => f.id === t.controllerId)?.name || '散户地头'
})
const residents = computed(() => store.npcs
  .filter(n => n.alive && n.locationId === selected.value.id && player.value.npcIntel[n.id])
  .slice(0, 5)
  .map(n => (player.value.npcIntel[n.id] === 'met' ? n.name : `${n.name}（耳闻）`)))

const actionLabel = (action: string) => ACTION_META[action]?.label || action
const iconFor = (action: string) => iconForAction(action)

function travel() {
  if (!reachable.value || isCurrent.value) {
    sfx.deny()
    return
  }
  sfx.confirm()
  travelTo(selected.value.id)
}

function doAction(action: string) {
  sfx.action()
  if (isCurrent.value) performAction(action)
  else travelAndAct(selected.value.id, action)
}

function challenge() {
  if (!activeRealm.value || !canEnterRealm.value) {
    sfx.deny()
    return
  }
  sfx.confirm()
  travelAndChallengeRealm(activeRealm.value.id)
}
</script>
