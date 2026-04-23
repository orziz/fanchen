<template>
  <header class="hud-bar">
    <!-- 角色身份 -->
    <div class="hud-identity">
      <span class="hud-name">{{ player.name }}</span>
      <span class="hud-sep">·</span>
      <span class="hud-realm">{{ rankData.name }}</span>
    </div>

    <!-- 气血/真气/体力 mini 进度条 -->
    <div class="hud-vitals">
      <div class="hud-meter">
        <span class="hud-meter-label">气血</span>
        <div class="hud-meter-track">
          <div class="hud-meter-fill hm-hp" :style="{ width: hpPct + '%' }"></div>
        </div>
        <span class="hud-meter-num">{{ Math.round(player.hp) }}/{{ Math.round(player.maxHp) }}</span>
      </div>
      <div class="hud-meter">
        <span class="hud-meter-label">真气</span>
        <div class="hud-meter-track">
          <div class="hud-meter-fill hm-qi" :style="{ width: qiPct + '%' }"></div>
        </div>
        <span class="hud-meter-num">{{ Math.round(player.qi) }}/{{ Math.round(player.maxQi) }}</span>
      </div>
      <div class="hud-meter">
        <span class="hud-meter-label">突破</span>
        <div class="hud-meter-track">
          <div class="hud-meter-fill hm-bt" :style="{ width: btPct + '%' }"></div>
        </div>
        <span class="hud-meter-num">{{ btPctDisplay }}%</span>
      </div>
    </div>

    <!-- 资源 -->
    <div class="hud-resources">
      <span class="hud-chip hud-chip-gold">
        <span class="hud-chip-label">灵石</span>
        <strong>{{ formatNumber(player.money) }}</strong>
      </span>
      <span class="hud-chip">
        <span class="hud-chip-label">声望</span>
        <strong>{{ formatNumber(player.reputation) }}</strong>
      </span>
      <span class="hud-chip">
        <span class="hud-chip-label">战力</span>
        <strong>{{ round(playerPower) }}</strong>
      </span>
    </div>

    <!-- 时间 -->
    <div class="hud-world">
      <span class="hud-chip">第 <strong>{{ world.day }}</strong> 日</span>
      <span class="hud-chip">{{ timeLabelText }}</span>
    </div>

    <div class="hud-mobile-status">
      <span class="hud-chip">血 {{ Math.round(player.hp) }}/{{ Math.round(player.maxHp) }}</span>
      <span class="hud-chip">气 {{ Math.round(player.qi) }}/{{ Math.round(player.maxQi) }}</span>
      <span class="hud-chip">突 {{ btPctDisplay }}%</span>
      <span class="hud-chip">石 {{ formatNumber(player.money) }}</span>
      <span class="hud-chip">第 {{ world.day }} 日 {{ timeLabelText }}</span>
    </div>

    <!-- 存档状态 -->
    <div class="hud-save-state">
      <span class="hud-chip hud-chip-save">{{ saveState }}</span>
    </div>

    <!-- 导轨挂钉按钮 -->
    <div class="hud-pins">
      <button
        v-for="pin in PIN_DEFS"
        :key="pin.id"
        class="hud-pin-btn"
        :class="{ 'is-pinned': windows[pin.id].open }"
        type="button"
        :title="pin.label + (windows[pin.id].open ? '（已钉出）' : '（点击钉出）')"
        @click="toggleWindow(pin.id)"
      >{{ pin.label }}</button>
    </div>

    <!-- 速度控制 -->
    <div class="hud-speed">
      <button
        v-for="opt in SPEED_OPTIONS"
        :key="opt.value"
        class="speed-button"
        :class="{ active: speed === opt.value }"
        type="button"
        @click="speed = opt.value"
      >{{ opt.label }}</button>
    </div>

    <!-- 存档操作 -->
    <div class="hud-actions">
      <button class="control-button primary" type="button" @click="store.saveGame(true)">存档</button>
      <button class="control-button" type="button" @click="store.loadGame()">读档</button>
      <button class="control-button ghost" type="button" @click="handleReset">重开</button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { SPEED_OPTIONS, TIME_LABELS } from '@/config'
import { formatNumber, round } from '@/utils'
import { useWindows } from '@/composables/useWindows'

const store = useGameStore()
const { player, world, rankData, saveState, speed, playerPower } = storeToRefs(store)
const { windows, toggleWindow } = useWindows()

const PIN_DEFS = [
  { id: 'journal' as const, label: '纪事' },
  { id: 'profile' as const, label: '人物簿' },
  { id: 'command' as const, label: '策略盘' },
]

const timeLabelText = computed(() => TIME_LABELS[world.value.hour] || '子时')

const hpPct = computed(() => player.value.maxHp > 0 ? Math.max(0, Math.min(100, player.value.hp / player.value.maxHp * 100)) : 0)
const qiPct = computed(() => player.value.maxQi > 0 ? Math.max(0, Math.min(100, player.value.qi / player.value.maxQi * 100)) : 0)
const btPct = computed(() => store.nextBreakthroughNeed > 0 ? Math.max(0, Math.min(100, player.value.breakthrough / store.nextBreakthroughNeed * 100)) : 0)
const btPctDisplay = computed(() => Math.round(btPct.value))

function handleReset() {
  if (window.confirm('确认重开此世？当前未存档进度会被覆盖。')) {
    store.resetGame()
  }
}
</script>
