<template>
  <p class="panel-intro">江湖门路分三脉：外部势力是你的身位，自家势力是你铺开的盘子，宗门则是你独占的一脉根基。</p>

  <UiMetricGrid :items="affiliationSummaryItems" />

  <div class="panel-section-nav">
    <button
      v-for="section in sectSections"
      :key="section.key"
      :class="['panel-section-button', { active: activeSectSection === section.key }]"
      type="button"
      @click="activeSectSection = section.key"
    >
      <span>{{ section.label }}</span>
      <strong class="panel-section-button__count">{{ section.count }}</strong>
    </button>
  </div>
  <p class="panel-section-copy">{{ activeSectSectionMeta.desc }}</p>

  <template v-if="activeSectSection === 'factions'">
  <h3 class="subsection-title">可投势力</h3>
  <div class="npc-grid">
    <UiPanelCard
      v-for="faction in FACTIONS"
      :key="faction.id"
      tone="npc"
      :standout="currentAffiliation?.id === faction.id"
      :class-name="{
        'sect-faction-card': true,
        'is-current-faction': currentAffiliation?.id === faction.id,
        'is-cooldown-card': factionStatusTone(faction) === 'cooldown-chip' || factionStatusTone(faction) === 'warning-chip',
      }"
    >
      <UiCardHeader :title="faction.name" title-class="npc-name" head-class="sect-faction-head" aside-class="sect-faction-status">
        <template #aside>
          <UiPillRow class-name="sect-faction-status">
            <UiPill variant="trait">{{ getFactionTypeLabel(faction.type) }}</UiPill>
            <UiPill variant="trait" :class-name="factionStatusTone(faction)" :tone="mapFactionTone(factionStatusTone(faction))">{{ factionStatusText(faction) }}</UiPill>
          </UiPillRow>
        </template>
      </UiCardHeader>
      <p class="npc-meta">{{ faction.desc }}</p>
      <p class="npc-meta">所在：{{ getLocationName(faction.locationId) }} · 可开：{{ formatUnlockLabels(faction.unlocks) }}</p>
      <p class="npc-meta">入门条件：境界 {{ getRankName(faction.joinRequirement.rankIndex) }}，声望 {{ faction.joinRequirement.reputation }}，灵石 {{ faction.joinRequirement.money }}</p>
      <p class="npc-meta">当前缺口：{{ factionGapText(faction) }}</p>
      <p v-if="currentAffiliation?.id === faction.id" class="npc-meta">退出代价：全局声望 -8，12 天内不可重返{{ faction.name }}；若是官府、军府或转运司，还会进入追缉期。</p>
      <UiActionGroup>
        <button v-if="currentAffiliation?.id === faction.id" class="item-button is-current" @click="doLeave()">
          当前身份：{{ faction.titles[player.affiliationRank] }} · 退出此势力
        </button>
        <button v-else class="item-button" :class="canJoinFaction(faction.id) ? 'is-route' : ''" :disabled="!canJoinFaction(faction.id)" :title="factionGapText(faction)" @click="doJoin(faction.id)">
          {{ canJoinFaction(faction.id) ? '加入此势力' : '条件未满足' }}
        </button>
      </UiActionGroup>
    </UiPanelCard>
  </div>
  </template>

  <template v-if="activeSectSection === 'affiliation'">
  <h3 class="subsection-title">势力差使</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="currentAffiliation && affiliationTasks.length">
      <UiPanelCard v-for="task in affiliationTasks" :key="task.id" tone="item">
        <UiCardHeader :title="task.title" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" tone="uncommon">声望 +{{ formatNumber(task.rewardReputation) }}</UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">{{ task.desc }}</p>
        <p class="item-meta">完成条件：{{ describeAffiliationNeed(task) }}</p>
        <p class="item-meta">当前差口：{{ describeAffiliationGap(task) }}</p>
        <p class="item-meta">{{ describeAffiliationReward(task) }}</p>
        <UiActionGroup>
          <button class="item-button" :class="canCompleteAffiliation(task.id) ? 'is-route' : ''" :disabled="!canCompleteAffiliation(task.id)" :title="describeAffiliationGap(task)" @click="doCompleteAffiliation(task.id)">
            {{ canCompleteAffiliation(task.id) ? '完成差使' : '条件未满足' }}
          </button>
        </UiActionGroup>
      </UiPanelCard>
    </template>
    <div v-else class="empty-state">{{ currentAffiliation ? '今天这方势力还没有新的差使。' : '先投一家势力，才会有正式差使可做。' }}</div>
  </div>
  </template>

  <template v-if="activeSectSection === 'player-faction'">
  <h3 class="subsection-title">自家势力</h3>
  <template v-if="playerFaction">
    <UiMetricGrid :items="playerFactionSummaryItems" />
    <div class="panel-section-nav panel-section-nav--compact">
      <button
        v-for="panel in playerFactionPanels"
        :key="panel.key"
        :class="['panel-section-button', { active: activePlayerFactionPanel === panel.key }]"
        type="button"
        @click="activePlayerFactionPanel = panel.key"
      >
        <span>{{ panel.label }}</span>
        <strong class="panel-section-button__count">{{ panel.count }}</strong>
      </button>
    </div>
    <p class="panel-section-copy">{{ activePlayerFactionPanelMeta.desc }}</p>
    <template v-if="activePlayerFactionPanel === 'overview'">
    <div class="world-grid">
      <UiPanelCard v-for="(branch, key) in PLAYER_FACTION_BRANCHES" :key="key" tone="world">
        <span>{{ branch.label }}</span>
        <strong>{{ playerFaction.branches[key as string] || 0 }} 级</strong>
        <p class="item-meta">{{ branch.desc }}</p>
        <p class="item-meta">扩张条件：{{ branchUpgradeReason(key as string) }}</p>
        <UiActionGroup>
          <button class="item-button" :disabled="!canUpgradeBranch(key as string)" :title="branchUpgradeReason(key as string)" @click="doUpgradeBranch(key as string)">扩张 {{ branch.baseCost * ((playerFaction.branches[key as string] || 0) + 1) }} 灵石</button>
        </UiActionGroup>
      </UiPanelCard>
    </div>
    </template>
    <template v-else>
    <h3 class="subsection-title">自家势力任务</h3>
    <div class="inventory-grid industry-stack">
      <template v-if="factionMissions.length">
        <UiPanelCard v-for="task in factionMissions" :key="task.id" tone="item">
          <UiCardHeader :title="task.title" title-class="item-title" />
          <p class="item-meta">{{ task.desc }}</p>
          <p class="item-meta">当前差口：{{ factionMissionReason(task.id) }}</p>
          <UiActionGroup>
            <button class="item-button" :disabled="!canCompleteFactionMission(task.id)" :title="factionMissionReason(task.id)" @click="doCompleteFactionMission(task.id)">推动势力事务</button>
          </UiActionGroup>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">今天这摊子暂时没有新增差事。</div>
    </div>
    </template>
  </template>
  <template v-else>
    <UiPanelCard tone="combat" standout>
      <p class="auction-meta">你可以另拉一张自己的江湖网络，需求：声望 22、灵石 900、至少练力境。</p>
      <p class="item-meta">当前差口：{{ createFactionReason() }}</p>
      <UiActionGroup variant="auction">
        <button class="item-button" :disabled="!canCreateOwnFaction()" :title="createFactionReason()" @click="doCreateFaction">拉起自家势力</button>
      </UiActionGroup>
    </UiPanelCard>
  </template>
  </template>

  <template v-if="activeSectSection === 'sect'">
  <h3 class="subsection-title">宗门</h3>
  <template v-if="sect">
    <UiMetricGrid :items="sectSummaryItems" />
    <UiPanelCard tone="combat" standout>
      <p class="item-meta">{{ sectReadonlyCopy }}</p>
    </UiPanelCard>
    <div class="panel-section-nav panel-section-nav--compact">
      <button
        v-for="panel in sectPanels"
        :key="panel.key"
        :class="['panel-section-button', { active: activeSectPanel === panel.key }]"
        type="button"
        @click="activeSectPanel = panel.key"
      >
        <span>{{ panel.label }}</span>
        <strong class="panel-section-button__count">{{ panel.count }}</strong>
      </button>
    </div>
    <p class="panel-section-copy">{{ activeSectPanelMeta.desc }}</p>
    <template v-if="activeSectPanel === 'missions'">
    <h3 class="subsection-title">宗门任务</h3>
    <div class="inventory-grid industry-stack">
      <template v-if="sectMissions.length">
        <UiPanelCard v-for="task in sectMissions" :key="task.id" tone="item">
          <UiCardHeader :title="task.title" title-class="item-title" />
          <p class="item-meta">{{ task.desc }}</p>
          <p class="item-meta">当前差口：{{ sectMissionReason(task.id) }}</p>
          <UiActionGroup>
            <button class="item-button" :disabled="!canRunSectMission(task.id)" :title="sectMissionReason(task.id)" @click="doCompleteSectMission(task.id)">处理宗门差使</button>
          </UiActionGroup>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">今天门中暂无额外差使。</div>
    </div>
    </template>
    <template v-if="activeSectPanel === 'buildings'">
    <h3 class="subsection-title">宗门建筑</h3>
    <div class="world-grid">
      <UiPanelCard v-for="(building, key) in SECT_BUILDINGS" :key="key" tone="world">
        <span>{{ building.label }}</span>
        <strong>{{ sect.buildings[key as string] || 0 }} 级</strong>
        <p class="item-meta">{{ building.desc }}</p>
        <p class="item-meta">升级条件：{{ buildingUpgradeReason(key as string) }}</p>
        <UiActionGroup>
          <button class="item-button" :disabled="!canUpgradeBuilding(key as string)" :title="buildingUpgradeReason(key as string)" @click="doUpgradeBuilding(key as string)">
            升级 {{ building.baseCost * ((sect.buildings[key as string] || 0) + 1) }} 灵石
          </button>
        </UiActionGroup>
      </UiPanelCard>
    </div>
    </template>
    <template v-if="activeSectPanel === 'library'">
    <h3 class="subsection-title">藏经阁</h3>
    <div class="inventory-grid">
      <template v-if="sect.skillLibrary.length">
        <UiPanelCard v-for="skillId in sect.skillLibrary" :key="skillId" tone="item">
          <UiCardHeader :kicker="getTechniqueKindLabel(getTechniqueData(skillId)?.kind || '')" :title="getTechniqueName(skillId)" title-class="item-title" />
          <p class="item-meta">{{ getTechniqueDesc(skillId) }}</p>
          <p class="item-meta">{{ getTechniqueEffect(skillId) }}</p>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">藏经阁尚无功法，可先从行囊中收入秘籍。</div>
    </div>
    </template>
    <template v-if="activeSectPanel === 'disciples'">
    <h3 class="subsection-title">门下弟子</h3>
    <div class="npc-grid">
      <template v-if="sect.disciples.length">
        <UiPanelCard v-for="npcId in sect.disciples" :key="npcId" tone="npc">
          <template v-if="store.getNpc(npcId)">
            <UiCardHeader :title="store.getNpc(npcId)!.name" title-class="npc-name">
              <template #aside>
                <UiPill variant="trait">修为 {{ formatNumber(store.getNpc(npcId)!.cultivation) }}</UiPill>
              </template>
            </UiCardHeader>
            <p class="npc-meta">{{ store.getNpc(npcId)!.profession || store.getNpc(npcId)!.title }} · {{ getRankName(store.getNpc(npcId)!.rankIndex) }}</p>
            <p class="npc-meta">最近动向：{{ store.getNpc(npcId)!.lastEvent }}</p>
            <p class="npc-meta">{{ getTeachingSummary(npcId) }}</p>
            <UiActionGroup variant="teaching">
              <template v-if="sect.skillLibrary.length">
                <button v-for="skillId in sect.skillLibrary" :key="skillId" class="npc-button" @click="doTeach(npcId, skillId)">
                  传授{{ getTechniqueName(skillId) }}
                </button>
              </template>
              <span v-else class="muted">藏经阁暂无可传功法</span>
            </UiActionGroup>
          </template>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">门下暂无亲传弟子，先去江湖中收人。</div>
    </div>
    </template>
  </template>
  <template v-else>
    <UiPanelCard tone="combat" standout>
      <p class="auction-meta">
        宗门山门暂未开启。当前：境界 {{ getRankName(player.rankIndex) }}、声望 {{ formatNumber(player.reputation) }}、灵石 {{ formatNumber(player.money) }}。
      </p>
      <p class="item-meta">当前差口：{{ createSectReason() }}</p>
    </UiPanelCard>
  </template>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { FACTIONS, FACTION_MAP, PLAYER_SECT_CREATE_BLOCK_TEXT, PLAYER_SECT_ENABLED, PLAYER_SECT_FROZEN_TEXT, RANKS, LOCATION_MAP, SECT_BUILDINGS, getItem, getTechnique } from '@/config'
