<template>
  <article v-if="npc" class="npc-detail">
    <header class="faction-detail__head">
      <SealAvatar :name="known ? npc.name : '？'" :seed="npc.id" size="lg" :variant="relation.role !== 'none' ? 'cinnabar' : 'ink'" />
      <div>
        <h3>{{ known ? npc.name : '面生之人' }}</h3>
        <p v-if="met">{{ npc.title }} · {{ npc.profession || '江湖人' }} · {{ npc.personalityLabel }} · {{ rankName }}</p>
        <p v-else-if="known">只闻其名，尚未照面</p>
        <p v-else>此人就在{{ locationName }}，还没打过交道</p>
      </div>
    </header>

    <template v-if="met">
      <p class="faction-detail__desc">{{ npc.personalityDesc }}</p>
      <dl class="fact-list">
        <div><dt>所在</dt><dd>{{ locationName }}</dd></div>
        <div><dt>年岁</dt><dd>{{ npc.lifeStage }} · {{ npc.age }} 岁</dd></div>
        <div><dt>归属</dt><dd>{{ factionName }}</dd></div>
        <div><dt>家底</dt><dd class="num">{{ wealth }}</dd></div>
        <div><dt>所图</dt><dd>{{ npc.goal }}</dd></div>
        <div><dt>近况</dt><dd>{{ npc.lastEvent }}</dd></div>
      </dl>

      <section>
        <h4 class="sheet__heading">交情</h4>
        <div class="relation-bars">
          <RelationBar label="好感" :value="relation.affinity" />
          <RelationBar label="信任" :value="relation.trust" />
          <RelationBar label="情缘" :value="relation.romance" />
          <RelationBar label="仇怨" :value="relation.rivalry" negative />
        </div>
        <div class="trait-row">
          <span class="tag">贪念 {{ npc.mood.greed }}</span>
          <span class="tag">仁心 {{ npc.mood.kindness }}</span>
          <span class="tag">胆魄 {{ npc.mood.courage }}</span>
          <span class="tag">耐性 {{ npc.mood.patience }}</span>
        </div>
        <p v-if="lifeEvents" class="sheet__note">近年：{{ lifeEvents }}</p>
      </section>
    </template>

    <section class="npc-detail__actions">
      <button class="ink-btn ink-btn--primary" type="button" :aria-disabled="!here" :data-tip="here ? '上前说话，耗一日' : `${npc.name}眼下在${locationName}，得先赶过去`" @click="visit">{{ visitLabel }}</button>
      <button class="ink-btn" type="button" @click="locate"><GameIcon name="target" />山河图上找</button>
      <template v-if="met">
        <button v-for="bond in bonds" :key="bond.key" class="ink-btn" type="button" :aria-disabled="!bond.ok" :data-tip="bond.reason" @click="runBond(bond.key, bond.ok)">{{ bond.label }}</button>
        <button class="ink-btn ink-btn--danger" type="button" @click="confirmRival = !confirmRival">立为仇敌</button>
      </template>
    </section>
    <p v-if="confirmRival" class="faction-detail__warn">
      从此与{{ npc.name }}势不两立，交情难再挽回。
      <button class="ink-btn ink-btn--small ink-btn--danger" type="button" @click="rival">决意如此</button>
    </p>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { FACTION_MAP, LOCATION_MAP, PLAYER_SECT_ENABLED, RANKS } from '@/config'
import { formatNumber } from '@/utils'
import {
  becomeMasterBond, becomePartner, canBecomeMaster, canBecomePartner, canRecruitDisciple, canRecruitFactionMember, declareRival,
  explainMasterBond, explainPartnerBond, explainRecruitDisciple, explainRecruitFactionMember, recruitDisciple, recruitFactionMember,
} from '@/systems/social'
import { hasNpcVisitStory } from '@/systems/story'
import { useBooks } from '@/composables/useBooks'
import { visitPerson } from '@/systems/life/activities'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'
import SealAvatar from '@/components/common/SealAvatar.vue'
import RelationBar from '@/components/books/people/RelationBar.vue'

const props = defineProps<{ npcId: string }>()

const store = useGameStore()
const { player, selectedLocationId, world } = storeToRefs(store)
const { openBook, closeBook } = useBooks()
const confirmRival = ref(false)

const npc = computed(() => store.getNpc(props.npcId))
const met = computed(() => player.value.npcIntel[props.npcId] === 'met')
const known = computed(() => Boolean(player.value.npcIntel[props.npcId]))
const here = computed(() => npc.value?.locationId === player.value.locationId)
const relation = computed(() => player.value.relations[props.npcId] || { affinity: 0, trust: 0, romance: 0, rivalry: 0, role: 'none' })
const rankName = computed(() => RANKS[Math.min(npc.value?.rankIndex || 0, RANKS.length - 1)].name)
const locationName = computed(() => LOCATION_MAP.get(npc.value?.locationId || '')?.name || '')
const factionName = computed(() => (npc.value?.factionId ? FACTION_MAP.get(npc.value.factionId)?.name || '某方势力' : '尚无'))
const wealth = computed(() => formatNumber(npc.value?.wealth || 0))
const lifeEvents = computed(() => (npc.value?.lifeEvents || []).slice(-2).join('；'))
const visitLabel = computed(() => (hasNpcVisitStory(props.npcId) ? '有话要说' : met.value ? '拜访' : '上前结识'))

const bonds = computed(() => {
  void world.value.day
  void relation.value.affinity
  const list = [
    { key: 'master', label: '拜其为师', ok: canBecomeMaster(props.npcId), reason: explainMasterBond(props.npcId) },
    { key: 'partner', label: '结为道侣', ok: canBecomePartner(props.npcId), reason: explainPartnerBond(props.npcId) },
  ]
  if (PLAYER_SECT_ENABLED) list.push({ key: 'disciple', label: '收为弟子', ok: canRecruitDisciple(props.npcId), reason: explainRecruitDisciple(props.npcId) })
  return list
})

function visit() {
  if (!here.value || !visitPerson(props.npcId)) {
    sfx.deny()
    return
  }
  sfx.confirm()
  closeBook()
}

function locate() {
  if (!npc.value) return
  sfx.page()
  selectedLocationId.value = npc.value.locationId
  openBook('map', 'map')
}

function runBond(key: string, ok: boolean) {
  if (!ok) {
    sfx.deny()
    return
  }
  sfx.chime()
  if (key === 'master') becomeMasterBond(props.npcId)
  else if (key === 'partner') becomePartner(props.npcId)
  else if (key === 'faction') recruitFactionMember(props.npcId)
  else if (key === 'disciple') recruitDisciple(props.npcId)
}

function rival() {
  sfx.deny()
  confirmRival.value = false
  declareRival(props.npcId)
}
</script>
