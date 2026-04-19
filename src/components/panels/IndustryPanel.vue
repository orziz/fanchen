<template>
  <p class="panel-intro">此处可置办官契、接行会单、扩建田产工坊铺面，也能把活计交给门下或自家人去跑。</p>

  <UiMetricGrid :items="industrySummaryItems" />

  <div class="panel-section-nav">
    <button
      v-for="section in industrySections"
      :key="section.key"
      :class="['panel-section-button', { active: activeIndustrySection === section.key }]"
      type="button"
      @click="activeIndustrySection = section.key"
    >
      <span>{{ section.label }}</span>
      <strong class="panel-section-button__count">{{ section.count }}</strong>
    </button>
  </div>
  <p class="panel-section-copy">{{ activeIndustrySectionMeta.desc }}</p>

  <!-- Industry Orders -->
  <template v-if="activeIndustrySection === 'orders'">
  <h3 class="subsection-title">行会订单</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="orders.length">
      <UiPanelCard v-for="order in orders" :key="order.id" tone="item">
        <UiCardHeader :title="order.title" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" tone="uncommon">报酬 {{ order.rewardMoney }}</UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">{{ order.factionName }} · {{ order.desc }}</p>
        <p class="item-meta">交付：{{ formatRequirements(order) }}</p>
        <p class="item-meta">额外收益：声望 +{{ formatNumber(order.rewardReputation) }}</p>
        <UiActionGroup>
          <button class="item-button" :class="canFulfill(order.id) ? 'is-route' : ''" :disabled="!canFulfill(order.id)" :title="orderIssueText(order.id)" @click="doFulfill(order.id)">
            {{ canFulfill(order.id) ? '交付订单' : '货物未齐' }}
          </button>
        </UiActionGroup>
      </UiPanelCard>
    </template>
    <div v-else class="empty-state">各地行会正在换单，过几个时辰再来看看。</div>
  </div>
  </template>

  <!-- Properties -->
  <template v-if="activeIndustrySection === 'properties'">
  <h3 class="subsection-title">当前地点可经营产业</h3>
  <div class="world-grid industry-stack">
    <template v-if="localProperties.length">
      <UiPanelCard v-for="prop in localProperties" :key="prop.id" tone="world">
        <span>{{ prop.label }}</span>
        <strong>{{ prop.cost }} 灵石</strong>
        <p class="item-meta">{{ prop.desc }}</p>
        <p class="item-meta">购入条件：{{ propertyIssueText(prop.id) }}</p>
        <UiActionGroup>
          <button class="item-button" :class="canBuyProperty(prop.id) ? 'is-route' : ''" :disabled="!canBuyProperty(prop.id)" :title="propertyIssueText(prop.id)" @click="doBuyProperty(prop.id)">购入到自己名下</button>
        </UiActionGroup>
      </UiPanelCard>
    </template>
    <div v-else class="empty-state">当前地点没有可经营的产业类型，换个地方看看。</div>
  </div>
  </template>

  <!-- Farms -->
  <template v-if="activeIndustrySection === 'farms'">
  <h3 class="subsection-title">名下田产</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="player.assets.farms.length">
      <UiPanelCard v-for="farm in player.assets.farms" :key="farm.id" tone="item">
        <UiCardHeader :title="farm.label" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" tone="common">田产</UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">地点：{{ getLocationName(farm.locationId) }} · {{ farm.level }} 级 · 治安 {{ getSecurity(farm.locationId) }} · 税赋 {{ formatPercent(getTaxRate(farm.locationId)) }}</p>
        <p class="item-meta">{{ farm.cropId ? `种植中 剩余 ${farm.daysRemaining} 天` : '当前空置，可立即播种。' }}</p>
        <p class="item-meta">当前功用：{{ describeIndustryAssetEffect('farm', farm.level) }}</p>
        <p class="item-meta">再扩一级：{{ describeIndustryNextUpgrade('farm', farm.level) }}（需 {{ getUpgradeCost('farm', farm.id) }} 灵石）</p>
        <p class="item-meta">当前管事：{{ getManagerLabel(farm) }} · 章程：{{ getAutomationLabel('farm', farm) }}</p>
        <p class="item-meta">最近打理：{{ getManagedResult(farm) }}</p>
        <p class="item-meta">扩建条件：{{ upgradeIssueText('farm', farm.id) }}</p>
        <UiActionGroup>
          <template v-if="!farm.cropId">
            <button v-for="crop in CROPS" :key="crop.id" class="item-button" @click="doPlant(farm.id, crop.id)">种{{ crop.label }}</button>
          </template>
          <button v-else class="item-button" :disabled="farm.daysRemaining > 0" :title="harvestIssueText(farm.id)" @click="doHarvest(farm.id)">
            {{ farm.daysRemaining > 0 ? '查看成熟时间' : '收成' }}
          </button>
          <button class="item-button" :disabled="!canUpgrade('farm', farm.id)" :title="upgradeIssueText('farm', farm.id)" @click="doUpgrade('farm', farm.id)">扩田</button>
        </UiActionGroup>
        <UiActionGroup v-if="delegateCandidates.length" variant="npc">
          <button
            v-for="npc in delegateCandidates"
            :key="`${farm.id}-${npc.id}`"
            class="npc-button"
            :disabled="!canAssignManager('farm', farm.id, npc.id)"
            :title="managerReason('farm', farm.id, npc.id)"
            @click="doAssignManager('farm', farm.id, npc.id)"
          >交给{{ npc.name }}</button>
          <button v-if="farm.managerNpcId" class="npc-button" @click="doClearManager('farm', farm.id)">收回管事</button>
        </UiActionGroup>
        <UiActionGroup v-if="farm.managerNpcId" variant="teaching">
          <button
            v-for="crop in CROPS"
            :key="`${farm.id}-${crop.id}-plan`"
            class="npc-button"
            :disabled="!canSetPlanForAsset('farm', farm.id, crop.id)"
            :title="planReason('farm', farm.id, crop.id)"
            @click="doSetPlan('farm', farm.id, crop.id)"
          >轮种{{ crop.label }}</button>
        </UiActionGroup>
      </UiPanelCard>
    </template>
    <div v-else class="empty-state">你还没有属于自己的田地。</div>
  </div>
  </template>

  <!-- Workshops -->
  <template v-if="activeIndustrySection === 'workshops'">
  <h3 class="subsection-title">名下工坊</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="player.assets.workshops.length">
      <UiPanelCard v-for="ws in player.assets.workshops" :key="ws.id" tone="item">
        <UiCardHeader :title="ws.label" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" tone="uncommon">工坊</UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">地点：{{ getLocationName(ws.locationId) }} · {{ ws.level }} 级 · 治安 {{ getSecurity(ws.locationId) }} · 税赋 {{ formatPercent(getTaxRate(ws.locationId)) }}</p>
        <p class="item-meta">当前功用：{{ describeIndustryAssetEffect('workshop', ws.level) }}</p>
        <p class="item-meta">再扩一级：{{ describeIndustryNextUpgrade('workshop', ws.level) }}（需 {{ getUpgradeCost('workshop', ws.id) }} 灵石）</p>
        <p class="item-meta">当前管事：{{ getManagerLabel(ws) }} · 章程：{{ getAutomationLabel('workshop', ws) }}</p>
        <p class="item-meta">最近打理：{{ getManagedResult(ws) }}</p>
        <p class="item-meta">扩建条件：{{ upgradeIssueText('workshop', ws.id) }}</p>
        <UiActionGroup variant="teaching">
          <button v-for="recipe in CRAFT_RECIPES" :key="recipe.id" class="npc-button" :disabled="!canCraft(recipe.id)" :title="craftIssueText(recipe.id)" @click="doCraft(recipe.id)">{{ recipe.label }}</button>
        </UiActionGroup>
        <UiActionGroup>
          <button class="item-button" :disabled="!canUpgrade('workshop', ws.id)" :title="upgradeIssueText('workshop', ws.id)" @click="doUpgrade('workshop', ws.id)">扩坊</button>
        </UiActionGroup>
        <UiActionGroup v-if="delegateCandidates.length" variant="npc">
          <button
            v-for="npc in delegateCandidates"
            :key="`${ws.id}-${npc.id}`"
            class="npc-button"
            :disabled="!canAssignManager('workshop', ws.id, npc.id)"
            :title="managerReason('workshop', ws.id, npc.id)"
            @click="doAssignManager('workshop', ws.id, npc.id)"
          >交给{{ npc.name }}</button>
          <button v-if="ws.managerNpcId" class="npc-button" @click="doClearManager('workshop', ws.id)">收回管事</button>
        </UiActionGroup>
        <UiActionGroup v-if="ws.managerNpcId && workshopAutomationRecipes.length" variant="teaching">
          <button
            v-for="recipe in workshopAutomationRecipes"
            :key="`${ws.id}-${recipe.id}-plan`"
            class="npc-button"
            :disabled="!canSetPlanForAsset('workshop', ws.id, recipe.id)"
            :title="planReason('workshop', ws.id, recipe.id)"
            @click="doSetPlan('workshop', ws.id, recipe.id)"
          >常做{{ recipe.label }}</button>
        </UiActionGroup>
      </UiPanelCard>
    </template>
    <div v-else class="empty-state">你还没有属于自己的工坊。</div>
  </div>
  </template>

  <!-- Shops -->
  <template v-if="activeIndustrySection === 'shops'">
  <h3 class="subsection-title">名下铺面</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="player.assets.shops.length">
      <UiPanelCard v-for="shop in player.assets.shops" :key="shop.id" tone="item">
        <UiCardHeader :title="shop.label" title-class="item-title">
          <template #aside>
            <UiPill variant="rarity" tone="rare">铺面</UiPill>
          </template>
        </UiCardHeader>
        <p class="item-meta">地点：{{ getLocationName(shop.locationId) }} · {{ shop.level }} 级 · 治安 {{ getSecurity(shop.locationId) }} · 税赋 {{ formatPercent(getTaxRate(shop.locationId)) }}</p>
        <p class="item-meta">库存 {{ shop.stock }} 批，待收账 {{ shop.pendingIncome }} 灵石。</p>
        <p class="item-meta">当前功用：{{ describeIndustryAssetEffect('shop', shop.level) }}</p>
        <p class="item-meta">再扩一级：{{ describeIndustryNextUpgrade('shop', shop.level) }}（需 {{ getUpgradeCost('shop', shop.id) }} 灵石）</p>
        <p class="item-meta">当前管事：{{ getManagerLabel(shop) }} · 章程：{{ getAutomationLabel('shop', shop) }}</p>
        <p class="item-meta">最近打理：{{ getManagedResult(shop) }}</p>
        <p class="item-meta">扩建条件：{{ upgradeIssueText('shop', shop.id) }}</p>
        <UiActionGroup>
          <button class="item-button" @click="doRestock(shop.id)">进货</button>
          <button class="item-button" @click="doCollect(shop.id)">收账</button>
          <button class="item-button" :disabled="!canUpgrade('shop', shop.id)" :title="upgradeIssueText('shop', shop.id)" @click="doUpgrade('shop', shop.id)">扩铺</button>
        </UiActionGroup>
        <UiActionGroup v-if="delegateCandidates.length" variant="npc">
          <button
            v-for="npc in delegateCandidates"
            :key="`${shop.id}-${npc.id}`"
            class="npc-button"
            :disabled="!canAssignManager('shop', shop.id, npc.id)"
            :title="managerReason('shop', shop.id, npc.id)"
            @click="doAssignManager('shop', shop.id, npc.id)"
          >交给{{ npc.name }}</button>
          <button v-if="shop.managerNpcId" class="npc-button" @click="doClearManager('shop', shop.id)">收回管事</button>
        </UiActionGroup>
      </UiPanelCard>
    </template>
    <div v-else class="empty-state">你还没有属于自己的铺面。</div>
  </div>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP, CROPS, CRAFT_RECIPES, describeIndustryAssetEffect, describeIndustryNextUpgrade, getItem } from '@/config'
