<template>
  <p class="panel-intro">江湖人各有性情、家底和打算。你能与他们结交、结仇、收徒，也能把合适的人拉进自家门路；茶馆酒肆里还会漏出本地税赋、商气和谁在暗中收货的口风。</p>
  <UiPanelCard tone="combat" standout>
    <UiCardHeader kicker="茶馆酒肆" title="打听消息" title-class="npc-name">
      <template #aside>
        <UiPill variant="trait">当前可见 {{ visibleNpcCount }}/{{ npcs.length }}</UiPill>
      </template>
    </UiCardHeader>
    <p class="npc-meta">{{ rumorVenueSummary }}</p>
    <UiActionGroup variant="npc">
      <button class="npc-button" :disabled="!canUseRumorVenue('teahouse')" :title="rumorVenueReason('teahouse')" @click="doRumor('teahouse')">去茶馆听闲话</button>
      <button class="npc-button" :disabled="!canUseRumorVenue('tavern')" :title="rumorVenueReason('tavern')" @click="doRumor('tavern')">去酒馆探热闹</button>
    </UiActionGroup>
  </UiPanelCard>

  <div v-if="sortedNpcs.length" class="npc-grid">
    <UiPanelCard v-for="npc in sortedNpcs" :key="npc.id" tone="npc">
      <UiCardHeader :title="hasMetNpc(npc.id) ? npc.name : '???'" title-class="npc-name">
        <template #aside>
          <UiPillRow v-if="hasMetNpc(npc.id)">
            <UiPill variant="trait">身份 {{ getRoleLabel(getRelation(npc.id).role) }}</UiPill>
            <UiPill variant="trait">财富 {{ formatNumber(npc.wealth) }}</UiPill>
          </UiPillRow>
          <UiPillRow v-else>
            <UiPill variant="trait">身份 路人</UiPill>
          </UiPillRow>
        </template>
      </UiCardHeader>
      <template v-if="hasMetNpc(npc.id)">
        <p class="npc-meta">{{ npc.title }} · {{ npc.profession || '江湖人' }} · {{ npc.personalityLabel }} · {{ getRankName(npc.rankIndex) }}</p>
        <p class="npc-meta">{{ npc.personalityDesc }}</p>
        <p class="npc-meta">当前位置：{{ getLocationName(npc.locationId) }}，目标：{{ npc.goal }}，最近动向：{{ npc.lastEvent }}</p>
        <p class="npc-meta">人生阶段：{{ npc.lifeStage }} · {{ npc.age }} 岁{{ npc.factionId ? ` · 所属 ${getFactionName(npc.factionId)}` : ' · 尚无归属' }}</p>
        <p class="npc-meta">近年经历：{{ (npc.lifeEvents || []).slice(-2).join('；') || '暂无大事' }}</p>
        <UiPillRow>
          <UiPill variant="trait">好感 {{ getRelation(npc.id).affinity }}</UiPill>
          <UiPill variant="trait">信任 {{ getRelation(npc.id).trust }}</UiPill>
          <UiPill variant="trait">情缘 {{ getRelation(npc.id).romance }}</UiPill>
          <UiPill variant="trait">仇怨 {{ getRelation(npc.id).rivalry }}</UiPill>
        </UiPillRow>
        <UiPillRow>
          <UiPill variant="trait">贪念 {{ npc.mood.greed }}</UiPill>
          <UiPill variant="trait">仁心 {{ npc.mood.kindness }}</UiPill>
          <UiPill variant="trait">胆魄 {{ npc.mood.courage }}</UiPill>
          <UiPill variant="trait">耐性 {{ npc.mood.patience }}</UiPill>
        </UiPillRow>
        <UiActionGroup variant="npc">
          <button class="npc-button" :disabled="!canVisit(npc.id)" :title="visitReason(npc.id)" @click="doVisit(npc.id)">{{ getVisitLabel(npc.id) }}</button>
          <button class="npc-button" @click="doFocus(npc.id)">查看所在地点</button>
          <button class="npc-button" :disabled="!canRecruit(npc.id)" :title="recruitReason(npc.id)" @click="doRecruit(npc.id)">收为弟子</button>
          <button class="npc-button" :disabled="!canRecruitIntoFaction(npc.id)" :title="recruitFactionReason(npc.id)" @click="doRecruitFaction(npc.id)">招入自家势力</button>
          <button class="npc-button" :disabled="!canTakeMaster(npc.id)" :title="masterReason(npc.id)" @click="doMaster(npc.id)">拜其为师</button>
          <button class="npc-button" :disabled="!canTakePartner(npc.id)" :title="partnerReason(npc.id)" @click="doPartner(npc.id)">结为道侣</button>
          <button class="npc-button" @click="doRival(npc.id)">立为仇敌</button>
        </UiActionGroup>
      </template>
      <template v-else>
        <p class="npc-meta">你尚未与此人发生过接触。</p>
        <UiActionGroup variant="npc">
          <button class="npc-button" :disabled="!canVisit(npc.id)" :title="visitReason(npc.id)" @click="doVisit(npc.id)">{{ getVisitLabel(npc.id) }}</button>
        </UiActionGroup>
      </template>
    </UiPanelCard>
  </div>
  <div v-else class="empty-state">你暂时只听过几句风声，还没真正记住什么江湖人物。先去茶馆酒肆打听，或亲自赶到人前照面。</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RANKS, LOCATION_MAP, FACTION_MAP, getItem } from '@/config'
