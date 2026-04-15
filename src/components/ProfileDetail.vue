<template>
  <div class="profile-sheet">
    <div class="item-card">
      <div class="item-top">
        <div>
          <p class="section-kicker">人物概览</p>
          <h3 class="item-title">{{ player.name }}</h3>
          <p class="item-meta">{{ player.title }} · {{ rankData.name }} · {{ currentLocation.name }}</p>
        </div>
        <span class="rarity uncommon">声望 {{ formatNumber(player.reputation) }}</span>
      </div>
      <p class="item-meta">当前归属：{{ affiliationLabel }}</p>
      <p class="item-meta">当前营生：农 {{ round(player.skills.farming) }} / 工 {{ round(player.skills.crafting) }} / 商 {{ round(player.skills.trading) }}</p>
      <p class="item-meta">师承谱系：{{ lineageText }}</p>
    </div>

    <div class="item-card">
      <div class="item-top">
        <div>
          <p class="section-kicker">关系脉络</p>
          <h3 class="item-title">门路与传承</h3>
        </div>
        <span class="rarity rare">关系 {{ relationCount }}</span>
      </div>
      <p class="item-meta">{{ master ? `${master.name}曾为你开门引路。` : '尚未拜得师门。' }}</p>
      <p class="item-meta">{{ partner ? `你与${partner.name}已结道侣。` : '尚未与人结成道侣。' }}</p>
      <p class="item-meta">{{ discipleText }}</p>
    </div>

    <div>
      <h3 class="subsection-title">个人记录</h3>
      <div class="summary-grid">
        <div class="summary-box"><span>击退强敌</span><strong>{{ formatNumber(player.stats.enemiesDefeated) }}</strong></div>
        <div class="summary-box"><span>斩落首领</span><strong>{{ formatNumber(player.stats.bossKills) }}</strong></div>
        <div class="summary-box"><span>成交买卖</span><strong>{{ formatNumber(player.stats.tradesCompleted) }}</strong></div>
        <div class="summary-box"><span>跑商趟数</span><strong>{{ formatNumber(player.stats.tradeRoutesCompleted) }}</strong></div>
        <div class="summary-box"><span>完成机缘</span><strong>{{ formatNumber(player.stats.questsFinished) }}</strong></div>
        <div class="summary-box"><span>拍得奇珍</span><strong>{{ formatNumber(player.stats.auctionsWon) }}</strong></div>
        <div class="summary-box"><span>传功次数</span><strong>{{ formatNumber(player.stats.disciplesTaught) }}</strong></div>
        <div class="summary-box"><span>名下产业</span><strong>{{ assetCount }}</strong></div>
        <div class="summary-box"><span>收成总量</span><strong>{{ formatNumber(player.stats.cropsHarvested) }}</strong></div>
        <div class="summary-box"><span>打造物件</span><strong>{{ formatNumber(player.stats.craftedItems) }}</strong></div>
        <div class="summary-box"><span>铺面收账</span><strong>{{ formatNumber(player.stats.shopCollections) }}</strong></div>
        <div class="summary-box"><span>当前灵石</span><strong>{{ formatNumber(player.money) }}</strong></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { formatNumber, round } from '@/utils'

const store = useGameStore()
const { player, currentLocation, rankData, currentAffiliation, sect } = storeToRefs(store)

const master = computed(() => player.value.masterId ? store.getNpc(player.value.masterId) : null)
const partner = computed(() => player.value.partnerId ? store.getNpc(player.value.partnerId) : null)
const disciples = computed(() =>
  (sect.value?.disciples || []).map(id => store.getNpc(id)).filter(Boolean)
)

const affiliationLabel = computed(() =>
  sect.value ? sect.value.name : currentAffiliation.value ? currentAffiliation.value.name : '无'
)

const lineageText = computed(() => [
  master.value ? `师承 ${master.value.name}` : '暂无师承',
  partner.value ? `道侣 ${partner.value.name}` : '暂无道侣',
  disciples.value.length ? `门下 ${disciples.value.map(n => n!.name).join('、')}` : '门下暂无弟子',
].join(' · '))

const relationCount = computed(() =>
  disciples.value.length + (master.value ? 1 : 0) + (partner.value ? 1 : 0)
)

const discipleText = computed(() =>
  disciples.value.length
    ? `当前门下弟子：${disciples.value.map(n => `${n!.name}·${store.rankData.name}`).join('、')}`
    : '还未建立自己的传承链。'
)

const assetCount = computed(() =>
  player.value.assets.farms.length + player.value.assets.workshops.length + player.value.assets.shops.length
)
</script>
