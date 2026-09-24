<template>
  <div class="bag-items">
    <aside class="bag-items__side">
      <h4 class="sheet__heading">随身</h4>
      <div class="equip-slots">
        <div v-for="slot in equipSlots" :key="slot.key" class="equip-slot" :class="slot.item ? `rarity--${slot.item.rarity}` : 'is-empty'" :data-tip="slot.item ? slot.item.desc : slot.hint" :data-tip-title="slot.label">
          <GameIcon :name="slot.icon" />
          <span class="equip-slot__label">{{ slot.label }}</span>
          <strong class="equip-slot__name">{{ slot.item ? slot.item.name : '空' }}</strong>
        </div>
      </div>

      <h4 class="sheet__heading">门类</h4>
      <div class="filter-chips">
        <button class="filter-chip" :class="{ 'is-active': filter === 'all' }" type="button" @click="filter = 'all'">全部<span class="num">{{ total }}</span></button>
        <button v-for="option in typeOptions" :key="option.type" class="filter-chip" :class="{ 'is-active': filter === option.type }" type="button" @click="filter = option.type">
          {{ option.label }}<span class="num">{{ option.count }}</span>
        </button>
      </div>

      <h4 class="sheet__heading">排序</h4>
      <div class="filter-chips">
        <button v-for="option in SORTS" :key="option.key" class="filter-chip" :class="{ 'is-active': sort === option.key }" type="button" @click="sort = option.key">{{ option.label }}</button>
      </div>
    </aside>

    <section class="bag-items__grid">
      <div v-if="visible.length" class="item-grid">
        <ItemTile v-for="entry in visible" :key="entry.itemId" :item="entry.item" :quantity="entry.quantity" :selected="entry.itemId === selectedId" @click="select(entry.itemId)" />
      </div>
      <p v-else class="empty-note">行囊空空，只剩一路风尘。</p>
    </section>

    <ItemDetail v-if="selected" :key="selected.itemId" class="bag-items__detail" :item-id="selected.itemId" :quantity="selected.quantity" />
    <aside v-else class="bag-items__detail bag-items__detail--empty">
      <p class="empty-note">择一件物品细看。</p>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { getItem, getTechnique } from '@/config'
import { getItemTypeLabel } from '@/composables/useUIHelpers'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'
import ItemTile from '@/components/common/ItemTile.vue'
import ItemDetail from '@/components/books/bag/ItemDetail.vue'

type SortKey = 'value' | 'rarity' | 'type' | 'quantity' | 'name'

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'value', label: '价值' },
  { key: 'rarity', label: '品阶' },
  { key: 'type', label: '门类' },
  { key: 'quantity', label: '数量' },
  { key: 'name', label: '名称' },
]
const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary']
const TYPE_ORDER = ['weapon', 'armor', 'manual', 'pill', 'tool', 'sect', 'token', 'deed', 'permit', 'relic', 'scroll', 'herb', 'grain', 'seed', 'wood', 'ore', 'cloth', 'leather', 'ice', 'fire', 'paper', 'ink']

const store = useGameStore()
const { player } = storeToRefs(store)
const filter = ref('all')
const sort = ref<SortKey>('value')
const selectedId = ref<string | null>(null)

const entries = computed(() => player.value.inventory.flatMap(entry => {
  const item = getItem(entry.itemId)
  return item ? [{ ...entry, item }] : []
}))

const total = computed(() => entries.value.reduce((sum, entry) => sum + entry.quantity, 0))

const typeOptions = computed(() => {
  const counts = new Map<string, number>()
  entries.value.forEach(entry => counts.set(entry.item.type, (counts.get(entry.item.type) || 0) + entry.quantity))
  return [...counts.entries()]
    .map(([type, count]) => ({ type, count, label: getItemTypeLabel(type) }))
    .sort((a, b) => typeRank(a.type) - typeRank(b.type))
})

function typeRank(type: string) {
  const index = TYPE_ORDER.indexOf(type)
  return index < 0 ? TYPE_ORDER.length : index
}

const visible = computed(() => {
  const list = entries.value.filter(entry => filter.value === 'all' || entry.item.type === filter.value)
  const byName = (a: typeof list[number], b: typeof list[number]) => a.item.name.localeCompare(b.item.name, 'zh-CN')
  return [...list].sort((a, b) => {
    switch (sort.value) {
      case 'rarity': return RARITY_ORDER.indexOf(b.item.rarity) - RARITY_ORDER.indexOf(a.item.rarity) || b.item.baseValue - a.item.baseValue
      case 'type': return typeRank(a.item.type) - typeRank(b.item.type) || byName(a, b)
      case 'quantity': return b.quantity - a.quantity || byName(a, b)
      case 'name': return byName(a, b)
      default: return b.item.baseValue - a.item.baseValue || byName(a, b)
    }
  })
})

const selected = computed(() => visible.value.find(entry => entry.itemId === selectedId.value) || null)

watch(visible, list => {
  if (!list.some(entry => entry.itemId === selectedId.value)) selectedId.value = list[0]?.itemId || null
}, { immediate: true })

watch(typeOptions, options => {
  if (filter.value !== 'all' && !options.some(option => option.type === filter.value)) filter.value = 'all'
})

function select(itemId: string) {
  sfx.page()
  selectedId.value = itemId
}

const equipSlots = computed(() => {
  const eq = player.value.equipment
  const heart = eq.heart ? getTechnique(eq.heart) : null
  return [
    { key: 'weapon', label: '兵器', icon: 'weapon', item: eq.weapon ? getItem(eq.weapon) : null, hint: '兵器直接抬高战力' },
    { key: 'armor', label: '护甲', icon: 'armor', item: eq.armor ? getItem(eq.armor) : null, hint: '护甲加厚气血与体力' },
    { key: 'heart', label: '心法', icon: 'meditate', item: heart ? { name: heart.name, desc: heart.desc, rarity: heart.rarity } : null, hint: '在修习页启用已学心法' },
  ]
})
</script>
