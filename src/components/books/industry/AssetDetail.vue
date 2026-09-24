<template>
  <article v-if="asset" class="asset-detail">
    <header class="asset-detail__head">
      <h3>{{ asset.label }}</h3>
      <p>{{ kindLabel }} · {{ locationName }} · {{ asset.level }} 级 · 治安 {{ security }} · 税 {{ tax }}</p>
    </header>

    <section v-if="kind === 'farm'" class="asset-detail__state">
      <template v-if="asset.cropId">
        <InkBar :label="`种着${cropLabel}`" tone="breakthrough" :value="growProgress" :max="growDays" :text="asset.daysRemaining > 0 ? `还需 ${asset.daysRemaining} 天` : '已熟'" />
        <button class="ink-btn ink-btn--primary" type="button" :aria-disabled="asset.daysRemaining > 0" :data-tip="asset.daysRemaining > 0 ? harvestIssue : undefined" @click="harvest">收成</button>
      </template>
      <template v-else>
        <p class="sheet__note">田里空着，择一样种下：</p>
        <div class="chip-actions">
          <button v-for="crop in crops" :key="crop.id" class="ink-btn ink-btn--small" type="button" :data-tip="`${crop.desc} ${crop.growDays} 天熟，每批收 ${crop.yield}`" @click="plant(crop.id)">种{{ crop.label }}</button>
        </div>
      </template>
    </section>

    <section v-else-if="kind === 'workshop'" class="asset-detail__state">
      <p class="sheet__note">工坊可打造以下物件，材料不齐时按钮会写明缺什么：</p>
      <div class="recipe-list">
        <button v-for="recipe in recipes" :key="recipe.id" class="recipe-row" type="button" :aria-disabled="!recipe.ok" :data-tip="recipe.issue" @click="craft(recipe.id, recipe.ok)">
          <strong>{{ recipe.label }}</strong>
          <span>{{ recipe.inputs }}</span>
          <span class="num">{{ recipe.cost }} 灵石</span>
        </button>
      </div>
    </section>

    <section v-else class="asset-detail__state">
      <dl class="record-grid record-grid--two">
        <div><dt>库存</dt><dd class="num">{{ asset.stock }} 批</dd></div>
        <div><dt>待收账</dt><dd class="num">{{ asset.pendingIncome }} 灵石</dd></div>
      </dl>
      <div class="chip-actions">
        <button class="ink-btn ink-btn--small" type="button" @click="restock">进货</button>
        <button class="ink-btn ink-btn--small ink-btn--primary" type="button" :aria-disabled="asset.pendingIncome <= 0" @click="collect">收账</button>
      </div>
    </section>

    <section class="asset-detail__growth">
      <p><span class="asset-detail__label">眼下</span>{{ effectText }}</p>
      <p><span class="asset-detail__label">再扩</span>{{ nextText }}</p>
      <button class="ink-btn ink-btn--small" type="button" :aria-disabled="!canUpgrade" :data-tip="canUpgrade ? undefined : upgradeIssue" @click="upgrade">扩建 · {{ upgradeCost }} 灵石</button>
    </section>

    <section class="asset-detail__manage">
      <h4 class="sheet__heading">托管</h4>
      <p class="sheet__note">管事：{{ managerLabel }} · 章程：{{ planLabel }}{{ asset.lastManagedResult ? ` · 上回：${asset.lastManagedResult}` : '' }}</p>
      <div v-if="candidates.length" class="chip-actions">
        <button v-for="npc in candidates" :key="npc.id" class="ink-btn ink-btn--small" type="button" :aria-disabled="!npc.ok" :data-tip="npc.reason" @click="assign(npc.id, npc.ok)">交给{{ npc.name }}</button>
        <button v-if="asset.managerNpcId" class="ink-btn ink-btn--small ink-btn--danger" type="button" @click="clearManager">收回</button>
      </div>
      <p v-else class="empty-note">尚无可托付的熟人。多结交些人物，便有人肯替你照看。</p>
      <div v-if="asset.managerNpcId && plans.length" class="chip-actions">
        <button v-for="plan in plans" :key="plan.id" class="ink-btn ink-btn--small" type="button" :aria-disabled="!plan.ok" :data-tip="plan.reason" @click="setPlan(plan.id, plan.ok)">{{ plan.label }}</button>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useGameStore } from '@/stores/game'
import { CRAFT_RECIPES, CROPS, LOCATION_MAP, describeIndustryAssetEffect, describeIndustryNextUpgrade, getItem } from '@/config'
import { getTerritorySecurity, getTerritoryTaxRate } from '@/systems/social'
import {
  assignAssetManager, canAssignAssetManager, canCraftRecipe, canSetAssetPlan, canUpgradeAsset, clearAssetManager, collectShopIncome,
  craftRecipe, explainCraftRecipe, explainHarvest, getAssetAutomationLabel, getAssetDelegateCandidates, getAssetManagerLabel,
  getAssetUpgradeCost, getAssetUpgradeIssues, getAssignAssetManagerIssues, getSetAssetPlanIssues, harvestCrop, plantCrop, restockShop,
  setAssetPlan, upgradeAsset,
} from '@/systems/industry'
import { sfx } from '@/audio/sfx'
import InkBar from '@/components/common/InkBar.vue'