import { formatNumber } from '@/utils'
import { getRoleLabel } from '@/composables/useUIHelpers'
import { useStage } from '@/composables/useStage'
import {
  canBecomeMaster,
  canBecomePartner,
  canRecruitDisciple,
  canRecruitFactionMember,
  explainMasterBond,
  explainPartnerBond,
  explainRecruitDisciple,
  explainRecruitFactionMember,
  visitNpc, recruitDisciple, recruitFactionMember,
  becomeMasterBond, becomePartner, declareRival,
} from '@/systems/social'
import { canGatherNpcRumors, explainNpcRumors, gatherNpcRumors } from '@/systems/npc'
import { hasNpcVisitStory } from '@/systems/story'
import { getTerritorySecurity, getTerritoryTaxRate } from '@/systems/social'
import { getLocationEconomyOverview } from '@/systems/worldEconomy'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const { npcs, player, selectedLocationId, world } = storeToRefs(store)
const { setTab } = useStage()

const MARKET_BIAS_LABELS: Record<string, string> = {
  grain: '口粮',
  herb: '药材',
  wood: '木料',
  ore: '矿料',
  cloth: '布货',
  pill: '丹药',
  weapon: '兵器',
  armor: '甲具',
  relic: '奇珍',
  scroll: '残卷',
  fire: '火材',
  ice: '寒材',
}

function isVisibleNpc(npcId: string, locationId: string) {
  const intel = getIntelSource(npcId)
  if (intel === 'met') return true
  return store.getNpc(npcId)?.locationId === locationId
}

const sortedNpcs = computed(() =>
  [...npcs.value]
    .filter(npc => isVisibleNpc(npc.id, player.value.locationId))
    .sort((a, b) => getRelation(b.id).affinity - getRelation(a.id).affinity)
)

const visibleNpcCount = computed(() => sortedNpcs.value.length)

const rumorVenueSummary = computed(() => {
  const parts = [`当前可见 ${visibleNpcCount.value} 人`]
  if (canUseRumorVenue('teahouse')) parts.push('茶馆偏本地门路、税赋与行会口风')
  if (canUseRumorVenue('tavern')) parts.push('酒馆偏外路价面、脚商风声与用人消息')
  if (!parts.length) return '此地暂时没有合适的茶馆酒肆可供你打听消息。'
  return parts.join('；')
})

function getRelation(npcId: string) {
  return player.value.relations[npcId] || { affinity: 0, trust: 0, romance: 0, rivalry: 0, role: 'none' }
}

function getIntelSource(npcId: string) {
  return player.value.npcIntel[npcId] || null
}

function hasMetNpc(npcId: string) {
  return getIntelSource(npcId) === 'met'
}

function getRankName(idx: number) { return RANKS[Math.min(idx, RANKS.length - 1)].name }
function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }
function getFactionName(id: string) { return FACTION_MAP.get(id)?.name || '未知势力' }
function getVisitLabel(id: string) { return hasNpcVisitStory(id) ? '对话' : '拜访' }
function formatPercent(value: number) { return `${Math.round(value * 100)}%` }

