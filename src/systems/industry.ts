import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { LOCATION_MAP, PROPERTY_DEFS, PROPERTY_MAP, FACTIONS, FACTION_MAP, CROPS, CROP_MAP, CRAFT_RECIPES, RECIPE_MAP, getItem } from '@/config'
import { uid, clamp, round } from '@/utils'
import { isTradeHubLocation, getGovernmentOfficeName, getPlayerTerritoryModifier, adjustFactionStanding } from './social'
import type { AssetState } from '@/types/game'

/* ═══════════════════ Constants ═══════════════════ */

const DEED_ITEM_BY_KIND: Record<string, string> = { farm: 'farm-deed', workshop: 'workshop-permit', shop: 'shop-deed' }
const SECT_UNLOCK_BY_KIND: Record<string, string> = { farm: 'hall', workshop: 'dojo', shop: 'market' }
const INDUSTRY_UPGRADE_BASE_COST: Record<string, number> = { farm: 130, workshop: 180, shop: 220 }
const GOVERNMENT_CONTRACTS: Record<string, { itemId: string; standingNeed: number; priceFactor: number; desc: string }> = {
  farm: { itemId: 'farm-deed', standingNeed: 6, priceFactor: 0.9, desc: '官府备案的薄田契纸，适合从安稳营生起手。' },
  workshop: { itemId: 'workshop-permit', standingNeed: 10, priceFactor: 0.92, desc: '衙门签发的工坊牌照，价格略低，但只卖给有地方口碑的人。' },
  shop: { itemId: 'shop-deed', standingNeed: 14, priceFactor: 0.94, desc: '挂号在册的铺契，便宜一些，但需要本地认可你能守规矩。' },
}

/* ═══════════════════ Internal Accessors ═══════════════════ */

function getAssets(kind: string): AssetState[] { return (getContext().game.player.assets as any)[`${kind}s`] || [] }
function getAsset(kind: string, assetId: string) { return getAssets(kind).find(a => a.id === assetId) }
function getAllAssets() { return ['farm', 'workshop', 'shop'].flatMap(k => getAssets(k).map(a => ({ ...a, kind: k }))) }
function getManagedAssetByNpcId(npcId: string) { return getAllAssets().find(a => a.managerNpcId === npcId) || null }

function getLiquidIndustryFunds(): number { const pf = getContext().game.player.playerFaction; return (pf?.treasury || 0) + getContext().game.player.money }
function spendIndustryFunds(amount: number): boolean {
  const ctx = getContext(); const pf = ctx.game.player.playerFaction
  if (getLiquidIndustryFunds() < amount) return false
  const ts = Math.min(pf?.treasury || 0, amount); if (pf) pf.treasury -= ts
  ctx.game.player.money -= amount - ts; return true
}

function getAssetOperatorBonus(asset: AssetState | null): number {
  if (!asset?.managerNpcId) return 0
  const ctx = getContext(); const npc = ctx.getNpc(asset.managerNpcId); if (!npc) return 0
  const rel = ctx.ensurePlayerRelation(npc.id)
  const trust = Math.max(0, rel.trust || 0); const affinity = Math.max(0, rel.affinity || 0)
  const isDisc = Boolean(ctx.game.player.sect?.disciples.includes(npc.id))
  const isMem = Boolean(ctx.game.player.playerFaction?.members.includes(npc.id))
  return (isDisc ? 0.12 : 0) + (isMem ? 0.08 : 0) + trust * 0.003 + affinity * 0.002
}

function getIndustrySupportBonus(kind: string, locationId?: string) {
  const ctx = getContext(); const locId = locationId || ctx.getCurrentLocation().id
  const pf = ctx.game.player.playerFaction; const sect = ctx.game.player.sect
  const tb = getPlayerTerritoryModifier(locId)
  if (kind === 'farm') return { output: (sect?.buildings.hall || 0) * 0.12 + tb * 0.25, upkeep: 0 }
  if (kind === 'workshop') return { output: (sect?.buildings.dojo || 0) * 0.08 + tb * 0.3, upkeep: 0 }
  return { output: ((pf?.branches.caravan || 0) * 0.16) + ((sect?.buildings.market || 0) * 0.08) + tb * 0.7, upkeep: (pf?.branches.safehouse || 0) * 0.04 + tb * 0.25 }
}

