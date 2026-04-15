<template>
  <p class="panel-intro">江湖门路分三脉：外部势力是你的身位，自家势力是你铺开的盘子，宗门则是你独占的一脉根基。</p>

  <div class="summary-grid">
    <div class="summary-box"><span>当前势力</span><strong>{{ currentAffiliation ? currentAffiliation.name : '无' }}</strong></div>
    <div class="summary-box"><span>江湖身份</span><strong>{{ currentAffiliation ? currentAffiliation.titles[player.affiliationRank] : '白身' }}</strong></div>
    <div class="summary-box"><span>本地声望</span><strong>{{ round(store.getRegionStanding(player.locationId), 1) }}</strong></div>
    <div class="summary-box"><span>任务完成</span><strong>{{ player.stats.affiliationTasksCompleted + player.stats.factionTasksCompleted + player.stats.sectTasksCompleted }}</strong></div>
  </div>

  <!-- Factions -->
  <h3 class="subsection-title">可投势力</h3>
  <div class="npc-grid">
    <div
      v-for="faction in FACTIONS"
      :key="faction.id"
      :class="[
        'npc-card',
        'sect-faction-card',
        {
          standout: currentAffiliation?.id === faction.id,
          'is-current-faction': currentAffiliation?.id === faction.id,
          'is-cooldown-card': factionStatusTone(faction) === 'cooldown-chip' || factionStatusTone(faction) === 'warning-chip',
        },
      ]"
    >
      <div class="npc-top sect-faction-head">
        <div>
          <h3 class="npc-name">{{ faction.name }}</h3>
          <p class="npc-meta">{{ faction.desc }}</p>
        </div>
        <div class="inline-list sect-faction-status">
          <span class="trait-chip">{{ getFactionTypeLabel(faction.type) }}</span>
          <span class="trait-chip" :class="factionStatusTone(faction)">{{ factionStatusText(faction) }}</span>
        </div>
      </div>
      <p class="npc-meta">所在：{{ getLocationName(faction.locationId) }} · 可开：{{ formatUnlockLabels(faction.unlocks) }}</p>
      <p class="npc-meta">入门条件：境界 {{ getRankName(faction.joinRequirement.rankIndex) }}，声望 {{ faction.joinRequirement.reputation }}，灵石 {{ faction.joinRequirement.money }}</p>
      <p class="npc-meta">当前缺口：{{ factionGapText(faction) }}</p>
      <p v-if="currentAffiliation?.id === faction.id" class="npc-meta">退出代价：全局声望 -8，12 天内不可重返{{ faction.name }}；若是官府、军府或转运司，还会进入追缉期。</p>
      <div class="item-actions">
        <button v-if="currentAffiliation?.id === faction.id" class="item-button is-current" @click="doLeave()">
          当前身份：{{ faction.titles[player.affiliationRank] }} · 退出此势力
        </button>
        <button v-else class="item-button" :class="canJoinFaction(faction.id) ? 'is-route' : ''" :disabled="!canJoinFaction(faction.id)" @click="doJoin(faction.id)">
          {{ canJoinFaction(faction.id) ? '加入此势力' : '条件未满足' }}
        </button>
      </div>
    </div>
  </div>

  <!-- Affiliation Tasks -->
  <h3 class="subsection-title">势力差使</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="currentAffiliation && affiliationTasks.length">
      <div v-for="task in affiliationTasks" :key="task.id" class="item-card">
        <div class="item-top">
          <div>
            <h3 class="item-title">{{ task.title }}</h3>
            <p class="item-meta">{{ task.desc }}</p>
          </div>
          <span class="rarity uncommon">声望 +{{ round(task.rewardReputation, 1) }}</span>
        </div>
        <p class="item-meta">完成条件：{{ describeAffiliationNeed(task) }}</p>
        <p class="item-meta">当前差口：{{ describeAffiliationGap(task) }}</p>
        <p class="item-meta">{{ describeAffiliationReward(task) }}</p>
        <div class="item-actions">
          <button class="item-button" :class="canCompleteAffiliation(task.id) ? 'is-route' : ''" :disabled="!canCompleteAffiliation(task.id)" @click="doCompleteAffiliation(task.id)">
            {{ canCompleteAffiliation(task.id) ? '完成差使' : '条件未满足' }}
          </button>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">{{ currentAffiliation ? '今天这方势力还没有新的差使。' : '先投一家势力，才会有正式差使可做。' }}</div>
  </div>

  <!-- Player Faction -->
  <h3 class="subsection-title">自家势力</h3>
  <template v-if="playerFaction">
    <div class="summary-grid">
      <div class="summary-box"><span>自家势力</span><strong>{{ playerFaction.name }}</strong></div>
      <div class="summary-box"><span>势力等级</span><strong>{{ playerFaction.level }}</strong></div>
      <div class="summary-box"><span>地盘影响</span><strong>{{ round(playerFaction.influence, 1) }}</strong></div>
      <div class="summary-box"><span>势力金库</span><strong>{{ formatNumber(playerFaction.treasury) }}</strong></div>
      <div class="summary-box"><span>补给</span><strong>{{ formatNumber(playerFaction.supplies) }}</strong></div>
      <div class="summary-box"><span>骨干成员</span><strong>{{ playerFaction.members.length }}</strong></div>
    </div>
    <div class="world-grid">
      <div v-for="(branch, key) in PLAYER_FACTION_BRANCHES" :key="key" class="world-card">
        <span>{{ branch.label }}</span>
        <strong>{{ playerFaction.branches[key as string] || 0 }} 级</strong>
        <p class="item-meta">{{ branch.desc }}</p>
        <div class="item-actions">
          <button class="item-button" @click="doUpgradeBranch(key as string)">扩张 {{ branch.baseCost * ((playerFaction.branches[key as string] || 0) + 1) }} 灵石</button>
        </div>
      </div>
    </div>
    <h3 class="subsection-title">自家势力任务</h3>
    <div class="inventory-grid industry-stack">
      <template v-if="factionMissions.length">
        <div v-for="task in factionMissions" :key="task.id" class="item-card">
          <div class="item-top">
            <div>
              <h3 class="item-title">{{ task.title }}</h3>
              <p class="item-meta">{{ task.desc }}</p>
            </div>
          </div>
          <div class="item-actions">
            <button class="item-button" @click="doCompleteFactionMission(task.id)">推动势力事务</button>
          </div>
        </div>
      </template>
      <div v-else class="empty-state">今天这摊子暂时没有新增差事。</div>
    </div>
  </template>
  <template v-else>
    <div class="combat-card standout">
      <p class="auction-meta">你可以另拉一张自己的江湖网络，需求：声望 22、灵石 900、至少练力境。</p>
      <div class="auction-actions">
        <button class="item-button" @click="doCreateFaction">拉起自家势力</button>
      </div>
    </div>
  </template>

  <!-- Sect -->
  <h3 class="subsection-title">宗门</h3>
  <template v-if="sect">
    <div class="summary-grid">
      <div class="summary-box"><span>宗门名称</span><strong>{{ sect.name }}</strong></div>
      <div class="summary-box"><span>宗门等级</span><strong>{{ sect.level }}</strong></div>
      <div class="summary-box"><span>威望</span><strong>{{ formatNumber(sect.prestige) }}</strong></div>
      <div class="summary-box"><span>府库</span><strong>{{ formatNumber(sect.treasury) }}</strong></div>
      <div class="summary-box"><span>粮草</span><strong>{{ formatNumber(sect.food) }}</strong></div>
      <div class="summary-box"><span>亲传弟子</span><strong>{{ sect.disciples.length }}</strong></div>
    </div>
    <h3 class="subsection-title">宗门任务</h3>
    <div class="inventory-grid industry-stack">
      <template v-if="sectMissions.length">
        <div v-for="task in sectMissions" :key="task.id" class="item-card">
          <div class="item-top">
            <div>
              <h3 class="item-title">{{ task.title }}</h3>
              <p class="item-meta">{{ task.desc }}</p>
            </div>
          </div>
          <div class="item-actions">
            <button class="item-button" @click="doCompleteSectMission(task.id)">处理宗门差使</button>
          </div>
        </div>
      </template>
      <div v-else class="empty-state">今天门中暂无额外差使。</div>
    </div>
    <h3 class="subsection-title">宗门建筑</h3>
    <div class="world-grid">
      <div v-for="(building, key) in SECT_BUILDINGS" :key="key" class="world-card">
        <span>{{ building.label }}</span>
        <strong>{{ sect.buildings[key as string] || 0 }} 级</strong>
        <p class="item-meta">{{ building.desc }}</p>
        <div class="item-actions">
          <button class="item-button" @click="doUpgradeBuilding(key as string)">
            升级 {{ building.baseCost * ((sect.buildings[key as string] || 0) + 1) }} 灵石
          </button>
        </div>
      </div>
    </div>
    <h3 class="subsection-title">藏经阁</h3>
    <div class="inventory-grid">
      <template v-if="sect.manualLibrary.length">
        <div v-for="manualId in sect.manualLibrary" :key="manualId" class="item-card">
          <div class="item-top">
            <div>
              <h3 class="item-title">{{ getItemName(manualId) }}</h3>
              <p class="item-meta">{{ getItemDesc(manualId) }}</p>
            </div>
          </div>
        </div>
      </template>
      <div v-else class="empty-state">藏经阁尚无功法，可先从行囊中收入秘籍。</div>
    </div>
    <h3 class="subsection-title">门下弟子</h3>
    <div class="npc-grid">
      <template v-if="sect.disciples.length">
        <div v-for="npcId in sect.disciples" :key="npcId" class="npc-card">
          <template v-if="store.getNpc(npcId)">
            <div class="npc-top">
              <div>
                <h3 class="npc-name">{{ store.getNpc(npcId)!.name }}</h3>
                <p class="npc-meta">{{ store.getNpc(npcId)!.profession || store.getNpc(npcId)!.title }} · {{ getRankName(store.getNpc(npcId)!.rankIndex) }}</p>
              </div>
              <span class="trait-chip">修为 {{ formatNumber(store.getNpc(npcId)!.cultivation) }}</span>
            </div>
            <p class="npc-meta">最近动向：{{ store.getNpc(npcId)!.lastEvent }}</p>
            <div class="teaching-actions">
              <template v-if="sect.manualLibrary.length">
                <button v-for="mid in sect.manualLibrary" :key="mid" class="npc-button" @click="doTeach(npcId, mid)">
                  传授{{ getItemName(mid) }}
                </button>
              </template>
              <span v-else class="muted">藏经阁暂无可传功法</span>
            </div>
          </template>
        </div>
      </template>
      <div v-else class="empty-state">门下暂无亲传弟子，先去江湖中收人。</div>
    </div>
  </template>
  <template v-else>
    <div class="combat-card standout">
      <p class="auction-meta">
        宗门是你独占的一脉根基。需求：至少筑基、声望 68、灵石 3800、立宗旗幡 1。
        当前：境界 {{ getRankName(player.rankIndex) }}、声望 {{ formatNumber(player.reputation) }}、灵石 {{ formatNumber(player.money) }}。
      </p>
      <div class="auction-actions"><button class="item-button" @click="doCreateSect">开宗立门</button></div>
    </div>
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

const store = useGameStore()
const { player, world, currentAffiliation, playerFaction, sect } = storeToRefs(store)

function getRankName(idx: number) { return RANKS[Math.min(idx, RANKS.length - 1)].name }
function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }
function getItemName(id: string) { return getItem(id)?.name || id }
function getItemDesc(id: string) { return getItem(id)?.desc || '' }

const affiliationTasks = computed(() => currentAffiliation.value ? refreshAffiliationTasks() : [])
const factionMissions = computed(() => playerFaction.value ? refreshPlayerFactionMissions() : [])
const sectMissions = computed(() => sect.value ? refreshSectMissions() : [])

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
