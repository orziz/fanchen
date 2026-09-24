/** 出身：开局时的一点根底差异，只影响起步，不锁任何门路。 */
export interface OriginData {
  id: string
  name: string
  desc: string
  perks: string
  bonus: {
    money?: number
    power?: number
    insight?: number
    charisma?: number
    farming?: number
    crafting?: number
    trading?: number
  }
  items: { itemId: string; quantity: number }[]
}

export const ORIGINS: OriginData[] = [
  {
    id: 'farmhand',
    name: '田家子',
    desc: '青禾田埂上长大，肩能挑、腰能弯，最知道一粒米的分量。',
    perks: '战力 +1 · 农务 +2 · 粗灵米 ×2',
    bonus: { power: 1, farming: 2 },
    items: [{ itemId: 'spirit-grain', quantity: 2 }],
  },
  {
    id: 'hunter',
    name: '猎户后人',
    desc: '随父辈进过几回迷林，认得兽踪，手上有股狠劲。',
    perks: '战力 +2 · 兽皮 ×1',
    bonus: { power: 2 },
    items: [{ itemId: 'beast-hide', quantity: 1 }],
  },
  {
    id: 'peddler',
    name: '货郎之子',
    desc: '自小跟着担子走街串巷，一张嘴能把死货说活。',
    perks: '灵石 +12 · 商道 +2 · 魅力 +1',
    bonus: { money: 12, trading: 2, charisma: 1 },
    items: [],
  },
  {
    id: 'scholar',
    name: '落魄书生',
    desc: '读过几卷残书，考场失意，倒把心思养得比旁人静。',
    perks: '悟性 +2 · 工艺 +1 · 空白册页 ×1',
    bonus: { insight: 2, crafting: 1 },
    items: [{ itemId: 'blank-codex', quantity: 1 }],
  },
]

export const ORIGIN_MAP = new Map(ORIGINS.map(origin => [origin.id, origin]))

const SURNAMES = ['林', '沈', '陆', '顾', '萧', '温', '裴', '苏', '秦', '江', '谢', '韩']
const GIVEN = ['寒', '舟', '砚', '澈', '越', '衡', '遥', '昭', '川', '禾', '晏', '青', '尘', '远']

export function randomPlayerName() {
  const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]
  return `${pick(SURNAMES)}${pick(GIVEN)}`
}