import { formatNumber } from '@/utils'
import { describeTechniqueEffect, getFactionTypeLabel, formatUnlockLabels, getTechniqueKindLabel } from '@/composables/useUIHelpers'
import {
  canCompleteAffiliationTask, canCompletePlayerFactionMission, canCompleteSectMission, canCreatePlayerFaction, canCreateSect,
  canJoinFaction, completeAffiliationTask, explainCreatePlayerFaction, explainCreateSect, explainFactionJoin, explainPlayerFactionMission,
  explainSectMission, getAffiliationTaskIssues,
  getFactionRejoinCooldownDays, hasActiveFactionPursuit, joinFaction, leaveFaction, refreshAffiliationTasks,
  createPlayerFaction, upgradePlayerFactionBranch, completePlayerFactionMission,
  refreshPlayerFactionMissions, PLAYER_FACTION_BRANCHES,
  createSect, upgradeSectBuilding, refreshSectMissions, completeSectMission,
  assignTeaching,
} from '@/systems/social'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiMetricGrid from '@/components/ui/UiMetricGrid.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const { player, world, currentAffiliation, playerFaction, sect } = storeToRefs(store)

function getRankName(idx: number) { return RANKS[Math.min(idx, RANKS.length - 1)].name }
function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }
function getItemName(id: string) { return getItem(id)?.name || id }
function getTechniqueData(id: string) { return getTechnique(id) || null }
function getTechniqueName(id: string) { return getTechnique(id)?.name || id }
function getTechniqueDesc(id: string) { return getTechnique(id)?.desc || '' }
function getTechniqueEffect(id: string) { return describeTechniqueEffect(getTechnique(id)?.effect || null) }

