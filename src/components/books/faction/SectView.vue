<template>
  <div class="sect-view">
    <template v-if="sect">
      <dl class="record-grid">
        <div v-for="item in summary" :key="item.label"><dt>{{ item.label }}</dt><dd>{{ item.value }}</dd></div>
      </dl>
      <p class="sheet__note">{{ frozenText }}</p>
      <h4 class="sheet__heading">藏经阁</h4>
      <ul v-if="library.length" class="plain-list">
        <li v-for="entry in library" :key="entry.id"><strong>{{ entry.name }}</strong><span>{{ entry.desc }}</span></li>
      </ul>
      <p v-else class="empty-note">阁中无书。</p>
      <h4 class="sheet__heading">门下弟子</h4>
      <ul v-if="disciples.length" class="plain-list">
        <li v-for="name in disciples" :key="name"><strong>{{ name }}</strong></li>
      </ul>
      <p v-else class="empty-note">门下无人。</p>
    </template>
    <p v-else class="empty-note">{{ blockText }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { PLAYER_SECT_CREATE_BLOCK_TEXT, PLAYER_SECT_FROZEN_TEXT, getTechnique } from '@/config'
import { formatNumber } from '@/utils'

/**
 * 宗门：自立宗门属阶段三内容，当前以开关封存（PLAYER_SECT_ENABLED）。
 * 旧档里已立的宗门只作只读展示，账册与名录备查。
 */
const store = useGameStore()
const { sect } = storeToRefs(store)
const frozenText = PLAYER_SECT_FROZEN_TEXT
const blockText = PLAYER_SECT_CREATE_BLOCK_TEXT

const summary = computed(() => {
  const s = sect.value
  if (!s) return []
  return [
    { label: '宗门', value: s.name },
    { label: '等级', value: s.level },
    { label: '威望', value: formatNumber(s.prestige) },
    { label: '府库', value: formatNumber(s.treasury) },
    { label: '粮草', value: formatNumber(s.food) },
    { label: '亲传', value: s.disciples.length },
  ]
})

const library = computed(() => (sect.value?.skillLibrary || []).map(id => ({ id, name: getTechnique(id)?.name || id, desc: getTechnique(id)?.desc || '' })))
const disciples = computed(() => (sect.value?.disciples || []).map(id => store.getNpc(id)?.name).filter(Boolean) as string[])
</script>
