<template>
  <BookFrame title="人物" icon="character">
    <div class="character-book">
      <section class="sheet sheet--portrait">
        <SealAvatar :name="player.name" variant="cinnabar" size="lg" />
        <h3 class="sheet__name">{{ player.name }}</h3>
        <p class="sheet__line">{{ player.title }}</p>
        <p class="sheet__line">{{ rankData.name }} · {{ currentLocation.name }}</p>
        <dl class="stat-grid">
          <div v-for="stat in stats" :key="stat.label" class="stat-grid__item" :data-tip="stat.tip">
            <dt><GameIcon :name="stat.icon" />{{ stat.label }}</dt>
            <dd class="num">{{ stat.value }}</dd>
          </div>
        </dl>
        <p class="sheet__note">{{ growthNote }}</p>
      </section>

      <section class="sheet">
        <h4 class="sheet__heading">境界</h4>
        <ol class="realm-ladder">
          <li v-for="(rank, index) in ranks" :key="rank.name" class="realm-ladder__step" :class="{ 'is-current': index === player.rankIndex, 'is-past': index < player.rankIndex }">
            <span class="realm-ladder__name">{{ rank.name }}</span>
            <span class="realm-ladder__need num">{{ index === 0 ? '起点' : `修为 ${rank.need}` }}</span>
            <span class="realm-ladder__gain num">寿元 {{ rank.lifespan }} · 气血 {{ rank.hpMax }}</span>
          </li>
        </ol>

        <h4 class="sheet__heading">门路与传承</h4>
        <dl class="fact-list">
          <div><dt>所投门路</dt><dd>{{ affiliationLabel }}</dd></div>
          <div><dt>恩师</dt><dd>{{ master ? master.name : '尚未拜师' }}</dd></div>
          <div><dt>道侣</dt><dd>{{ partner ? partner.name : '暂无' }}</dd></div>
          <div><dt>名下产业</dt><dd class="num">{{ assetCount }} 处</dd></div>
        </dl>

        <h4 class="sheet__heading">营生手艺</h4>
        <div class="skill-bars">
          <InkBar v-for="skill in skills" :key="skill.label" :label="skill.label" :value="skill.value" :max="skill.max" :text="`${skill.value}`" compact />
        </div>
      </section>

      <section class="sheet">
        <h4 class="sheet__heading">平生记录</h4>
        <dl class="record-grid">
          <div v-for="record in records" :key="record.label">
            <dt>{{ record.label }}</dt>
            <dd class="num">{{ record.value }}</dd>
          </div>
        </dl>
      </section>
    </div>
  </BookFrame>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { RANKS } from '@/config'
import { ageOf, lifespanOf, nextRealmNeed } from '@/systems/life/cultivation'
import { formatNumber } from '@/utils'
import BookFrame from '@/components/books/BookFrame.vue'
import GameIcon from '@/components/common/GameIcon.vue'
import InkBar from '@/components/common/InkBar.vue'
import SealAvatar from '@/components/common/SealAvatar.vue'

const store = useGameStore()
const {
  player, rankData, currentLocation, currentAffiliation, playerPower, playerInsight, playerCharisma, hasNextRank, nextBreakthroughNeed,
} = storeToRefs(store)

const ranks = RANKS

const stats = computed(() => [
  { label: '战力', icon: 'power', value: formatNumber(Math.round(playerPower.value)), tip: '体魄、兵器、心法与境界之和' },
  { label: '悟性', icon: 'insight', value: formatNumber(Math.round(playerInsight.value)), tip: '冲关成败、火候积累、术法威力都看悟性' },
  { label: '魅力', icon: 'charisma', value: formatNumber(Math.round(playerCharisma.value)), tip: '结交人物、脱身、交涉时更占便宜' },
  { label: '灵石', icon: 'stone', value: formatNumber(player.value.money), tip: '随身盘缠' },
  { label: '声望', icon: 'fame', value: formatNumber(player.value.reputation), tip: '江湖名声' },
  { label: '气血', icon: 'hp', value: `${player.value.hp}/${player.value.maxHp}`, tip: '归零即落败，被人救回也要折损灵石' },
])

const growthNote = computed(() => {
  const p = player.value
  const need = nextRealmNeed(p.rankIndex)
  const age = ageOf(p)
  const left = lifespanOf(p) - age
  const progress = need ? `这一境修为 ${Math.floor(p.cultivation)} / ${need}` : '已到境界尽头'
  return `${age}岁，寿元还剩${left}年。${progress}。`
})

const master = computed(() => (player.value.masterId ? store.getNpc(player.value.masterId) : null))
const partner = computed(() => (player.value.partnerId ? store.getNpc(player.value.partnerId) : null))
const assetCount = computed(() => player.value.assets.farms.length + player.value.assets.workshops.length + player.value.assets.shops.length)
const affiliationLabel = computed(() => {
  const faction = currentAffiliation.value
  return faction ? `${faction.name}（${faction.titles[player.value.affiliationRank] || faction.titles[0]}）` : '白身'
})

const skills = computed(() => [
  { label: '农务', value: Math.round(player.value.skills.farming), max: 20 },
  { label: '工艺', value: Math.round(player.value.skills.crafting), max: 20 },
  { label: '商道', value: Math.round(player.value.skills.trading), max: 20 },
])

const records = computed(() => {
  const s = player.value.stats
  return [
    { label: '击败妖物', value: s.enemiesDefeated },
    { label: '斩落首领', value: s.bossKills },
    { label: '买卖成交', value: s.tradesCompleted },
    { label: '跑通货路', value: s.tradeRoutesCompleted },
    { label: '了结差事', value: s.questsFinished },
    { label: '门路差使', value: s.affiliationTasksCompleted },
    { label: '静坐修炼', value: s.meditationSessions },
    { label: '收成', value: s.cropsHarvested },
    { label: '成器', value: s.craftedItems },
    { label: '铺面收账', value: s.shopCollections },
    { label: '拍得宝物', value: s.auctionsWon },
    { label: '产业扩建', value: s.industryUpgrades },
  ]
})
</script>