import { formatNumber } from '@/utils'
import type { AssetState } from '@/types/game'
import { getTerritorySecurity, getTerritoryTaxRate } from '@/systems/social'
import {
  canCraftRecipe, canFulfillIndustryOrder, canPurchaseProperty, canUpgradeAsset,
  canAssignAssetManager, canSetAssetPlan,
  explainCraftRecipe, explainHarvest, explainIndustryOrder, explainPropertyPurchase,
  getAssetDelegateCandidates, getAssetManagerLabel, getAssetAutomationLabel,
  getAssetUpgradeIssues, getLocalProperties, refreshIndustryOrders, fulfillIndustryOrder,
  getAssignAssetManagerIssues, getSetAssetPlanIssues, getAssetUpgradeCost,
  purchaseProperty, upgradeAsset, plantCrop, harvestCrop,
  assignAssetManager, clearAssetManager, setAssetPlan,
  craftRecipe, restockShop, collectShopIncome,
} from '@/systems/industry'
import UiActionGroup from '@/components/ui/UiActionGroup.vue'
import UiCardHeader from '@/components/ui/UiCardHeader.vue'
import UiMetricGrid from '@/components/ui/UiMetricGrid.vue'
import UiPanelCard from '@/components/ui/UiPanelCard.vue'
import UiPill from '@/components/ui/UiPill.vue'