function applyIndustryNetworkGrowth(kind: string, value: number) {
  const ctx = getContext(); const pf = ctx.game.player.playerFaction; const sect = ctx.game.player.sect
  if (pf) { pf.treasury += Math.max(1, Math.floor(value * (kind === 'shop' ? 0.12 : 0.08))); pf.influence += kind === 'shop' ? 0.18 : 0.1 }
  if (sect) { sect.treasury += Math.max(0, Math.floor(value * 0.05)); sect.prestige += kind === 'workshop' ? 0.16 : 0.08 }
}

function getGovernmentStandingNeed(kind: string, locationId?: string) {
  const loc = LOCATION_MAP.get(locationId || getContext().getCurrentLocation().id)
  return (GOVERNMENT_CONTRACTS[kind]?.standingNeed || 0) + Math.max(0, (loc?.marketTier || 0) - 1)
}

function hasGovernmentPropertyAccess(property: any) {
  const ctx = getContext(); const loc = ctx.getCurrentLocation()
  if (!property || !getGovernmentOfficeName(loc.id)) return false
  if (!property.locationTags.some((tag: string) => loc.tags.includes(tag))) return false
  return (ctx.getRegionStanding(loc.id) || 0) >= getGovernmentStandingNeed(property.kind, loc.id)
}

function hasIndustryAccess(kind: string, property?: any) {
  const ctx = getContext(); const g = ctx.game
  const faction = FACTION_MAP.get(g.player.affiliationId)
  if (faction && faction.unlocks.includes(kind as any)) {
    if (!property || !property.allowedFactionIds || property.allowedFactionIds.includes(faction.id)) return true
  }
  if (property && hasGovernmentPropertyAccess(property)) return true
  if (g.player.sect) { const bk = SECT_UNLOCK_BY_KIND[kind]; return (g.player.sect.buildings as any)[bk] > 0 }
  return false
}

/* ═══════════════════ Public Accessors ═══════════════════ */

export function getAssetDelegateCandidates() {
  const g = getContext().game; const pf = g.player.playerFaction
  const ids = [...(g.player.sect?.disciples || []), ...(pf?.members || [])]
  return [...new Set(ids)].map(id => getContext().getNpc(id)).filter(Boolean)
}
export function getAssetManager(kind: string, assetId: string) { const a = getAsset(kind, assetId); return a?.managerNpcId ? getContext().getNpc(a.managerNpcId) : null }
export function getAssetManagerLabel(asset: AssetState) { return asset?.managerNpcId ? (getContext().getNpc(asset.managerNpcId)?.name || '失联管事') : '暂未委派' }

export function getAssetAutomationLabel(kind: string, asset: AssetState) {
  if (kind === 'farm') return asset?.automationTargetId ? `轮种 ${CROP_MAP.get(asset.automationTargetId)?.label || asset.automationTargetId}` : '未定轮种'
  if (kind === 'workshop') return asset?.automationTargetId ? `常做 ${RECIPE_MAP.get(asset.automationTargetId)?.label || asset.automationTargetId}` : '未定活计'
  return asset?.managerNpcId ? '有人看账补货' : '暂无人照看'
}

export function getAvailableProperties() {
  const ctx = getContext(); const loc = ctx.getCurrentLocation()
  return PROPERTY_DEFS.filter(p => { if (p.locationTags && !p.locationTags.some(t => loc.tags.includes(t))) return false; return hasIndustryAccess(p.kind, p) })
}
export function getLocalProperties() {
  const loc = getContext().getCurrentLocation()
  return PROPERTY_DEFS.filter(p => p.locationTags.some(t => loc.tags.includes(t)))
}

/* ═══════════════════ Industry Orders ═══════════════════ */

