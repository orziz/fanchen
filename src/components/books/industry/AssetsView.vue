<template>
  <div v-if="assets.length" class="split-view">
    <ul class="split-view__list">
      <li v-for="asset in assets" :key="asset.id">
        <button class="list-row" :class="{ 'is-selected': asset.id === selectedId }" type="button" @click="select(asset.id)">
          <span class="asset-glyph" :class="`asset-glyph--${asset.kind}`"><GameIcon :name="asset.icon" /></span>
          <span class="list-row__main">
            <strong>{{ asset.label }}</strong>
            <span>{{ asset.kindLabel }} · {{ asset.locationName }} · {{ asset.level }}级</span>
          </span>
          <span class="tag" :class="asset.statusClass">{{ asset.status }}</span>
        </button>
      </li>
    </ul>
    <AssetDetail v-if="selected" :key="selected.id" class="split-view__detail" :kind="selected.kind" :asset-id="selected.id" />
  </div>
  <div v-else class="empty-hero">
    <GameIcon name="industry" />
    <h3>名下尚无产业</h3>
    <p>在市镇里置办田产、工坊或铺面，或用地契、牌照落成一处，便有了细水长流的进项。</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP } from '@/config'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'
import AssetDetail from '@/components/books/industry/AssetDetail.vue'

const store = useGameStore()
const { player } = storeToRefs(store)
const selectedId = ref<string | null>(null)

const KIND_META: Record<string, { label: string; icon: string }> = {
  farm: { label: '田产', icon: 'grain' },
  workshop: { label: '工坊', icon: 'tool' },
  shop: { label: '铺面', icon: 'market' },
}

const assets = computed(() => {
  const a = player.value.assets
  return [...a.farms, ...a.workshops, ...a.shops].map(asset => {
    let status = '照常'
    let statusClass = ''
    if (asset.kind === 'farm') {
      if (!asset.cropId) { status = '空置'; statusClass = 'tag--gold' }
      else if (asset.daysRemaining <= 0) { status = '可收'; statusClass = 'tag--jade' }
      else status = `${asset.daysRemaining}天熟`
    } else if (asset.kind === 'shop') {
      if (asset.pendingIncome > 0) { status = `待收${asset.pendingIncome}`; statusClass = 'tag--jade' }
      else if (asset.stock <= 0) { status = '缺货'; statusClass = 'tag--gold' }
    }
    if (asset.managerNpcId && status === '照常') status = '托管'
    return {
      ...asset,
      status,
      statusClass,
      kindLabel: KIND_META[asset.kind]?.label || '',
      icon: KIND_META[asset.kind]?.icon || 'industry',
      locationName: LOCATION_MAP.get(asset.locationId)?.name || asset.locationId,
    }
  })
})

const selected = computed(() => assets.value.find(asset => asset.id === selectedId.value) || null)

watch(assets, list => {
  if (!list.some(asset => asset.id === selectedId.value)) selectedId.value = list[0]?.id || null
}, { immediate: true })

function select(id: string) {
  sfx.page()
  selectedId.value = id
}
</script>
