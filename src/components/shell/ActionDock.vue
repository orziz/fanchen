<template>
  <footer class="action-dock">
    <div class="action-dock__status">
      <GameIcon :name="statusIcon" />
      <div>
        <strong>{{ statusTitle }}</strong>
        <span>{{ statusSub }}</span>
      </div>
    </div>

    <div class="action-dock__actions" role="toolbar" :aria-label="fighting ? '交战' : '此地可做'">
      <template v-if="fighting">
        <button v-for="cmd in combatCommands" :key="cmd.key" class="action-btn" :class="[`action-btn--${cmd.key}`, { 'is-on': cmd.on }]" type="button" :disabled="cmd.disabled" :data-tip="cmd.tip" @click="cmd.run">
          <GameIcon :name="cmd.icon" />
          <span>{{ cmd.label }}</span>
        </button>
      </template>
      <template v-else>
        <div v-for="act in activities" :key="act.id" class="action-slot">
          <button
            class="action-btn"
            :class="{ 'is-ready': act.id === 'breakthrough' && !act.issue, 'is-open': openId === act.id }"
            type="button"
            :aria-disabled="Boolean(act.issue) || busy"
            :aria-expanded="act.options.length > 1 ? openId === act.id : undefined"
            :data-tip="openId === act.id ? undefined : act.issue || (act.options.length === 1 ? `${act.options[0].preview}。${act.hint}` : act.hint)"
            :data-tip-title="act.label"
            @click="pick(act)"
          >
            <GameIcon :name="act.icon" />
            <span>{{ act.label }}</span>
            <small class="action-btn__days num">{{ daysLabel(act) }}</small>
          </button>
          <div v-if="openId === act.id" class="duration-pop" role="menu" :aria-label="`${act.label}多久`">
            <button v-for="option in act.options" :key="option.days" class="duration-pop__option" type="button" role="menuitem" @click="run(act, option.days)">
              <strong class="num">{{ formatDays(option.days) }}</strong>
              <span>{{ option.preview }}</span>
            </button>
          </div>
        </div>
      </template>
    </div>

    <div class="action-dock__controls">
      <button class="travel-btn" type="button" :aria-disabled="busy || fighting" data-tip="打开山河图，择地前往" @click="openMap">
        <GameIcon name="travel" />
        <span>赶路</span>
      </button>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { formatDate, formatDays } from '@/config/calendar'
import { useBooks } from '@/composables/useBooks'
import { processBattleRound } from '@/systems/combat'
import { getPreferredSpellId } from '@/systems/techniques'
import { listActivities, startLocalActivity, type ActivityView } from '@/systems/life/activities'
import { sfx } from '@/audio/sfx'
import GameIcon from '@/components/common/GameIcon.vue'

const store = useGameStore()
const { player, combat, currentLocation, world } = storeToRefs(store)
const { openBook } = useBooks()
const openId = ref<string | null>(null)

const fighting = computed(() => Boolean(combat.value.currentEnemy))
const busy = computed(() => Boolean(store.game.life.runner || store.game.life.event || store.game.life.ended))

const activities = computed(() => {
  void player.value.cultivation
  void player.value.inventory.length
  void player.value.injury
  void player.value.locationId
  return listActivities()
})

function daysLabel(act: ActivityView) {
  const days = act.options.map(option => option.days)
  return days.length > 1 ? `${days[0]}–${days[days.length - 1]}日` : `${days[0]}日`
}

function run(act: ActivityView, days: number) {
  openId.value = null
  if (act.issue || busy.value) {
    sfx.deny()
    return
  }
  sfx.action()
  startLocalActivity(act.id, days)
}

function pick(act: ActivityView) {
  if (act.issue || busy.value) {
    sfx.deny()
    return
  }
  if (act.options.length === 1) {
    run(act, act.options[0].days)
    return
  }
  sfx.page()
  openId.value = openId.value === act.id ? null : act.id
}

function openMap() {
  if (busy.value || fighting.value) {
    sfx.deny()
    return
  }
  sfx.page()
  openBook('map')
}

function closePop(event: MouseEvent) {
  if (!(event.target as HTMLElement | null)?.closest('.action-slot')) openId.value = null
}
onMounted(() => window.addEventListener('pointerdown', closePop))
onBeforeUnmount(() => window.removeEventListener('pointerdown', closePop))

const combatCommands = computed(() => {
  const spellId = getPreferredSpellId(player.value.qi)
  const auto = combat.value.autoBattle
  const round = (action: string, skill: string | null = null) => () => {
    if (!combat.value.currentEnemy) return
    sfx.action()
    processBattleRound(action, skill)
  }
  return [
    { key: 'attack', label: '出手', icon: 'combat', tip: '以兵器与拳脚硬攻', disabled: false, on: false, run: round('attack') },
    { key: 'skill', label: '术法', icon: 'spell', tip: spellId ? '施展已学术法，耗真气' : '尚无可用术法，或真气不足', disabled: !spellId, on: false, run: round('skill', spellId) },
    { key: 'defend', label: '守势', icon: 'defend', tip: '稳住身形，硬接下一击', disabled: false, on: false, run: round('defend') },
    { key: 'item', label: '服药', icon: 'potion', tip: '服下行囊里回气血最多的药食', disabled: false, on: false, run: round('item') },
    { key: 'flee', label: '撤走', icon: 'flee', tip: combat.value.currentEnemy?.boss ? '秘境退路已封' : '设法脱身，不一定成功', disabled: Boolean(combat.value.currentEnemy?.boss), on: false, run: round('flee') },
    {
      key: 'auto', label: auto ? '自动中' : '自动', icon: 'auto', tip: auto ? '点此改为亲手出招' : '交给本能自动出招', disabled: false, on: auto,
      run: () => { sfx.confirm(); store.toggleAutoBattle() },
    },
  ]
})

const statusIcon = computed(() => (fighting.value ? 'combat' : store.game.life.runner ? 'travel' : 'target'))
const statusTitle = computed(() => {
  if (fighting.value) return `与${combat.value.currentEnemy!.name}交手`
  return store.game.life.runner?.label || currentLocation.value.name
})
const statusSub = computed(() => formatDate(world.value.day))
</script>