const affiliationTasks = computed(() => currentAffiliation.value ? refreshAffiliationTasks() : [])
const factionMissions = computed(() => playerFaction.value ? refreshPlayerFactionMissions() : [])
const sectMissions = computed(() => {
  if (!sect.value) return []
  if (!PLAYER_SECT_ENABLED) return Array.isArray(sect.value.missions) ? sect.value.missions : []
  return refreshSectMissions()
})
const sectReadonlyCopy = computed(() => PLAYER_SECT_FROZEN_TEXT)

type SectSectionKey = 'factions' | 'affiliation' | 'player-faction' | 'sect'
type PlayerFactionPanelKey = 'overview' | 'missions'
type SectPanelKey = 'missions' | 'buildings' | 'library' | 'disciples'

const activeSectSection = ref<SectSectionKey>('factions')
const activePlayerFactionPanel = ref<PlayerFactionPanelKey>('overview')
const activeSectPanel = ref<SectPanelKey>('missions')

const sectSections = computed(() => ([
  { key: 'factions' as const, label: '可投势力', count: FACTIONS.length, desc: '先只看哪些外部势力能投、还差什么门槛。' },
  { key: 'affiliation' as const, label: '势力差使', count: affiliationTasks.value.length, desc: currentAffiliation.value ? '只看当前身份下能接的正式差使。' : '先投一家势力，这一栏才会真正转起来。' },
  { key: 'player-faction' as const, label: '自家势力', count: playerFaction.value ? playerFaction.value.members.length || 1 : 0, desc: playerFaction.value ? '把自家盘子的经营和事务拆开看，不再一屏堆满。' : '你还没拉起自家势力，这一栏只留建势入口。' },
  { key: 'sect' as const, label: '宗门', count: sect.value ? sect.value.disciples.length || 1 : 0, desc: PLAYER_SECT_ENABLED ? (sect.value ? '宗门改成按差使、建筑、藏经阁和弟子分栏看。' : '你尚未立宗，这一栏只留开宗入口。') : (sect.value ? PLAYER_SECT_FROZEN_TEXT : PLAYER_SECT_CREATE_BLOCK_TEXT) },
]))
const activeSectSectionMeta = computed(() =>
  sectSections.value.find(section => section.key === activeSectSection.value) || sectSections.value[0]
)
const playerFactionPanels = computed(() => ([
  { key: 'overview' as const, label: '经营盘', count: Object.keys(PLAYER_FACTION_BRANCHES).length, desc: '这里只看地盘分支和扩张成本。' },
  { key: 'missions' as const, label: '事务单', count: factionMissions.value.length, desc: '这里只看自家势力今天的推进事项。' },
]))
const activePlayerFactionPanelMeta = computed(() =>
  playerFactionPanels.value.find(panel => panel.key === activePlayerFactionPanel.value) || playerFactionPanels.value[0]
)
const sectPanels = computed(() => ([
  { key: 'missions' as const, label: '差使', count: sectMissions.value.length, desc: '只看门内今日事务和完成门槛。' },
  { key: 'buildings' as const, label: '建筑', count: Object.keys(SECT_BUILDINGS).length, desc: '只看宗门建筑和升级所需。' },
  { key: 'library' as const, label: '藏经阁', count: sect.value?.skillLibrary.length || 0, desc: '只看当前入阁功法，不和别的事务混在一屏。' },
  { key: 'disciples' as const, label: '弟子', count: sect.value?.disciples.length || 0, desc: '只看门下弟子近况和传功安排。' },
]))
const activeSectPanelMeta = computed(() =>
  sectPanels.value.find(panel => panel.key === activeSectPanel.value) || sectPanels.value[0]
)

