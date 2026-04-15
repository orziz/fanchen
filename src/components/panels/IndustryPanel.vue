<template>
  <p class="panel-intro">此处可置办官契、接行会单、扩建田产工坊铺面，也能把活计交给门下或自家人去跑。</p>

  <div class="summary-grid">
    <div class="summary-box"><span>本地声望</span><strong>{{ round(store.getRegionStanding(), 1) }}</strong></div>
    <div class="summary-box"><span>名下产业</span><strong>{{ totalAssets }}</strong></div>
    <div class="summary-box"><span>现银</span><strong>{{ player.money }}</strong></div>
  </div>

  <!-- Industry Orders -->
  <h3 class="subsection-title">行会订单</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="orders.length">
      <div v-for="order in orders" :key="order.id" class="item-card">
        <div class="item-top">
          <div>
            <h3 class="item-title">{{ order.title }}</h3>
            <p class="item-meta">{{ order.factionName }} · {{ order.desc }}</p>
          </div>
          <span class="rarity uncommon">报酬 {{ order.rewardMoney }}</span>
        </div>
        <p class="item-meta">交付：{{ formatRequirements(order) }}</p>
        <p class="item-meta">额外收益：声望 +{{ round(order.rewardReputation, 1) }}</p>
        <div class="item-actions">
          <button class="item-button" @click="doFulfill(order.id)">交付订单</button>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">各地行会正在换单，过几个时辰再来看看。</div>
  </div>

  <!-- Properties -->
  <h3 class="subsection-title">当前地点可经营产业</h3>
  <div class="world-grid industry-stack">
    <template v-if="localProperties.length">
      <div v-for="prop in localProperties" :key="prop.id" class="world-card">
        <span>{{ prop.label }}</span>
        <strong>{{ prop.cost }} 灵石</strong>
        <p class="item-meta">{{ prop.desc }}</p>
        <div class="item-actions">
          <button class="item-button" @click="doBuyProperty(prop.id)">购入到自己名下</button>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">当前地点没有可经营的产业类型，换个地方看看。</div>
  </div>

  <!-- Farms -->
  <h3 class="subsection-title">名下田产</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="player.assets.farms.length">
      <div v-for="farm in player.assets.farms" :key="farm.id" class="item-card">
        <div class="item-top">
          <div>
            <h3 class="item-title">{{ farm.label }}</h3>
            <p class="item-meta">地点：{{ getLocationName(farm.locationId) }} · {{ farm.level }} 级</p>
          </div>
          <span class="rarity common">田产</span>
        </div>
        <p class="item-meta">{{ farm.cropId ? `种植中 剩余 ${farm.daysRemaining} 天` : '当前空置，可立即播种。' }}</p>
        <div class="item-actions">
          <template v-if="!farm.cropId">
            <button v-for="crop in CROPS" :key="crop.id" class="item-button" @click="doPlant(farm.id, crop.id)">种{{ crop.label }}</button>
          </template>
          <button v-else class="item-button" :disabled="farm.daysRemaining > 0" @click="doHarvest(farm.id)">
            {{ farm.daysRemaining > 0 ? '查看成熟时间' : '收成' }}
          </button>
          <button class="item-button" @click="doUpgrade('farm', farm.id)">扩田</button>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">你还没有属于自己的田地。</div>
  </div>

  <!-- Workshops -->
  <h3 class="subsection-title">名下工坊</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="player.assets.workshops.length">
      <div v-for="ws in player.assets.workshops" :key="ws.id" class="item-card">
        <div class="item-top">
          <div>
            <h3 class="item-title">{{ ws.label }}</h3>
            <p class="item-meta">地点：{{ getLocationName(ws.locationId) }} · {{ ws.level }} 级</p>
          </div>
          <span class="rarity uncommon">工坊</span>
        </div>
        <div class="teaching-actions">
          <button v-for="recipe in CRAFT_RECIPES" :key="recipe.id" class="npc-button" @click="doCraft(recipe.id)">{{ recipe.label }}</button>
        </div>
        <div class="item-actions">
          <button class="item-button" @click="doUpgrade('workshop', ws.id)">扩坊</button>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">你还没有属于自己的工坊。</div>
  </div>

  <!-- Shops -->
  <h3 class="subsection-title">名下铺面</h3>
  <div class="inventory-grid industry-stack">
    <template v-if="player.assets.shops.length">
      <div v-for="shop in player.assets.shops" :key="shop.id" class="item-card">
        <div class="item-top">
          <div>
            <h3 class="item-title">{{ shop.label }}</h3>
            <p class="item-meta">地点：{{ getLocationName(shop.locationId) }} · {{ shop.level }} 级</p>
          </div>
          <span class="rarity rare">铺面</span>
        </div>
        <p class="item-meta">库存 {{ shop.stock }} 批，待收账 {{ shop.pendingIncome }} 灵石。</p>
        <div class="item-actions">
          <button class="item-button" @click="doRestock(shop.id)">进货</button>
          <button class="item-button" @click="doCollect(shop.id)">收账</button>
          <button class="item-button" @click="doUpgrade('shop', shop.id)">扩铺</button>
        </div>
      </div>
    </template>
    <div v-else class="empty-state">你还没有属于自己的铺面。</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { LOCATION_MAP, CROPS, CRAFT_RECIPES, getItem } from '@/config'
import { round } from '@/utils'
import {
  getLocalProperties, refreshIndustryOrders, fulfillIndustryOrder,
  purchaseProperty, upgradeAsset, plantCrop, harvestCrop,
  craftRecipe, restockShop, collectShopIncome,
} from '@/systems/industry'

const store = useGameStore()
const { player } = storeToRefs(store)

const totalAssets = computed(() => player.value.assets.farms.length + player.value.assets.workshops.length + player.value.assets.shops.length)

const orders = computed(() => refreshIndustryOrders())
const localProperties = computed(() => getLocalProperties())

function getLocationName(id: string) { return LOCATION_MAP.get(id)?.name || id }

function formatRequirements(order: { requirements: { itemId: string; quantity: number }[] }) {
  return order.requirements.map(r => {
    const current = store.findInventoryEntry(r.itemId)?.quantity || 0
    return `${getItem(r.itemId)?.name || r.itemId} ${current}/${r.quantity}`
  }).join('、')
}

function doFulfill(id: string) { fulfillIndustryOrder(id) }
function doBuyProperty(id: string) { purchaseProperty(id) }
function doUpgrade(kind: string, assetId: string) { upgradeAsset(kind, assetId) }
function doPlant(assetId: string, cropId: string) { plantCrop(assetId, cropId) }
function doHarvest(assetId: string) { harvestCrop(assetId) }
function doCraft(recipeId: string) { craftRecipe(recipeId) }
function doRestock(shopId: string) { restockShop(shopId) }
function doCollect(shopId: string) { collectShopIncome(shopId) }
</script>
