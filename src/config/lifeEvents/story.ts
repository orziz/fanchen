import type { LifeEventDef } from '@/types/life'

/** 开场与志向上的关键事：青禾街口醒来、玉阙行院入门试炼。 */
export const STORY_EVENTS: LifeEventDef[] = [
  {
    id: 'opening', title: '青禾街口',
    text: '天刚蒙蒙亮，有人拿扁担捅了捅你。是个挑菜的老汉：“后生，睡柴垛边上要着凉的。”\n\n你坐起来摸了摸怀里，钱袋瘪瘪的。你从家里出来，是奔着玉阙行院去的。听人说那里每年收外院弟子，进去了就能学仙法。',
    choices: [
      {
        label: '跟老汉打听玉阙',
        success: {
          text: '老汉把你上下打量一番，笑了：“玉阙？那是仙家待的地方。人家收的是有修为、有人作保的，你这身板，先在镇上把力气练出来再说。”\n\n他往街那头一指：“缺钱就去铺子里帮工，镇外河滩上也有草药能换钱。”走前，他从菜担底下抽出一杆木枪，连同半袋粗米塞进你怀里：“我家老大当年用的，放着也是放着。”',
          effects: { items: [{ itemId: 'spirit-grain', quantity: 2 }, { itemId: 'wood-spear', quantity: 1 }], flag: 'opening.done' },
          hook: 'equipStarter',
        },
      },
      {
        label: '谢过老汉，自己想办法',
        success: {
          text: '老汉摇摇头，挑起担子走了，走出几步又折回来，把半袋粗米塞进你怀里。\n\n你站在街口想了想，先得有口饭吃。镇上的铺子缺人手，镇外的河滩上长着草药。',
          effects: { items: [{ itemId: 'spirit-grain', quantity: 2 }], flag: 'opening.done' },
        },
      },
    ],
  },
  {
    id: 'jadegate-trial', title: '行院入门试炼',
    text: '演武场上站着二十来个少年。执事扯着嗓子念规矩：“一试根骨，二试心性，三试身手。三关都过，才算我玉阙外院的人。”',
    choices: [
      {
        label: '上前试根骨', check: { stat: 'power', difficulty: 6 },
        success: { text: '你一掌按在测骨石上，石面亮起一层淡光。执事点了点头：“下一关。”', next: 'jadegate-trial-heart' },
        failure: { text: '测骨石只闪了一下就暗了。执事摆摆手：“回去再练练，下一旬再来。”' },
      },
      { label: '先看别人试', success: { text: '你挤出人群，在场边看别人试了几轮。' } },
    ],
  },
  {
    id: 'jadegate-trial-heart', title: '二试心性',
    text: '执事领你进了一间空屋，屋里只点着一炷香。“香烧完之前，坐着不许动。”门一关，屋里就响起了各种声音：有人喊你的名字，有人哭，有人笑。',
    choices: [
      {
        label: '坐着不动', check: { stat: 'insight', difficulty: 5 },
        success: { text: '香烧完了，那些声音也停了。执事推门进来：“最后一关。”', next: 'jadegate-trial-fight' },
        failure: { text: '有个声音喊了你娘给你起的小名，你没忍住，回了头。执事推门进来看了一眼：“下一旬再来吧。”' },
      },
    ],
  },
  {
    id: 'jadegate-trial-fight', title: '三试身手',
    text: '最后一关是跟外院的一位师兄过招。师兄抱了抱拳：“点到为止，撑满十招就算你过。”',
    choices: [
      {
        label: '出手',
        fight: { templateId: 'road-bandit', name: '外院师兄', danger: 3 },
        success: { text: '十招过后，师兄收了手：“好。”执事翻开名册，蘸墨写下你的名字：“明早卯时到外院报到，迟了扣月例。”', hook: 'joinJadegate' },
        failure: { text: '你被师兄一掌推出了圈外。师兄伸手把你拉起来：“底子不错，就是还嫩。下一旬再来。”' },
      },
    ],
  },
]
