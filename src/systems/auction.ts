import { getContext } from '@/core/context'
import { bus } from '@/core/events'
import { addPlayerMetric } from '@/core/integerProgress'
import {
  LOCATIONS, LOCATION_MAP, REALM_TEMPLATES, WORLD_EVENT_TEMPLATES,
  getItem,
} from '@/config'
import { sample, randomInt, fillTemplate, round } from '@/utils'
import { createDynamicMarketListings } from './worldEconomy'

/* ─── Reserved Funds ─── */

function getReservedAuctionFunds(ignoreListingId: string | null = null): number {
  return getContext().game.auction.reduce((sum, l) => {
    if (l.bidderId !== 'player') return sum
    if (l.id === ignoreListingId) return sum
    return sum + l.currentBid
  }, 0)
}

/* ─── Bidding ─── */

export function placeBid(listingId: string) {
  const ctx = getContext()
  const listing = ctx.game.auction.find(e => e.id === listingId)
  if (!listing) return
  const nextBid = listing.currentBid + listing.minimumRaise
  if (ctx.game.player.money < getReservedAuctionFunds(listing.id) + nextBid) {
    ctx.appendLog('你手头灵石不够抬价。', 'warn'); return
  }
  listing.currentBid = nextBid
  listing.bidderId = 'player'
  listing.interest += 8
  ctx.appendLog(`你对${getItem(listing.itemId)?.name || '拍品'}出价${nextBid}灵石。`, 'info')
}

/* ─── Auction Visit (auto) ─── */

export function resolveAuctionVisit() {
  const ctx = getContext()
  const g = ctx.game
  if (!g.auction.length) { g.auction = ctx.createAuctionListings(randomInt(3, 5)); return }
  const listing = sample(g.auction)
  const item = getItem(listing.itemId)
  if (!item) return
  if (Math.random() < 0.28 && g.player.money > listing.currentBid + listing.minimumRaise) {
    placeBid(listing.id)
  } else {
    addPlayerMetric('reputation', 0.4)
    ctx.appendLog(`你在拍卖行打探到${item.name}的消息。`, 'npc')
  }
}

/* ─── Per-Turn Auction Resolution ─── */

export function resolveAuctionTurn() {
  const ctx = getContext()
  const g = ctx.game
  const survivors: typeof g.auction = []
  g.auction.forEach(listing => {
    listing.turnsLeft -= 1
    if (listing.turnsLeft > 0) {
      if (Math.random() < listing.interest / 150) {
        const challenger = sample(g.npcs)
        const nextBid = listing.currentBid + listing.minimumRaise
        const rivalPressure = g.player.rivalIds.includes(challenger.id) ? 0.18 : 0
        if (challenger.wealth > nextBid && challenger.mood.greed / 100 + rivalPressure > 0.42) {
          listing.currentBid = nextBid
          listing.bidderId = challenger.id
          challenger.wealth -= Math.round(nextBid * 0.05)
        }
      }
      survivors.push(listing)
      return
    }
    const item = getItem(listing.itemId)
    if (listing.bidderId === 'player') {
      if (g.player.money >= listing.currentBid) {
        g.player.money -= listing.currentBid
        ctx.addItemToInventory(listing.itemId, listing.quantity)
        g.player.stats.auctionsWon += 1
        ctx.appendLog(`拍卖结束，你拍得${item?.name || '奇珍'}。`, 'loot')
      } else {
        ctx.appendLog(`你对${item?.name || '拍品'}的出价因灵石不足作废。`, 'warn')
      }
    } else if (listing.bidderId.startsWith('npc-')) {
      const npc = ctx.getNpc(listing.bidderId)
      if (npc) {
        npc.inventory.push({ itemId: listing.itemId, quantity: listing.quantity })
        npc.lastEvent = `在拍卖行夺得${item?.name || '拍品'}`
      }
      ctx.appendLog(`${npc?.name || '某位修士'}拍下了${item?.name || '奇珍'}。`, 'npc')
    }
  })
  g.auction = survivors
  if (g.auction.length < 4) g.auction.push(...ctx.createAuctionListings(randomInt(1, 2)))
}

/* ─── Market Refresh ─── */

export function refreshMarketIfNeeded() {
  const ctx = getContext()
  const g = ctx.game
  if (g.world.hour % 4 !== 0 || g.world.subStep !== 0) return
  LOCATIONS.forEach(loc => { g.market[loc.id] = createDynamicMarketListings(loc) })
  ctx.appendLog('各地商铺与黑市货架焕然一新。', 'info')
}

/* ─── Realm Activation ─── */

export function maybeActivateRealm() {
  const ctx = getContext()
  const g = ctx.game
  if (g.world.realm.cooldown > 0) { g.world.realm.cooldown -= 1; return }
  if (g.world.realm.activeRealmId) return
  if (Math.random() < 0.18) {
    const eligible = REALM_TEMPLATES.filter(r => g.player.reputation >= Math.max(0, r.unlockRep - 6))
    if (!eligible.length) return
    const realm = sample(eligible)
    g.world.realm.activeRealmId = realm.id
    const loc = LOCATION_MAP.get(realm.locationId)!
    ctx.appendLog(fillTemplate(sample(WORLD_EVENT_TEMPLATES).text, { location: loc.name, resource: loc.resource }), 'npc')
    ctx.appendLog(`${realm.name}在${loc.name}附近出现了波动。`, 'npc')
  }
}
