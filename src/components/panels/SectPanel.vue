<template>
  <p class="panel-intro">江湖门路分三脉：外部势力是你的身位，自家势力是你铺开的盘子，宗门则是你独占的一脉根基。</p>

  <UiMetricGrid :items="affiliationSummaryItems" />

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
        <button v-else class="item-button" :class="canJoinFaction(faction.id) ? 'is-route' : ''" :disabled="!canJoinFaction(faction.id)" @click="doJoin(faction.id)">
          {{ canJoinFaction(faction.id) ? '加入此势力' : '条件未满足' }}
        </button>
      </UiActionGroup>
    </UiPanelCard>
  </div>

  <h3 class="subsection-title">势力差使</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="currentAffiliation && affiliationTasks.length">
      <UiPanelCard v-for="task in affiliationTasks" :key="task.id" tone="item">
        <UiCardHeader :title="task.title" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" tone="uncommon">声望 +{{ round(task.rewardReputation, 1) }}</UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">{{ task.desc }}</p>
        <p class="item-meta">完成条件：{{ describeAffiliationNeed(task) }}</p>
        <p class="item-meta">当前差口：{{ describeAffiliationGap(task) }}</p>
        <p class="item-meta">{{ describeAffiliationReward(task) }}</p>
        <UiActionGroup>
          <button class="item-button" :class="canCompleteAffiliation(task.id) ? 'is-route' : ''" :disabled="!canCompleteAffiliation(task.id)" @click="doCompleteAffiliation(task.id)">
            {{ canCompleteAffiliation(task.id) ? '完成差使' : '条件未满足' }}
          </button>
        </UiActionGroup>
      </UiPanelCard>
    </template>
    <div v-else class="empty-state">{{ currentAffiliation ? '今天这方势力还没有新的差使。' : '先投一家势力，才会有正式差使可做。' }}</div>
  </div>

  <h3 class="subsection-title">自家势力</h3>
  <template v-if="playerFaction">
    <UiMetricGrid :items="playerFactionSummaryItems" />
    <div class="world-grid">
      <UiPanelCard v-for="(branch, key) in PLAYER_FACTION_BRANCHES" :key="key" tone="world">
        <span>{{ branch.label }}</span>
        <strong>{{ playerFaction.branches[key as string] || 0 }} 级</strong>
        <p class="item-meta">{{ branch.desc }}</p>
        <UiActionGroup>
          <button class="item-button" @click="doUpgradeBranch(key as string)">扩张 {{ branch.baseCost * ((playerFaction.branches[key as string] || 0) + 1) }} 灵石</button>
        </UiActionGroup>
      </UiPanelCard>
    </div>
    <h3 class="subsection-title">自家势力任务</h3>
    <div class="inventory-grid industry-stack">
      <template v-if="factionMissions.length">
        <UiPanelCard v-for="task in factionMissions" :key="task.id" tone="item">
          <UiCardHeader :title="task.title" title-class="item-title" />
          <p class="item-meta">{{ task.desc }}</p>
          <UiActionGroup>
            <button class="item-button" @click="doCompleteFactionMission(task.id)">推动势力事务</button>
          </UiActionGroup>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">今天这摊子暂时没有新增差事。</div>
    </div>
  </template>
  <template v-else>
    <UiPanelCard tone="combat" standout>
      <p class="auction-meta">你可以另拉一张自己的江湖网络，需求：声望 22、灵石 900、至少练力境。</p>
      <UiActionGroup variant="auction">
        <button class="item-button" @click="doCreateFaction">拉起自家势力</button>
      </UiActionGroup>
    </UiPanelCard>
  </template>

  <h3 class="subsection-title">宗门</h3>
  <template v-if="sect">
    <UiMetricGrid :items="sectSummaryItems" />
    <h3 class="subsection-title">宗门任务</h3>
    <div class="inventory-grid industry-stack">
      <template v-if="sectMissions.length">
        <UiPanelCard v-for="task in sectMissions" :key="task.id" tone="item">
          <UiCardHeader :title="task.title" title-class="item-title" />
          <p class="item-meta">{{ task.desc }}</p>
          <UiActionGroup>
            <button class="item-button" @click="doCompleteSectMission(task.id)">处理宗门差使</button>
          </UiActionGroup>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">今天门中暂无额外差使。</div>
    </div>
    <h3 class="subsection-title">宗门建筑</h3>
    <div class="world-grid">
      <UiPanelCard v-for="(building, key) in SECT_BUILDINGS" :key="key" tone="world">
        <span>{{ building.label }}</span>
        <strong>{{ sect.buildings[key as string] || 0 }} 级</strong>
        <p class="item-meta">{{ building.desc }}</p>
        <UiActionGroup>
          <button class="item-button" @click="doUpgradeBuilding(key as string)">
            升级 {{ building.baseCost * ((sect.buildings[key as string] || 0) + 1) }} 灵石
          </button>
        </UiActionGroup>
      </UiPanelCard>
    </div>
    <h3 class="subsection-title">藏经阁</h3>
    <div class="inventory-grid">
      <template v-if="sect.manualLibrary.length">
        <UiPanelCard v-for="manualId in sect.manualLibrary" :key="manualId" tone="item">
          <UiCardHeader :title="getItemName(manualId)" title-class="item-title" />
          <p class="item-meta">{{ getItemDesc(manualId) }}</p>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">藏经阁尚无功法，可先从行囊中收入秘籍。</div>
    </div>
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
            <UiActionGroup variant="teaching">
              <template v-if="sect.manualLibrary.length">
                <button v-for="mid in sect.manualLibrary" :key="mid" class="npc-button" @click="doTeach(npcId, mid)">
                  传授{{ getItemName(mid) }}
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
  <template v-else>
    <UiPanelCard tone="combat" standout>
      <p class="auction-meta">
        宗门是你独占的一脉根基。需求：至少筑基、声望 68、灵石 3800、立宗旗幡 1。
        当前：境界 {{ getRankName(player.rankIndex) }}、声望 {{ formatNumber(player.reputation) }}、灵石 {{ formatNumber(player.money) }}。
      </p>
      <UiActionGroup variant="auction"><button class="item-button" @click="doCreateSect">开宗立门</button></UiActionGroup>
    </UiPanelCard>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { FACTIONS, FACTION_MAP, RANKS, LOCATION_MAP, SECT_BUILDINGS, getItem } from '@/config'
