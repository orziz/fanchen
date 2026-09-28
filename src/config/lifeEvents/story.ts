import type { LifeEventDef } from '@/types/life'

/** 开场与志向上的关键事：青禾街口醒来、玉阙行院入门试炼。 */
export const STORY_EVENTS: LifeEventDef[] = [
  {
    id: 'opening', title: '青禾街口',
    text: '天刚蒙蒙亮，有人拿扁担捅了捅你。是个挑菜的老汉：“后生，睡柴垛边上要着凉的。”\n\n你坐起来摸了摸怀里，钱袋瘪瘪的。你从家里出来，是奔着玉阙行院去的。听人说那里收外院弟子，进去了就能学仙法。',
    choices: [
      {
        label: '跟老汉打听玉阙',
        success: {
          text: '老汉把扁担换了个肩：“玉阙？你认得里头的人？没人作保，去了也是白去。”他往街那头一指，“先找个活干吧，前街几家铺子正缺人手。”\n\n菜担边上斜插着一杆木枪，是他早起走夜路防野狗的。老汉把枪抽出来递给你：“我这把老骨头用不着了，你拿着防身。”又从担子里摸出两小袋粗米，一并给了你。',
          effects: { items: [{ itemId: 'spirit-grain', quantity: 2 }, { itemId: 'wood-spear', quantity: 1 }], flag: 'opening.done' },
          hook: 'equipStarter',
        },
      },
      {
        label: '谢过老汉，自己想办法',
        success: {
          text: '老汉摇摇头，挑起担子走了，走出几步又折回来，把两小袋粗米放在你脚边。\n\n你站在街口想了想，先得有口饭吃。镇上的铺子缺人手，镇外的河滩上长着草药。',
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
        success: { text: '你一掌按在测骨石上，石面亮起一层淡光。执事在册子上画了个勾：“下一关。”', next: 'jadegate-trial-heart' },
        failure: { text: '测骨石只闪了一下就暗了。执事头也没抬：“回去再练练，下一旬再来。”' },
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