const ORDER_TEMPLATES = [
  { id: 'grain-route', title: '乡社口粮单', desc: '青禾乡社正在补口粮，先把粗灵米送过去。', requirements: [{ itemId: 'spirit-grain', quantity: 4 }], rewardMoney: 56, rewardReputation: 1.2, standing: 2.4, factionId: 'qinghe-commons' },
  { id: 'herb-relief', title: '药草济急单', desc: '迷林猎社在收治伤员，急需雾心草和草膏。', requirements: [{ itemId: 'mist-herb', quantity: 2 }, { itemId: 'herb-paste', quantity: 1 }], rewardMoney: 88, rewardReputation: 1.8, standing: 3.2, factionId: 'mist-hunt-lodge' },
  { id: 'forge-consignment', title: '工盟押货单', desc: '玄铁工盟在催一批练手兵刃，赶得上就能接后续门路。', requirements: [{ itemId: 'wood-spear', quantity: 1 }, { itemId: 'scrap-iron', quantity: 2 }], rewardMoney: 118, rewardReputation: 2.2, standing: 4, factionId: 'blackforge-guild' },
  { id: 'stall-restock', title: '商盟补货单', desc: '听潮商盟要临时补摊，粗布和杂木料都收。', requirements: [{ itemId: 'cloth-roll', quantity: 2 }, { itemId: 'timber', quantity: 2 }], rewardMoney: 96, rewardReputation: 1.6, standing: 3.4, factionId: 'tide-market' },
  { id: 'sect-supply', title: '行院备库单', desc: '玉阙行院要补一批基础资材，交货后更容易在外院站稳。', requirements: [{ itemId: 'spirit-grain', quantity: 2 }, { itemId: 'mist-herb', quantity: 2 }, { itemId: 'cloth-roll', quantity: 1 }], rewardMoney: 102, rewardReputation: 2, standing: 3.8, factionId: 'jadegate-courtyard' },
]

function createIndustryOrder(template: typeof ORDER_TEMPLATES[0]) {
  const faction = FACTIONS.find(f => f.id === template.factionId)
  return { id: uid(`order-${template.id}`), templateId: template.id, title: template.title, desc: template.desc, factionId: template.factionId, factionName: faction?.name || '行会', requirements: template.requirements.map(r => ({ ...r })), rewardMoney: template.rewardMoney, rewardReputation: template.rewardReputation, standing: template.standing }
}

export function refreshIndustryOrders(force = false) {
  const g = getContext().game
  const orders = Array.isArray(g.world.industryOrders) ? g.world.industryOrders : []
  if (!force && g.world.industryOrderDay === g.world.day && orders.length >= 3) return orders
  const next = ORDER_TEMPLATES.slice().sort(() => Math.random() - 0.5).slice(0, 3)
  g.world.industryOrders = next.map(createIndustryOrder) as any[]; g.world.industryOrderDay = g.world.day
  return g.world.industryOrders
}

export function getIndustryOrderIssues(orderId: string): string[] {
  const ctx = getContext(); const orders = Array.isArray(ctx.game.world.industryOrders) ? ctx.game.world.industryOrders : [] as any[]
  const order = orders.find((e: any) => e.id === orderId) as any; if (!order) return ['这张订单已经失效。']
  return order.requirements.flatMap((r: any) => { const cur = ctx.findInventoryEntry(r.itemId)?.quantity || 0; if (cur >= r.quantity) return []; return [`缺少${getItem(r.itemId)?.name || r.itemId} ${r.quantity - cur}件`] })
}
export function canFulfillIndustryOrder(id: string) { return getIndustryOrderIssues(id).length === 0 }
export function explainIndustryOrder(id: string) { const i = getIndustryOrderIssues(id); return i.length ? i.join('；') : '货物齐备，可以交付。' }

export function fulfillIndustryOrder(orderId: string) {
  const ctx = getContext(); const g = ctx.game; const orders = Array.isArray(g.world.industryOrders) ? g.world.industryOrders : [] as any[]
  const order = orders.find((e: any) => e.id === orderId) as any; if (!order) return
  if (!canFulfillIndustryOrder(orderId)) { ctx.appendLog('你手头货不够，还交不了这笔订单。', 'warn'); return }
  order.requirements.forEach((r: any) => ctx.removeItemFromInventory(r.itemId, r.quantity))
  g.player.money += order.rewardMoney; g.player.reputation += order.rewardReputation
  adjustFactionStanding(order.factionId, order.standing || 0)
  g.world.industryOrders = orders.filter((e: any) => e.id !== orderId) as any[]
  ctx.appendLog(`你完成了${order.factionName}的"${order.title}"，入账${order.rewardMoney}灵石。`, 'loot')
  if ((g.world.industryOrders as any[]).length === 0) refreshIndustryOrders(true)
}

