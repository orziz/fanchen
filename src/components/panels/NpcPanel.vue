<template>
  <p class="panel-intro">江湖人各有性情、家底和打算。你能与他们结交、结仇、收徒，也能把合适的人拉进自家门路。</p>
  <div class="npc-grid">
    <UiPanelCard v-for="npc in sortedNpcs" :key="npc.id" tone="npc">
      <UiCardHeader :title="npc.name" title-class="npc-name">
        <template #aside>
          <UiPillRow>
            <UiPill variant="trait">身份 {{ getRoleLabel(getRelation(npc.id).role) }}</UiPill>
            <UiPill variant="trait">财富 {{ formatNumber(npc.wealth) }}</UiPill>
          </UiPillRow>
        </template>
      </UiCardHeader>
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
        <button class="npc-button" @click="doVisit(npc.id)">{{ getVisitLabel(npc.id) }}</button>
        <button class="npc-button" @click="doFocus(npc.id)">查看所在地点</button>
        <button class="npc-button" @click="doRecruit(npc.id)">收为弟子</button>
        <button class="npc-button" @click="doRecruitFaction(npc.id)">招入自家势力</button>
        <button class="npc-button" @click="doMaster(npc.id)">拜其为师</button>
        <button class="npc-button" @click="doPartner(npc.id)">结为道侣</button>
        <button class="npc-button" @click="doRival(npc.id)">立为仇敌</button>
      </UiActionGroup>
    </UiPanelCard>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RANKS, LOCATION_MAP, FACTION_MAP } from '@/config'
import { formatNumber } from '@/utils'
import { getRoleLabel } from '@/composables/useUIHelpers'
import { useStage } from '@/composables/useStage'
import {
  visitNpc, recruitDisciple, recruitFactionMember,
  becomeMasterBond, becomePartner, declareRival,
} from '@/systems/social'
import { hasNpcVisitStory } from '@/systems/story'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const { npcs, player, selectedLocationId } = storeToRefs(store)
const { setTab } = useStage()

const sortedNpcs = computed(() =>
  [...npcs.value].sort((a, b) => getRelation(b.id).affinity - getRelation(a.id).affinity)
)

function getRelation(npcId: string) {
  return player.value.relations[npcId] || { affinity: 0, trust: 0, romance: 0, rivalry: 0, role: 'none' }
}

function getRankName(idx: number) { return RANKS[Math.min(idx, RANKS.length - 1)].name }
function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }
function getFactionName(id: string) { return FACTION_MAP.get(id)?.name || '未知势力' }
function getVisitLabel(id: string) { return hasNpcVisitStory(id) ? '对话' : '拜访' }

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
</script>
