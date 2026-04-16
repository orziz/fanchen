<template>
  <div class="profile-sheet">
    <UiPanelCard as="section" tone="item" class-name="profile-card profile-card-hero">
      <UiCardHeader kicker="人物概览" :title="player.name" title-class="item-title" head-class="profile-hero-top">
        <template #aside>
          <UiPill variant="rarity" tone="uncommon">声望 {{ formatNumber(player.reputation) }}</UiPill>
        </template>
      </UiCardHeader>
      <p class="item-meta">{{ player.title }} · {{ rankData.name }} · {{ currentLocation.name }}</p>
      <UiPillRow class-name="profile-chip-row">
        <UiPill variant="trait">战力 {{ round(playerPower) }}</UiPill>
        <UiPill variant="trait">悟性 {{ round(playerInsight) }}</UiPill>
        <UiPill variant="trait">魅力 {{ round(playerCharisma) }}</UiPill>
        <UiPill variant="trait">灵石 {{ formatNumber(player.money) }}</UiPill>
      </UiPillRow>
      <div class="profile-fact-grid">
        <div class="profile-fact"><span>当前归属</span><strong>{{ affiliationLabel }}</strong></div>
        <div class="profile-fact"><span>当前营生</span><strong>农 {{ round(player.skills.farming) }} / 工 {{ round(player.skills.crafting) }} / 商 {{ round(player.skills.trading) }}</strong></div>
        <div class="profile-fact"><span>当前所在地</span><strong>{{ currentLocation.name }}</strong></div>
        <div class="profile-fact"><span>师承谱系</span><strong>{{ lineageText }}</strong></div>
      </div>
    </UiPanelCard>

    <UiPanelCard as="section" tone="item" class-name="profile-card">
      <UiCardHeader kicker="关系脉络" title="门路与传承" title-class="item-title">
        <template #aside>
          <UiPill variant="rarity" tone="rare">关系 {{ relationCount }}</UiPill>
        </template>
      </UiCardHeader>
      <div class="profile-fact-grid">
        <div class="profile-fact"><span>恩师</span><strong>{{ master ? master.name : '尚未拜得师门' }}</strong></div>
        <div class="profile-fact"><span>道侣</span><strong>{{ partner ? partner.name : '暂无道侣' }}</strong></div>
        <div class="profile-fact"><span>门下弟子</span><strong>{{ discipleNames || '暂无弟子' }}</strong></div>
        <div class="profile-fact"><span>名下产业</span><strong>{{ assetCount }}</strong></div>
      </div>
      <p class="item-meta profile-note">{{ discipleText }}</p>
    </UiPanelCard>

    <section class="profile-records">
      <h3 class="subsection-title profile-records-title">个人记录</h3>
      <UiMetricGrid :items="profileRecordItems" class-name="profile-summary-grid" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { formatNumber, round } from '@/utils'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiMetricGrid from '@/components/ui/UiMetricGrid.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'
import UiPillRow from '@/components/ui/UiPillRow.vue'

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

const profileRecordItems = computed(() => [
  { label: '击退强敌', value: formatNumber(player.value.stats.enemiesDefeated) },
  { label: '斩落首领', value: formatNumber(player.value.stats.bossKills) },
  { label: '成交买卖', value: formatNumber(player.value.stats.tradesCompleted) },
  { label: '跑商趟数', value: formatNumber(player.value.stats.tradeRoutesCompleted) },
  { label: '完成机缘', value: formatNumber(player.value.stats.questsFinished) },
  { label: '拍得奇珍', value: formatNumber(player.value.stats.auctionsWon) },
  { label: '传功次数', value: formatNumber(player.value.stats.disciplesTaught) },
  { label: '名下产业', value: assetCount.value },
  { label: '收成总量', value: formatNumber(player.value.stats.cropsHarvested) },
  { label: '打造物件', value: formatNumber(player.value.stats.craftedItems) },
  { label: '铺面收账', value: formatNumber(player.value.stats.shopCollections) },
  { label: '当前灵石', value: formatNumber(player.value.money) },
])
</script>