const affiliationSummaryItems = computed(() => [
  { label: '当前势力', value: currentAffiliation.value ? currentAffiliation.value.name : '无' },
  { label: '江湖身份', value: currentAffiliation.value ? currentAffiliation.value.titles[player.value.affiliationRank] : '白身' },
  { label: '本地声望', value: formatNumber(store.getRegionStanding(player.value.locationId)) },
  {
    label: '任务完成',
    value: player.value.stats.affiliationTasksCompleted + player.value.stats.factionTasksCompleted + player.value.stats.sectTasksCompleted,
  },
])

const playerFactionSummaryItems = computed(() => playerFaction.value ? [
  { label: '自家势力', value: playerFaction.value.name },
  { label: '势力等级', value: playerFaction.value.level },
  { label: '地盘影响', value: formatNumber(playerFaction.value.influence) },
  { label: '势力金库', value: formatNumber(playerFaction.value.treasury) },
  { label: '补给', value: formatNumber(playerFaction.value.supplies) },
  { label: '骨干成员', value: playerFaction.value.members.length },
] : [])

const sectSummaryItems = computed(() => sect.value ? [
  { label: '宗门名称', value: sect.value.name },
  { label: '宗门等级', value: sect.value.level },
  { label: '威望', value: formatNumber(sect.value.prestige) },
  { label: '府库', value: formatNumber(sect.value.treasury) },
  { label: '粮草', value: formatNumber(sect.value.food) },
  { label: '亲传弟子', value: sect.value.disciples.length },
] : [])