function getTeaIntelLine() {
  const location = LOCATION_MAP.get(player.value.locationId)
  const economy = getLocationEconomyOverview(player.value.locationId)
  const security = getTerritorySecurity(player.value.locationId)
  const taxRate = formatPercent(getTerritoryTaxRate(player.value.locationId))
  const securityText = security >= 70 ? '街面安稳' : security >= 50 ? '巡夜渐紧' : '人心略浮'
  return `${location?.name || player.value.locationId}近来${securityText}，税赋约${taxRate}，${economy.summary}。`
}

function getTeaOrderLine() {
  const order = world.value.industryOrders[0]
  if (!order) return ''
  const goods = order.requirements.map(req => `${req.quantity}${getItem(req.itemId)?.name || req.itemId}`).join('、')
  const locationText = order.locationId ? `${getLocationName(order.locationId)}那边，` : ''
  return `茶客低声议论，${locationText}${order.factionName}近来正在收${goods}。`
}

function getTavernRouteLine() {
  const current = LOCATION_MAP.get(player.value.locationId)
  const target = (current?.neighbors || [])
    .map(id => LOCATION_MAP.get(id))
    .filter(Boolean)
    .sort((left, right) => {
      const leftEconomy = getLocationEconomyOverview(left!.id)
      const rightEconomy = getLocationEconomyOverview(right!.id)
      return (rightEconomy.needPressure + (right!.marketTier || 0) * 8) - (leftEconomy.needPressure + (left!.marketTier || 0) * 8)
    })[0]
  if (!target) return ''
  const biasLabel = MARKET_BIAS_LABELS[target.marketBias || ''] || '紧俏货'
  const economy = getLocationEconomyOverview(target.id)
  return `行脚客说，${target.name}这阵子${economy.needLabel}，若带${biasLabel}过去，多半更好谈价。`
}

function getTavernOrderLine() {
  const order = world.value.industryOrders[1] || world.value.industryOrders[0]
  if (!order) return ''
  const goods = order.requirements.map(req => `${req.quantity}${getItem(req.itemId)?.name || req.itemId}`).join('、')
  const locationText = order.locationId ? `${getLocationName(order.locationId)}的` : ''
  return `酒客说${locationText}${order.factionName}近来缺${goods}，肯跑腿送货的人更容易摸到门路。`
}

function appendVenueIntel(venue: 'teahouse' | 'tavern') {
  const lines = venue === 'teahouse'
    ? [getTeaIntelLine(), getTeaOrderLine()]
    : [getTavernRouteLine(), getTavernOrderLine()]
  lines.filter(Boolean).forEach(text => store.appendLog(text, 'npc'))
}
function canVisit(id: string) { return store.getNpc(id)?.locationId === player.value.locationId }
function visitReason(id: string) {
  const npc = store.getNpc(id)
  if (!npc) return '此人当前不在江湖册录中。'
  if (npc.locationId === player.value.locationId) return '此人就在眼前，可直接去见。'
  return `${npc.name}眼下人在${getLocationName(npc.locationId)}，得先赶过去。`
}
function canRecruit(id: string) { return canRecruitDisciple(id) }
function recruitReason(id: string) { return explainRecruitDisciple(id) }
function canRecruitIntoFaction(id: string) { return canRecruitFactionMember(id) }
function recruitFactionReason(id: string) { return explainRecruitFactionMember(id) }
function canTakeMaster(id: string) { return canBecomeMaster(id) }
function masterReason(id: string) { return explainMasterBond(id) }
function canTakePartner(id: string) { return canBecomePartner(id) }
function partnerReason(id: string) { return explainPartnerBond(id) }
function canUseRumorVenue(venue: 'teahouse' | 'tavern') { return canGatherNpcRumors(venue) }
function rumorVenueReason(venue: 'teahouse' | 'tavern') { return explainNpcRumors(venue) }

function doVisit(id: string) { visitNpc(id) }
function doFocus(id: string) {
  const npc = store.getNpc(id)
  if (npc) {
    selectedLocationId.value = npc.locationId
    store.appendLog(`山河图已标出${npc.name}所在的${getLocationName(npc.locationId)}。`, 'action')
    setTab('map')
  }
}
function doRecruit(id: string) { recruitDisciple(id) }
function doRecruitFaction(id: string) { recruitFactionMember(id) }
function doMaster(id: string) { becomeMasterBond(id) }
function doPartner(id: string) { becomePartner(id) }
function doRival(id: string) { declareRival(id) }
function doRumor(venue: 'teahouse' | 'tavern') {
  const heardIds = gatherNpcRumors(venue)
  if (heardIds.length) appendVenueIntel(venue)
}
</script>
