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
      <button v-if="!isCurrent" class="ink-btn ink-btn--primary" type="button" :aria-disabled="!reachable || busy" :data-tip="reachable ? undefined : journeySummary" @click="travel">
        <GameIcon name="travel" />{{ travelLabel }}
      </button>
    </section>

    <section v-if="activeRealm" class="realm-card">
      <span class="realm-card__kicker">异象显世</span>
      <strong class="realm-card__name">{{ activeRealm.name }}</strong>
      <p class="realm-card__desc">{{ activeRealm.desc }} 到了此地，可在“此地”一栏里闯秘境。</p>
    </section>

    <section class="location-info__section">
      <h4 class="sheet__heading">本旬消息</h4>
      <p v-if="!cards.length" class="location-info__empty">眼下没听说此地有什么事。</p>
      <ul v-else class="location-info__cards">
        <li v-for="card in cards" :key="card.id"><strong>{{ card.title }}</strong><span>{{ card.reward }}</span></li>
      </ul>
    </section>

    <section class="location-info__section">
      <h4 class="sheet__heading">到了能做</h4>
      <div class="location-info__actions">
        <span v-for="label in doable" :key="label" class="tag">{{ label }}</span>
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
import { FACTIONS, LOCATION_MAP, REALM_TEMPLATES } from '@/config'
import { formatDays } from '@/config/calendar'
import { getTerritoryState } from '@/systems/social'
import { getTravelPreview } from '@/systems/world'
import { startTravel } from '@/systems/life/activities'
import { opportunitiesAt } from '@/systems/life/opportunities'
import { useBooks } from '@/composables/useBooks'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { player, world, currentLocation, selectedLocation: selected } = storeToRefs(store)
const { closeBook } = useBooks()

const preview = computed(() => {
  void world.value.day
  void player.value.locationId
  return getTravelPreview(selected.value.id)
})
const isCurrent = computed(() => selected.value.id === currentLocation.value.id)
const reachable = computed(() => isCurrent.value || Boolean(preview.value.route))
const busy = computed(() => Boolean(store.game.life.runner || store.game.life.event || store.combat.currentEnemy || store.game.life.ended))

const journeyTag = computed(() => (isCurrent.value ? '身在此地' : reachable.value ? '可以前往' : '前路受阻'))
const journeySummary = computed(() => {
  if (isCurrent.value) return '此地诸事都可就地去做。'
  if (!reachable.value) return preview.value.blockedReason || '眼下没有能走通的路。'
  const via = preview.value.viaIds.map(id => LOCATION_MAP.get(id)?.name || id).join('、')
  return via ? `约走${formatDays(preview.value.days)}，途经${via}。路上可能遇事。` : `约走${formatDays(preview.value.days)}。`
})
const travelLabel = computed(() => (reachable.value ? `前往${selected.value.name}（${formatDays(preview.value.days)}）` : '前路受阻'))

const activeRealm = computed(() => {
  const realmId = selected.value.realmId
  if (!realmId || world.value.realm.activeRealmId !== realmId) return null
  return REALM_TEMPLATES.find(r => r.id === realmId) || null
})

const cards = computed(() => {
  void world.value.day
  return opportunitiesAt(selected.value.id)
})

const doable = computed(() => {
  const loc = selected.value
  const settled = loc.tags.some(tag => ['town', 'city', 'port', 'market', 'village', 'pass', 'sect'].includes(tag)) || loc.actions.includes('trade')
  const list = ['练体']
  if (loc.actions.includes('meditate') || loc.aura >= 30) list.push('静坐')
  if (settled) list.push('打零工')
  list.push(settled ? '镇外转转' : '四处探探')
  if (loc.tags.some(tag => ['town', 'city', 'port', 'market'].includes(tag))) list.push('茶馆打听')
  if (loc.aura >= 34) list.push('可冲感气')
  if (loc.actions.includes('breakthrough')) list.push('可冲高境')
  if (loc.marketTier) list.push('市集')
  return list
})

const factionsHere = computed(() => FACTIONS.filter(f => selected.value.factionIds?.includes(f.id)))
const territoryHolder = computed(() => {
  const t = getTerritoryState(selected.value.id)
  if (!t) return '无主'
  const pf = player.value.playerFaction
  if (pf && t.controllerId === pf.id) return pf.name
  return FACTIONS.find(f => f.id === t.controllerId)?.name || '本地人各管各的'
})
const residents = computed(() => store.npcs
  .filter(n => n.alive && n.locationId === selected.value.id && player.value.npcIntel[n.id])
  .slice(0, 5)
  .map(n => (player.value.npcIntel[n.id] === 'met' ? n.name : `${n.name}（耳闻）`)))

function travel() {
  if (!reachable.value || isCurrent.value || busy.value) {
    sfx.deny()
    return
  }
  sfx.confirm()
  closeBook()
  startTravel(selected.value.id)
}
</script>
