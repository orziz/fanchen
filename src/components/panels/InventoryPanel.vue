<template>
  <div class="inventory-panel">
    <p class="panel-intro">行囊里装着兵刃、护具、秘籍与契物。药食可随手取用，秘籍与札记留待修习，地契与材料则多半要留着营生、置业或悟道之用。</p>

    <div class="inventory-summary-grid">
      <UiPanelCard tone="item" :class-name="summaryCardClass(equippedItem(player.equipment.weapon)?.rarity)">
        <UiCardHeader kicker="兵器" :title="equippedItem(player.equipment.weapon)?.name || '未装备'" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" :tone="equippedItem(player.equipment.weapon) ? RARITY_META[equippedItem(player.equipment.weapon)!.rarity].color : 'common'">
              {{ equippedItem(player.equipment.weapon) ? RARITY_META[equippedItem(player.equipment.weapon)!.rarity].label : '空位' }}
            </UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">{{ equippedItem(player.equipment.weapon)?.desc || '行囊中的兵器会在这里显示。' }}</p>
        <p class="inventory-summary-meta">{{ describeItemEffect(equippedItem(player.equipment.weapon)) || '装备后会直接影响战力。' }}</p>
      </UiPanelCard>

      <UiPanelCard tone="item" :class-name="summaryCardClass(equippedItem(player.equipment.armor)?.rarity)">
        <UiCardHeader kicker="护甲" :title="equippedItem(player.equipment.armor)?.name || '未装备'" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" :tone="equippedItem(player.equipment.armor) ? RARITY_META[equippedItem(player.equipment.armor)!.rarity].color : 'common'">
              {{ equippedItem(player.equipment.armor) ? RARITY_META[equippedItem(player.equipment.armor)!.rarity].label : '空位' }}
            </UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">{{ equippedItem(player.equipment.armor)?.desc || '护甲会直接影响你的生存能力。' }}</p>
        <p class="inventory-summary-meta">{{ describeItemEffect(equippedItem(player.equipment.armor)) || '装备后会直接影响气血或体力。' }}</p>
      </UiPanelCard>

      <UiPanelCard tone="item" :class-name="summaryCardClass(currentHeart?.rarity)">
        <UiCardHeader kicker="当前心法" :title="currentHeart?.name || '未启用心法'" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" :tone="currentHeart ? RARITY_META[currentHeart.rarity].color : 'common'">
              {{ currentHeart ? RARITY_META[currentHeart.rarity].label : '空位' }}
            </UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">{{ currentHeart?.desc || '一次只能启用一门心法；修炼相关行动会提升它的熟练度。' }}</p>
        <p class="inventory-summary-meta">{{ currentHeartStatus }}</p>
      </UiPanelCard>
    </div>

    <UiPillRow class-name="inventory-view-switch">
      <button class="item-button" :class="{ active: activeInventoryView === 'bag' }" @click="activeInventoryView = 'bag'">行囊</button>
      <button class="item-button" :class="{ active: activeInventoryView === 'study' }" @click="activeInventoryView = 'study'">修习</button>
    </UiPillRow>

    <section v-if="activeInventoryView === 'study'" class="inventory-view-panel">
      <UiPanelCard tone="item" :class-name="summaryCardClass(currentHeart?.rarity)">
        <UiCardHeader kicker="当前心法" :title="currentHeart?.name || '未启用心法'" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" :tone="currentHeart ? RARITY_META[currentHeart.rarity].color : 'common'">
              {{ currentHeart ? RARITY_META[currentHeart.rarity].label : '空位' }}
            </UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">{{ currentHeart?.desc || '学会心法后，会在这里显示当前修习路线。' }}</p>
        <p class="item-meta">{{ currentHeartStatus }}</p>
        <p class="item-meta">{{ currentHeart ? describeTechniqueEffect(currentHeartEffect(currentHeart.id)) : '' }}</p>
        <p v-if="currentHeart && hasUnlockedScribe(currentHeart.id)" class="item-meta">圆满加成：{{ describeTechniqueEffect(techniqueBonus(currentHeart.id)) || '无额外圆满加成。' }}</p>
      </UiPanelCard>

      <h3 class="subsection-title">已学功法</h3>
      <div class="inventory-grid">
        <template v-if="learnedTechniques.length">
          <UiPanelCard v-for="entry in learnedTechniques" :key="entry.technique.id" tone="item" :class-name="rarityCardClass(entry.technique.rarity)">
            <UiCardHeader :kicker="getTechniqueKindLabel(entry.technique.kind)" :title="entry.technique.name" title-class="item-title">
              <template #aside>
                <UiPill variant="rarity" :tone="RARITY_META[entry.technique.rarity].color">
                  {{ RARITY_META[entry.technique.rarity].label }}
                </UiPill>
              </template>
            </UiCardHeader>
            <p class="item-meta">{{ entry.technique.desc }}</p>
            <p class="item-meta">需求：{{ getRankName(entry.technique.minRankIndex) }} · 悟性 {{ entry.technique.minInsight }}</p>
            <p class="item-meta">{{ techniqueStatusText(entry.technique.id) }}<span v-if="hasUnlockedScribe(entry.technique.id)"> · 已解锁无限誊抄</span></p>
            <p class="item-meta">当前效果：{{ describeTechniqueEffect(currentTechniqueEffect(entry.technique.id)) || '暂无特殊效果。' }}</p>
            <p class="item-meta">圆满加成：{{ describeTechniqueEffect(techniqueBonus(entry.technique.id)) || '无额外圆满加成。' }}</p>
            <p class="item-meta">誊抄成本：{{ scribeCostText(entry.technique.id) || '尚未开放。' }}</p>
            <UiActionGroup>
              <button
                v-if="entry.technique.kind === 'heart'"
                class="item-button"
                :aria-disabled="player.equipment.heart === entry.technique.id ? 'true' : 'false'"
                :disabled="player.equipment.heart === entry.technique.id"
                :title="player.equipment.heart === entry.technique.id ? '这门心法已经在运转。' : undefined"
                @click="doEquipHeart(entry.technique.id)"
              >
                {{ player.equipment.heart === entry.technique.id ? '当前心法' : '设为心法' }}
              </button>
              <button
                v-if="hasUnlockedScribe(entry.technique.id)"
                class="item-button"
                :aria-disabled="!canScribe(entry.technique.id) ? 'true' : 'false'"
                :disabled="!canScribe(entry.technique.id)"
                :title="scribeIssues(entry.technique.id) || '圆满后可无限誊抄'"
                @click="doScribe(entry.technique.id)"
              >
                誊写秘籍
              </button>
            </UiActionGroup>
          </UiPanelCard>
        </template>
        <div v-else class="empty-state">你暂时还没学会任何功法，先从秘籍开始入门。</div>
      </div>

      <h3 class="subsection-title">已学学识</h3>
      <div class="inventory-grid">
        <template v-if="learnedKnowledges.length">
          <UiPanelCard v-for="entry in learnedKnowledges" :key="entry.knowledge.id" tone="item" :class-name="rarityCardClass(entry.knowledge.rarity)">
            <UiCardHeader kicker="学识札记" :title="entry.knowledge.name" title-class="item-title">
              <template #aside>
                <UiPill variant="rarity" :tone="RARITY_META[entry.knowledge.rarity].color">
                  {{ RARITY_META[entry.knowledge.rarity].label }}
                </UiPill>
              </template>
            </UiCardHeader>
            <p class="item-meta">{{ entry.knowledge.desc }}</p>
            <p class="item-meta">研读收益：{{ describeTechniqueEffect(entry.knowledge.effect) || '无额外收益。' }}</p>
            <p class="item-meta">已研读 · 无熟练度 · 第{{ entry.learnedDay }}日纳入见闻。</p>
          </UiPanelCard>
        </template>
        <div v-else class="empty-state">你暂时还没研读任何学识札记，多读几卷，手艺和见识自然会慢慢补上来。</div>
      </div>
    </section>

    <section v-else class="inventory-view-panel">
      <div class="inventory-toolbar">
        <div class="inventory-toolbar-section">
          <p class="inventory-toolbar-label">类型筛选</p>
          <UiPillRow class-name="inventory-toolbar-row">
            <button
              class="item-button"
              :class="{ active: activeTypeFilter === 'all' }"
              @click="activeTypeFilter = 'all'"
            >
              全部 · {{ totalInventoryQuantity }}
            </button>
            <button
              v-for="option in inventoryTypeOptions"
              :key="option.type"
              class="item-button"
              :class="{ active: activeTypeFilter === option.type }"
              @click="activeTypeFilter = option.type"
            >
              {{ option.label }} · {{ option.count }}
            </button>
          </UiPillRow>
        </div>
        <div class="inventory-toolbar-section">
          <p class="inventory-toolbar-label">排序方式</p>
          <UiPillRow class-name="inventory-toolbar-row">
            <button
              v-for="option in INVENTORY_SORT_OPTIONS"
              :key="option.key"
              class="item-button"
              :class="{ active: activeSortMode === option.key }"
              @click="activeSortMode = option.key"
            >
              {{ option.label }}
            </button>
          </UiPillRow>
        </div>
      </div>

      <div class="inventory-grid">
        <template v-if="visibleInventory.length">
          <UiPanelCard v-for="entry in visibleInventory" :key="entry.itemId" tone="item" :class-name="rarityCardClass(entry.item.rarity)">
            <UiCardHeader :title="`${entry.item.name} x${entry.quantity}`" title-class="item-title">
              <template #aside>
                <UiPill variant="rarity" :tone="RARITY_META[entry.item.rarity].color">{{ RARITY_META[entry.item.rarity].label }}</UiPill>
              </template>
            </UiCardHeader>
            <p class="item-meta">{{ entry.item.desc }}</p>
            <UiPillRow class-name="inventory-item-tags">
              <UiPill variant="trait">{{ getItemTypeLabel(entry.item) }}</UiPill>
              <UiPill>价值 {{ entry.item.baseValue }}</UiPill>
            </UiPillRow>
            <p class="item-meta">{{ inventoryEntryDetail(entry.item) }}</p>
            <UiActionGroup>
              <button
                v-if="getPrimaryActionState(entry.itemId).visible"
                class="item-button"
                :aria-disabled="getPrimaryActionState(entry.itemId).disabled ? 'true' : 'false'"
                :disabled="getPrimaryActionState(entry.itemId).disabled"
                :title="getPrimaryActionState(entry.itemId).title || undefined"
                @click="doConsume(entry.itemId)"
              >
                {{ getPrimaryActionState(entry.itemId).label }}
              </button>
              <button class="item-button" @click="doSell(entry.itemId)">出售一件</button>
              <button v-if="player.sect && entry.item.type === 'manual' && entry.item.manualSkillId" class="item-button" @click="doStash(entry.itemId)">收入藏经阁</button>
            </UiActionGroup>
          </UiPanelCard>
        </template>
        <div v-else-if="inventoryEntries.length" class="empty-state">当前筛选下没有可显示的物品，换个类型或排序试试。</div>
        <div v-else class="empty-state">你的行囊暂时空空如也，出去历练或做生意吧。</div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RARITY_META, RANKS, canUseItemDirectly, getItem, getItemUsageSummary, hasAssetClaimEffect, getTechnique } from '@/config'
