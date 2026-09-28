import type { LifeEventDef } from '@/types/life'

/** 镇外、山野里会碰上的事：采药、遇兽、奇遇、迷路。 */
export const WILD_EVENTS: LifeEventDef[] = [
  {
    id: 'herb-patch', title: '河滩药草',
    text: '{location}外的河滩上长着一片雾心草，叶背还挂着露水。有几株长在滩边的乱石缝里，看着格外壮实。',
    when: { kinds: ['wild'], maxDanger: 2, weight: 3 },
    choices: [
      { label: '只采好采的', success: { text: '你蹲在滩上采了小半个时辰，裤脚全湿了。', effects: { items: [{ itemId: 'mist-herb', quantity: 2 }] } } },
      {
        label: '攀进乱石缝里采', hint: '石头滑，得有把子力气',
        check: { stat: 'power', difficulty: 3 },
        success: { text: '你手脚并用攀进石缝，把最壮的几株连根拔了出来。', effects: { items: [{ itemId: 'mist-herb', quantity: 4 }] } },
        failure: { text: '脚下一滑摔在石上，蹭掉一大块皮，只抓住了一株。', effects: { items: [{ itemId: 'mist-herb', quantity: 1 }], injury: 1 } },
      },
      {
        label: '细看有没有更好的药', hint: '眼力好的人，常能捡到宝',
        check: { stat: 'insight', difficulty: 5 },
        success: { text: '石缝深处竟藏着一株月魄叶，叶脉里泛着淡淡的银光。', effects: { items: [{ itemId: 'moonleaf', quantity: 1 }, { itemId: 'mist-herb', quantity: 1 }] } },
        failure: { text: '看了半天，还是雾心草。你随手采了两株。', effects: { items: [{ itemId: 'mist-herb', quantity: 2 }] } },
      },
    ],
  },
  {
    id: 'stray-dogs', title: '野狗拦路',
    text: '一条瘦骨嶙峋的野狗从草丛里窜出来，龇着牙拦在路中间，后头还跟着两条。',
    when: { kinds: ['wild'], maxDanger: 2, weight: 2 },
    choices: [
      {
        label: '抄起棍子赶它们走',
        fight: { templateId: 'feral-dog' },
        success: { text: '领头的挨了几棍，夹着尾巴逃了，另外两条也跟着散了。', effects: { reputation: 1 } },
        failure: { text: '你被咬了两口，狼狈地退回了镇上。' },
      },
      {
        label: '扔点干粮引开它们', cost: { items: [{ itemId: 'spirit-grain', quantity: 1 }] },
        success: { text: '野狗叼着米袋跑远了。你心疼那半袋米，脚下却快了几分。' },
      },
      {
        label: '看准时机慢慢退开', check: { stat: 'insight', difficulty: 3 },
        success: { text: '你一步步退进树林，野狗盯了你半晌，终究没追。' },
        failure: { text: '刚一转身，野狗就扑了上来，在你腿上撕开一道口子。', effects: { injury: 1 } },
      },
    ],
  },
  {
    id: 'trapped-hunter', title: '兽夹里的猎户',
    text: '林边传来呼救声——一个猎户的腿被自己下的兽夹夹住了，血顺着裤腿往下淌。',
    when: { kinds: ['wild'], weight: 1 },
    choices: [
      {
        label: '拿草膏替他止血', cost: { items: [{ itemId: 'herb-paste', quantity: 1 }] },
        success: { text: '猎户千恩万谢，硬塞给你一张刚硝好的兽皮，说往后进山可以报他的名号。', effects: { items: [{ itemId: 'beast-hide', quantity: 1 }], reputation: 2 } },
      },
      {
        label: '帮他掰开兽夹', check: { stat: 'power', difficulty: 4 },
        success: { text: '兽夹“咔”地弹开，猎户扶着你站了起来，掏出几枚铜钱谢你。', effects: { money: 8, reputation: 2 } },
        failure: { text: '兽夹纹丝不动。你只好跑回去叫人，来回折腾了一整天。', effects: { reputation: 1, days: 1 } },
      },
      { label: '装作没听见', success: { text: '你绕开了那片林子。呼救声在身后响了很久。' } },
    ],
  },
  {
    id: 'old-grave', title: '荒冢残碑',
    text: '草丛里露出半截残碑，碑后的土被雨水冲开，隐约能看见一只朽烂的木匣。',
    when: { kinds: ['wild'], weight: 1, once: true },
    choices: [
      {
        label: '挖出来看看', check: { stat: 'insight', difficulty: 4 },
        success: { text: '匣子里是一卷没被虫蛀透的旧册页，还有几枚锈铜钱。', effects: { items: [{ itemId: 'blank-codex', quantity: 1 }], money: 12 } },
        failure: { text: '匣子一碰就碎了，只剩一把烂木头。你心里发毛，赶紧走了。' },
      },
      { label: '添一抔土，拜一拜再走', success: { text: '你把土培好，拜了三拜。走出老远，心里还觉得格外清静。', effects: { cultivation: 3 } } },
    ],
  },
  {
    id: 'wild-fruit', title: '野山楂',
    text: '山坡上一片野山楂红透了，枝头被压得低低的。',
    when: { kinds: ['wild'], seasons: ['summer', 'autumn'], weight: 2 },
    choices: [
      { label: '摘一兜回去', success: { text: '你吃了个饱，剩下的拿到镇上换了几文钱。', effects: { money: 4, hp: 12 } } },
      {
        label: '爬上高处摘最红的', check: { stat: 'power', difficulty: 3 },
        success: { text: '高处的果子又大又甜，卖了个好价钱。', effects: { money: 9, hp: 12 } },
        failure: { text: '树枝“咔嚓”一声断了，你摔进了灌木丛。', effects: { injury: 1 } },
      },
    ],
  },
  {
    id: 'lost-in-fog', title: '起雾迷路',
    text: '雾一下子漫上来，来时的路全不见了，四下里只有湿漉漉的树影。',
    when: { kinds: ['wild', 'travel'], minDanger: 2, weight: 1 },
    choices: [
      {
        label: '找处高地辨方向', check: { stat: 'insight', difficulty: 5 },
        success: { text: '你爬上一块大石，远远看见了{location}的炊烟。' },
        failure: { text: '你在雾里兜了两天圈子，才摸回熟悉的路。', effects: { days: 2 } },
      },
      { label: '原地等雾散', success: { text: '一直等到第二天晌午，雾才散尽。', effects: { days: 1 } } },
    ],
  },
  {
    id: 'grey-wolf', title: '林中灰狼',
    text: '林子深处传来狼嚎，一头灰狼从树后绕了出来，绿幽幽的眼睛直盯着你。',
    when: { kinds: ['wild'], minDanger: 2, weight: 1.5 },
    choices: [
      {
        label: '迎上去',
        fight: {},
        success: { text: '灰狼倒在地上不动了。你剥下狼皮，背着回了镇上。', effects: { items: [{ itemId: 'beast-hide', quantity: 1 }] } },
        failure: { text: '你被狼扑倒在地，拼了命才逃出林子。' },
      },
      {
        label: '爬到树上避开', check: { stat: 'power', difficulty: 4 },
        success: { text: '你在树杈上蹲了半宿，狼终于悻悻地走了。', effects: { days: 1 } },
        failure: { text: '爬到一半，小腿被狼一口咬住。你踹开它，一瘸一拐地逃了。', effects: { injury: 1 } },
      },
    ],
  },
  {
    id: 'bandits', title: '剪径毛贼',
    text: '两个蒙着脸的汉子从路边跳出来，手里的柴刀晃了晃：“留下买路钱！”',
    when: { kinds: ['wild', 'travel'], minDanger: 2, weight: 1 },
    choices: [
      { label: '扔出钱袋了事', success: { text: '你把钱袋扔了过去。两人掂了掂，骂骂咧咧地走了。', effects: { money: -20 } } },
      {
        label: '跟他们拼了',
        fight: { templateId: 'road-bandit', name: '剪径毛贼', hpMul: 1.2 },
        success: { text: '两个毛贼抱头鼠窜，慌乱中还掉下一个钱袋。', effects: { money: 15, reputation: 2 } },
        failure: { text: '你被打翻在地，钱袋也叫他们搜走了。', effects: { money: -15 } },
      },
      {
        label: '说自己是猎社的人', check: { stat: 'charisma', difficulty: 4 },
        success: { text: '两人面面相觑，嘀咕了几句，钻回林子里去了。' },
        failure: { text: '“少来这套！”对方一脚把你踹翻，把钱袋翻了个底朝天。', effects: { money: -25 } },
      },
    ],
  },
  {
    id: 'hidden-cave', title: '藤后山洞',
    text: '一处藤蔓遮住的山洞，洞口的石壁上刻着些模糊的字，像是很久以前有人在此修行。',
    when: { kinds: ['wild'], minDanger: 2, weight: 0.8, once: true },
    choices: [
      {
        label: '进去看看', check: { stat: 'insight', difficulty: 6 },
        success: { text: '洞里有个前人留下的蒲团，石壁上刻的是一段吐纳法。你照着坐了一夜，气息顺了许多。', effects: { cultivation: 15 } },
        failure: { text: '洞里黑得伸手不见五指，你磕破了头才摸出来。', effects: { injury: 1 } },
      },
      {
        label: '把石壁上的字拓下来', cost: { items: [{ itemId: 'blank-codex', quantity: 1 }] },
        success: { text: '你把字拓在册页上，带回去慢慢参，竟有所得。', effects: { cultivation: 8, insight: 1 } },
      },
      { label: '不进去了', success: { text: '你记下了山洞的位置，转身下山。' } },
    ],
  },
  {
    id: 'cliff-lingzhi', title: '崖上灵芝',
    text: '崖壁半腰长着一株紫色灵芝，伞盖上泛着微光，底下是望不见底的深涧。',
    when: { kinds: ['wild'], minDanger: 3, weight: 0.6 },
    choices: [
      {
        label: '攀崖去采', check: { stat: 'power', difficulty: 6 },
        success: { text: '你攀上崖壁，连根带土捧下了灵芝。尝了一小片，浑身暖洋洋的。', effects: { items: [{ itemId: 'moonleaf', quantity: 2 }], cultivation: 6 } },
        failure: { text: '手一松，你顺着崖壁滑了下去，好在被一棵歪脖子松挂住了。', effects: { injury: 2 } },
      },
      { label: '可惜，还是算了', success: { text: '你在崖边站了一会儿，把这株灵芝记在了心里。' } },
    ],
  },
  {
    id: 'hurt-peddler', title: '遭劫的行商',
    text: '路边躺着一个受伤的行商，货担散了一地，看样子刚遭了劫。',
    when: { kinds: ['wild', 'travel'], maxDanger: 3, weight: 1 },
    choices: [
      { label: '扶他去镇上', success: { text: '到了镇上，行商摸出几块碎银塞给你，说这份情他记下了。', effects: { money: 10, reputation: 3, days: 1 } } },
      {
        label: '给他敷上草膏', cost: { items: [{ itemId: 'herb-paste', quantity: 1 }] },
        success: { text: '行商缓过劲来，把剩下的一匹好布送给了你。', effects: { items: [{ itemId: 'cloth-roll', quantity: 2 }], reputation: 2 } },
      },
      { label: '捡两件货就走', success: { text: '你拎起两卷布，头也不回地走了，心里却一直发虚。', effects: { items: [{ itemId: 'cloth-roll', quantity: 2 }], reputation: -3 } } },
    ],
  },
  {
    id: 'summer-storm', title: '山雨',
    text: '一场大雨劈头盖脸浇下来，山路转眼成了泥沟。',
    when: { kinds: ['wild', 'travel'], seasons: ['summer'], weight: 1 },
    choices: [
      { label: '找个岩洞躲雨', success: { text: '雨下了一夜，第二天才停。', effects: { days: 1 } } },
      {
        label: '冒雨往前赶', check: { stat: 'power', difficulty: 3 },
        success: { text: '你浑身湿透，好在脚下没出岔子。' },
        failure: { text: '回去就着了凉，咳了好些天。', effects: { injury: 1 } },
      },
    ],
  },
  {
    id: 'snow-hare', title: '雪地兔踪',
    text: '雪地里有一串新鲜的兔子脚印，一直延伸进灌木丛里。',
    when: { kinds: ['wild'], seasons: ['winter'], weight: 1.5 },
    choices: [
      {
        label: '顺着脚印追', check: { stat: 'power', difficulty: 3 },
        success: { text: '你扑了个满怀，抓住一只肥兔子，卖了几文钱，还喝了碗热汤。', effects: { money: 6, hp: 15 } },
        failure: { text: '兔子钻进了洞，你在雪地里白白冻了一天。', effects: { days: 1 } },
      },
      { label: '天太冷，回去吧', success: { text: '你搓着手往回走。' } },
    ],
  },
  {
    id: 'creek-elder', title: '溪边钓叟',
    text: '一个白发老人坐在溪边钓鱼，鱼篓里空空的。他头也不回：“年轻人，你身上的气乱得很。”',
    when: { kinds: ['wild'], weight: 0.5, once: true },
    choices: [
      {
        label: '请老人指点', check: { stat: 'insight', difficulty: 4 },
        success: { text: '老人随手在你背上拍了三下，一股热流从脊背直冲头顶。再回头时，溪边已经没人了。', effects: { cultivation: 20, insight: 1 } },
        failure: { text: '老人摇摇头，不再理你。', effects: { cultivation: 2 } },
      },
      { label: '坐下陪他钓一会儿', success: { text: '日落时老人收竿走了，一句话也没留。你却觉得心里静了下来。', effects: { cultivation: 6, days: 1 } } },
    ],
  },
]
