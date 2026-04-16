<template>
  <button :type="type" :class="classes" :disabled="disabled" :aria-disabled="disabled ? 'true' : undefined" @click="emit('click', $event)">
    <span v-if="theme || $slots.theme" :class="['ui-action-card-button__theme', themeClass]">
      <slot name="theme">{{ theme }}</slot>
    </span>
    <strong :class="['ui-action-card-button__title', titleClass]">
      <slot>{{ title }}</slot>
    </strong>
    <span v-if="description || $slots.description" :class="['ui-action-card-button__desc', descriptionClass]">
      <slot name="description">{{ description }}</slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'

type ClassName = string | string[] | Record<string, boolean>

const props = withDefaults(defineProps<{
  type?: 'button' | 'submit' | 'reset'
  title?: string
  description?: string
  theme?: string
  disabled?: boolean
  buttonClass?: ClassName
  themeClass?: ClassName
  titleClass?: ClassName
  descriptionClass?: ClassName
}>(), {
  type: 'button',
  title: '',
  description: '',
  theme: '',
  disabled: false,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const classes = computed(() => [
  'ui-action-card-button',
  'mini-button',
  'action-button-card',
  props.buttonClass,
])
</script>