<template>
  <div class="profile-sheet">
    <section class="item-card profile-card profile-card-hero">
      <div class="item-top profile-hero-top">
        <div>
          <p class="section-kicker">人物概览</p>
          <h3 class="item-title">{{ player.name }}</h3>
          <p class="item-meta">{{ player.title }} · {{ rankData.name }} · {{ currentLocation.name }}</p>
        </div>
        <span class="rarity uncommon">声望 {{ formatNumber(player.reputation) }}</span>
      </div>
      <div class="profile-chip-row">
        <span class="trait-chip">战力 {{ round(playerPower) }}</span>
        <span class="trait-chip">悟性 {{ round(playerInsight) }}</span>
        <span class="trait-chip">魅力 {{ round(playerCharisma) }}</span>
        <span class="trait-chip">灵石 {{ formatNumber(player.money) }}</span>
      </div>
      <div class="profile-fact-grid">
        <div class="profile-fact"><span>当前归属</span><strong>{{ affiliationLabel }}</strong></div>
        <div class="profile-fact"><span>当前营生</span><strong>农 {{ round(player.skills.farming) }} / 工 {{ round(player.skills.crafting) }} / 商 {{ round(player.skills.trading) }}</strong></div>
        <div class="profile-fact"><span>当前所在地</span><strong>{{ currentLocation.name }}</strong></div>
        <div class="profile-fact"><span>师承谱系</span><strong>{{ lineageText }}</strong></div>
      </div>
    </section>

    <section class="item-card profile-card">
      <div class="item-top">
        <div>
          <p class="section-kicker">关系脉络</p>
          <h3 class="item-title">门路与传承</h3>
        </div>
        <span class="rarity rare">关系 {{ relationCount }}</span>
      </div>
      <div class="profile-fact-grid">
        <div class="profile-fact"><span>恩师</span><strong>{{ master ? master.name : '尚未拜得师门' }}</strong></div>
        <div class="profile-fact"><span>道侣</span><strong>{{ partner ? partner.name : '暂无道侣' }}</strong></div>
        <div class="profile-fact"><span>门下弟子</span><strong>{{ discipleNames || '暂无弟子' }}</strong></div>
        <div class="profile-fact"><span>名下产业</span><strong>{{ assetCount }}</strong></div>
      </div>
      <p class="item-meta profile-note">{{ discipleText }}</p>
    </section>

    <section class="profile-records">
      <h3 class="subsection-title profile-records-title">个人记录</h3>
      <div class="summary-grid profile-summary-grid">
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
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { formatNumber, round } from '@/utils'

const store = useGameStore()
const { player, currentLocation, rankData, currentAffiliation, playerPower, playerInsight, playerCharisma, sect } = storeToRefs(store)

const master = computed(() => player.value.masterId ? store.getNpc(player.value.masterId) : null)
const partner = computed(() => player.value.partnerId ? store.getNpc(player.value.partnerId) : null)
const disciples = computed(() =>
  (sect.value?.disciples || []).map(id => store.getNpc(id)).filter(Boolean)
)
const discipleNames = computed(() => disciples.value.map(n => n!.name).join('、'))

const affiliationLabel = computed(() =>
  sect.value ? sect.value.name : currentAffiliation.value ? currentAffiliation.value.name : '无'
)

const lineageText = computed(() => [
  master.value ? `师承 ${master.value.name}` : '暂无师承',
  partner.value ? `道侣 ${partner.value.name}` : '暂无道侣',
  disciples.value.length ? `门下 ${discipleNames.value}` : '门下暂无弟子',
].join(' · '))

const relationCount = computed(() =>
  disciples.value.length + (master.value ? 1 : 0) + (partner.value ? 1 : 0)
)

const discipleText = computed(() =>
  disciples.value.length
    ? `当前门下弟子：${discipleNames.value}。这条传承已经开始成形。`
    : '还未建立自己的传承链。'
)

const assetCount = computed(() =>
  player.value.assets.farms.length + player.value.assets.workshops.length + player.value.assets.shops.length
)
</script>
