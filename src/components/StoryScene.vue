<template>
  <div v-if="scene" :class="['story-scene', { 'story-scene--compact': compact }]">
    <div class="story-scene__meta">
      <p class="section-kicker">剧情</p>
      <h3>{{ scene.title }}</h3>
      <p class="story-scene__summary">{{ scene.summary }}</p>
      <p v-if="scene.speaker" class="story-scene__speaker">{{ scene.speaker }}</p>
    </div>

    <div class="story-scene__body">
      <p class="story-scene__text">{{ scene.text }}</p>
    </div>

    <div class="story-scene__choices">
      <button
        v-for="choice in scene.choices"
        :key="choice.id"
        class="story-choice-button"
        type="button"
        :disabled="choice.disabled"
        @click="chooseStoryOption(choice.id)"
      >
        <span>{{ choice.text }}</span>
        <small v-if="choice.reason" class="story-choice-button__hint">{{ choice.reason }}</small>
      </button>

      <button v-if="scene.canContinue" class="story-choice-button story-choice-button--continue" type="button" @click="continueStory()">
        继续
      </button>

      <button v-if="scene.isTerminal" class="story-choice-button story-choice-button--finish" type="button" @click="closeStory()">
        收起
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { chooseStoryOption, closeStory, continueStory, getActiveStoryScene } from '@/systems/story'

defineProps<{ compact?: boolean }>()

const store = useGameStore()
const { story } = storeToRefs(store)

const scene = computed(() => {
  story.value
  return getActiveStoryScene()
})
</script>