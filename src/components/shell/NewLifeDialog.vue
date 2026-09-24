<template>
  <section class="new-life" role="dialog" aria-labelledby="new-life-title">
    <h2 id="new-life-title" class="new-life__title">此生何名，出身何处</h2>

    <div class="new-life__name">
      <label for="new-life-name">名讳</label>
      <input id="new-life-name" v-model="name" maxlength="6" autocomplete="off" spellcheck="false" @keydown.enter="confirm">
      <button class="icon-btn" type="button" data-tip="另取一名" aria-label="另取一名" @click="reroll">
        <GameIcon name="auto" />
      </button>
    </div>

    <div class="new-life__origins" role="radiogroup" aria-label="出身">
      <button
        v-for="origin in origins"
        :key="origin.id"
        class="origin-card"
        :class="{ 'is-active': origin.id === originId }"
        type="button"
        role="radio"
        :aria-checked="origin.id === originId"
        @click="pick(origin.id)"
      >
        <strong class="origin-card__name">{{ origin.name }}</strong>
        <span class="origin-card__desc">{{ origin.desc }}</span>
        <span class="origin-card__perks">{{ origin.perks }}</span>
      </button>
    </div>

    <p v-if="overwrite" class="new-life__warn">另起一世会覆盖浏览器里现有的存档；若想留底，先在设置中导出。</p>

    <div class="new-life__actions">
      <button class="ink-btn" type="button" @click="$emit('cancel')">回去</button>
      <button class="ink-btn ink-btn--primary" type="button" :disabled="!name.trim()" @click="confirm">入世</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ORIGINS, randomPlayerName } from '@/config/origins'
import { sfx } from '@/audio/sfx'
import type { NewLifeOptions } from '@/stores/game/store'
import GameIcon from '@/components/common/GameIcon.vue'

defineProps<{ overwrite: boolean }>()
const emit = defineEmits<{ cancel: []; confirm: [options: NewLifeOptions] }>()

const origins = ORIGINS
const name = ref('林寒')
const originId = ref(ORIGINS[0].id)

function reroll() {
  sfx.page()
  name.value = randomPlayerName()
}

function pick(id: string) {
  sfx.page()
  originId.value = id
}

function confirm() {
  if (!name.value.trim()) return
  emit('confirm', { name: name.value.trim(), originId: originId.value })
}
</script>