function factionStatusText(faction: { id: string }) {
  if (currentAffiliation.value?.id === faction.id) {
    return hasActiveFactionPursuit(faction.id) ? '已加入 · 追缉未解' : '已加入'
  }
  const cooldownDays = getFactionRejoinCooldownDays(faction.id)
  if (hasActiveFactionPursuit(faction.id)) {
    return cooldownDays > 0 ? `追缉中 · 冷却 ${cooldownDays} 天` : '追缉中'
  }
  return cooldownDays > 0 ? `重返冷却 ${cooldownDays} 天` : '可加入'
}

function factionStatusTone(faction: { id: string }) {
  if (currentAffiliation.value?.id === faction.id) return 'current-chip'
  if (hasActiveFactionPursuit(faction.id)) return 'warning-chip'
  return getFactionRejoinCooldownDays(faction.id) > 0 ? 'cooldown-chip' : 'route-chip'
}

function mapFactionTone(tone: string) {
  if (tone === 'current-chip') return 'current'
  if (tone === 'warning-chip') return 'warning'
  if (tone === 'cooldown-chip') return 'cooldown'
  if (tone === 'route-chip') return 'route'
  return ''
}

function factionGapText(faction: { id: string }) {
  if (currentAffiliation.value?.id === faction.id) return '你当前已在这方势力中。'
  if (canJoinFaction(faction.id)) return '条件已满足，可立即加入。'
  return explainFactionJoin(faction.id)
}

function describeAffiliationNeed(task: any) {
  const faction = FACTION_MAP.get(task.factionId)
  const needs = [`需前往${getLocationName(faction?.locationId || player.value.locationId)}`]
  if (task.kind === 'supply') needs.push(`缴付${getItemName(task.itemId)} x${task.quantity}`)
  if (task.kind === 'patrol') needs.push(`体力至少 ${task.staminaCost}，真气至少 ${task.qiCost}`)
  if (task.kind === 'liaison') needs.push(`灵石至少 ${task.moneyCost}，本地声望至少 ${task.standingNeed}`)
  return needs.join('；')
}