/* ─── Government Contracts ─── */

export function getGovernmentContractOffers(locationId?: string) {
  const ctx = getContext(); const locId = locationId || ctx.game.player.locationId; const loc = LOCATION_MAP.get(locId)
  if (!loc || !getGovernmentOfficeName(locId)) return []
  const localKinds = [...new Set(PROPERTY_DEFS.filter(p => p.locationTags.some(t => loc.tags.includes(t))).map(p => p.kind))]
  return localKinds.filter(k => GOVERNMENT_CONTRACTS[k]).map(kind => {
    const c = GOVERNMENT_CONTRACTS[kind]; const item = getItem(c.itemId)
    return { kind, itemId: c.itemId, label: item?.name || c.itemId, price: Math.max(18, Math.round((item?.baseValue || 0) * c.priceFactor)), standingNeed: getGovernmentStandingNeed(kind, locId), desc: c.desc }
  })
}

export function getGovernmentContractIssues(kind: string): string[] {
  const ctx = getContext(); const offer = getGovernmentContractOffers().find(e => e.kind === kind)
  if (!offer) return ['当前没有官府出售这类契约。']
  const issues: string[] = []; const standing = ctx.getRegionStanding()
  if (standing < offer.standingNeed) issues.push(`地区声望不足，还差${round(offer.standingNeed - standing, 1)}`)
  if (ctx.game.player.money < offer.price) issues.push(`灵石不足，还差${offer.price - ctx.game.player.money}`)
  return issues
}
export function canPurchaseGovernmentContract(kind: string) { return getGovernmentContractIssues(kind).length === 0 }
export function explainGovernmentContract(kind: string) { const i = getGovernmentContractIssues(kind); return i.length ? i.join('；') : '官府愿意卖你这份契约。' }

export function purchaseGovernmentContract(kind: string) {
  const ctx = getContext(); const offer = getGovernmentContractOffers().find(e => e.kind === kind)
  if (!offer || !canPurchaseGovernmentContract(kind)) { ctx.appendLog('官府暂时不愿把这份契约卖给你。', 'warn'); return }
  ctx.game.player.money -= offer.price; ctx.addItemToInventory(offer.itemId, 1)
  ctx.adjustRegionStanding(ctx.getCurrentLocation().id, 0.8)
  ctx.appendLog(`${getGovernmentOfficeName() || '官府'}以${offer.price}灵石卖给你一份${offer.label}。`, 'loot')
}

/* ═══════════════════ Property Operations ═══════════════════ */

export function getPropertyPurchaseIssues(propertyId: string): string[] {
  const ctx = getContext(); const p = PROPERTY_MAP.get(propertyId); if (!p) return ['这处产业已经不存在。']
  const issues: string[] = []
  if (!p.locationTags.some(t => ctx.getCurrentLocation().tags.includes(t))) issues.push('当前地点不提供这类产业')
  if (!hasIndustryAccess(p.kind, p)) issues.push(`尚未打通${p.kind === 'farm' ? '田产' : p.kind === 'workshop' ? '工坊' : '铺面'}门路`)
  if (ctx.game.player.money < p.cost) issues.push(`灵石不足，还差${p.cost - ctx.game.player.money}`)
  const deedId = DEED_ITEM_BY_KIND[p.kind]; if (deedId && !ctx.findInventoryEntry(deedId)) issues.push(`缺少${getItem(deedId)?.name || '对应契据'}`)
  return issues
}
export function canPurchaseProperty(id: string) { return getPropertyPurchaseIssues(id).length === 0 }
export function explainPropertyPurchase(id: string) { const i = getPropertyPurchaseIssues(id); return i.length ? i.join('；') : '条件齐备，可以购入。' }

