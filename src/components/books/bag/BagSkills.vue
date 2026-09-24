<template>
  <div class="bag-skills">
    <section class="skill-hero" :class="currentHeart ? `rarity--${currentHeart.rarity}` : 'is-empty'">
      <span class="skill-hero__kicker">所运心法</span>
      <h3 class="skill-hero__name">{{ currentHeart ? currentHeart.name : '尚未启用' }}</h3>
      <p class="skill-hero__desc">{{ currentHeart ? currentHeart.desc : '研习一门心法秘籍并启用，静坐修炼时便会随之精进，也会抬高各项根基。' }}</p>
      <template v-if="currentHeart">
        <InkBar label="熟练" tone="breakthrough" :value="mastery(currentHeart.id)" :max="100" :text="`${mastery(currentHeart.id)}%`" />
        <p class="skill-hero__effect">{{ effectText(currentHeart.id) }}</p>
      </template>
    </section>

    <section class="skill-section">
      <h4 class="sheet__heading">已学功法</h4>
      <div v-if="techniques.length" class="skill-list">
        <article v-for="entry in techniques" :key="entry.technique.id" class="skill-card" :class="`rarity--${entry.technique.rarity}`">
          <header class="skill-card__head">
            <GameIcon :name="entry.technique.kind === 'heart' ? 'meditate' : 'spell'" />
            <strong>{{ entry.technique.name }}</strong>
            <span class="tag" :class="entry.technique.kind === 'heart' ? 'tag--jade' : 'tag--azure'">{{ kindLabel(entry.technique.kind) }}</span>
            <span class="tag">{{ rarityLabel(entry.technique.rarity) }}</span>
          </header>
          <p class="skill-card__desc">{{ entry.technique.desc }}</p>
          <InkBar label="熟练" tone="breakthrough" :value="mastery(entry.technique.id)" :max="100" :text="`${mastery(entry.technique.id)}%${mastered(entry.technique.id) ? ' · 圆满' : ''}`" compact />
          <dl class="skill-card__facts">
            <div><dt>当前</dt><dd>{{ effectText(entry.technique.id) || '暂无' }}</dd></div>
            <div><dt>圆满</dt><dd>{{ bonusText(entry.technique.id) || '无额外加成' }}</dd></div>
            <div v-if="mastered(entry.technique.id)"><dt>誊抄</dt><dd>{{ scribeCost(entry.technique.id) || '—' }}</dd></div>
          </dl>
          <div class="skill-card__actions">
            <button
              v-if="entry.technique.kind === 'heart'"
              class="ink-btn ink-btn--small"
              :class="{ 'ink-btn--primary': player.equipment.heart !== entry.technique.id }"
              type="button"
              :aria-disabled="player.equipment.heart === entry.technique.id"
              @click="equip(entry.technique.id)"
            >{{ player.equipment.heart === entry.technique.id ? '正在运转' : '启用心法' }}</button>
            <button
              v-if="mastered(entry.technique.id)"
              class="ink-btn ink-btn--small"
              type="button"
              :aria-disabled="!canScribe(entry.technique.id)"
              :data-tip="scribeIssues(entry.technique.id) || '誊写一册，可自用、出售或传人'"
              @click="scribe(entry.technique.id)"
            >誊写秘籍</button>
          </div>
        </article>
      </div>
      <p v-else class="empty-note">还没学会任何功法。秘籍可在市集、拍卖、秘境与机缘中得来。</p>
    </section>

    <section class="skill-section">
      <h4 class="sheet__heading">学识札记</h4>
      <div v-if="knowledges.length" class="skill-list">
        <article v-for="entry in knowledges" :key="entry.knowledge.id" class="skill-card" :class="`rarity--${entry.knowledge.rarity}`">
          <header class="skill-card__head">
            <GameIcon name="scroll" />
            <strong>{{ entry.knowledge.name }}</strong>
            <span class="tag">{{ rarityLabel(entry.knowledge.rarity) }}</span>
          </header>
          <p class="skill-card__desc">{{ entry.knowledge.desc }}</p>
          <p class="skill-card__effect">{{ describe(entry.knowledge.effect) || '开阔见识' }} · 第{{ entry.learnedDay }}日读毕</p>
        </article>
      </div>
      <p v-else class="empty-note">尚未研读学识札记。多读几卷，手艺与见识自然渐长。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RARITY_META, getTechnique } from '@/config'
import { describeTechniqueEffect, getTechniqueKindLabel } from '@/composables/useUIHelpers'
import { getLearnedKnowledges } from '@/systems/knowledge'
import {
  canScribeTechnique, equipHeartTechnique, getLearnedTechniques, getScribeTechniqueCostText, getScribeTechniqueIssues,
  getTechniqueCurrentEffect, getTechniqueMasteryPercent, getTechniqueStageBonusEffect, hasUnlockedScribeTechnique, scribeTechnique,
} from '@/systems/techniques'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'
import InkBar from '@/components/common/InkBar.vue'

const store = useGameStore()
const { player } = storeToRefs(store)

const currentHeart = computed(() => (player.value.equipment.heart ? getTechnique(player.value.equipment.heart) || null : null))
const techniques = computed(() => {
  void player.value.learnedTechniques
  return getLearnedTechniques()
})
const knowledges = computed(() => {
  void player.value.learnedKnowledges
  return getLearnedKnowledges()
})

const kindLabel = (kind: string) => getTechniqueKindLabel(kind)
const rarityLabel = (rarity: string) => RARITY_META[rarity]?.label || '凡品'
const describe = (effect: Record<string, number>) => describeTechniqueEffect(effect)
const mastery = (id: string) => getTechniqueMasteryPercent(id)
const mastered = (id: string) => hasUnlockedScribeTechnique(id)
const effectText = (id: string) => describeTechniqueEffect(getTechniqueCurrentEffect(id))
const bonusText = (id: string) => describeTechniqueEffect(getTechniqueStageBonusEffect(id))
const scribeCost = (id: string) => getScribeTechniqueCostText(id)
const scribeIssues = (id: string) => getScribeTechniqueIssues(id).join('；')
const canScribe = (id: string) => canScribeTechnique(id)

function equip(id: string) {
  if (player.value.equipment.heart === id) return
  sfx.confirm()
  equipHeartTechnique(id)
}

function scribe(id: string) {
  if (!canScribe(id)) {
    sfx.deny()
    return
  }
  sfx.confirm()
  scribeTechnique(id)
}
</script>
