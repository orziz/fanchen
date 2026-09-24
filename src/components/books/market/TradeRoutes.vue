<template>
  <div class="trade-view">
    <section v-if="run" class="caravan-card">
      <GameIcon name="trade" class="caravan-card__icon" />
      <div class="caravan-card__body">
        <span class="caravan-card__kicker">{{ arrived ? '货已到站' : '货队在途' }}</span>
        <strong>{{ run.cargoLabel }}</strong>
        <p>{{ run.originName }} → {{ run.destinationName }} · 压货 {{ run.purchaseCost }} · 预计到手 {{ run.saleEstimate }}</p>
      </div>
      <button class="ink-btn ink-btn--primary" type="button" @click="continueRun">{{ arrived ? '交割' : `押往${run.destinationName}` }}</button>
    </section>

    <p v-if="!isHub" class="empty-note">{{ currentLocation.name }}没有成形的大宗货路，往州府、港埠、关隘这类商埠去才压得到货。</p>
    <template v-else>
      <p class="sheet__note">在{{ currentLocation.name }}压一批货，押到别处出手。路越远、外货越紧，赚头越大；一路风雨险阻，也得自己担着。</p>
      <div class="route-table">
        <div class="route-row route-row--head">
          <span>去处</span><span>货</span><span class="num">程</span><span class="num">压货</span><span class="num">到手</span><span class="num">净利</span><span />
        </div>
        <div v-for="route in routes" :key="route.destinationId" class="route-row" :class="{ 'is-best': route.destinationId === bestId }">
          <span class="route-row__dest">{{ route.destinationName }}</span>
          <span>{{ route.cargoLabel }}</span>
          <span class="num">{{ route.segments }}</span>
          <span class="num">{{ route.purchaseCost }}</span>
          <span class="num">{{ route.saleEstimate }}</span>
          <span class="num route-row__profit">+{{ route.profitEstimate }}</span>
          <button class="ink-btn ink-btn--small" :class="{ 'ink-btn--primary': !route.reason }" type="button" :aria-disabled="Boolean(route.reason)" :data-tip="route.reason || `起货税 ${pct(route.originTaxRate)} · 落地治安 ${route.destinationSecurity}`" @click="start(route.destinationId, route.reason)">压货启程</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { advanceTradeRun, getTradeRouteOptions, isTradeHub, startTradeRun } from '@/systems/trade'
import { tickWorld } from '@/systems/world'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { player, currentLocation, world } = storeToRefs(store)

const run = computed(() => player.value.tradeRun)
const arrived = computed(() => Boolean(run.value && player.value.locationId === run.value.destinationId))
const isHub = computed(() => isTradeHub(currentLocation.value))

const routes = computed(() => {
  void world.value.hour
  void player.value.money
  return getTradeRouteOptions(currentLocation.value.id).map(route => ({
    ...route,
    reason: run.value ? '手上这趟货还没交割' : !route.affordable ? `灵石还差 ${route.purchaseCost - player.value.money}` : '',
  })).sort((a, b) => b.profitEstimate - a.profitEstimate)
})

const bestId = computed(() => routes.value.find(route => !route.reason)?.destinationId || null)

const pct = (value: number) => `${Math.round(value * 100)}%`

function start(destinationId: string, reason: string) {
  if (reason) {
    sfx.deny()
    return
  }
  sfx.coin()
  startTradeRun(destinationId)
}

function continueRun() {
  sfx.confirm()
  if (advanceTradeRun() !== 'none') tickWorld()
}
</script>
