<template>
  <section class="book" role="dialog" :aria-label="title">
    <header class="book__head">
      <span class="book__seal" aria-hidden="true"><GameIcon :name="icon" /></span>
      <h2 class="book__title">{{ title }}</h2>
      <nav v-if="tabs && tabs.length > 1" class="book__tabs" role="tablist">
        <button
          v-for="item in tabs"
          :key="item.id"
          class="book__tab"
          :class="{ 'is-active': item.id === tab }"
          role="tab"
          type="button"
          :aria-selected="item.id === tab"
          @click="selectTab(item.id)"
        >
          {{ item.label }}<span v-if="item.badge" class="book__tab-badge num">{{ item.badge }}</span>
        </button>
      </nav>
      <div class="book__head-extra"><slot name="head" /></div>
      <button class="icon-btn book__close" type="button" aria-label="合上" data-tip="合上（Esc）" @click="close">
        <GameIcon name="close" />
      </button>
    </header>
    <div class="book__body" :class="bodyClass">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
import GameIcon from '@/components/common/GameIcon.vue'
import { useBooks } from '@/composables/useBooks'
import { sfx } from '@/audio/sfx'

defineProps<{
  title: string
  icon: string
  tabs?: { id: string; label: string; badge?: string | number }[]
  tab?: string
  bodyClass?: string
}>()
const emit = defineEmits<{ 'update:tab': [value: string] }>()
const { closeBook } = useBooks()

function selectTab(id: string) {
  sfx.page()
  emit('update:tab', id)
}

function close() {
  sfx.page()
  closeBook()
}
</script>