export function purchaseProperty(propertyId: string) {
  const ctx = getContext(); const g = ctx.game; const p = PROPERTY_MAP.get(propertyId)!
  if (!canPurchaseProperty(propertyId)) { ctx.appendLog('眼下还买不起或买不到这处产业。', 'warn'); return }
  const deedId = DEED_ITEM_BY_KIND[p.kind]; if (deedId) ctx.removeItemFromInventory(deedId, 1)
  g.player.money -= p.cost
  const asset: AssetState = { id: uid(p.kind), propertyId, locationId: ctx.getCurrentLocation().id, kind: p.kind, label: p.label, cropId: null, daysRemaining: 0, stock: 0, pendingIncome: 0, level: 1, managerNpcId: null, automationTargetId: null }
  getAssets(p.kind).push(asset)
  ctx.appendLog(`${p.label}已经记在你名下。`, 'loot'); ctx.adjustRegionStanding(ctx.getCurrentLocation().id, 1.2)
  adjustFactionStanding(g.player.affiliationId, p.kind === 'farm' ? 2 : 3)
}

/* ─── Asset Manager ─── */
export function getAssignAssetManagerIssues(kind: string, assetId: string, npcId: string): string[] {
  const asset = getAsset(kind, assetId); const npc = getContext().getNpc(npcId)
  if (!asset || !npc) return ['这份委派眼下办不成。']
  const issues: string[] = []; const candidates = getAssetDelegateCandidates().map(e => e!.id)
  if (!candidates.includes(npcId)) issues.push('只有自家势力骨干或门下弟子才能接手产业')
  const managed = getManagedAssetByNpcId(npcId); if (managed && managed.id !== assetId) issues.push('此人已经在管另一处产业了')
  return issues
}
export function canAssignAssetManager(kind: string, assetId: string, npcId: string) { return getAssignAssetManagerIssues(kind, assetId, npcId).length === 0 }
export function explainAssignAssetManager(kind: string, assetId: string, npcId: string) { const i = getAssignAssetManagerIssues(kind, assetId, npcId); return i.length ? i.join('；') : '这份委派可以定下。' }

export function assignAssetManager(kind: string, assetId: string, npcId: string) {
  const asset = getAsset(kind, assetId)!; const npc = getContext().getNpc(npcId)!
  if (!canAssignAssetManager(kind, assetId, npcId)) { getContext().appendLog('这份产业委派眼下还定不下来。', 'warn'); return }
  asset.managerNpcId = npcId; npc.lastEvent = `接手打理${asset.label}`
  getContext().appendLog(`你把${asset.label}交给${npc.name}照看。`, 'info')
}

export function clearAssetManager(kind: string, assetId: string) {
  const asset = getAsset(kind, assetId); if (!asset?.managerNpcId) return
  const npc = getContext().getNpc(asset.managerNpcId); asset.managerNpcId = null
  getContext().appendLog(`你收回了${asset.label}的管事权${npc ? `，${npc.name}不再看这摊子` : ''}。`, 'info')
}

/* ─── Asset Plan ─── */
export function getSetAssetPlanIssues(kind: string, assetId: string, targetId: string): string[] {
  const asset = getAsset(kind, assetId); if (!asset) return ['这份经营章程暂时定不下来。']
  const issues: string[] = []; if (!asset.managerNpcId) issues.push('需先给这处产业委派人手')
  if (kind === 'farm' && !CROP_MAP.get(targetId)) issues.push('这份轮种章程不存在')
  if (kind === 'workshop' && !RECIPE_MAP.get(targetId)) issues.push('这份工坊活计不存在')
  return issues
}
export function canSetAssetPlan(kind: string, assetId: string, targetId: string) { return getSetAssetPlanIssues(kind, assetId, targetId).length === 0 }

export function setAssetPlan(kind: string, assetId: string, targetId: string) {
  const asset = getAsset(kind, assetId)!
  if (!canSetAssetPlan(kind, assetId, targetId)) { getContext().appendLog('这份经营章程眼下还立不住。', 'warn'); return }
  asset.automationTargetId = targetId
  getContext().appendLog(`${asset.label}改按"${getAssetAutomationLabel(kind, asset)}"行事。`, 'info')
}

