import { getContext } from '@/core/context'
import { LOCATION_MAP, getItem } from '@/config'
import { gatherNpcRumors } from '@/systems/npc'
import { getTerritorySecurity, getTerritoryTaxRate } from '@/systems/social'
import { getLocationEconomyOverview } from '@/systems/worldEconomy'

type RumorVenue = 'teahouse' | 'tavern'

const MARKET_BIAS_LABELS: Record<string, string> = {
  grain: '口粮', herb: '药材', wood: '木料', ore: '矿料', cloth: '布货', pill: '丹药',
  weapon: '兵器', armor: '甲具', relic: '奇珍', scroll: '残卷', fire: '火材', ice: '寒材',
}

function locationName(id: string) {
  return LOCATION_MAP.get(id)?.name || id
}

/** 茶馆：本地治安、税赋、商气，以及哪家行会在收货。 */
function teahouseLines() {
  const g = getContext().game
  const here = g.player.locationId
  const economy = getLocationEconomyOverview(here)
  const security = getTerritorySecurity(here)
  const securityText = security >= 70 ? '街面安稳' : security >= 50 ? '巡夜渐紧' : '人心略浮'
  const lines = [`${locationName(here)}近来${securityText}，税赋约${Math.round(getTerritoryTaxRate(here) * 100)}%，${economy.summary}。`]
  const order = g.world.industryOrders[0]
  if (order) {
    const goods = order.requirements.map(req => `${req.quantity}${getItem(req.itemId)?.name || req.itemId}`).join('、')
    lines.push(`茶客低声议论，${order.locationId ? `${locationName(order.locationId)}那边，` : ''}${order.factionName}近来正在收${goods}。`)
  }
  return lines
}

/** 酒馆：邻近哪里外货吃紧、哪家肯用跑腿送货的人。 */
function tavernLines() {
  const g = getContext().game
  const current = LOCATION_MAP.get(g.player.locationId)
  const lines: string[] = []
  const target = (current?.neighbors || [])
    .map(id => LOCATION_MAP.get(id))
    .filter((loc): loc is NonNullable<typeof loc> => Boolean(loc))
    .sort((a, b) => (getLocationEconomyOverview(b.id).needPressure + (b.marketTier || 0) * 8) - (getLocationEconomyOverview(a.id).needPressure + (a.marketTier || 0) * 8))[0]
  if (target) {
    const bias = MARKET_BIAS_LABELS[target.marketBias || ''] || '紧俏货'
    lines.push(`行脚客说，${target.name}这阵子${getLocationEconomyOverview(target.id).needLabel}，若带${bias}过去，多半更好谈价。`)
  }
  const order = g.world.industryOrders[1] || g.world.industryOrders[0]
  if (order) {
    const goods = order.requirements.map(req => `${req.quantity}${getItem(req.itemId)?.name || req.itemId}`).join('、')
    lines.push(`酒客说${order.locationId ? `${locationName(order.locationId)}的` : ''}${order.factionName}近来缺${goods}，肯跑腿送货的人更容易摸到门路。`)
  }
  return lines
}

/** 去茶馆酒肆打听：先听人物风声，再记下与生计相关的口风。 */
export function gatherVenueRumors(venue: RumorVenue) {
  const heard = gatherNpcRumors(venue)
  if (!heard.length) return heard
  const ctx = getContext()
  const lines = venue === 'teahouse' ? teahouseLines() : tavernLines()
  lines.forEach(text => ctx.appendLog(text, 'npc'))
  return heard
}