const store = useGameStore()
const { player } = storeToRefs(store)

const totalAssets = computed(() => player.value.assets.farms.length + player.value.assets.workshops.length + player.value.assets.shops.length)
const industrySummaryItems = computed(() => [
  { label: '本地声望', value: formatNumber(store.getRegionStanding()) },
  { label: '名下产业', value: totalAssets.value },
  { label: '现银', value: player.value.money },
])

const orders = computed(() => refreshIndustryOrders())
const localProperties = computed(() => getLocalProperties())
const delegateCandidates = computed(() => getAssetDelegateCandidates())
const workshopAutomationRecipes = computed(() =>
  CRAFT_RECIPES.filter(recipe => player.value.rankIndex >= recipe.minRankIndex)
)

type IndustrySectionKey = 'orders' | 'properties' | 'farms' | 'workshops' | 'shops'

const activeIndustrySection = ref<IndustrySectionKey>('orders')
const industrySections = computed(() => ([
  { key: 'orders' as const, label: '行会单', count: orders.value.length, desc: '先看当下能立刻交付或值得备货的活计。' },
  { key: 'properties' as const, label: '可置办', count: localProperties.value.length, desc: '只看当前地点还能落到你名下的产业。' },
  { key: 'farms' as const, label: '田产', count: player.value.assets.farms.length, desc: '田里只看播种、收成、轮种和管事安排。' },
  { key: 'workshops' as const, label: '工坊', count: player.value.assets.workshops.length, desc: '工坊只看打造、章程和托管人选。' },
  { key: 'shops' as const, label: '铺面', count: player.value.assets.shops.length, desc: '铺面只看进货、收账和扩铺盘面。' },
]))
const activeIndustrySectionMeta = computed(() =>
  industrySections.value.find(section => section.key === activeIndustrySection.value) || industrySections.value[0]
)

