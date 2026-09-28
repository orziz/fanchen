export interface WorldEventTemplate {
  id: string
  text: string
  type: string
}

export const WORLD_EVENT_TEMPLATES: WorldEventTemplate[] = [
  { id: 'realm-ripple', text: '听说{location}那边出了异象，都说是秘境要开了。', type: 'npc' },
  { id: 'trade-wave', text: '{location}来了好几支商队，{resource}的价钱一下子涨了。', type: 'info' },
  { id: 'sect-call', text: '{location}贴出了宗门的悬赏，散修们都往那边赶。', type: 'npc' },
  { id: 'black-market', text: '{location}的黑市上来了件怪东西，好些人半夜去看。', type: 'npc' },
]

export interface TravelEventTemplate {
  id: string
  kind: string
  text: string
}

export const TRAVEL_EVENT_TEMPLATES: TravelEventTemplate[] = [
  { id: 'escort', kind: 'money', text: '路过{location}时帮人押了一段货车，挣了{value}灵石。' },
  { id: 'salvage', kind: 'item', text: '你在{terrain}捡到了{item}。' },
  { id: 'pressure', kind: 'injury', text: '路上灵气乱得厉害，你胸口闷了好几天。' },
]

export interface SocialEventTemplate {
  id: string
  text: string
  type: string
}

export const SOCIAL_EVENT_TEMPLATES: SocialEventTemplate[] = [
  { id: 'gift', text: '{npc}托人给你捎来一包东西，说是自家的。', type: 'npc' },
  { id: 'teaching', text: '{npc}顺口指点了你一招，你回去比划了半天。', type: 'npc' },
  { id: 'rival', text: '{npc}当着一街人的面跟你呛了起来，旁人拉都拉不开。', type: 'warn' },
  { id: 'partner', text: '{npc}陪你走了一段路，话不多，却总往你这边看。', type: 'npc' },
]

export interface SectEventTemplate {
  id: string
  text: string
  type: string
}

export const SECT_EVENT_TEMPLATES: SectEventTemplate[] = [
  { id: 'tribute', text: '外门弟子交上来{value}灵石供奉。', type: 'info' },
  { id: 'teaching-progress', text: '{npc}传功有了长进，宗门的名声跟着好了些。', type: 'info' },
  { id: 'raid', text: '有对头来宗门试探，被弟子们合力挡了回去。', type: 'warn' },
]
