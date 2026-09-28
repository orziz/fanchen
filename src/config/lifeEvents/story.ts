import type { LifeEventDef } from '@/types/life'

/** 开场与志向上的关键事：青禾街口醒来、玉阙行院入门试炼。 */
export const STORY_EVENTS: LifeEventDef[] = [
  {
    id: 'opening', title: '青禾街口',
    text: '天刚蒙蒙亮，你被人从街口的柴垛边推醒。推你的是个挑菜担的老汉：“后生，睡在这儿要着凉的。”\n\n你想起了自己为什么来——听说玉阙行院每年都收外院弟子，你要去修仙。可身上的盘缠，只剩下一点零碎了。',
    choices: [
      {
        label: '向老汉打听去玉阙的门路',
        success: {
          text: '老汉上下打量你：“玉阙？那是神仙待的地方，只收有修为、有人作保的。你这身板，先在镇上练出一身力气再说。”\n\n他指了指街那头：“缺钱就去帮工，镇外河滩也能采药换钱。日子是自己过出来的，做一件事，就过去几天。”临走，他往你怀里塞了半袋粗米和一杆木枪。',
          effects: { items: [{ itemId: 'spirit-grain', quantity: 2 }, { itemId: 'wood-spear', quantity: 1 }], flag: 'opening.done' },
          hook: 'equipStarter',
        },
      },
      {
        label: '谢过老汉，自己琢磨',
        success: {
          text: '你谢过老汉，站在街口想了想：修仙之前，先得吃饱饭。镇上帮工、镇外采药，总有一条活路。老汉走出几步又折回来，把半袋粗米塞给了你。',
          effects: { items: [{ itemId: 'spirit-grain', quantity: 2 }], flag: 'opening.done' },
        },
      },
    ],
  },
  {
    id: 'jadegate-trial', title: '行院入门试炼',
    text: '演武场上站着二十来个少年。执事高声念着规矩：“一试根骨，二试心性，三试身手。三关都过，才算我玉阙外院的人。”',
    choices: [
      {
        label: '上前试根骨', check: { stat: 'power', difficulty: 6 },
        success: { text: '你一掌按在测骨石上，石面亮起一层淡光。执事点了点头：“下一关。”', next: 'jadegate-trial-heart' },
        failure: { text: '测骨石只闪了一下就暗了。执事摆摆手：“根骨还欠火候，下一旬再来。”' },
      },
      { label: '再准备准备', success: { text: '你退出人群，打算把底子再打熬扎实些。' } },
    ],
  },
  {
    id: 'jadegate-trial-heart', title: '二试心性',
    text: '执事领你走进一间空屋，屋里只有一炷香。“香燃尽之前，坐着不许动。”门一关，屋里便响起了各种声音：有人喊你的名字，有人哭，有人笑。',
    choices: [
      {
        label: '守住心神', check: { stat: 'insight', difficulty: 5 },
        success: { text: '香燃尽了，你缓缓睁眼，屋里一片寂静。执事推门进来：“最后一关。”', next: 'jadegate-trial-fight' },
        failure: { text: '你忍不住回头看了一眼，香灰便落了一地。执事叹了口气：“心性未稳，下一旬再来吧。”' },
      },
    ],
  },
  {
    id: 'jadegate-trial-fight', title: '三试身手',
    text: '最后一关是和外院的一位师兄过招。师兄抱拳：“点到为止，撑满十招就算你过。”',
    choices: [
      {
        label: '出手',
        fight: { templateId: 'road-bandit', name: '外院师兄', danger: 3 },
        success: { text: '十招过后，师兄收手笑道：“好。”执事在名册上写下你的名字：“从今日起，你便是玉阙行院的外院弟子。”', hook: 'joinJadegate' },
        failure: { text: '你被师兄一掌推出了圈外。师兄扶你起来：“底子不错，下一旬再来。”' },
      },
    ],
  },
]