const props = defineProps<{ kind: string; assetId: string }>()

const store = useGameStore()
const { player, world } = storeToRefs(store)

const KIND_LABEL: Record<string, string> = { farm: '田产', workshop: '工坊', shop: '铺面' }

const asset = computed(() => {
  const list = player.value.assets[`${props.kind}s` as 'farms' | 'workshops' | 'shops'] || []
  return list.find(a => a.id === props.assetId) || null
})
const kindLabel = computed(() => KIND_LABEL[props.kind] || '')
const locationName = computed(() => LOCATION_MAP.get(asset.value?.locationId || '')?.name || '')
const security = computed(() => (asset.value ? getTerritorySecurity(asset.value.locationId) : 0))
const tax = computed(() => (asset.value ? `${Math.round(getTerritoryTaxRate(asset.value.locationId) * 100)}%` : ''))

const crops = CROPS
const crop = computed(() => CROPS.find(c => c.id === asset.value?.cropId) || null)
const cropLabel = computed(() => crop.value?.label || '')
const growDays = computed(() => crop.value?.growDays || 1)
const growProgress = computed(() => Math.max(0, growDays.value - (asset.value?.daysRemaining || 0)))
const harvestIssue = computed(() => (asset.value ? explainHarvest(asset.value.id) : ''))

const recipes = computed(() => {
  void player.value.inventory
  void player.value.money
  return CRAFT_RECIPES.map(r => ({
    id: r.id,
    label: r.label,
    cost: r.cost,
    inputs: r.inputs.map(input => `${getItem(input.itemId)?.name || input.itemId}×${input.quantity}`).join('、'),
    ok: canCraftRecipe(r.id),
    issue: explainCraftRecipe(r.id),
  }))
})

const effectText = computed(() => describeIndustryAssetEffect(props.kind, asset.value?.level || 1))
const nextText = computed(() => describeIndustryNextUpgrade(props.kind, asset.value?.level || 1))
const upgradeCost = computed(() => getAssetUpgradeCost(props.kind, props.assetId))
const canUpgrade = computed(() => {
  void player.value.money
  return canUpgradeAsset(props.kind, props.assetId)
})
const upgradeIssue = computed(() => getAssetUpgradeIssues(props.kind, props.assetId).join('；'))

const managerLabel = computed(() => (asset.value ? getAssetManagerLabel(asset.value) : ''))
const planLabel = computed(() => (asset.value ? getAssetAutomationLabel(props.kind, asset.value) : ''))
const candidates = computed(() => {
  void world.value.day
  return getAssetDelegateCandidates().map(npc => {
    const issues = getAssignAssetManagerIssues(props.kind, props.assetId, npc.id)
    return { id: npc.id, name: npc.name, ok: canAssignAssetManager(props.kind, props.assetId, npc.id), reason: issues.join('；') || '此人肯接手' }
  })
})
const plans = computed(() => {
  const targets = props.kind === 'farm'
    ? CROPS.map(c => ({ id: c.id, label: `轮种${c.label}` }))
    : props.kind === 'workshop'
      ? CRAFT_RECIPES.filter(r => player.value.rankIndex >= r.minRankIndex).map(r => ({ id: r.id, label: `常做${r.label}` }))
      : []
  return targets.map(t => {
    const issues = getSetAssetPlanIssues(props.kind, props.assetId, t.id)
    return { ...t, ok: canSetAssetPlan(props.kind, props.assetId, t.id), reason: issues.join('；') || '立下章程' }
  })
})

function plant(cropId: string) { sfx.confirm(); plantCrop(props.assetId, cropId) }
function harvest() {
  if ((asset.value?.daysRemaining || 0) > 0) { sfx.deny(); return }
  sfx.loot()
  harvestCrop(props.assetId)
}
function craft(recipeId: string, ok: boolean) {
  if (!ok) { sfx.deny(); return }
  sfx.confirm()
  craftRecipe(recipeId)
}
function restock() { sfx.confirm(); restockShop(props.assetId) }
function collect() {
  if ((asset.value?.pendingIncome || 0) <= 0) { sfx.deny(); return }
  sfx.coin()
  collectShopIncome(props.assetId)
}
function upgrade() {
  if (!canUpgrade.value) { sfx.deny(); return }
  sfx.confirm()
  upgradeAsset(props.kind, props.assetId)
}
function assign(npcId: string, ok: boolean) {
  if (!ok) { sfx.deny(); return }
  sfx.confirm()
  assignAssetManager(props.kind, props.assetId, npcId)
}
function clearManager() { sfx.page(); clearAssetManager(props.kind, props.assetId) }
function setPlan(targetId: string, ok: boolean) {
  if (!ok) { sfx.deny(); return }
  sfx.confirm()
  setAssetPlan(props.kind, props.assetId, targetId)
}
</script>
