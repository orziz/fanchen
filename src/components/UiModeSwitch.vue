<template>
  <div class="ui-mode-switch" role="group" aria-label="界面切换">
    <div class="ui-mode-switch__copy">
      <span class="ui-mode-switch__eyebrow">显示设置</span>
      <span class="ui-mode-switch__label">只影响界面布局</span>
    </div>
    <div class="ui-mode-switch__actions">
      <button
        v-for="mode in modes"
        :key="mode.id"
        class="ui-mode-switch__button"
        :class="{ 'is-active': uiMode === mode.id }"
        type="button"
        :title="mode.desc"
        @click="setUiMode(mode.id)"
      >{{ mode.label }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePresentationMode, type UiMode } from '@/composables/usePresentationMode'

const { uiMode, setUiMode } = usePresentationMode()

const modes: Array<{ id: UiMode; label: string; desc: string }> = [
  { id: 'text', label: '导轨布局', desc: '使用原有的导轨式界面布局。' },
  { id: 'jianghu', label: '舞台布局', desc: '使用舞台式界面布局。' },
]
</script>