import { getKnowledgeLearnIssues, getLearnedKnowledges, hasLearnedKnowledge } from '@/systems/knowledge'
import { describeItemEffect, describeTechniqueEffect, getItemTypeLabel, getTechniqueKindLabel } from '@/composables/useUIHelpers'
import { consumeItem, sellItem, stashManualToSect } from '@/systems/player'
import {
  canScribeTechnique,
  equipHeartTechnique,
  getScribeTechniqueCostText,
  getScribeTechniqueIssues,
  getTechniqueCurrentEffect,
  getLearnedTechniques,
  getTechniqueLearnIssues,
  getTechniqueStageBonusEffect,
  getTechniqueMasteryPercent,
  hasUnlockedScribeTechnique,
  hasLearnedTechnique,
  scribeTechnique,
} from '@/systems/techniques'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const { player } = storeToRefs(store)

type InventorySortMode = 'value-desc' | 'rarity-desc' | 'type-asc' | 'quantity-desc' | 'name-asc'
type InventoryViewMode = 'bag' | 'study'
type InventoryViewEntry = {
  itemId: string
  quantity: number
  item: NonNullable<ReturnType<typeof getItem>>
}
type PrimaryActionState = {
  visible: boolean
  label: string
  disabled: boolean
  title: string
}

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const ITEM_TYPE_ORDER: Record<string, number> = {
  weapon: 0,
  armor: 1,
  manual: 2,
  pill: 3,
  tool: 4,
  sect: 5,
  token: 6,
  deed: 7,
  permit: 8,
  relic: 9,
  scroll: 10,
  herb: 11,
  grain: 12,
  seed: 13,
  wood: 14,
  ore: 15,
  cloth: 16,
  leather: 17,
  ice: 18,
  fire: 19,
}
const INVENTORY_SORT_OPTIONS: Array<{ key: InventorySortMode; label: string }> = [
  { key: 'value-desc', label: '按价值' },
  { key: 'rarity-desc', label: '按品阶' },
  { key: 'type-asc', label: '按类型' },
  { key: 'quantity-desc', label: '按数量' },
  { key: 'name-asc', label: '按名称' },
]

