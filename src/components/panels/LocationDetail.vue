<template>
  <div class="location-detail">
    <div class="location-card location-detail-card">
      <section class="location-head">
        <div class="location-heading-copy">
          <h3 class="location-title">{{ selected.name }}</h3>
          <p class="location-subtitle">{{ locationTypeLine }}</p>
        </div>
        <UiPillRow class-name="location-inline-tags">
          <UiPill v-for="tag in locationTags" :key="tag" variant="tag">{{ tag }}</UiPill>
        </UiPillRow>
        <p class="location-summary">{{ selected.desc }}</p>
      </section>

      <div class="location-fact-grid">
        <div v-for="fact in locationFacts" :key="fact.label" class="location-fact">
          <span>{{ fact.label }}</span>
          <strong>{{ fact.value }}</strong>
        </div>
      </div>

      <section class="location-journey-card" :class="{ 'is-current': isCurrent, 'is-unreachable': !isCurrent && !reachable }">
        <div class="location-journey-copy">
          <p class="section-kicker">{{ journeyTag }}</p>
          <h3 class="location-journey-title">{{ journeyTitle }}</h3>
          <p class="location-meta">{{ journeySummary }}</p>
        </div>
        <button
          class="item-button location-travel-btn"
          :class="{ active: !isCurrent && reachable, 'is-current': isCurrent, 'is-unreachable': !isCurrent && !reachable }"
          :disabled="!canTravel"
          :aria-disabled="!canTravel"
          :title="travelButtonReason"
          @click="canTravel ? onTravel() : undefined"
        >{{ travelButtonLabel }}</button>
      </section>

      <template v-if="activeRealm">
        <div class="divider"></div>
        <UiPanelCard tone="combat" standout>
          <UiCardHeader kicker="首领秘境" :title="activeRealm.name" title-class="location-title">
            <template #aside>
              <UiPill variant="rarity" tone="epic">声望需求 {{ activeRealm.unlockRep }}</UiPill>
            </template>
          </UiCardHeader>
          <p class="location-meta">{{ activeRealm.desc }}</p>
          <div class="location-actions">
            <button class="item-button" @click="onChallengeRealm">{{ isCurrent ? '立即闯入秘境' : '先赶赴此地并挑战' }}</button>
          </div>
        </UiPanelCard>
      </template>

      <div class="divider"></div>
      <section class="location-action-stack">
        <div class="location-action-head">
          <div>
            <p class="section-kicker">当地门路</p>
            <h3 class="location-section-title">可做事务</h3>
          </div>
          <UiPillRow>
            <UiPill v-for="action in selected.actions" :key="action" variant="route">{{ ACTION_META[action]?.label || action }}</UiPill>
            <UiPill v-for="hint in industryHints" :key="hint" variant="route">{{ hint }}</UiPill>
          </UiPillRow>
        </div>

        <div class="location-actions location-actions-secondary">
          <button
            v-for="action in selected.actions" :key="action"
            class="item-button"
            @click="onLocationAction(action)"
          >{{ isCurrent ? `执行${ACTION_META[action]?.label || action}` : `前往后${ACTION_META[action]?.label || action}` }}</button>
        </div>
      </section>

      <div class="location-footer-copy">
        <section class="location-note">
          <p class="section-kicker">常驻人物</p>
          <p class="location-meta">{{ residents.length ? residents.map(n => residentLabel(n)).join('、') : '你还没在此地听说过什么熟面孔。' }}</p>
        </section>
        <section class="location-note">
          <p class="section-kicker">此地门路</p>
          <p class="location-meta">{{ factionsText }}</p>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { ACTION_META, FACTIONS, LOCATION_MAP, REALM_TEMPLATES } from '@/config'
import { formatUnlockLabels } from '@/composables/useUIHelpers'
import { getTerritoryState } from '@/systems/social'
import { getTravelPreview, travelTo, travelAndAct, travelAndChallengeRealm, performAction } from '@/systems/world'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const { player, npcs, world, currentLocation, selectedLocation: selected } = storeToRefs(store)

