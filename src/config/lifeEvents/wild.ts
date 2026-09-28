import type { LifeEventDef } from '@/types/life'

/** 镇外、山野里会碰上的事：采药、遇兽、奇遇、迷路。 */
export const WILD_EVENTS: LifeEventDef[] = [
  {
    id: 'herb-patch', title: '河滩药草',
    text: '{location}外头的河滩上长着一片雾心草，叶子背面还挂着露水。滩边乱石缝里也有几株，茎秆足有小指粗。',
    when: { kinds: ['wild'], maxDanger: 2, weight: 3 },
    choices: [
      { label: '采好采的', success: { text: '你蹲在滩上采了小半个时辰，裤脚湿到了膝盖。', effects: { items: [{ itemId: 'mist-herb', quantity: 2 }] } } },
      {
        label: '爬进乱石缝里采', hint: '石头上全是青苔',
        check: { stat: 'power', difficulty: 3 },
        success: { text: '你手脚并用爬进石缝，把最壮的几株连根拔了出来。', effects: { items: [{ itemId: 'mist-herb', quantity: 4 }] } },
        failure: { text: '脚下一滑，你摔在石头上，胳膊蹭掉一大块皮，手里只攥住一株。', effects: { items: [{ itemId: 'mist-herb', quantity: 1 }], injury: 1 } },
      },
      {
        label: '再往里头找找', hint: '要眼尖',
        check: { stat: 'insight', difficulty: 5 },
        success: { text: '石缝最里头藏着一株月魄叶，叶脉在暗处泛着一点银光。', effects: { items: [{ itemId: 'moonleaf', quantity: 1 }, { itemId: 'mist-herb', quantity: 1 }] } },
        failure: { text: '翻了半天，还是雾心草。你顺手拔了两株。', effects: { items: [{ itemId: 'mist-herb', quantity: 2 }] } },
      },
    ],
  },
  {
    id: 'stray-dogs', title: '野狗拦路',
    text: '草丛里窜出一条瘦得见骨的野狗，龇着牙挡在路当中。后头又钻出来两条。',
    when: { kinds: ['wild'], maxDanger: 2, weight: 2 },
    choices: [
      {
        label: '抄起棍子赶',
        fight: { templateId: 'feral-dog' },
        success: { text: '领头那条挨了几棍，夹着尾巴跑了，另外两条也跟着散了。', effects: { reputation: 1 } },
        failure: { text: '你腿上挨了两口，一路退了回去。' },
      },
      {
        label: '扔半袋米引开', cost: { items: [{ itemId: 'spirit-grain', quantity: 1 }] },
        success: { text: '野狗叼起米袋就跑。那是你两天的口粮。' },
      },
      {
        label: '慢慢往后退', check: { stat: 'insight', difficulty: 3 },
        success: { text: '你一步一步退进树林。野狗盯了你半天，没追上来。' },
        failure: { text: '你刚一转身，野狗就扑了上来，在你小腿上撕开一道口子。', effects: { injury: 1 } },
      },
    ],
  },
  {
    id: 'trapped-hunter', title: '兽夹里的猎户',
    text: '林子边上有人喊救命。一个猎户踩中了自己下的兽夹，血顺着裤腿往下淌。',
    when: { kinds: ['wild'], weight: 1 },
    choices: [
      {
        label: '拿草膏给他止血', cost: { items: [{ itemId: 'herb-paste', quantity: 1 }] },
        success: { text: '猎户疼得直抽气，缓过来以后硬塞给你一张刚硝好的兽皮：“往后进山，报我韩老四的名字。”', effects: { items: [{ itemId: 'beast-hide', quantity: 1 }], reputation: 2 } },
      },
      {
        label: '帮他掰开兽夹', check: { stat: 'power', difficulty: 4 },
        success: { text: '兽夹“咔”一声弹开。猎户扶着你站起来，摸出几块灵石塞给你。', effects: { money: 8, reputation: 2 } },
        failure: { text: '兽夹纹丝不动。你跑回去叫了人来，来回折腾了一整天。', effects: { reputation: 1, days: 1 } },
      },
      { label: '装没听见', success: { text: '你绕开了那片林子。走出去很远，还能听见他在喊。' } },
    ],
  },
  {
    id: 'old-grave', title: '荒冢残碑',
    text: '草丛里露出半截石碑，上面的字早磨平了。碑后的土让雨水冲开一块，露出一只烂了角的木匣。',
    when: { kinds: ['wild'], weight: 1, once: true },
    choices: [
      {
        label: '挖出来看看', check: { stat: 'insight', difficulty: 4 },
        success: { text: '匣子里是一沓没叫虫蛀透的旧册页，底下压着几块灵石。', effects: { items: [{ itemId: 'blank-codex', quantity: 1 }], money: 12 } },
        failure: { text: '匣子一碰就散了架，里头只剩烂木屑。你后脖颈一阵发凉，赶紧走了。' },
      },
      { label: '培上土，拜一拜', success: { text: '你把土培回去拍实，又拜了三拜。', effects: { cultivation: 3 } } },
    ],
  },
  {
    id: 'wild-fruit', title: '野山楂',
    text: '山坡上一片野山楂红透了，枝子被压得老低。',
    when: { kinds: ['wild'], seasons: ['summer', 'autumn'], weight: 2 },
    choices: [
      { label: '摘一兜回去', success: { text: '你边摘边吃，吃得牙都酸了。剩下的拿去换了几块灵石。', effects: { money: 4, hp: 12 } } },
      {
        label: '爬到高处摘', check: { stat: 'power', difficulty: 3 },
        success: { text: '高处的果子个大色正，卖了个好价。', effects: { money: 9, hp: 12 } },
        failure: { text: '脚下的树枝“咔嚓”一声断了，你摔进了灌木丛。', effects: { injury: 1 } },
      },
    ],
  },
  {
    id: 'lost-in-fog', title: '起雾迷路',
    text: '雾说起就起，一转眼，来时的路就看不见了。四下里只有湿漉漉的树影。',
    when: { kinds: ['wild', 'travel'], minDanger: 2, weight: 1 },
    choices: [
      {
        label: '找块高地辨方向', check: { stat: 'insight', difficulty: 5 },
        success: { text: '你爬上一块大石头，远远看见了{location}的炊烟。' },
        failure: { text: '你在雾里转了两天，才摸回认得的路上。', effects: { days: 2 } },
      },
      { label: '原地等雾散', success: { text: '你靠着树一直坐到第二天晌午，雾才散干净。', effects: { days: 1 } } },
    ],
  },
  {
    id: 'grey-wolf', title: '林中灰狼',
    text: '林子深处有狼在叫。一头灰狼从树后绕出来，眼睛直勾勾地盯着你。',
    when: { kinds: ['wild'], minDanger: 2, weight: 1.5 },
    choices: [
      {
        label: '迎上去',
        fight: {},
        success: { text: '灰狼倒下不动了。你剥了狼皮，卷起来背在身后。', effects: { items: [{ itemId: 'beast-hide', quantity: 1 }] } },
        failure: { text: '你被狼扑倒在地，拼了命才逃出林子。' },
      },
      {
        label: '爬树躲开', check: { stat: 'power', difficulty: 4 },
        success: { text: '你在树杈上蹲了半宿。狼在底下转了几圈，走了。', effects: { days: 1 } },
        failure: { text: '爬到一半，狼一口咬住了你的小腿。你踹开它，一瘸一拐地跑了。', effects: { injury: 1 } },
      },
    ],
  },
  {
    id: 'bandits', title: '剪径毛贼',
    text: '路边跳出两个蒙着脸的汉子，手里的柴刀晃了晃：“把钱袋留下。”',
    when: { kinds: ['wild', 'travel'], minDanger: 2, weight: 1 },
    choices: [
      { label: '把钱袋扔过去', success: { text: '两人掂了掂钱袋，嘟囔了一句“穷鬼”，钻回林子去了。', effects: { money: -20 } } },
      {
        label: '跟他们拼了',
        fight: { templateId: 'road-bandit', name: '剪径毛贼', hpMul: 1.2 },
        success: { text: '两个毛贼抱着头跑了，慌里慌张还掉下一个钱袋。', effects: { money: 15, reputation: 2 } },
        failure: { text: '你被打翻在地，钱袋也叫他们搜走了。', effects: { money: -15 } },
      },
      {
        label: '说自己是猎社的人', check: { stat: 'charisma', difficulty: 4 },
        success: { text: '两人对看了一眼，嘀咕了几句，退回林子里去了。' },
        failure: { text: '“少来这套。”对方一脚把你踹翻，把钱袋翻了个底朝天。', effects: { money: -25 } },
      },
    ],
  },
  {
    id: 'hidden-cave', title: '藤后山洞',
    text: '一片藤蔓后头藏着个山洞，洞口的石壁上刻着些看不清的字。洞里飘出一股陈年的香灰味。',
    when: { kinds: ['wild'], minDanger: 2, weight: 0.8, once: true },
    choices: [
      {
        label: '进去看看', check: { stat: 'insight', difficulty: 6 },
        success: { text: '洞里摆着个烂了一半的蒲团，石壁上刻的是一段吐纳的法子。你照着坐了一夜，出洞时气息都匀了。', effects: { cultivation: 15 } },
        failure: { text: '洞里黑得伸手不见五指，你一头撞在石头上，摸了半天才出来。', effects: { injury: 1 } },
      },
      {
        label: '把石壁上的字拓下来', cost: { items: [{ itemId: 'blank-codex', quantity: 1 }] },
        success: { text: '你把字一个个拓在册页上，带回去慢慢琢磨。', effects: { cultivation: 8, insight: 1 } },
      },
      { label: '不进去了', success: { text: '你记住洞口那棵歪脖子树，下山去了。' } },
    ],
  },
  {
    id: 'cliff-lingzhi', title: '崖上月魄叶',
    text: '崖壁半腰长着一丛月魄叶，风一吹，叶子翻出银白的背面。底下是深涧，看不见底。',
    when: { kinds: ['wild'], minDanger: 3, weight: 0.6 },
    choices: [
      {
        label: '攀过去采', check: { stat: 'power', difficulty: 6 },
        success: { text: '你贴着崖壁一点点挪过去，连根带土捧了回来。掐一片嚼了嚼，一股凉气直冲脑门。', effects: { items: [{ itemId: 'moonleaf', quantity: 2 }], cultivation: 6 } },
        failure: { text: '手一滑，你顺着崖壁溜了下去，幸好被一棵歪脖子松挂住了。', effects: { injury: 2 } },
      },
      { label: '算了', success: { text: '你趴在崖边看了一会儿，往回走了。' } },
    ],
  },
  {
    id: 'hurt-peddler', title: '遭劫的行商',
    text: '路边躺着个行商，额头上一道口子，货担散了一地。看样子刚遭了劫。',
    when: { kinds: ['wild', 'travel'], maxDanger: 3, weight: 1 },
    choices: [
      { label: '扶他去最近的镇子', success: { text: '进了镇子，行商摸出几块灵石塞给你：“这回要不是你，我就交代在那儿了。”', effects: { money: 10, reputation: 3, days: 1 } } },
      {
        label: '给他敷上草膏', cost: { items: [{ itemId: 'herb-paste', quantity: 1 }] },
        success: { text: '行商缓过劲来，从担子里抽出两匹布塞给你，说什么也要你收下。', effects: { items: [{ itemId: 'cloth-roll', quantity: 2 }], reputation: 2 } },
      },
      { label: '捡两匹布就走', success: { text: '你拎起两匹布就走，没回头。', effects: { items: [{ itemId: 'cloth-roll', quantity: 2 }], reputation: -3 } } },
    ],
  },
  {
    id: 'summer-storm', title: '山雨',
    text: '一场大雨劈头盖脸浇下来，山道转眼成了泥沟。',
    when: { kinds: ['wild', 'travel'], seasons: ['summer'], weight: 1 },
    choices: [
      { label: '找个岩洞躲雨', success: { text: '雨下了一整夜，第二天早上才停。', effects: { days: 1 } } },
      {
        label: '冒雨往前赶', check: { stat: 'power', difficulty: 3 },
        success: { text: '你浑身湿透，好在一路没摔跤。' },
        failure: { text: '到了地方你就发起热来，咳了好些天。', effects: { injury: 1 } },
      },
    ],
  },
  {
    id: 'snow-hare', title: '雪地兔踪',
    text: '雪地上一串新鲜的兔子脚印，一直通进灌木丛里。',
    when: { kinds: ['wild'], seasons: ['winter'], weight: 1.5 },
    choices: [
      {
        label: '顺着脚印追', check: { stat: 'power', difficulty: 3 },
        success: { text: '你扑了个满怀，按住一只肥兔子。卖了几块灵石，还混了碗热汤喝。', effects: { money: 6, hp: 15 } },
        failure: { text: '兔子钻进了洞。你在雪地里白冻了一天。', effects: { days: 1 } },
      },
      { label: '太冷了，回去', success: { text: '你把手揣进袖子，往回走了。' } },
    ],
  },
  {
    id: 'creek-elder', title: '溪边钓叟',
    text: '溪边坐着个白头发的老人在钓鱼，鱼篓里是空的。他头也不回：“后生，你这口气喘得乱。”',
    when: { kinds: ['wild'], weight: 0.5, once: true },
    choices: [
      {
        label: '请他指点', check: { stat: 'insight', difficulty: 4 },
        success: { text: '老人放下竿子，在你背上拍了三下，一股热气顺着脊梁往上走。你再抬头，溪边已经没人了，只剩竿子插在石缝里。', effects: { cultivation: 20, insight: 1 } },
        failure: { text: '老人摇摇头，不再搭理你。', effects: { cultivation: 2 } },
      },
      { label: '坐下陪他钓一会儿', success: { text: '两人一直坐到太阳落山，谁也没开口。老人收了竿，拎着空鱼篓走了。', effects: { cultivation: 6, days: 1 } } },
    ],
  },
]
