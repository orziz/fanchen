<template>
  <p class="panel-intro">战斗面板会展示敌人的词条、生命与输出倾向。关闭自动战斗后，挂机循环会暂停代打，你可以手动操作。</p>

  <!-- No enemy -->
  <template v-if="!enemy">
    <div class="combat-grid single">
      <UiPanelCard v-if="activeRealm" tone="combat" standout>
        <UiCardHeader kicker="活跃秘境" :title="activeRealm.name" title-class="combat-title">
          <template #aside>
            <UiPill variant="rarity" tone="epic">声望需求 {{ activeRealm.unlockRep }}</UiPill>
          </template>
        </UiCardHeader>
        <p class="combat-meta">{{ activeRealm.desc }}</p>
        <p class="combat-meta">出现地点：{{ getLocationName(activeRealm.locationId) }}，首领：{{ activeRealm.boss.name }}</p>
        <UiActionGroup variant="combat">
          <button class="item-button" @click="doChallenge(activeRealm.id)">
            {{ player.locationId === activeRealm.locationId ? '立即挑战' : '赶赴并挑战' }}
          </button>
        </UiActionGroup>
      </UiPanelCard>
      <div v-else class="empty-state">当前没有活跃的首领秘境，继续游历与刷图，等待世界异象出现。</div>
      <UiPanelCard v-if="combat.lastResult" tone="combat">
        <p class="section-kicker">最近战报</p>
        <h3 class="combat-title">{{ combat.lastResult.outcome === 'victory' ? '胜利' : '败退' }}</h3>
        <p class="combat-meta">对象：{{ combat.lastResult.enemy }}{{ combat.lastResult.boss ? ' · 首领' : '' }}</p>
      </UiPanelCard>
    </div>
  </template>

  <!-- Active enemy -->
  <template v-else>
    <div class="combat-grid">
      <UiPanelCard tone="combat" standout>
        <UiCardHeader :kicker="'当前敌人'" :title="`${enemy.name}${enemy.boss ? ' · 首领' : ''}`" title-class="combat-title">
          <template #aside>
            <UiPill variant="rarity" :tone="enemy.boss ? 'legendary' : 'epic'">{{ enemy.boss ? '首领' : '遭遇战' }}</UiPill>
          </template>
        </UiCardHeader>
        <p class="combat-meta">区域：{{ getLocationName(enemy.regionId) }}{{ enemy.realmId ? ` · 来自秘境` : '' }}</p>
        <div class="meter-stack compact">
          <MeterBar label="敌方气血" :value="enemy.hp" :max="enemy.maxHp" class-name="hp" />
          <MeterBar label="敌方真气" :value="enemy.qi" :max="enemy.maxQi" class-name="qi" />
        </div>
        <UiPillRow>
          <UiPill variant="tag">战力 {{ round(enemy.power) }}</UiPill>
          <UiPill variant="tag">闪避 {{ Math.round(enemy.dodge * 100) }}%</UiPill>
          <UiPill variant="tag">护甲 {{ Math.round(enemy.defense * 100) }}%</UiPill>
          <UiPill variant="tag">暴击 {{ Math.round(enemy.crit * 100) }}%</UiPill>
        </UiPillRow>
        <UiPillRow class-name="affix-row">
          <template v-if="enemy.affixIds.length">
            <UiPill v-for="affixId in enemy.affixIds" :key="affixId" variant="trait">{{ getAffixLabel(affixId) }}</UiPill>
          </template>
          <UiPill v-else variant="trait">无特殊词条</UiPill>
        </UiPillRow>
        <p class="combat-meta">
          预计收益：灵石 {{ enemy.rewards.money }}，修为 {{ round(enemy.rewards.cultivation) }}，
          突破 {{ round(enemy.rewards.breakthrough) }}，声望 {{ round(enemy.rewards.reputation) }}
        </p>
        <UiActionGroup variant="combat">
          <button class="item-button" @click="doAction('attack')">普攻</button>
          <button class="item-button" @click="doAction('skill')">术法</button>
          <button class="item-button" @click="doAction('defend')">防守</button>
          <button class="item-button" @click="doAction('item')">用药</button>
          <button class="item-button" @click="doAction('flee')">脱战</button>
          <button class="item-button" @click="toggleAuto">{{ combat.autoBattle ? '关闭自动战斗' : '开启自动战斗' }}</button>
        </UiActionGroup>
      </UiPanelCard>
      <UiPanelCard tone="combat">
        <p class="section-kicker">战斗记录</p>
        <div class="combat-history">
          <template v-if="combat.history.length">
            <article v-for="(entry, i) in combat.history" :key="i" :class="['log-item', entry.type]">
              <div>{{ entry.text }}</div>
            </article>
          </template>
          <div v-else class="empty-state">战斗刚刚开始。</div>
        </div>
      </UiPanelCard>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP, MONSTER_AFFIXES, REALM_TEMPLATES } from '@/config'
import { round } from '@/utils'
import { processBattleRound } from '@/systems/combat'
import { tickWorld, travelAndChallengeRealm } from '@/systems/world'
import MeterBar from '../MeterBar.vue'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

const store = useGameStore()
const { player, combat } = storeToRefs(store)

const enemy = computed(() => combat.value.currentEnemy)

const activeRealm = computed(() => {
  const id = store.world.realm.activeRealmId
  return id ? REALM_TEMPLATES.find(r => r.id === id) || null : null
})

function getLocationName(locId: string | null) {
  return locId ? LOCATION_MAP.get(locId)?.name || '未知' : '未知'
}

function getAffixLabel(affixId: string) {
  const affix = MONSTER_AFFIXES.find(a => a.id === affixId)
  return affix ? `${affix.label} · ${affix.desc}` : affixId
}

function doAction(action: string) {
  processBattleRound(action)
  tickWorld()
}

function toggleAuto() {
  store.toggleAutoBattle()
}

function doChallenge(realmId: string) {
  travelAndChallengeRealm(realmId)
}
</script>
