import { getContext } from '@/core/context'
import { getItem } from '@/config'
import { recordMarketPurchase } from '@/systems/worldEconomy'

/** 市集：在当地货架上买下一批货。 */
export function buyListing(listingId: string) {
  const ctx = getContext()
  const g = ctx.game
  const market = g.market[g.player.locationId] || []
  const listing = market.find(e => e.listingId === listingId)
  if (!listing) return
  if (g.player.money < listing.price) { ctx.appendLog('灵石不足，买不起这件货。', 'warn'); return }
  g.player.money -= listing.price
  ctx.addItemToInventory(listing.itemId, listing.quantity)
  recordMarketPurchase(g.player.locationId, listing.itemId, listing.quantity)
  g.player.stats.tradesCompleted += 1
  ctx.adjustRegionStanding(g.player.locationId, 0.4)
  ctx.appendLog(`你购入${getItem(listing.itemId)?.name || '货物'} x${listing.quantity}。`, 'loot')
  g.market[g.player.locationId] = market.filter(e => e !== listing)
}
