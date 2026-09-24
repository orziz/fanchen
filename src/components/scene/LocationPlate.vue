<template>
  <div class="location-plate">
    <div class="location-plate__frame">
      <span class="location-plate__ornament" aria-hidden="true" />
      <h2 class="location-plate__name">{{ title }}</h2>
      <span class="location-plate__ornament is-right" aria-hidden="true" />
    </div>
    <p class="location-plate__sub">
      <template v-if="travelPlan">
        <span>赶往 {{ travelPlan.destinationName }}</span>
        <span class="location-plate__route" aria-hidden="true">
          <i v-for="(stop, index) in travelPlan.route" :key="stop" :class="{ 'is-done': index < travelPlan.nextIndex, 'is-next': index === travelPlan.nextIndex }" />
        </span>
        <span v-if="travelPlan.pausedReason" class="is-warn">受阻</span>
      </template>
      <template v-else>
        <span>{{ location.region }} · {{ location.terrain }}</span>
        <span class="location-plate__chip" data-tip="地点灵气越浓，修炼与冲关越顺">灵气 {{ location.aura }}</span>
        <span class="location-plate__chip" :class="dangerClass" data-tip="险度越高，历练收获与遭遇越多">险 {{ location.danger }}</span>
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'

const store = useGameStore()
const { player, currentLocation } = storeToRefs(store)

const location = computed(() => currentLocation.value)
const travelPlan = computed(() => player.value.travelPlan)
const title = computed(() => (travelPlan.value ? `${location.value.name}道中` : location.value.name))
const dangerClass = computed(() => (location.value.danger >= 5 ? 'is-danger' : location.value.danger >= 3 ? 'is-warn' : ''))
</script>
