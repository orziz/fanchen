import type { LifeEventDef } from '@/types/life'

/** 做工、静坐、赶路时会碰上的事。 */
export const DAILY_EVENTS: LifeEventDef[] = [
  /* ─── 做工 ─── */
  {
    id: 'wage-cheat', title: '克扣工钱',
    text: '掌柜的把铜钱数了又数，只给了你一半：“活儿干得糙，就这些。”',
    when: { kinds: ['work'], weight: 1 },
    choices: [
      {
        label: '据理力争', check: { stat: 'charisma', difficulty: 3 },
        success: { text: '你把干了哪些活一样样说清，围观的人也帮腔，掌柜讪讪地补足了工钱。', effects: { money: 4 } },
        failure: { text: '掌柜叫来两个伙计，把你推出了门，连那一半也扣下了。', effects: { money: -3 } },
      },
      { label: '算了', success: { text: '你把钱揣好，心里记下了这家铺子。' } },
    ],
  },
  {
    id: 'kind-shopkeeper', title: '药铺掌柜',
    text: '药铺掌柜看你手脚勤快，留你吃了顿饭，问你愿不愿意替他去镇外收两天药。',
    when: { kinds: ['work'], weight: 1 },
    choices: [
      { label: '答应下来', success: { text: '你跑了两天，把药一担担挑回来，掌柜很是满意。', effects: { money: 12, standing: 2, days: 2 } } },
      { label: '婉言谢绝', success: { text: '掌柜也不勉强，又给你添了碗饭。', effects: { hp: 10 } } },
    ],
  },
  {
    id: 'street-bullies', title: '地痞收钱',
    text: '几个地痞把你堵在巷口：“在这条街上讨生活，得孝敬孝敬爷们。”',
    when: { kinds: ['work'], weight: 1 },
    choices: [
      { label: '给几文打发走', cost: { money: 5 }, success: { text: '他们掂着钱，吹着口哨走了。' } },
      {
        label: '跟他们动手',
        fight: { templateId: 'road-bandit', name: '街头地痞', danger: 1 },
        success: { text: '地痞们挨了揍，往后见了你都绕道走。街坊们看你的眼神也不一样了。', effects: { reputation: 3, standing: 2 } },
        failure: { text: '好汉难敌四手，你被打得鼻青脸肿，钱也被搜走了。', effects: { money: -8 } },
      },
      {
        label: '请乡里的长辈出面', check: { stat: 'charisma', difficulty: 4 },
        success: { text: '老里正拄着拐杖出来骂了几句，地痞们灰溜溜地散了。', effects: { standing: 1 } },
        failure: { text: '没人愿意管这闲事，你最后还是赔了钱。', effects: { money: -5 } },
      },
    ],
  },
  {
    id: 'storyteller', title: '茶棚说书',
    text: '茶棚里有人在说书，讲的是前朝一个樵夫进山遇仙、七日不归的故事。',
    when: { kinds: ['work'], weight: 0.8 },
    choices: [
      { label: '听完再走', success: { text: '你听得入了神，回去的路上心里一直在琢磨。', effects: { cultivation: 2 } } },
      { label: '赶着回去', success: { text: '你摇摇头，脚步不停。' } },
    ],
  },

  /* ─── 静坐 ─── */
  {
    id: 'sudden-insight', title: '气机一动',
    text: '坐到第五日夜里，你忽然觉得周身的气动了一下，像是哪扇门开了一道缝。',
    when: { kinds: ['meditate'], weight: 1 },
    choices: [
      {
        label: '顺着那一线气走下去', check: { stat: 'insight', difficulty: 5 },
        success: { text: '那道缝越开越大，天亮时你只觉浑身通透。', effects: { cultivation: 15 } },
        failure: { text: '气走到一半岔了，你胸口闷了好几天。', effects: { cultivation: -5 } },
      },
      { label: '稳住，不贪', success: { text: '你守住那一线气感，慢慢把它养稳了。', effects: { cultivation: 5 } } },
    ],
  },
  {
    id: 'inner-demon', title: '旧事扰心',
    text: '静坐时眼前总浮现出些旧事：饿肚子的冬天，被人赶出门的那个雨夜……',
    when: { kinds: ['meditate'], minRank: 1, weight: 0.7 },
    choices: [
      {
        label: '直面它们', check: { stat: 'insight', difficulty: 6 },
        success: { text: '你把那些旧事一件件看完，心里反倒放下了。', effects: { cultivation: 12, insight: 1 } },
        failure: { text: '心神一乱，气血翻涌，你呕出一口血来。', effects: { cultivation: -8, injury: 1 } },
      },
      { label: '起身走走，缓一缓', success: { text: '你出门走了一圈，回来时心里平静了些。' } },
    ],
  },
  {
    id: 'qi-tide', title: '灵潮',
    text: '这一夜灵气格外浓，像潮水一样从四面涌来。',
    when: { kinds: ['meditate'], weight: 0.6 },
    choices: [
      { label: '趁势多坐几日', success: { text: '你一连又坐了三日，把这一波灵潮尽数收下。', effects: { cultivation: 18, days: 3 } } },
      { label: '照常修行', success: { text: '你收了一些，余下的任它散去。', effects: { cultivation: 6 } } },
    ],
  },

  /* ─── 赶路 ─── */
  {
    id: 'caravan', title: '路遇商队',
    text: '路上遇到一支商队，领头的汉子问你愿不愿意帮着押一段货，管吃管住还给钱。',
    when: { kinds: ['travel'], weight: 1.2 },
    choices: [
      { label: '答应下来', success: { text: '你跟着商队走了一日，到地方时领头的爽快地结了钱。', effects: { money: 12, days: 1 } } },
      { label: '同行一段，听听各地的事', success: { text: '他们讲了许多各地的行情与传闻，你一一记下。', effects: { cultivation: 1 } } },
    ],
  },
  {
    id: 'ferry', title: '渡口',
    text: '渡口的船家见你是外乡人，开口就要十文。',
    when: { kinds: ['travel'], weight: 1 },
    choices: [
      { label: '照价付钱', cost: { money: 10 }, success: { text: '船稳稳当当地送你过了河。' } },
      {
        label: '讨价还价', check: { stat: 'charisma', difficulty: 3 },
        success: { text: '船家笑骂了你一句，只收了四文。', effects: { money: -4 } },
        failure: { text: '船家把竹篙一横，不理你了。你只好绕远路走旱道。', effects: { days: 1 } },
      },
    ],
  },
  {
    id: 'tea-stall', title: '路边茶摊',
    text: '路边茶摊的老婆婆给你舀了一碗热茶，说什么也不肯收钱。',
    when: { kinds: ['travel'], weight: 1 },
    choices: [
      { label: '谢过婆婆', success: { text: '一碗热茶下肚，浑身都暖了。', effects: { hp: 20 } } },
      { label: '悄悄在碗底压两文钱', cost: { money: 2 }, success: { text: '你走出老远，回头还看见婆婆在摊前朝你挥手。', effects: { hp: 20, reputation: 1 } } },
    ],
  },
  {
    id: 'wandering-swordsman', title: '背剑游侠',
    text: '一个背剑的游侠拦住你：“看你步子沉稳，可敢与我比划比划？”',
    when: { kinds: ['travel'], minRank: 1, weight: 0.8 },
    choices: [
      {
        label: '比划比划',
        fight: { templateId: 'road-bandit', name: '背剑游侠', powerMul: 1.1 },
        success: { text: '游侠收剑后退，哈哈一笑：“好身手！”说着抛给你一小块碎银。', effects: { reputation: 3, cultivation: 5, money: 8 } },
        failure: { text: '你输了一招，游侠扶你起来，指点了你几处破绽。', effects: { cultivation: 3 } },
      },
      { label: '拱手婉拒', success: { text: '游侠也不纠缠，大笑着走远了。' } },
    ],
  },
]