/* ─── Upgrade ─── */
export function getAssetUpgradeCost(kind: string, assetId: string) { const a = getAsset(kind, assetId); return a ? INDUSTRY_UPGRADE_BASE_COST[kind] * a.level : 0 }
export function getAssetUpgradeIssues(kind: string, assetId: string): string[] {
  const g = getContext().game; const a = getAsset(kind, assetId); if (!a) return ['这处产业暂时无法整修。']
  const cost = getAssetUpgradeCost(kind, assetId); const issues: string[] = []
  if (g.player.money < cost) issues.push(`灵石不足，还差${cost - g.player.money}`)
  if (kind === 'shop' && a.stock > 0) issues.push('铺里还有现货，先把这一轮货转完再扩面')
  return issues
}
export function canUpgradeAsset(kind: string, assetId: string) { return getAssetUpgradeIssues(kind, assetId).length === 0 }

export function upgradeAsset(kind: string, assetId: string) {
  const ctx = getContext(); const g = ctx.game; const a = getAsset(kind, assetId)!
  if (!canUpgradeAsset(kind, assetId)) { ctx.appendLog('这处产业眼下还扩不动。', 'warn'); return }
  const cost = getAssetUpgradeCost(kind, assetId); g.player.money -= cost; a.level += 1
  if (kind === 'shop') { a.stock = 0; a.pendingIncome = 0 }
  g.player.stats.industryUpgrades += 1; adjustFactionStanding(g.player.affiliationId, 1.8 + a.level * 0.3)
  ctx.appendLog(`${a.label}扩建完成，升到 ${a.level} 级。`, 'loot')
}

/* ═══════════════════ Farm Operations ═══════════════════ */

function plantCropInternal(asset: AssetState, cropId: string, opts: { automated?: boolean } = {}): boolean {
  const crop = CROP_MAP.get(cropId); if (!asset || !crop) return false
  if (asset.cropId) { if (!opts.automated) getContext().appendLog('这块田还没腾出来。', 'warn'); return false }
  if (!getContext().removeItemFromInventory(crop.seedItemId, 1)) { if (!opts.automated) getContext().appendLog('你手头没有对应种子。', 'warn'); return false }
  asset.cropId = crop.id; asset.daysRemaining = crop.growDays; asset.lastManagedResult = `${crop.label}已经播下。`
  if (!opts.automated) getContext().appendLog(`你在${asset.label}里种下了${crop.label}。`, 'info')
  return true
}

export function plantCrop(assetId: string, cropId: string) { const a = getAssets('farm').find(e => e.id === assetId); if (a) plantCropInternal(a, cropId) }

export function getHarvestIssues(assetId: string): string[] {
  const a = getAssets('farm').find(e => e.id === assetId); if (!a || !a.cropId) return ['这块田里还没有作物。']
  if (a.daysRemaining > 0) return [`作物尚未成熟，还需${a.daysRemaining}天`]; return []
}
export function explainHarvest(id: string) { const i = getHarvestIssues(id); return i.length ? i.join('；') : '作物已熟，可以收成。' }

function harvestCropInternal(asset: AssetState, opts: { automated?: boolean } = {}): boolean {
  if (!asset || !asset.cropId) return false; if (asset.daysRemaining > 0) { if (!opts.automated) getContext().appendLog('作物尚未成熟。', 'warn'); return false }
  const crop = CROP_MAP.get(asset.cropId); if (!crop) return false
  const ctx = getContext(); const support = getIndustrySupportBonus('farm', asset.locationId); const opBonus = getAssetOperatorBonus(asset)
  const harvestYield = crop.yield + Math.max(0, asset.level - 1) + Math.round(crop.yield * (support.output + opBonus))
  ctx.addItemToInventory(crop.harvestItemId, harvestYield)
  asset.cropId = null; asset.daysRemaining = 0; asset.lastManagedResult = `${getItem(crop.harvestItemId)?.name || crop.harvestItemId} x${harvestYield}`
  ctx.game.player.skills.farming += opts.automated ? 0.25 : 0.4; ctx.game.player.stats.cropsHarvested += harvestYield
  adjustFactionStanding(ctx.game.player.affiliationId, opts.automated ? 0.8 : 1.5)
  applyIndustryNetworkGrowth('farm', harvestYield * 6)
  if (!opts.automated) ctx.appendLog(`你从${asset.label}收成了${getItem(crop.harvestItemId)?.name || crop.harvestItemId} x${harvestYield}。`, 'loot')
  return true
}