function describeAffiliationReward(task: any) {
  return `完成后：灵石 +${task.rewardMoney}，声望 +${formatNumber(task.rewardReputation)}，势力立场 +${formatNumber(task.rewardStanding)}，本地声望 +${formatNumber(task.rewardRegion)}`
}

function describeAffiliationGap(task: any) {
  const issues = getAffiliationTaskIssues(task.id)
  return issues.length ? issues.join('；') : '当前已满足，可立即交付。'
}

function canCreateOwnFaction() {
  return canCreatePlayerFaction()
}

function createFactionReason() {
  return explainCreatePlayerFaction()
}

function canUpgradeBranch(key: string) {
  const branch = PLAYER_FACTION_BRANCHES[key]
  if (!playerFaction.value || !branch) return false
  const level = playerFaction.value.branches[key as keyof typeof playerFaction.value.branches] || 0
  const cost = branch.baseCost * (level + 1)
  return player.value.money >= cost
}

function branchUpgradeReason(key: string) {
  const branch = PLAYER_FACTION_BRANCHES[key]
  if (!playerFaction.value || !branch) return '你还没有自己的势力。'
  const level = playerFaction.value.branches[key as keyof typeof playerFaction.value.branches] || 0
  const cost = branch.baseCost * (level + 1)
  if (player.value.money < cost) return `灵石不足，还差${cost - player.value.money}`
  return '条件已齐，可立即扩张。'
}

function canCompleteFactionMission(id: string) {
  return canCompletePlayerFactionMission(id)
}

function factionMissionReason(id: string) {
  return explainPlayerFactionMission(id)
}

function canFoundSect() {
  return PLAYER_SECT_ENABLED && canCreateSect()
}

function createSectReason() {
  if (!PLAYER_SECT_ENABLED) return PLAYER_SECT_CREATE_BLOCK_TEXT
  return explainCreateSect()
}

function canRunSectMission(id: string) {
  return PLAYER_SECT_ENABLED && canCompleteSectMission(id)
}

function sectMissionReason(id: string) {
  if (!PLAYER_SECT_ENABLED) return PLAYER_SECT_FROZEN_TEXT
  return explainSectMission(id)
}

function canUpgradeBuilding(key: string) {
  const building = SECT_BUILDINGS[key as keyof typeof SECT_BUILDINGS]
  if (!PLAYER_SECT_ENABLED || !sect.value || !building) return false
  const level = sect.value.buildings[key as keyof typeof sect.value.buildings] || 0
  const cost = building.baseCost * (level + 1)
  return player.value.money >= cost
}

function buildingUpgradeReason(key: string) {
  const building = SECT_BUILDINGS[key as keyof typeof SECT_BUILDINGS]
  if (!PLAYER_SECT_ENABLED) return PLAYER_SECT_FROZEN_TEXT
  if (!sect.value || !building) return '你尚未建立宗门。'
  const level = sect.value.buildings[key as keyof typeof sect.value.buildings] || 0
  const cost = building.baseCost * (level + 1)
  if (player.value.money < cost) return `灵石不足，还差${cost - player.value.money}`
  return '条件已齐，可立即升级。'
}

function doJoin(id: string) { joinFaction(id) }
function doCompleteAffiliation(id: string) { completeAffiliationTask(id) }
function doLeave() { leaveFaction() }
function canCompleteAffiliation(id: string) { return canCompleteAffiliationTask(id) }
function doCreateFaction() { createPlayerFaction() }
function doUpgradeBranch(key: string) { upgradePlayerFactionBranch(key) }
function doCompleteFactionMission(id: string) { completePlayerFactionMission(id) }
function doCreateSect() { createSect() }
function doUpgradeBuilding(key: string) { upgradeSectBuilding(key) }
function doCompleteSectMission(id: string) { completeSectMission(id) }
function doTeach(npcId: string, skillId: string) { assignTeaching(npcId, skillId) }

function getTeachingSummary(npcId: string) {
  const teaching = sect.value?.teachings.find(entry => entry.npcId === npcId)
  if (!teaching) return '当前未安排专门传功。'
  const technique = getTechnique(teaching.skillId)
  const need = Math.max(10, Math.round((technique?.masteryNeed || 40) * 0.45))
  const percent = Math.max(0, Math.min(100, Math.round((teaching.mastery / need) * 100)))
  return `正在研习：${technique?.name || teaching.skillId} · 熟练 ${percent}%${percent >= 100 ? ' · 已圆满' : ''}`
}
</script>
