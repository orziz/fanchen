import type { LifeEventDef } from '@/types/life'

/** 各地机缘接下之后的事；多数有期限，由机缘卡引出。 */
export const ERRAND_EVENTS: LifeEventDef[] = [
  {
    id: 'herb-order', title: '药铺收药',
    text: '药铺门口贴着告示：本旬收雾心草，一株十二文，比平日高出一截。',
    choices: [
      { label: '卖出三株', cost: { items: [{ itemId: 'mist-herb', quantity: 3 }] }, success: { text: '掌柜验过成色，爽快地数了钱。', effects: { money: 36, standing: 1 } } },
      { label: '卖出一株', cost: { items: [{ itemId: 'mist-herb', quantity: 1 }] }, success: { text: '掌柜收下药，顺手给你抓了把炒豆。', effects: { money: 12 } } },
      { label: '手里没药，下回再说', success: { text: '你记下了告示上的价钱。' } },
    ],
  },
  {
    id: 'escort-grain', title: '押送粮车',
    text: '乡社要往邻镇送一车粮，缺个押车的，说好了给二十五灵石。这几日路上不太平。',
    choices: [
      {
        label: '押车上路', check: { stat: 'power', difficulty: 4 },
        success: { text: '一路平安，粮车准时到了地方。乡社的人拍着你的肩说下回还找你。', effects: { money: 25, standing: 3 } },
        failure: { text: '走到半路，林子里窜出几个人来，把粮车团团围住……', next: 'escort-ambush' },
      },
      { label: '推说有事', success: { text: '乡社的人叹了口气，另找人去了。' } },
    ],
  },
  {
    id: 'escort-ambush', title: '粮车遇劫',
    text: '三个劫匪举着刀逼上来，赶车的老汉吓得钻到了车底下。',
    choices: [
      {
        label: '护住粮车',
        fight: { templateId: 'road-bandit', name: '劫粮匪', hpMul: 1.3 },
        success: { text: '劫匪被你打退，粮车一粒米都没少。乡社额外多给了你十灵石。', effects: { money: 35, standing: 5, reputation: 3 } },
        failure: { text: '你被打倒在地，粮车被劫走了大半。乡社的人没说什么，脸色却不好看。', effects: { standing: -2 } },
      },
      { label: '弃车逃走', success: { text: '你拉着老汉逃进了林子。粮没了，乡社那边也不好交代。', effects: { standing: -4 } } },
    ],
  },
  {
    id: 'beast-bounty', title: '悬赏除害',
    text: '猎社贴出悬赏：{location}附近有野兽伤人，除掉者赏三十灵石。',
    choices: [
      {
        label: '进山除害',
        fight: { hpMul: 1.25 },
        success: { text: '你拖着野兽的尸首回来，领到了赏钱，镇上人见了你都竖大拇指。', effects: { money: 30, reputation: 3, items: [{ itemId: 'beast-hide', quantity: 1 }] } },
        failure: { text: '那畜生太凶，你带着一身伤逃了回来。' },
      },
      { label: '量力而行，不接了', success: { text: '你把悬赏看了两遍，终究没揭。' } },
    ],
  },
  {
    id: 'wandering-daoist', title: '游方道人讲经',
    text: '茶馆里来了个游方道人，说要讲一段吐纳养气的功夫，听一回收五文。',
    choices: [
      {
        label: '付钱进去听', cost: { money: 5 }, check: { stat: 'insight', difficulty: 4 },
        success: { text: '道人讲得浅白，你却句句听进了心里。', effects: { cultivation: 10, insight: 1 } },
        failure: { text: '道人讲得太快，你只记住了一半。', effects: { cultivation: 3 } },
      },
      {
        label: '在窗外蹭听', check: { stat: 'insight', difficulty: 6 },
        success: { text: '隔着窗户，你竟也听明白了几分。', effects: { cultivation: 6 } },
        failure: { text: '外头太吵，只听见几句零碎的口诀。' },
      },
    ],
  },
  {
    id: 'autumn-harvest', title: '秋收帮工',
    text: '秋收抢晒，田里正缺人手，一天管两顿饭，干完还给工钱。',
    choices: [
      { label: '下田帮忙', success: { text: '你在田里忙了四天，晒得黝黑，筋骨却结实了些。', effects: { money: 16, standing: 3, power: 0.5, days: 4 } } },
      { label: '另有打算', success: { text: '你看了一眼金黄的田垄，转身走了。' } },
    ],
  },
  {
    id: 'summer-flood', title: '河堤告急',
    text: '连下了几天暴雨，河水漫过了堤脚，乡里正招人扛沙袋。',
    choices: [
      {
        label: '上堤扛沙袋', check: { stat: 'power', difficulty: 4 },
        success: { text: '你和乡亲们在堤上守了两天两夜，河堤总算保住了。', effects: { reputation: 4, standing: 4, money: 10, days: 2 } },
        failure: { text: '一个浪头打来，你被冲下堤坡，好在被人拽了上来。', effects: { reputation: 2, injury: 1, days: 2 } },
      },
      { label: '先顾自己', success: { text: '你收拾好东西，往高处去了。' } },
    ],
  },
  {
    id: 'temple-fair', title: '赶庙会',
    text: '镇上赶庙会，各路摊贩把街挤得水泄不通，吆喝声此起彼伏。',
    choices: [
      {
        label: '摆个摊帮人写信算账', check: { stat: 'charisma', difficulty: 3 },
        success: { text: '一天下来，找你写信的人排起了队。', effects: { money: 18, reputation: 1 } },
        failure: { text: '冷冷清清，只接了两单生意。', effects: { money: 4 } },
      },
      { label: '逛逛热闹', cost: { money: 5 }, success: { text: '你吃了碗羊汤，看了一场社戏，浑身都松快了。', effects: { hp: 30 } } },
    ],
  },
  {
    id: 'old-bookstall', title: '旧书摊',
    text: '街角的旧书摊上，摊主举着一本《养气入门诀》招呼：“正经的养气功课，一百二十灵石，不讲价！”',
    choices: [
      { label: '买下', cost: { money: 120 }, success: { text: '你把书揣进怀里，一路上摸了好几回。', effects: { items: [{ itemId: 'apprentice-manual', quantity: 1 }] } } },
      {
        label: '讲讲价', check: { stat: 'charisma', difficulty: 4 },
        success: { text: '摊主嘬着牙花子：“看你是真心要学……九十，不能再少了！”', next: 'old-bookstall-deal' },
        failure: { text: '摊主把书往怀里一揣：“不卖了！”', effects: { standing: -1 } },
      },
      { label: '翻两页就走', success: { text: '你翻了几页，默默记下了书名。' } },
    ],
  },
  {
    id: 'old-bookstall-deal', title: '旧书摊',
    text: '摊主把书推到你面前：“九十灵石，拿走。”',
    choices: [
      { label: '成交', cost: { money: 90 }, success: { text: '你付了钱，把书小心包好。', effects: { items: [{ itemId: 'apprentice-manual', quantity: 1 }] } } },
      { label: '还是买不起', success: { text: '摊主摆摆手：“攒够了钱再来。”' } },
    ],
  },
  {
    id: 'npc-errand', title: '熟人托事',
    text: '{npc}托你帮个忙：要两株雾心草入药，说好了给你十五灵石。',
    choices: [
      { label: '把手里的雾心草给他', cost: { items: [{ itemId: 'mist-herb', quantity: 2 }] }, success: { text: '{npc}接过药，连声道谢。', effects: { money: 15, affinity: 6 } } },
      { label: '答应下来去采', success: { text: '你跑了两天，把药交到了{npc}手里。', effects: { money: 15, affinity: 5, days: 2 } } },
      { label: '推说没空', success: { text: '{npc}笑了笑，没再说什么。', effects: { affinity: -2 } } },
    ],
  },
  {
    id: 'jadegate-herb-garden', title: '行院药圃',
    text: '行院药圃里的灵草遭了虫害，管事的师兄急得团团转，正招人帮忙捉虫、翻土。',
    choices: [
      {
        label: '细细地捉', check: { stat: 'insight', difficulty: 5 },
        success: { text: '你分得清哪片叶子背后藏着虫卵，三天下来药圃焕然一新。师兄记下了你的名字。', effects: { money: 10, standing: 4, days: 2 } },
        failure: { text: '你误拔了两株灵草，师兄心疼得直咂嘴，工钱倒还是给了。', effects: { money: 6, standing: 1, days: 2 } },
      },
      { label: '只帮着翻土', success: { text: '粗活干了一身汗，师兄点了点头。', effects: { money: 6, standing: 2, days: 2 } } },
    ],
  },
  {
    id: 'jadegate-escort-furnace', title: '护送丹炉',
    text: '行院从山下铸坊订的一尊丹炉要运上山，外务执事缺个护送的人，山路上常有野兽出没。',
    choices: [
      {
        label: '护着丹炉上山',
        fight: { danger: 3 },
        success: { text: '你把扑上来的野兽打退，丹炉安安稳稳进了山门。执事难得露出了笑模样。', effects: { money: 18, standing: 6 } },
        failure: { text: '丹炉磕掉了一只耳，执事叹了口气，说下回小心。', effects: { standing: 1 } },
      },
      { label: '推说力气不够', success: { text: '执事摆摆手，另找人去了。' } },
    ],
  },
  {
    id: 'jadegate-errand', title: '行院外务',
    text: '玉阙行院的外务执事在找人跑腿：往山下送一封信，顺道采些药回来。',
    choices: [
      {
        label: '接下差事', check: { stat: 'power', difficulty: 6 },
        success: { text: '你一路小跑送到了信，采回的药也挑不出毛病。执事记下了你的名字。', effects: { money: 15, standing: 4 } },
        failure: { text: '山路难走，你晚了一日才回，执事皱了皱眉，还是收下了药。', effects: { money: 8, standing: 2, days: 1 } },
      },
      { label: '不接', success: { text: '执事点点头，另找人去了。' } },
    ],
  },
]