import { formatNumber, round } from '@/utils'
import { getFactionTypeLabel, formatUnlockLabels } from '@/composables/useUIHelpers'
import {
  canCompleteAffiliationTask, canJoinFaction, completeAffiliationTask, explainFactionJoin, getAffiliationTaskIssues,
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
function getItemDesc(id: string) { return getItem(id)?.desc || '' }

const affiliationTasks = computed(() => currentAffiliation.value ? refreshAffiliationTasks() : [])
const factionMissions = computed(() => playerFaction.value ? refreshPlayerFactionMissions() : [])
const sectMissions = computed(() => sect.value ? refreshSectMissions() : [])

const affiliationSummaryItems = computed(() => [
  { label: '当前势力', value: currentAffiliation.value ? currentAffiliation.value.name : '无' },
  { label: '江湖身份', value: currentAffiliation.value ? currentAffiliation.value.titles[player.value.affiliationRank] : '白身' },
  { label: '本地声望', value: round(store.getRegionStanding(player.value.locationId), 1) },
  {
    label: '任务完成',
    value: player.value.stats.affiliationTasksCompleted + player.value.stats.factionTasksCompleted + player.value.stats.sectTasksCompleted,
  },
])

const playerFactionSummaryItems = computed(() => playerFaction.value ? [
  { label: '自家势力', value: playerFaction.value.name },
  { label: '势力等级', value: playerFaction.value.level },
  { label: '地盘影响', value: round(playerFaction.value.influence, 1) },
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
  return `完成后：灵石 +${task.rewardMoney}，声望 +${round(task.rewardReputation, 1)}，势力立场 +${round(task.rewardStanding, 1)}，本地声望 +${round(task.rewardRegion, 1)}`
}

function describeAffiliationGap(task: any) {
  const issues = getAffiliationTaskIssues(task.id)
  return issues.length ? issues.join('；') : '当前已满足，可立即交付。'
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
function doTeach(npcId: string, manualId: string) { assignTeaching(npcId, manualId) }
</script>
