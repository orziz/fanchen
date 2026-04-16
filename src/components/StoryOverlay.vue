<template>
  <div v-if="isVisible" class="story-overlay" role="dialog" aria-modal="true" aria-label="剧情对话">
    <div class="story-overlay__backdrop"></div>
    <section class="story-overlay__panel">
      <div class="story-overlay__head">
        <div>
          <p class="section-kicker">剧情面板</p>
          <h2>当前剧情</h2>
        </div>
        <div class="story-overlay__actions">
          <button class="control-button ghost" type="button" @click="showStoryInRail()">收入侧栏</button>
          <button class="control-button ghost" type="button" @click="closeStory()">结束</button>
        </div>
      </div>
      <StoryScene />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import StoryScene from './StoryScene.vue'
import { closeStory, getActiveStoryScene, showStoryInRail } from '@/systems/story'

const store = useGameStore()
const { story } = storeToRefs(store)

const isVisible = computed(() => {
  story.value
  return Boolean(getActiveStoryScene() && story.value.presentation === 'overlay')
})
</script>