const activeTypeFilter = ref('all')
const activeSortMode = ref<InventorySortMode>('value-desc')
const activeInventoryView = ref<InventoryViewMode>('bag')

function rarityCardClass(rarity: string) {
  return ['rarity-card', `rarity-card--${rarity}`]
}

function summaryCardClass(rarity?: string | null) {
  return rarity ? [...rarityCardClass(rarity), 'inventory-summary-card'] : ['inventory-summary-card']
}

function equippedItem(itemId: string | null) {
  return itemId ? getItem(itemId) : null
}

function getRankName(idx: number) {
  return RANKS[Math.min(idx, RANKS.length - 1)].name
}

const inventoryEntries = computed<InventoryViewEntry[]>(() =>
  player.value.inventory.flatMap((entry) => {
    const item = getItem(entry.itemId)
    return item ? [{ ...entry, item }] : []
  })
)

const totalInventoryQuantity = computed(() =>
  inventoryEntries.value.reduce((sum, entry) => sum + entry.quantity, 0)
)

const inventoryTypeOptions = computed(() => {
  const counts = new Map<string, number>()

  inventoryEntries.value.forEach((entry) => {
    counts.set(entry.item.type, (counts.get(entry.item.type) || 0) + entry.quantity)
  })

  return [...counts.entries()]
    .map(([type, count]) => ({
      type,
      count,
      label: getItemTypeLabel(type),
      order: ITEM_TYPE_ORDER[type] ?? 999,
    }))
    .sort((left, right) => left.order - right.order || left.label.localeCompare(right.label, 'zh-CN'))
})

