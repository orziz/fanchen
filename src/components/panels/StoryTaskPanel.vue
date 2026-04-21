<template>
  <p class="panel-intro">把眼下剧情和各路委托收在一处，先看哪条线待续、哪摊差事能立刻落手。</p>

  <UiMetricGrid :items="storyTaskSummaryItems" />

  <div class="panel-section-nav">
    <button
      v-for="section in storyTaskSections"
      :key="section.key"
      :class="['panel-section-button', { active: activeStoryTaskSection === section.key }]"
      type="button"
      @click="activeStoryTaskSection = section.key"
    >
      <span>{{ section.label }}</span>
      <strong class="panel-section-button__count">{{ section.count }}</strong>
    </button>
  </div>
  <p class="panel-section-copy">{{ activeStoryTaskSectionMeta.desc }}</p>

  <template v-if="activeStoryTaskSection === 'story'">
    <h3 class="subsection-title">剧情时间线</h3>
    <div class="inventory-grid industry-stack">
      <template v-if="storyTimelineEntries.length">
        <UiPanelCard
          v-for="entry in storyTimelineEntries"
          :key="entry.key"
          :tone="entry.kind === 'ongoing' ? 'combat' : 'item'"
          :standout="entry.kind === 'ongoing'"
        >
          <UiCardHeader :title="entry.title" :title-class="entry.kind === 'ongoing' ? 'auction-title' : 'item-title'">
            <template #aside>
              <UiPill variant="trait" :tone="entry.kind === 'ongoing' ? 'route' : undefined">{{ entry.badge }}</UiPill>
            </template>
          </UiCardHeader>
          <p v-if="entry.summary" class="auction-meta">{{ entry.summary }}</p>
          <p v-if="entry.speaker" class="item-meta">{{ entry.speaker }}</p>
          <p class="item-meta">{{ entry.text }}</p>
          <UiActionGroup v-if="entry.kind === 'ongoing'">
            <button class="item-button is-route" @click="openCurrentStory()">继续剧情</button>
          </UiActionGroup>
        </UiPanelCard>
      </template>
      <div v-else class="empty-state">眼下没有悬着的剧情线，可先去江湖里继续碰门路。</div>
    </div>
  </template>

  <template v-if="activeStoryTaskSection === 'tasks'">
    <template v-if="totalTaskCount">
      <template v-if="affiliationTasks.length">
        <h3 class="subsection-title">势力差使</h3>
        <div class="inventory-grid industry-stack">
          <UiPanelCard v-for="task in affiliationTasks" :key="task.id" tone="item">
            <UiCardHeader :title="task.title" title-class="item-title">
              <template #aside>
                <UiPill variant="rarity" tone="uncommon">势力</UiPill>
              </template>
            </UiCardHeader>
            <p class="item-meta">{{ task.desc }}</p>
            <p class="item-meta">当前差口：{{ explainAffiliationTask(task.id) }}</p>
            <p class="item-meta">{{ getAffiliationReward(task) }}</p>
            <UiActionGroup>
              <button class="item-button" :class="canCompleteAffiliationTask(task.id) ? 'is-route' : ''" :disabled="!canCompleteAffiliationTask(task.id)" :title="explainAffiliationTask(task.id)" @click="completeAffiliationTask(task.id)">
                {{ canCompleteAffiliationTask(task.id) ? '完成差使' : '条件未满足' }}
              </button>
            </UiActionGroup>
          </UiPanelCard>
        </div>
      </template>

      <template v-if="factionMissions.length">
        <h3 class="subsection-title">自家势力任务</h3>
        <div class="inventory-grid industry-stack">
          <UiPanelCard v-for="task in factionMissions" :key="task.id" tone="item">
            <UiCardHeader :title="task.title" title-class="item-title">
              <template #aside>
                <UiPill variant="rarity" tone="rare">自家势力</UiPill>
              </template>
            </UiCardHeader>
            <p class="item-meta">{{ task.desc }}</p>
            <p class="item-meta">当前差口：{{ explainPlayerFactionMission(task.id) }}</p>
            <p class="item-meta">{{ getFactionMissionReward(task) }}</p>
            <UiActionGroup>
              <button class="item-button" :class="canCompletePlayerFactionMission(task.id) ? 'is-route' : ''" :disabled="!canCompletePlayerFactionMission(task.id)" :title="explainPlayerFactionMission(task.id)" @click="completePlayerFactionMission(task.id)">
                {{ canCompletePlayerFactionMission(task.id) ? '推动事务' : '条件未满足' }}
              </button>
            </UiActionGroup>
          </UiPanelCard>
        </div>
      </template>

      <template v-if="sectMissions.length">
        <h3 class="subsection-title">宗门差使</h3>
        <div class="inventory-grid industry-stack">
          <UiPanelCard v-for="task in sectMissions" :key="task.id" tone="item">
            <UiCardHeader :title="task.title" title-class="item-title">
              <template #aside>
                <UiPill variant="rarity" tone="epic">宗门</UiPill>
              </template>
            </UiCardHeader>
            <p class="item-meta">{{ task.desc }}</p>
            <p class="item-meta">当前差口：{{ explainSectMission(task.id) }}</p>
            <p class="item-meta">{{ getSectMissionReward(task) }}</p>
            <UiActionGroup>
              <button class="item-button" :class="canCompleteSectMission(task.id) ? 'is-route' : ''" :disabled="!canCompleteSectMission(task.id)" :title="explainSectMission(task.id)" @click="completeSectMission(task.id)">
                {{ canCompleteSectMission(task.id) ? '处理差使' : '条件未满足' }}
              </button>
            </UiActionGroup>
          </UiPanelCard>
        </div>
      </template>

      <template v-if="industryOrders.length">
        <h3 class="subsection-title">行会单</h3>
        <div class="inventory-grid industry-stack">
          <UiPanelCard v-for="order in industryOrders" :key="order.id" tone="item">
            <UiCardHeader :title="order.title" title-class="item-title">
              <template #aside>
                <UiPill variant="rarity" tone="common">行会</UiPill>
              </template>
            </UiCardHeader>
            <p class="item-meta">{{ order.factionName }} · {{ order.desc }}</p>
            <p class="item-meta">交付：{{ formatIndustryRequirements(order) }}</p>
            <p class="item-meta">当前差口：{{ explainIndustryOrder(order.id) }}</p>
            <p class="item-meta">报酬 {{ order.rewardMoney }} 灵石 · 声望 +{{ formatNumber(order.rewardReputation) }}</p>
            <UiActionGroup>
              <button class="item-button" :class="canFulfillIndustryOrder(order.id) ? 'is-route' : ''" :disabled="!canFulfillIndustryOrder(order.id)" :title="explainIndustryOrder(order.id)" @click="fulfillIndustryOrder(order.id)">
                {{ canFulfillIndustryOrder(order.id) ? '交付订单' : '货物未齐' }}
              </button>
            </UiActionGroup>
          </UiPanelCard>
        </div>
      </template>
    </template>
    <div v-else class="empty-state">眼下没有挂在桌上的委托，先去江湖里跑动，新的机会会随着局势浮出来。</div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { TIME_LABELS, getItem } from '@/config'
