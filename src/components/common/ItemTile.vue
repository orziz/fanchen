<template>
  <button class="item-tile" :class="[`rarity--${item.rarity}`, { 'is-selected': selected }]" type="button" :aria-pressed="selected" :data-tip="item.desc" :data-tip-title="item.name">
    <span class="item-tile__icon"><GameIcon :name="icon" /></span>
    <span class="item-tile__name">{{ item.name }}</span>
    <span v-if="quantity > 1" class="item-tile__qty num">{{ quantity }}</span>
    <span v-if="badge" class="item-tile__badge">{{ badge }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ItemData } from '@/config/items'
import { iconForItemType } from '@/art/icons'
import GameIcon from '@/components/common/GameIcon.vue'

const props = withDefaults(defineProps<{ item: ItemData; quantity?: number; selected?: boolean; badge?: string }>(), {
  quantity: 1,
  selected: false,
  badge: '',
})

const icon = computed(() => iconForItemType(props.item.type))
</script>