export function harvestCrop(assetId: string) { const a = getAssets('farm').find(e => e.id === assetId); if (a) harvestCropInternal(a) }

/* ═══════════════════ Workshop Operations ═══════════════════ */

export function getCraftRecipeIssues(recipeId: string): string[] {
  const recipe = RECIPE_MAP.get(recipeId); const g = getContext().game; if (!recipe) return ['这张配方当前不可用。']
  const issues: string[] = []; if (!getAssets(recipe.requiresPropertyKind).length) issues.push(`名下还没有可用${recipe.requiresPropertyKind === 'workshop' ? '工坊' : recipe.requiresPropertyKind}`)
  if (g.player.rankIndex < recipe.minRankIndex) issues.push(`境界不足，需要更高境界`)
  if (g.player.money < recipe.cost) issues.push(`灵石不足，还差${recipe.cost - g.player.money}`)
  recipe.inputs.forEach(input => { const cur = getContext().findInventoryEntry(input.itemId)?.quantity || 0; if (cur < input.quantity) issues.push(`缺少${getItem(input.itemId)?.name || input.itemId} ${input.quantity - cur}件`) })
  return issues
}
export function canCraftRecipe(id: string) { return getCraftRecipeIssues(id).length === 0 }
export function explainCraftRecipe(id: string) { const i = getCraftRecipeIssues(id); return i.length ? i.join('；') : '材料与条件齐备，可以动工。' }

export function craftRecipe(recipeId: string) {
  const recipe = RECIPE_MAP.get(recipeId)!; const ctx = getContext(); const g = ctx.game
  if (!canCraftRecipe(recipeId)) { ctx.appendLog('材料、工坊或手艺还不够，暂时做不出这件东西。', 'warn'); return }
  const ws = getAssets('workshop').slice().sort((a, b) => (b.level || 1) - (a.level || 1))[0] || null
  recipe.inputs.forEach(input => ctx.removeItemFromInventory(input.itemId, input.quantity))
  g.player.money -= recipe.cost
  const wsLevel = ws?.level || getAssets('workshop').reduce((m, a) => Math.max(m, a.level || 1), 1)
  const support = getIndustrySupportBonus('workshop', ws?.locationId || ctx.getCurrentLocation().id); const opBonus = getAssetOperatorBonus(ws)
  const extra = wsLevel >= 3 && Math.random() < 0.3 + support.output + opBonus ? 1 : 0
  ctx.addItemToInventory(recipe.outputItemId, recipe.outputQuantity + extra)
  g.player.skills.crafting += 0.6; g.player.stats.craftedItems += recipe.outputQuantity + extra
  adjustFactionStanding(g.player.affiliationId, 2); applyIndustryNetworkGrowth('workshop', recipe.cost + extra * 22)
  ctx.appendLog(`你亲手做出了${getItem(recipe.outputItemId)?.name || recipe.outputItemId}。`, 'loot')
}

/* ═══════════════════ Shop Operations ═══════════════════ */

function getShopRestockCost(shop: AssetState) { return 26 + shop.level * 10 }
function getShopRestockAmount(shop: AssetState) { const s = getIndustrySupportBonus('shop', shop.locationId); const ob = getAssetOperatorBonus(shop); return 2 + shop.level + Math.round((s.output + s.upkeep + ob) * 2) }

function restockShopInternal(shop: AssetState, opts: { automated?: boolean } = {}): boolean {
  if (!shop) return false; const cost = getShopRestockCost(shop)
  if (opts.automated) { if (!spendIndustryFunds(cost)) return false }
  else if (getContext().game.player.money < cost) { getContext().appendLog('手头灵石不够进货。', 'warn'); return false }
  else getContext().game.player.money -= cost
  shop.stock += getShopRestockAmount(shop); shop.lastManagedResult = `补货 ${shop.stock} 批`
  if (!opts.automated) getContext().appendLog(`你给${shop.label}补了新货。`, 'info'); return true
}

