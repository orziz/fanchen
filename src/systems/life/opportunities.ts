import { getContext } from '@/core/context'
import { LOCATIONS, LOCATION_MAP, REALM_TEMPLATES } from '@/config'
import { calendarOf, nextXunStart, DAYS_PER_XUN } from '@/config/calendar'
import { OPPORTUNITY_TEMPLATES, type OpportunityTemplate } from '@/config/opportunities'
import { uid } from '@/utils'
import { currentGoal } from '@/systems/life/goals'
import type { LocationData } from '@/config'
import type { NpcState } from '@/types/game'
import type { OpportunityCard } from '@/types/life'

function fits(template: OpportunityTemplate, location: LocationData, goalId: string | null) {
  const g = getContext().game
  const where = template.where
  if (template.goal && template.goal !== goalId) return false
  if (template.minRank !== undefined && g.player.rankIndex < template.minRank) return false
  if (template.seasons && !template.seasons.includes(calendarOf(g.world.day).season)) return false
  if (where.locationIds && !where.locationIds.includes(location.id)) return false
  if (where.tags && !where.tags.some(tag => location.tags.includes(tag))) return false
  if (where.notTags && where.notTags.some(tag => location.tags.includes(tag))) return false
  if (where.minDanger !== undefined && location.danger < where.minDanger) return false
  if (where.maxDanger !== undefined && location.danger > where.maxDanger) return false
  return true
}

function localAcquaintance(locationId: string): NpcState | null {
  const g = getContext().game
  const known = g.npcs.filter(npc => npc.alive && npc.locationId === locationId && g.player.npcIntel[npc.id] === 'met')
  return known.length ? known[Math.floor(Math.random() * known.length)] : null
}

function makeCard(template: OpportunityTemplate, location: LocationData, npc: NpcState | null): OpportunityCard {
  const g = getContext().game
  const lasts = template.lasts ?? 2
  const fill = (text: string) => text.replace(/\{npc\}/g, npc?.name || '熟人').replace(/\{location\}/g, location.name)
  return {
    id: uid('opp'), templateId: template.id, locationId: location.id,
    title: fill(template.title), desc: fill(template.desc), reward: fill(template.reward),
    days: template.days, eventId: template.eventId, npcId: npc?.id || null,
    expiresDay: nextXunStart(g.world.day) - 1 + (lasts - 1) * DAYS_PER_XUN,
  }
}

function realmCard(): OpportunityCard | null {
  const g = getContext().game
  const realm = REALM_TEMPLATES.find(entry => entry.id === g.world.realm.activeRealmId)
  if (!realm) return null
  return {
    id: uid('opp'), templateId: 'realm', locationId: realm.locationId,
    title: `秘境 · ${realm.name}`, desc: realm.desc, reward: '首领所守的珍宝', days: 1,
    eventId: 'realm', npcId: null, expiresDay: nextXunStart(g.world.day) - 1 + DAYS_PER_XUN,
  }
}

/** 换旬：各地留下未过期的机缘，再按地点、季节与志向添上新的。 */
export function refreshOpportunities() {
  const g = getContext().game
  const goalId = currentGoal()?.id || null
  for (const location of LOCATIONS) {
    const cards = (g.life.opportunities[location.id] || []).filter(card => card.expiresDay >= g.world.day && card.templateId !== 'realm')
    const cap = location.tags.includes('city') ? 3 : 2
    const templates = [...OPPORTUNITY_TEMPLATES].sort(() => Math.random() - 0.5)
    for (const template of templates) {
      if (cards.length >= cap) break
      if (cards.some(card => card.templateId === template.id) || !fits(template, location, goalId)) continue
      if (Math.random() > template.chance) continue
      const npc = template.needsNpc ? localAcquaintance(location.id) : null
      if (template.needsNpc && !npc) continue
      cards.push(makeCard(template, location, npc))
    }
    g.life.opportunities[location.id] = cards
  }
  const realm = realmCard()
  if (realm) g.life.opportunities[realm.locationId] = [realm, ...(g.life.opportunities[realm.locationId] || [])]
}

/** 按模板在指定地点放一张机缘卡（已有同类则不重复）。 */
export function spawnOpportunity(templateId: string, locationId: string) {
  const g = getContext().game
  const template = OPPORTUNITY_TEMPLATES.find(entry => entry.id === templateId)
  const location = LOCATION_MAP.get(locationId)
  if (!template || !location) return null
  const cards = g.life.opportunities[locationId] || []
  const existing = cards.find(card => card.templateId === templateId && card.expiresDay >= g.world.day)
  if (existing) return existing
  const card = makeCard(template, location, null)
  g.life.opportunities[locationId] = [...cards, card]
  return card
}

/** 此地眼下还作数的机缘。 */
export function opportunitiesAt(locationId = getContext().game.player.locationId) {
  const g = getContext().game
  return (g.life.opportunities[locationId] || []).filter(card => card.expiresDay >= g.world.day)
}

/** 附近几处的机缘（茶馆里能听到的）。 */
export function opportunitiesNearby() {
  const here = LOCATION_MAP.get(getContext().game.player.locationId)
  return (here?.neighbors || []).flatMap(id => opportunitiesAt(id))
}
