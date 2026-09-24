<template>
  <aside v-if="item" class="item-detail" :class="`rarity--${item.rarity}`">
    <div class="item-detail__head">
      <span class="item-detail__icon"><GameIcon :name="icon" /></span>
      <div>
        <h3 class="item-detail__name">{{ item.name }}</h3>
        <p class="item-detail__meta">
          <span class="rarity-label">{{ rarityLabel }}</span>
          <span>{{ typeLabel }}</span>
          <span>{{ tier }}阶</span>
          <span v-if="quantity > 1" class="num">持有 {{ quantity }}</span>
        </p>
      </div>
    </div>

    <p class="item-detail__desc">{{ item.desc }}</p>

    <dl class="item-detail__facts">
      <div v-if="effectText"><dt>效用</dt><dd>{{ effectText }}</dd></div>
      <div v-else><dt>用途</dt><dd>{{ usageText }}</dd></div>
      <div v-if="item.minRankIndex > 0"><dt>境界</dt><dd>{{ rankName }}以上</dd></div>
      <div><dt>行价</dt><dd class="num">约 {{ item.baseValue }} 灵石</dd></div>
      <div><dt>此地收</dt><dd class="num">{{ sellPrice }} 灵石</dd></div>
    </dl>

    <div class="item-detail__actions">
      <button
        v-if="primary.visible"
        class="ink-btn ink-btn--primary"
        type="button"
        :aria-disabled="primary.disabled"
        :data-tip="primary.title || undefined"
        @click="usePrimary"
      >{{ primary.label }}</button>
      <button class="ink-btn" type="button" :data-tip="`在${locationName}卖出一件，得 ${sellPrice} 灵石`" @click="sell">出售一件</button>
      <button v-if="canStash" class="ink-btn" type="button" @click="stash">收入藏经阁</button>
    </div>
    <p v-if="primary.disabled && primary.title" class="item-detail__reason">{{ primary.title }}</p>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import {
  PLAYER_SECT_ENABLED, RANKS, RARITY_META, canUseItemDirectly, getItem, getItemUsageSummary, hasAssetClaimEffect,
} from '@/config'
import { iconForItemType } from '@/art/icons'
import { describeItemEffect, getItemTypeLabel } from '@/composables/useUIHelpers'
import { consumeItem, getItemSellPrice, sellItem, stashManualToSect } from '@/systems/player'
import { getKnowledgeLearnIssues, hasLearnedKnowledge } from '@/systems/knowledge'
import { getTechniqueLearnIssues, hasLearnedTechnique } from '@/systems/techniques'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const props = defineProps<{ itemId: string; quantity: number }>()

const store = useGameStore()
const { player, currentLocation } = storeToRefs(store)

const TIER_NAMES = ['零', '一', '二', '三', '四', '五', '六']

const item = computed(() => getItem(props.itemId))
const icon = computed(() => iconForItemType(item.value?.type))
const rarityLabel = computed(() => RARITY_META[item.value?.rarity || 'common']?.label || '凡品')
const typeLabel = computed(() => getItemTypeLabel(item.value))
const tier = computed(() => TIER_NAMES[item.value?.tier || 0] || item.value?.tier)
const rankName = computed(() => RANKS[Math.min(item.value?.minRankIndex || 0, RANKS.length - 1)].name)
const locationName = computed(() => currentLocation.value.name)
const effectText = computed(() => (item.value && canUseItemDirectly(item.value) ? describeItemEffect(item.value) : ''))
const usageText = computed(() => (item.value ? getItemUsageSummary(item.value) : ''))
const sellPrice = computed(() => {
  void currentLocation.value.id
  return getItemSellPrice(props.itemId)
})
const canStash = computed(() => PLAYER_SECT_ENABLED && Boolean(player.value.sect) && item.value?.type === 'manual' && Boolean(item.value?.manualSkillId))

/** 主操作：装备、研读、服用、落成资产……做不成时写明缘由。 */
const primary = computed(() => {
  void player.value.learnedTechniques
  void player.value.learnedKnowledges
  const it = item.value
  const none = { visible: false, label: '', disabled: false, title: '' }
  if (!it) return none
  if (it.type === 'weapon' || it.type === 'armor') {
    const tooWeak = it.minRankIndex > player.value.rankIndex
    return { visible: true, label: '装备', disabled: tooWeak, title: tooWeak ? `需${rankName.value}以上的根基才驾驭得住。` : '' }
  }
  if (it.type === 'manual') {
    if (it.manualSkillId) {
      if (hasLearnedTechnique(it.manualSkillId)) return { visible: true, label: '已学会', disabled: true, title: '这门功法你已经学会了。' }
      const issues = getTechniqueLearnIssues(it.manualSkillId)
      return { visible: true, label: '研习秘籍', disabled: issues.length > 0, title: issues.join('；') }
    }
    if (it.knowledgeId) {
      if (hasLearnedKnowledge(it.knowledgeId)) return { visible: true, label: '已研读', disabled: true, title: '这份札记你已经读过了。' }
      const issues = getKnowledgeLearnIssues(it.knowledgeId)
      return { visible: true, label: '研读札记', disabled: issues.length > 0, title: issues.join('；') }
    }
    return { visible: true, label: '研读', disabled: true, title: '这册文字残缺，读不出门道。' }
  }
  if (!canUseItemDirectly(it)) return none
  if (hasAssetClaimEffect(it)) return { visible: true, label: '落成产业', disabled: false, title: '' }
  if (it.type === 'pill') return { visible: true, label: '服用', disabled: false, title: '' }
  if (it.type === 'tool') return { visible: true, label: '启用', disabled: false, title: '' }
  return { visible: true, label: '使用', disabled: false, title: '' }
})

function usePrimary() {
  if (primary.value.disabled) {
    sfx.deny()
    return
  }
  sfx.confirm()
  consumeItem(props.itemId)
}

function sell() {
  sfx.coin()
  sellItem(props.itemId)
}

function stash() {
  sfx.confirm()
  stashManualToSect(props.itemId)
}
</script>