export function restockShop(assetId: string) { const s = getAssets('shop').find(e => e.id === assetId); if (s) restockShopInternal(s) }

export function collectShopIncome(assetId: string) {
  const ctx = getContext(); const shop = getAssets('shop').find(e => e.id === assetId); if (!shop) return
  if (shop.pendingIncome <= 0) { ctx.appendLog('今天铺面还没什么进账。', 'info'); return }
  const income = shop.pendingIncome; shop.pendingIncome = 0
  ctx.game.player.money += income; ctx.game.player.skills.trading += 0.5; ctx.game.player.stats.shopCollections += 1
  adjustFactionStanding(ctx.game.player.affiliationId, 1.5); applyIndustryNetworkGrowth('shop', income)
  ctx.appendLog(`你从${shop.label}收回了${income}灵石。`, 'loot')
}

/* ═══════════════════ Industry Tick ═══════════════════ */

export function processIndustryTick() {
  const ctx = getContext(); const g = ctx.game
  refreshIndustryOrders((g.world.industryOrders as any[]).length < 3)
  if (g.world.hour !== 0) return

  getAssets('farm').forEach(farm => {
    const opBonus = getAssetOperatorBonus(farm)
    if (farm.cropId && farm.daysRemaining > 0) { const acc = farm.level >= 3 && Math.random() < 0.35 + opBonus ? 1 : 0; farm.daysRemaining = Math.max(0, farm.daysRemaining - 1 - acc) }
    if (farm.managerNpcId && farm.cropId && farm.daysRemaining <= 0) { const harvested = harvestCropInternal(farm, { automated: true }); if (harvested && farm.automationTargetId) plantCropInternal(farm, farm.automationTargetId, { automated: true }); return }
    if (farm.managerNpcId && !farm.cropId && farm.automationTargetId) plantCropInternal(farm, farm.automationTargetId, { automated: true })
  })

  getAssets('workshop').forEach(ws => {
    if (!ws.managerNpcId || !ws.automationTargetId) return
    const recipe = RECIPE_MAP.get(ws.automationTargetId); if (!recipe) return
    const canRun = recipe.inputs.every(i => (ctx.findInventoryEntry(i.itemId)?.quantity || 0) >= i.quantity)
    const autoCost = Math.max(4, Math.round(recipe.cost * 0.6))
    if (!canRun || !spendIndustryFunds(autoCost)) return
    recipe.inputs.forEach(i => ctx.removeItemFromInventory(i.itemId, i.quantity))
    const support = getIndustrySupportBonus('workshop', ws.locationId); const opBonus = getAssetOperatorBonus(ws)
    const extra = ws.level >= 2 && Math.random() < 0.18 + support.output * 0.5 + opBonus ? 1 : 0
    ctx.addItemToInventory(recipe.outputItemId, recipe.outputQuantity + extra)
    g.player.skills.crafting += 0.25; g.player.stats.craftedItems += recipe.outputQuantity + extra
    ws.lastManagedResult = `${getItem(recipe.outputItemId)?.name || recipe.outputItemId} x${recipe.outputQuantity + extra}`
    applyIndustryNetworkGrowth('workshop', autoCost + extra * 18)
  })

  getAssets('shop').forEach(shop => {
    if (shop.managerNpcId && shop.stock <= 0) restockShopInternal(shop, { automated: true })
    if (shop.stock <= 0) return
    const loc = LOCATION_MAP.get(shop.locationId); const support = getIndustrySupportBonus('shop', shop.locationId); const opBonus = getAssetOperatorBonus(shop)
    const income = Math.max(5, Math.round(4 + g.player.skills.trading * 0.45 + (loc?.marketTier || 0) * 2 + shop.level * 3 + shop.level * (support.output + opBonus)))
    const upkeep = Math.max(1, Math.round(shop.level * (1 - support.upkeep)))
    shop.stock -= 1; shop.pendingIncome += Math.max(2, income - upkeep)
    shop.lastManagedResult = `待收账 ${shop.pendingIncome} 灵石`
  })

  refreshIndustryOrders(true)
}