watchEffect(() => {
  if (activeTypeFilter.value === 'all') return
  if (!inventoryTypeOptions.value.some(option => option.type === activeTypeFilter.value)) {
    activeTypeFilter.value = 'all'
  }
})

function getRarityRank(rarity: string) {
  return RARITY_ORDER.indexOf(rarity)
}

function compareByName(left: InventoryViewEntry, right: InventoryViewEntry) {
  return left.item.name.localeCompare(right.item.name, 'zh-CN')
}

const visibleInventory = computed(() => {
  const filtered = inventoryEntries.value.filter((entry) => (
    activeTypeFilter.value === 'all' || entry.item.type === activeTypeFilter.value
  ))

  return [...filtered].sort((left, right) => {
    switch (activeSortMode.value) {
      case 'rarity-desc':
        return getRarityRank(right.item.rarity) - getRarityRank(left.item.rarity)
          || right.item.tier - left.item.tier
          || right.item.baseValue - left.item.baseValue
          || compareByName(left, right)
      case 'type-asc':
        return (ITEM_TYPE_ORDER[left.item.type] ?? 999) - (ITEM_TYPE_ORDER[right.item.type] ?? 999)
          || getItemTypeLabel(left.item).localeCompare(getItemTypeLabel(right.item), 'zh-CN')
          || compareByName(left, right)
      case 'quantity-desc':
        return right.quantity - left.quantity
          || right.item.baseValue - left.item.baseValue
          || compareByName(left, right)
      case 'name-asc':
        return compareByName(left, right)
      default:
        return right.item.baseValue - left.item.baseValue
          || getRarityRank(right.item.rarity) - getRarityRank(left.item.rarity)
          || compareByName(left, right)
    }
  })
})