function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }
function getSecurity(id: string) { return getTerritorySecurity(id) }
function getTaxRate(id: string) { return getTerritoryTaxRate(id) }
function formatPercent(value: number) { return `${Math.round(value * 100)}%` }
function canFulfill(id: string) { return canFulfillIndustryOrder(id) }
function orderIssueText(id: string) { return explainIndustryOrder(id) }
function canBuyProperty(id: string) { return canPurchaseProperty(id) }
function propertyIssueText(id: string) { return explainPropertyPurchase(id) }
function canUpgrade(kind: string, assetId: string) { return canUpgradeAsset(kind, assetId) }
function upgradeIssueText(kind: string, assetId: string) {
  const issues = getAssetUpgradeIssues(kind, assetId)
  return issues.length ? issues.join('；') : '条件已齐，可立即扩建。'
}
function getUpgradeCost(kind: string, assetId: string) { return getAssetUpgradeCost(kind, assetId) }
function getManagerLabel(asset: AssetState) { return getAssetManagerLabel(asset) }
function getAutomationLabel(kind: string, asset: AssetState) { return getAssetAutomationLabel(kind, asset) }
function managerReason(kind: string, assetId: string, npcId: string) {
  const issues = getAssignAssetManagerIssues(kind, assetId, npcId)
  return issues.length ? issues.join('；') : '这人眼下能接手。'
}
function canAssignManager(kind: string, assetId: string, npcId: string) { return canAssignAssetManager(kind, assetId, npcId) }
function planReason(kind: string, assetId: string, targetId: string) {
  const issues = getSetAssetPlanIssues(kind, assetId, targetId)
  return issues.length ? issues.join('；') : '章程可立即立下。'
}
function canSetPlanForAsset(kind: string, assetId: string, targetId: string) { return canSetAssetPlan(kind, assetId, targetId) }
function canCraft(id: string) { return canCraftRecipe(id) }
function craftIssueText(id: string) { return explainCraftRecipe(id) }
function harvestIssueText(id: string) { return explainHarvest(id) }

function getManagedResult(asset: AssetState) {
  if (asset.lastManagedResult) return asset.lastManagedResult
  return asset.managerNpcId ? '管事正在照看，还没跑完这一轮。' : '还没人接手，眼下全靠你亲自盯着。'
}

function formatRequirements(order: { requirements: { itemId: string; quantity: number }[] }) {
  return order.requirements.map(r => {
    const current = store.findInventoryEntry(r.itemId)?.quantity || 0
    return `${getItem(r.itemId)?.name || r.itemId} ${current}/${r.quantity}`
  }).join('、')
}

function doFulfill(id: string) { fulfillIndustryOrder(id) }
function doBuyProperty(id: string) { purchaseProperty(id) }
function doUpgrade(kind: string, assetId: string) { upgradeAsset(kind, assetId) }
function doAssignManager(kind: string, assetId: string, npcId: string) { assignAssetManager(kind, assetId, npcId) }
function doClearManager(kind: string, assetId: string) { clearAssetManager(kind, assetId) }
function doSetPlan(kind: string, assetId: string, targetId: string) { setAssetPlan(kind, assetId, targetId) }
function doPlant(assetId: string, cropId: string) { plantCrop(assetId, cropId) }
function doHarvest(assetId: string) { harvestCrop(assetId) }
function doCraft(recipeId: string) { craftRecipe(recipeId) }
function doRestock(shopId: string) { restockShop(shopId) }
function doCollect(shopId: string) { collectShopIncome(shopId) }
</script>
