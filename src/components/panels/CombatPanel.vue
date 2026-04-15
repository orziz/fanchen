<template>
  <p class="panel-intro">战斗面板会展示敌人的词条、生命与输出倾向。关闭自动战斗后，挂机循环会暂停代打，你可以手动操作。</p>

  <!-- No enemy -->
  <template v-if="!enemy">
    <div class="combat-grid single">
      <div v-if="activeRealm" class="combat-card standout">
        <div class="combat-top">
          <div>
            <p class="section-kicker">活跃秘境</p>
            <h3 class="combat-title">{{ activeRealm.name }}</h3>
            <p class="combat-meta">{{ activeRealm.desc }}</p>
          </div>
          <span class="rarity epic">声望需求 {{ activeRealm.unlockRep }}</span>
        </div>
        <p class="combat-meta">出现地点：{{ getLocationName(activeRealm.locationId) }}，首领：{{ activeRealm.boss.name }}</p>
        <div class="combat-actions">
          <button class="item-button" @click="doChallenge(activeRealm.id)">
            {{ player.locationId === activeRealm.locationId ? '立即挑战' : '赶赴并挑战' }}
          </button>
        </div>
      </div>
      <div v-else class="empty-state">当前没有活跃的首领秘境，继续游历与刷图，等待世界异象出现。</div>
      <div v-if="combat.lastResult" class="combat-card">
        <p class="section-kicker">最近战报</p>
        <h3 class="combat-title">{{ combat.lastResult.outcome === 'victory' ? '胜利' : '败退' }}</h3>
        <p class="combat-meta">对象：{{ combat.lastResult.enemy }}{{ combat.lastResult.boss ? ' · 首领' : '' }}</p>
      </div>
    </div>
  </template>

  <!-- Active enemy -->
  <template v-else>
    <div class="combat-grid">
      <div class="combat-card standout">
        <div class="combat-top">
          <div>
            <p class="section-kicker">当前敌人</p>
            <h3 class="combat-title">{{ enemy.name }}{{ enemy.boss ? ' · 首领' : '' }}</h3>
            <p class="combat-meta">区域：{{ getLocationName(enemy.regionId) }}{{ enemy.realmId ? ` · 来自秘境` : '' }}</p>
          </div>
          <span :class="['rarity', enemy.boss ? 'legendary' : 'epic']">{{ enemy.boss ? '首领' : '遭遇战' }}</span>
        </div>
        <div class="meter-stack compact">
          <MeterBar label="敌方气血" :value="enemy.hp" :max="enemy.maxHp" class-name="hp" />
          <MeterBar label="敌方真气" :value="enemy.qi" :max="enemy.maxQi" class-name="qi" />
        </div>
        <div class="inline-list">
          <span class="tag">战力 {{ round(enemy.power) }}</span>
          <span class="tag">闪避 {{ Math.round(enemy.dodge * 100) }}%</span>
          <span class="tag">护甲 {{ Math.round(enemy.defense * 100) }}%</span>
          <span class="tag">暴击 {{ Math.round(enemy.crit * 100) }}%</span>
        </div>
        <div class="inline-list affix-row">
          <template v-if="enemy.affixIds.length">
            <span v-for="affixId in enemy.affixIds" :key="affixId" class="trait-chip">{{ getAffixLabel(affixId) }}</span>
          </template>
          <span v-else class="trait-chip">无特殊词条</span>
        </div>
        <p class="combat-meta">
          预计收益：灵石 {{ enemy.rewards.money }}，修为 {{ round(enemy.rewards.cultivation) }}，
          突破 {{ round(enemy.rewards.breakthrough) }}，声望 {{ round(enemy.rewards.reputation) }}
        </p>
        <div class="combat-actions">
          <button class="item-button" @click="doAction('attack')">普攻</button>
          <button class="item-button" @click="doAction('skill')">术法</button>
          <button class="item-button" @click="doAction('defend')">防守</button>
          <button class="item-button" @click="doAction('item')">用药</button>
          <button class="item-button" @click="doAction('flee')">脱战</button>
          <button class="item-button" @click="toggleAuto">{{ combat.autoBattle ? '关闭自动战斗' : '开启自动战斗' }}</button>
        </div>
      </div>
      <div class="combat-card">
        <p class="section-kicker">战斗记录</p>
        <div class="combat-history">
          <template v-if="combat.history.length">
            <article v-for="(entry, i) in combat.history" :key="i" :class="['log-item', entry.type]">
              <div>{{ entry.text }}</div>
            </article>
          </template>
          <div v-else class="empty-state">战斗刚刚开始。</div>
        </div>
      </div>
    </div>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP, MONSTER_AFFIXES, REALM_TEMPLATES } from '@/config'
import { round } from '@/utils'
import { processBattleRound, challengeRealm } from '@/systems/combat'
import { tickWorld } from '@/systems/world'
import { travelTo } from '@/systems/world'
import MeterBar from '../MeterBar.vue'

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
  const realm = REALM_TEMPLATES.find(r => r.id === realmId)
  if (!realm) return
  if (player.value.locationId !== realm.locationId) {
    travelTo(realm.locationId)
  }
  challengeRealm(realmId)
}
</script>
