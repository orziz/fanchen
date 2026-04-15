<template>
  <div v-if="status !== 'ready'" class="runtime-overlay" :class="statusClass">
    <div class="runtime-card">
      <p class="runtime-kicker">TS / Vue3 源码运行时</p>
      <h2>{{ title }}</h2>
      <p class="runtime-detail">{{ detail }}</p>

      <p v-if="status === 'booting'" class="runtime-progress">{{ progress }}</p>
      <p v-if="status === 'error'" class="runtime-error">{{ errorMessage }}</p>

      <div v-if="status === 'error'" class="runtime-actions">
        <button class="control-button primary" type="button" @click="$emit('retry')">重新启动</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  detail: string;
  errorMessage: string;
  progress: string;
  status: string;
  title: string;
}>();

defineEmits<{
  retry: [];
}>();

const statusClass = computed(() => `is-${props.status}`);
</script>