import { formatNumber } from '@/utils'
import { getActiveStoryScene, getSuspendedStoryScene, resumeSuspendedStory, showStoryOverlay } from '@/systems/story'
import { canFulfillIndustryOrder, explainIndustryOrder, fulfillIndustryOrder, refreshIndustryOrders } from '@/systems/industry'
import {
  canCompleteAffiliationTask,
  completeAffiliationTask,
  explainAffiliationTask,
  refreshAffiliationTasks,
} from '@/systems/social/faction'
import {
  canCompletePlayerFactionMission,
  completePlayerFactionMission,
  explainPlayerFactionMission,
  refreshPlayerFactionMissions,
} from '@/systems/social/playerFaction'
import {
  canCompleteSectMission,
  completeSectMission,
  explainSectMission,
  refreshSectMissions,
} from '@/systems/social/sect'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiMetricGrid from '@/components/ui/UiMetricGrid.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import type { IndustryOrder, SectMission } from '@/types/game'

type StoryTaskSectionKey = 'story' | 'tasks'
type TaskCardLike = SectMission & { title: string; desc: string }
type StoryTimelineEntry = {
  key: string
  kind: 'ongoing' | 'history'
  title: string
  speaker: string
  text: string
  summary: string
  badge: string
}

const store = useGameStore()
const { player, story, currentAffiliation, playerFaction, sect } = storeToRefs(store)

const activeStoryTaskSection = ref<StoryTaskSectionKey>('story')

const activeStoryScene = computed(() => {
  story.value
  return getActiveStoryScene()
})

const suspendedStoryScene = computed(() => {
  story.value
  return getSuspendedStoryScene()
})

const currentStoryCard = computed(() => {
  if (activeStoryScene.value) {
    return {
      scene: activeStoryScene.value,
      stateLabel: story.value.presentation === 'overlay' ? '进行中' : '待续',
    }
  }
  if (suspendedStoryScene.value) {
    return {
      scene: suspendedStoryScene.value,
      stateLabel: '已收起',
    }
  }
  return null
})

const recentStoryHistory = computed(() => story.value.history.slice(0, 6))
const storyTimelineEntries = computed<StoryTimelineEntry[]>(() => {
  const activeEntry = currentStoryCard.value
    ? {
        key: `ongoing-${currentStoryCard.value.scene.storyId}-${currentStoryCard.value.scene.text}`,
        kind: 'ongoing' as const,
        title: currentStoryCard.value.scene.title,
        speaker: currentStoryCard.value.scene.speaker,
        text: currentStoryCard.value.scene.text,
        summary: currentStoryCard.value.scene.summary,
        badge: currentStoryCard.value.stateLabel,
      }
    : null

  const historyEntries = recentStoryHistory.value
    .filter((entry) => {
      if (!activeEntry) return true
      return !(
        entry.title === activeEntry.title
        && entry.speaker === activeEntry.speaker
        && entry.text === activeEntry.text
      )
    })
    .map((entry, index) => ({
      key: `${entry.progressKey}-${entry.nodeId}-${entry.day}-${entry.hour}-${index}`,
      kind: 'history' as const,
      title: entry.title,
      speaker: entry.speaker,
      text: entry.text,
      summary: '',
      badge: getStoryTimeLabel(entry.day, entry.hour),
    }))

  return activeEntry ? [activeEntry, ...historyEntries] : historyEntries
})

