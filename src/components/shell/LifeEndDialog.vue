<template>
  <div class="modal-host life-end">
    <section v-if="!reborn" class="modal life-end__sheet" role="dialog" aria-modal="true" aria-labelledby="life-end-title">
      <header class="modal__head">
        <h2 id="life-end-title">一世已尽</h2>
      </header>
      <div class="life-end__body">
        <p class="life-end__epitaph">{{ summary.name }}，{{ summary.cause }}，享年{{ summary.age }}岁。</p>
        <dl class="life-end__facts">
          <div><dt>境界</dt><dd>{{ rankName }}</dd></div>
          <div><dt>声望</dt><dd class="num">{{ summary.reputation }}</dd></div>
          <div><dt>第几世</dt><dd class="num">{{ generation }}</dd></div>
        </dl>
        <h3 class="life-end__deeds-title">生平</h3>
        <ul v-if="summary.deeds.length" class="life-end__deeds">
          <li v-for="deed in summary.deeds" :key="deed">{{ deed }}</li>
        </ul>
        <p v-else class="life-end__empty">一生平平，未留下什么可说的事。</p>
        <p class="life-end__legacy">{{ legacyText }}</p>
      </div>
      <footer class="life-end__actions">
        <button class="ink-btn ink-btn--primary" type="button" @click="reborn = true">再入轮回</button>
      </footer>
    </section>
    <NewLifeDialog v-else :overwrite="false" @cancel="reborn = false" @confirm="startNext" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import { RANKS } from '@/config'
import { legacyFor } from '@/systems/life/legacy'
import { sfx } from '@/audio/sfx'
import NewLifeDialog from '@/components/shell/NewLifeDialog.vue'
import type { NewLifeOptions } from '@/stores/game/store'

const store = useGameStore()
const reborn = ref(false)

const summary = computed(() => store.game.life.ended!)
const generation = computed(() => store.game.life.generation)
const rankName = computed(() => RANKS[Math.min(summary.value.rankIndex, RANKS.length - 1)].name)
const legacyText = computed(() => {
  const legacy = legacyFor(summary.value)
  const parts = [legacy.insight ? `悟性 +${legacy.insight}` : '', legacy.power ? `体魄 +${legacy.power}` : '', legacy.items.length ? '几件随身旧物' : ''].filter(Boolean)
  return parts.length ? `带入下一世的传承：${parts.join('、')}。` : '这一世没能留下什么传承，下一世从头来过。'
})

function startNext(options: NewLifeOptions) {
  sfx.chime()
  store.startNextLife(options)
}
</script>
