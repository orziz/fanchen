<template>
  <div class="world-overview">
    <dl class="record-grid world-overview__summary">
      <div v-for="item in summary" :key="item.label" :data-tip="item.tip">
        <dt>{{ item.label }}</dt>
        <dd>{{ item.value }}</dd>
      </div>
    </dl>

    <h4 class="sheet__heading">九州风物</h4>
    <table class="ink-table">
      <thead>
        <tr>
          <th>地点</th><th>地域</th><th class="num">灵气</th><th class="num">险</th><th>治安</th><th>税</th><th>商气</th><th>外需</th><th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.id" :class="{ 'is-current': row.current }">
          <td><button class="link-btn" type="button" @click="focus(row.id)">{{ row.name }}</button></td>
          <td>{{ row.region }}</td>
          <td class="num">{{ row.aura }}</td>
          <td class="num">{{ row.danger }}</td>
          <td class="num">{{ row.security }}</td>
          <td class="num">{{ row.tax }}</td>
          <td>{{ row.prosperity }}</td>
          <td>{{ row.need }}</td>
          <td><span v-if="row.current" class="tag tag--jade">所在</span><span v-else-if="row.realm" class="tag tag--danger">异象</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATIONS, REALM_TEMPLATES } from '@/config'
import { formatNumber } from '@/utils'
import { getTerritorySecurity, getTerritoryTaxRate } from '@/systems/social'
import { getLocationEconomyOverview } from '@/systems/worldEconomy'
import { useBooks } from '@/composables/useBooks'
import { sfx } from '@/audio/sfx'

const store = useGameStore()
const { player, world, selectedLocationId } = storeToRefs(store)
const { setBookTab } = useBooks()

const realmLocation = computed(() => {
  const id = world.value.realm.activeRealmId
  return id ? REALM_TEMPLATES.find(r => r.id === id)?.locationId || null : null
})

const summary = computed(() => {
  const here = player.value.locationId
  const economy = getLocationEconomyOverview(here)
  return [
    { label: '天候', value: world.value.weather, tip: '雨雪风雾影响行路与心境' },
    { label: '天象', value: world.value.omen, tip: '异象往往预示秘境显世' },
    { label: '商帮情面', value: formatNumber(world.value.factionFavor.merchants), tip: '与各路商帮、镖局的交情' },
    { label: '官面声望', value: formatNumber(world.value.factionFavor.court), tip: '官府、转运司、军府对你的观感' },
    { label: '此地治安', value: `${getTerritorySecurity(here)}`, tip: '治安越好，行路越少风险' },
    { label: '此地税赋', value: `${Math.round(getTerritoryTaxRate(here) * 100)}%`, tip: '买卖与铺面收入要交的份子' },
    { label: '此地商气', value: economy.prosperityLabel, tip: economy.summary },
    { label: '外货行情', value: economy.needLabel, tip: '外地货在此地是否抢手' },
  ]
})

const rows = computed(() => {
  void world.value.day
  return LOCATIONS.map(location => {
    const economy = getLocationEconomyOverview(location.id)
    return {
      id: location.id,
      name: location.name,
      region: location.region,
      aura: location.aura,
      danger: location.danger,
      security: getTerritorySecurity(location.id),
      tax: `${Math.round(getTerritoryTaxRate(location.id) * 100)}%`,
      prosperity: economy.prosperityLabel,
      need: economy.needLabel,
      current: location.id === player.value.locationId,
      realm: location.id === realmLocation.value,
    }
  })
})

function focus(id: string) {
  sfx.page()
  selectedLocationId.value = id
  setBookTab('map', 'map')
}
</script>