const travelPreview = computed(() => getTravelPreview(selected.value.id))
const isTravelingHere = computed(() => player.value.travelPlan?.destinationId === selected.value.id)
const isCurrent = computed(() => selected.value.id === currentLocation.value.id)
const reachable = computed(() => isCurrent.value || Boolean(travelPreview.value.route))
const canTravel = computed(() => reachable.value && !isCurrent.value)
const actionLabels = computed(() => selected.value.actions.map(action => ACTION_META[action]?.label || action).join('、'))
const journeyTag = computed(() => {
  if (isCurrent.value) return '所在地'
  if (isTravelingHere.value) return '已定路线'
  return reachable.value ? '可前往' : '前路受阻'
})
const journeyTitle = computed(() => {
  if (isCurrent.value) return '你已在此地'
  if (isTravelingHere.value) return `正沿路赶往${selected.value.name}`
  return reachable.value ? `前往${selected.value.name}` : '当前暂时进不去'
})
const journeySummary = computed(() => {
  if (isCurrent.value) return '你可直接在此地处理风闻、跑差、历练与当地事务。'
  if (!reachable.value) return travelPreview.value.blockedReason || '先打通与周边州县的通路，再来此地落脚。'

  const nextStop = travelPreview.value.nextStopId ? LOCATION_MAP.get(travelPreview.value.nextStopId)?.name || travelPreview.value.nextStopId : null
  const via = travelPreview.value.viaIds.length ? describeViaIds(travelPreview.value.viaIds) : ''
  const segmentLabel = travelPreview.value.segments <= 1 ? '单段直达' : `共 ${travelPreview.value.segments} 段`
  const routeLine = via ? `${segmentLabel}，经由${via}` : segmentLabel
  if (isTravelingHere.value) {
    return `${routeLine}。下一站 ${nextStop || selected.value.name}，到站后可处理${actionLabels.value}。`
  }
  return `${routeLine}。动身后可在此地进行${actionLabels.value}。`
})
const travelButtonReason = computed(() => {
  if (isCurrent.value) return '你已在此地。'
  return journeySummary.value
})
const travelButtonLabel = computed(() => {
  if (isCurrent.value) return '你在此地'
  if (!reachable.value) return '前路受阻'
  if (isTravelingHere.value) return '继续赶路'
  return `前往${selected.value.name}`
})

const locationTypeLine = computed(() => `${selected.value.region} · ${selected.value.terrain}`)

const locationTags = computed(() => [
  `灵气 ${selected.value.aura}`,
  `风险 ${selected.value.danger}`,
  `市集 ${selected.value.marketTier || 0} 阶`,
])

const residents = computed(() =>
  store.npcs.filter(n => n.locationId === selected.value.id && player.value.npcIntel[n.id]).slice(0, 5)
)

const factionsHere = computed(() =>
  FACTIONS.filter(f => (selected.value as any).factionIds?.includes(f.id))
)

const territory = computed(() => getTerritoryState(selected.value.id))

const territoryHolder = computed(() => {
  const t = territory.value
  if (!t) return '暂无'
  const pf = player.value.playerFaction
  if (pf && t.controllerId === pf.id) return pf.name
  const faction = FACTIONS.find(f => f.id === t.controllerId)
  return faction?.name || '散户地头'
})

const locationFacts = computed(() => [
  { label: '特产', value: selected.value.resource },
  { label: '市集层级', value: `${selected.value.marketTier || 0} 阶` },
  { label: '势力驻点', value: factionsHere.value.length ? factionsHere.value.map(f => f.name).join('、') : '暂无' },
  { label: '地头归属', value: territoryHolder.value },
  { label: '门路深浅', value: `${Math.round(territory.value?.playerInfluence || 0)}` },
])

const activeRealm = computed(() => {
  const realmId = (selected.value as any).realmId
  if (!realmId || world.value.realm.activeRealmId !== realmId) return null
  return REALM_TEMPLATES.find(r => r.id === realmId) || null
})

const industryHints = computed(() => {
  const tags = selected.value.tags as string[]
  return [
    tags.includes('starter') ? '适合白手起家' : null,
    tags.includes('town') ? '可置办田产或铺面' : null,
    tags.includes('forge') ? '可经营工坊' : null,
    tags.includes('market') || tags.includes('port') ? '适合行商开铺' : null,
    tags.includes('court') ? '可买官契、办路引' : null,
    tags.includes('pass') ? '适合跑长线商路' : null,
    tags.includes('sect') ? '有行院与修行门路' : null,
  ].filter(Boolean) as string[]
})

const factionsText = computed(() =>
  factionsHere.value.length
    ? factionsHere.value.map(f => `${f.name}·可开${formatUnlockLabels((f as any).unlocks)}`).join('；')
    : '暂无成型势力，可先路过打探。'
)

function onTravel() {
  travelTo(selected.value.id)
}

function onLocationAction(action: string) {
  if (player.value.locationId === selected.value.id) {
    performAction(action)
  } else {
    travelAndAct(selected.value.id, action)
  }
}

function onChallengeRealm() {
  if (!activeRealm.value) return
  travelAndChallengeRealm(activeRealm.value.id)
}

function describeViaIds(viaIds: string[]) {
  return viaIds.map(id => LOCATION_MAP.get(id)?.name || id).join('、')
}

function residentLabel(npc: { id: string; name: string; personalityLabel: string }) {
  return player.value.npcIntel[npc.id] === 'met' ? `${npc.name}·${npc.personalityLabel}` : `${npc.name}·只闻其名`
}
</script>
