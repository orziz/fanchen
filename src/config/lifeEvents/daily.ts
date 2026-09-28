import type { LifeEventDef } from '@/types/life'

/** 做工、静坐、赶路时会碰上的事。 */
export const DAILY_EVENTS: LifeEventDef[] = [
  /* ─── 做工 ─── */
  {
    id: 'wage-cheat', title: '克扣工钱',
    text: '掌柜把工钱数了两遍，只给了你一半：“活干得糙，就这些。”',
    when: { kinds: ['work'], weight: 1 },
    choices: [
      {
        label: '跟他理论', check: { stat: 'charisma', difficulty: 3 },
        success: { text: '你把干了哪些活一样样数出来，旁边看热闹的也帮腔。掌柜脸上挂不住，把钱补齐了。', effects: { money: 4 } },
        failure: { text: '掌柜喊来两个伙计，把你推出了门，那一半也没给。', effects: { money: -3 } },
      },
      { label: '算了', success: { text: '你把钱揣进怀里走了。这家铺子，下回不来了。' } },
    ],
  },
  {
    id: 'kind-shopkeeper', title: '药铺掌柜',
    text: '药铺的孙掌柜看你手脚勤快，留你吃了顿饭，问你愿不愿意替他去镇外收两天药。',
    when: { kinds: ['work'], weight: 1 },
    choices: [
      { label: '答应下来', success: { text: '你跑了两天，一担一担把药挑回来。孙掌柜翻了翻成色，说下回还找你。', effects: { money: 12, standing: 2, days: 2 } } },
      { label: '这回就不去了', success: { text: '孙掌柜也不勉强，又给你盛了碗饭。', effects: { hp: 10 } } },
    ],
  },
  {
    id: 'street-bullies', title: '地痞收钱',
    text: '三个地痞把你堵在巷子口：“在这条街上讨饭吃，不懂规矩？”',
    when: { kinds: ['work'], weight: 1 },
    choices: [
      { label: '给几块灵石打发走', cost: { money: 5 }, success: { text: '他们掂了掂钱，吹着口哨走了。' } },
      {
        label: '跟他们动手',
        fight: { templateId: 'road-bandit', name: '街头地痞', danger: 1 },
        success: { text: '几个地痞挨了揍，往后在街上见了你都绕着走。第二天，卖菜的王婶多塞了你两根葱。', effects: { reputation: 3, standing: 2 } },
        failure: { text: '双拳难敌四手，你被打得鼻青脸肿，钱也被搜走了。', effects: { money: -8 } },
      },
      {
        label: '请老里正出面', check: { stat: 'charisma', difficulty: 4 },
        success: { text: '老里正拄着拐杖出来骂了几句，地痞们灰溜溜地散了。', effects: { standing: 1 } },
        failure: { text: '老里正家的门关着，敲了半天没人应。你最后还是掏了钱。', effects: { money: -5 } },
      },
    ],
  },
  {
    id: 'storyteller', title: '茶棚说书',
    text: '茶棚里有人说书，说的是前朝有个樵夫进山砍柴，碰上两个老头下棋。他站着看完一局，斧子柄都烂了。',
    when: { kinds: ['work'], weight: 0.8 },
    choices: [
      { label: '听完再走', success: { text: '散场时天都黑了。你一路上都在想，那樵夫回到家，还有没有人认得他。', effects: { cultivation: 2 } } },
      { label: '赶着回去', success: { text: '你听了两句，没停脚。' } },
    ],
  },

  /* ─── 静坐 ─── */
  {
    id: 'sudden-insight', title: '气机一动',
    text: '坐到第五天夜里，你忽然觉得身上的气动了一下，像是有扇门开了条缝。',
    when: { kinds: ['meditate'], weight: 1 },
    choices: [
      {
        label: '顺着那口气往下走', check: { stat: 'insight', difficulty: 5 },
        success: { text: '那条缝越开越大。天亮时你出了一身透汗，身上却轻得很。', effects: { cultivation: 15 } },
        failure: { text: '走到一半，气岔了。你胸口闷了好几天。', effects: { cultivation: -5 } },
      },
      { label: '稳住，不贪', success: { text: '你没去追它，守着那一点气感，一直坐到天亮。', effects: { cultivation: 5 } } },
    ],
  },
  {
    id: 'inner-demon', title: '旧事扰心',
    text: '一闭眼，旧事就往外冒：饿肚子的那个冬天，被人赶出门的那个雨夜……',
    when: { kinds: ['meditate'], minRank: 1, weight: 0.7 },
    choices: [
      {
        label: '不躲，由它去', check: { stat: 'insight', difficulty: 6 },
        success: { text: '你没躲，由着那些事一件件过去。天亮时再想起那个雨夜，胸口已经不发紧了。', effects: { cultivation: 12, insight: 1 } },
        failure: { text: '心一乱，气血往上翻，你吐出一口血来。', effects: { cultivation: -8, injury: 1 } },
      },
      { label: '起来走走', success: { text: '你起身在院子里走了几圈，打桶井水洗了把脸。' } },
    ],
  },
  {
    id: 'qi-tide', title: '灵潮',
    text: '这一夜的灵气浓得出奇，一阵一阵往身上涌。',
    when: { kinds: ['meditate'], weight: 0.6 },
    choices: [
      { label: '趁势多坐几天', success: { text: '你一连又坐了三天，直到那股劲儿退了才起身。', effects: { cultivation: 18, days: 3 } } },
      { label: '照常收功', success: { text: '你到了平日的时辰就收了功，余下的由它散了。', effects: { cultivation: 6 } } },
    ],
  },

  /* ─── 赶路 ─── */
  {
    id: 'caravan', title: '路遇商队',
    text: '路上碰见一支商队。领头的汉子问你肯不肯帮着押一段货，管饭，到了地方给钱。',
    when: { kinds: ['travel'], weight: 1.2 },
    choices: [
      { label: '答应下来', success: { text: '你跟着商队走了一天。到了地方，领头的数钱倒是爽快。', effects: { money: 12, days: 1 } } },
      {
        label: '跟着走一段，听他们闲聊',
        success: { text: '伙计们一路上说些哪里米贵、哪条路不太平的闲话。有个老伙计问你往哪儿去，听你说完，咂了咂嘴：', hook: 'goalTip' },
      },
    ],
  },
  {
    id: 'ferry', title: '渡口',
    text: '渡口的船家见你是外乡人，开口就要十块灵石。',
    when: { kinds: ['travel'], weight: 1 },
    choices: [
      { label: '照价给', cost: { money: 10 }, success: { text: '船家一篙撑开，稳稳当当把你送过了河。' } },
      {
        label: '讲讲价', check: { stat: 'charisma', difficulty: 3 },
        success: { text: '船家笑骂了你一句，收了四块。', effects: { money: -4 } },
        failure: { text: '船家把竹篙往船头一横，不理你了。你只好绕远路走旱道。', effects: { days: 1 } },
      },
    ],
  },
  {
    id: 'tea-stall', title: '路边茶摊',
    text: '路边茶摊的老婆婆给你舀了碗热茶，说什么也不肯收钱：“出门在外，谁没个难处。”',
    when: { kinds: ['travel'], weight: 1 },
    choices: [
      { label: '谢过婆婆', success: { text: '一碗热茶下肚，身上暖和过来了。', effects: { hp: 20 } } },
      { label: '走时在碗底压两块灵石', cost: { money: 2 }, success: { text: '走出老远，你回头一看，婆婆正端着碗冲你这边嚷嚷。', effects: { hp: 20, reputation: 1 } } },
    ],
  },
  {
    id: 'wandering-swordsman', title: '背剑游侠',
    text: '一个背剑的游侠把你拦住，上下打量了一番：“步子挺稳，练过？来，比划两下。”',
    when: { kinds: ['travel'], minRank: 1, weight: 0.8 },
    choices: [
      {
        label: '比划两下',
        fight: { templateId: 'road-bandit', name: '背剑游侠', powerMul: 1.1 },
        success: { text: '游侠收剑往后一跳，哈哈一笑：“行啊你！”抛给你一小块灵石当彩头。', effects: { reputation: 3, cultivation: 5, money: 8 } },
        failure: { text: '你输了一招。游侠把你拉起来，拿剑鞘点了点你的肋下和膝弯：“这两处，空得很。”', effects: { cultivation: 3 } },
      },
      { label: '拱手推了', success: { text: '游侠撇撇嘴：“没劲。”背着剑走了。' } },
    ],
  },
]
