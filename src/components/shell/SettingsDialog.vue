<template>
  <div class="modal-host" @pointerdown.self="$emit('close')">
    <section class="modal settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header class="modal__head">
        <h2 id="settings-title">设置</h2>
        <button class="icon-btn" type="button" aria-label="关闭" @click="$emit('close')"><GameIcon name="close" /></button>
      </header>

      <div class="settings-dialog__body">
        <section class="settings-group">
          <h3>声音</h3>
          <label class="setting-row">
            <span>琴曲</span>
            <input v-model.number="settings.musicVolume" type="range" min="0" max="1" step="0.05">
            <span class="num">{{ Math.round(settings.musicVolume * 100) }}</span>
          </label>
          <label class="setting-row">
            <span>音效</span>
            <input v-model.number="settings.sfxVolume" type="range" min="0" max="1" step="0.05">
            <span class="num">{{ Math.round(settings.sfxVolume * 100) }}</span>
          </label>
          <label class="setting-row setting-row--toggle">
            <span>静音</span>
            <input v-model="settings.muted" type="checkbox">
          </label>
        </section>

        <section class="settings-group">
          <h3>画面</h3>
          <label class="setting-row setting-row--toggle">
            <span>减少动态</span>
            <input v-model="settings.reduceMotion" type="checkbox">
          </label>
        </section>

        <section v-if="inGame" class="settings-group">
          <h3>存档</h3>
          <p class="settings-group__note">{{ saveState }}</p>
          <div class="settings-group__actions">
            <button class="ink-btn" type="button" @click="saveNow"><GameIcon name="save" />立即存档</button>
            <button class="ink-btn" type="button" @click="exportFile"><GameIcon name="scroll" />导出存档</button>
            <label class="ink-btn">
              <GameIcon name="load" />导入存档
              <input class="sr-only" type="file" accept=".json,application/json" @change="importFile">
            </label>
          </div>
          <p v-if="notice" class="settings-group__notice" :class="{ 'is-error': noticeError }">{{ notice }}</p>
        </section>

        <section v-if="inGame" class="settings-group">
          <h3>此世</h3>
          <div class="settings-group__actions">
            <button class="ink-btn" type="button" @click="toTitle"><GameIcon name="exit" />存档并返回标题</button>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { useSettings } from '@/composables/useSettings'
import { useGamePhase } from '@/composables/useGamePhase'
import { useBooks } from '@/composables/useBooks'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

defineProps<{ inGame: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useGameStore()
const { saveState } = storeToRefs(store)
const settings = useSettings()
const { returnToTitle } = useGamePhase()
const { closeBook } = useBooks()
const notice = ref('')
const noticeError = ref(false)

function saveNow() {
  store.saveGame(true)
  sfx.confirm()
}

function exportFile() {
  const data = store.exportSave()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `凡尘立道录-${store.player.name}-第${store.world.day}日.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  sfx.confirm()
  noticeError.value = false
  notice.value = '存档文件已导出。'
}

async function importFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    store.importSave(await file.text())
    sfx.chime()
    noticeError.value = false
    notice.value = '存档已读入。'
  } catch {
    sfx.deny()
    noticeError.value = true
    notice.value = '这份文件不是可用的存档。'
  }
}

function toTitle() {
  store.saveGame(false)
  closeBook()
  emit('close')
  returnToTitle()
}
</script>
