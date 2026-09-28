<template>
  <div class="task-board">
    <p v-if="!currentAffiliation" class="empty-note">还没投靠哪一家，自然没有差使可领。先在“投势”里挑一家。</p>
    <template v-else>
      <p class="sheet__note">{{ currentAffiliation.name }}今日的差使，完成后可得灵石、声望与门中立场；立场攒够便能升一阶身份。</p>
      <div v-if="tasks.length" class="task-grid">
        <article v-for="task in tasks" :key="task.id" class="task-card" :class="{ 'is-ready': task.ready }">
          <header>
            <GameIcon :name="task.icon" />
            <strong>{{ task.title }}</strong>
            <span class="tag" :class="task.ready ? 'tag--jade' : ''">{{ task.ready ? '可交' : '未齐' }}</span>
          </header>
          <p class="task-card__desc">{{ task.desc }}</p>
          <ul class="req-list">
            <li v-for="need in task.needs" :key="need" :class="{ 'is-met': task.ready }">
              <GameIcon :name="task.ready ? 'check' : 'chevronRight'" />
              <span>{{ need }}</span>
            </li>
          </ul>
          <p v-if="!task.ready" class="task-card__gap">{{ task.gap }}</p>
          <footer>
            <span class="task-card__reward">{{ task.reward }}</span>
            <button class="ink-btn ink-btn--small" :class="{ 'ink-btn--primary': task.ready }" type="button" :aria-disabled="!task.ready" :data-tip="task.ready ? undefined : task.gap" @click="complete(task.id, task.ready)">交差</button>
          </footer>
        </article>
      </div>
      <p v-else class="empty-note">今日门中无事，明日再来看看。</p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { FACTION_MAP, LOCATION_MAP, getItem } from '@/config'
import { formatNumber } from '@/utils'
import { canCompleteAffiliationTask, completeAffiliationTask, getAffiliationTaskIssues, refreshAffiliationTasks } from '@/systems/social'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { player, world, currentAffiliation } = storeToRefs(store)

const KIND_ICON: Record<string, string> = { supply: 'bag', patrol: 'defend', liaison: 'people' }

const tasks = computed(() => {
  void world.value.hour
  void player.value.inventory
  if (!currentAffiliation.value) return []
  return (refreshAffiliationTasks() as any[]).map(task => {
    const faction = FACTION_MAP.get(task.factionId)
    const needs = [`身在${LOCATION_MAP.get(faction?.locationId || player.value.locationId)?.name || ''}`]
    if (task.kind === 'supply') needs.push(`交付${getItem(task.itemId)?.name || task.itemId} ×${task.quantity}`)
    if (task.kind === 'patrol') needs.push(`体力 ${task.staminaCost}、真气 ${task.qiCost}`)
    if (task.kind === 'liaison') needs.push(`灵石 ${task.moneyCost}、本地声望 ${task.standingNeed}`)
    const issues = getAffiliationTaskIssues(task.id)
    return {
      id: task.id as string,
      title: task.title as string,
      desc: task.desc as string,
      icon: KIND_ICON[task.kind] || 'quest',
      needs,
      ready: canCompleteAffiliationTask(task.id),
      gap: issues.join('；'),
      reward: `灵石 +${task.rewardMoney} · 声望 +${formatNumber(task.rewardReputation)} · 立场 +${formatNumber(task.rewardStanding)}`,
    }
  })
})

function complete(id: string, ready: boolean) {
  if (!ready) {
    sfx.deny()
    return
  }
  sfx.coin()
  completeAffiliationTask(id)
}
</script>