const currentHeart = computed(() => player.value.equipment.heart ? getTechnique(player.value.equipment.heart) || null : null)

const learnedTechniques = computed(() => {
  void player.value.learnedTechniques
  return getLearnedTechniques()
})

const learnedKnowledges = computed(() => {
  void player.value.learnedKnowledges
  return getLearnedKnowledges()
})

const currentHeartStatus = computed(() => {
  if (!currentHeart.value) return '学会心法后会在修习页中继续精进。'
  return techniqueStatusText(currentHeart.value.id)
})

function techniquePercent(skillId: string) {
  return getTechniqueMasteryPercent(skillId)
}

function techniqueStatusText(skillId: string) {
  return `熟练 ${techniquePercent(skillId)}%${hasUnlockedScribe(skillId) ? ' · 已圆满' : ''}`
}

function hasUnlockedScribe(skillId: string) {
  return hasUnlockedScribeTechnique(skillId)
}

function canScribe(skillId: string) {
  return canScribeTechnique(skillId)
}

function scribeIssues(skillId: string) {
  return getScribeTechniqueIssues(skillId).join('；')
}

function scribeCostText(skillId: string) {
  return getScribeTechniqueCostText(skillId)
}

function currentTechniqueEffect(skillId: string) {
  return getTechniqueCurrentEffect(skillId)
}

function currentHeartEffect(skillId: string) {
  return getTechniqueCurrentEffect(skillId)
}

function techniqueBonus(skillId: string) {
  return getTechniqueStageBonusEffect(skillId)
}

function inventoryEntryDetail(item: InventoryViewEntry['item']) {
  const effectText = describeItemEffect(item)
  if (canUseItemDirectly(item) && effectText) return `效果：${effectText}`
  return `用途：${getItemUsageSummary(item)}`
}

function getPrimaryActionState(itemId: string): PrimaryActionState {
  const item = getItem(itemId)
  if (!item) return { visible: false, label: '', disabled: false, title: '' }
  if (item.type === 'weapon' || item.type === 'armor') {
    return { visible: true, label: '装备', disabled: false, title: '' }
  }
  if (item.type === 'manual') {
    if (item.manualSkillId) {
      if (hasLearnedTechnique(item.manualSkillId)) {
        return { visible: true, label: '已学会', disabled: true, title: '这门功法你已经学会了。' }
      }
      const issues = getTechniqueLearnIssues(item.manualSkillId)
      return { visible: true, label: '学习秘籍', disabled: issues.length > 0, title: issues.join('；') }
    }
    if (item.knowledgeId) {
      if (hasLearnedKnowledge(item.knowledgeId)) {
        return { visible: true, label: '已研读', disabled: true, title: '这份学识札记你已经读过了。' }
      }
      const issues = getKnowledgeLearnIssues(item.knowledgeId)
      return { visible: true, label: '研读札记', disabled: issues.length > 0, title: issues.join('；') }
    }
    return { visible: true, label: '研读', disabled: true, title: '这册秘籍暂时无法识别对应内容。' }
  }
  if (!canUseItemDirectly(item)) {
    return { visible: false, label: '', disabled: false, title: '' }
  }
  if (hasAssetClaimEffect(item)) {
    return { visible: true, label: '落成资产', disabled: false, title: '' }
  }
  if (item.type === 'pill') return { visible: true, label: '服用', disabled: false, title: '' }
  if (item.type === 'tool') return { visible: true, label: '启用', disabled: false, title: '' }
  return { visible: true, label: '使用', disabled: false, title: '' }
}

function doConsume(itemId: string) { consumeItem(itemId) }
function doSell(itemId: string) { sellItem(itemId) }
function doStash(itemId: string) { stashManualToSect(itemId) }
function doEquipHeart(skillId: string) { equipHeartTechnique(skillId) }
function doScribe(skillId: string) { scribeTechnique(skillId) }
</script>