const affiliationTasks = computed(() => refreshAffiliationTasks() as unknown as TaskCardLike[])
const factionMissions = computed(() => refreshPlayerFactionMissions() as unknown as TaskCardLike[])
const sectMissions = computed(() => refreshSectMissions() as unknown as TaskCardLike[])
const industryOrders = computed(() => refreshIndustryOrders() as IndustryOrder[])

const totalTaskCount = computed(() => (
  affiliationTasks.value.length
  + factionMissions.value.length
  + sectMissions.value.length
  + industryOrders.value.length
))

const currentLeadLabel = computed(() => {
  if (currentStoryCard.value) return currentStoryCard.value.scene.title
  if (recentStoryHistory.value[0]) return recentStoryHistory.value[0].title
  return '暂无新线'
})

const routeLabel = computed(() => {
  if (currentAffiliation.value) return currentAffiliation.value.name
  if (playerFaction.value) return playerFaction.value.name
  if (sect.value) return sect.value.name
  return '仍在摸路'
})

const storyTaskSummaryItems = computed(() => [
  { label: '当前线头', value: currentLeadLabel.value },
  { label: '待办委托', value: totalTaskCount.value },
  { label: '剧情条目', value: storyTimelineEntries.value.length },
  { label: '当前门路', value: routeLabel.value },
])

const storyTaskSections = computed(() => ([
  {
    key: 'story' as const,
    label: '剧情',
    count: storyTimelineEntries.value.length,
    desc: '剧情只走一条时间线：未完的放在最前，已经历过的顺着往后排，不再把同一条线拆成两处。',
  },
  {
    key: 'tasks' as const,
    label: '委托',
    count: totalTaskCount.value,
    desc: '把势力差使、自家势力任务、宗门差使和行会单并排收进一页，先挑能立刻落手的。',
  },
]))

const activeStoryTaskSectionMeta = computed(() => (
  storyTaskSections.value.find(section => section.key === activeStoryTaskSection.value) || storyTaskSections.value[0]
))

function openCurrentStory() {
  if (suspendedStoryScene.value) {
    resumeSuspendedStory('overlay')
    return
  }
  showStoryOverlay()
}

function getStoryTimeLabel(day: number, hour: number) {
  return `第${day}日 · ${TIME_LABELS[hour] || `${hour}时`}`
}

function getAffiliationReward(task: TaskCardLike) {
  return `报酬 ${formatNumber(Number(task.rewardMoney) || 0)} 灵石 · 声望 +${formatNumber(Number(task.rewardReputation) || 0)}`
}

function getFactionMissionReward(task: TaskCardLike) {
  const rewardParts = [
    Number(task.rewardTreasury) ? `库银 +${formatNumber(Number(task.rewardTreasury) || 0)}` : '',
    Number(task.rewardSupplies) ? `补给 +${formatNumber(Number(task.rewardSupplies) || 0)}` : '',
    Number(task.rewardInfluence) ? `影响 +${formatNumber(Number(task.rewardInfluence) || 0)}` : '',
    Number(task.rewardPrestige) ? `威望 +${formatNumber(Number(task.rewardPrestige) || 0)}` : '',
  ].filter(Boolean)
  return rewardParts.length ? rewardParts.join(' · ') : '办妥后能把自家盘子往外再撑一截。'
}

function getSectMissionReward(task: TaskCardLike) {
  const rewardParts = [
    Number(task.rewardTreasury) ? `库藏 +${formatNumber(Number(task.rewardTreasury) || 0)}` : '',
    Number(task.rewardFood) ? `粮储 +${formatNumber(Number(task.rewardFood) || 0)}` : '',
    Number(task.rewardPrestige) ? `宗门威望 +${formatNumber(Number(task.rewardPrestige) || 0)}` : '',
    Number(task.rewardReputation) ? `声望 +${formatNumber(Number(task.rewardReputation) || 0)}` : '',
  ].filter(Boolean)
  return rewardParts.length ? rewardParts.join(' · ') : '办妥后能替宗门把根基再坐实一分。'
}

function formatIndustryRequirements(order: IndustryOrder) {
  const requirements = Array.isArray(order.requirements) ? order.requirements : []
  return requirements.map((entry: any) => `${getItem(entry.itemId)?.name || entry.itemId} x${entry.quantity}`).join('、')
}
</script>