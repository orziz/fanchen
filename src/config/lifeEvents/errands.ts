import type { LifeEventDef } from '@/types/life'

/** 各地机缘接下之后的事；多数有期限，由机缘卡引出。 */
export const ERRAND_EVENTS: LifeEventDef[] = [
  {
    id: 'herb-order', title: '药铺收药',
    text: '药铺门口贴了张告示：本旬收雾心草，一株十二灵石，比平日高出一截。',
    choices: [
      { label: '卖三株', cost: { items: [{ itemId: 'mist-herb', quantity: 3 }] }, success: { text: '掌柜捏着草根看了看成色，把钱数给了你。', effects: { money: 36, standing: 1 } } },
      { label: '卖一株', cost: { items: [{ itemId: 'mist-herb', quantity: 1 }] }, success: { text: '掌柜收下药，顺手抓了把炒豆给你。', effects: { money: 12 } } },
      { label: '手里没药，下回再说', success: { text: '你把告示又看了一遍，走了。' } },
    ],
  },
  {
    id: 'escort-grain', title: '押送粮车',
    text: '乡社要往邻镇送一车粮，缺个押车的，说好给二十五灵石。这几天路上不太平。',
    choices: [
      {
        label: '押车上路', check: { stat: 'power', difficulty: 4 },
        success: { text: '一路太平，粮车按时到了。乡社的周管事拍着你的肩膀：“下回还找你。”', effects: { money: 25, standing: 3 } },
        failure: { text: '走到半路，林子里窜出几个人来，把粮车围住了……', next: 'escort-ambush' },
      },
      { label: '推说有事', success: { text: '乡社的人叹了口气，去别家问了。' } },
    ],
  },
  {
    id: 'escort-ambush', title: '粮车遇劫',
    text: '三个人举着刀逼上来。赶车的老汉吓得钻到了车底下。',
    choices: [
      {
        label: '护住粮车',
        fight: { templateId: 'road-bandit', name: '劫粮匪', hpMul: 1.3 },
        success: { text: '劫匪被你打跑了，粮车一粒米也没少。乡社多给了你十灵石。', effects: { money: 35, standing: 5, reputation: 3 } },
        failure: { text: '你被打倒在地，车上的粮袋叫人搬走了大半。乡社的人没说什么，脸色很难看。', effects: { standing: -2 } },
      },
      { label: '弃车逃走', success: { text: '你拽着老汉钻进林子。粮是保不住了，回去还不知道怎么跟乡社交代。', effects: { standing: -4 } } },
    ],
  },
  {
    id: 'beast-bounty', title: '悬赏除害',
    text: '猎社贴了张悬赏：{location}附近有头畜生夜里下山，咬死了两头猪，还伤了人。谁除掉它，赏三十灵石。',
    choices: [
      {
        label: '进山除害',
        fight: { hpMul: 1.25 },
        success: { text: '你拖着那畜生回来领了赏。猎社把兽头挂在门口，逢人就说是你打的。', effects: { money: 30, reputation: 3, items: [{ itemId: 'beast-hide', quantity: 1 }] } },
        failure: { text: '那畜生太凶，你带着一身伤逃了回来。' },
      },
      { label: '这活接不了', success: { text: '你把悬赏看了两遍，没揭。' } },
    ],
  },
  {
    id: 'wandering-daoist', title: '游方道人讲经',
    text: '茶馆里来了个游方道人，说要讲一段吐纳养气的法子，听一回五灵石。',
    choices: [
      {
        label: '付钱进去听', cost: { money: 5 }, check: { stat: 'insight', difficulty: 4 },
        success: { text: '道人讲得浅，说的都是怎么喘气、怎么坐。你照着试了试，小腹里真暖了一下。', effects: { cultivation: 10, insight: 1 } },
        failure: { text: '道人一口外乡话，你听懂一半，记下的更少。', effects: { cultivation: 3 } },
      },
      {
        label: '在窗外蹭听', check: { stat: 'insight', difficulty: 6 },
        success: { text: '隔着窗户，你竟也听明白了几句。', effects: { cultivation: 6 } },
        failure: { text: '外头太吵，只听见几句零碎的口诀。' },
      },
    ],
  },
  {
    id: 'autumn-harvest', title: '秋收帮工',
    text: '秋收抢晒，田里正缺人手。一天管两顿饭，干完还给工钱。',
    choices: [
      { label: '下田帮忙', success: { text: '四天下来，你晒脱了一层皮，连挑两趟谷子上坡也不喘了。', effects: { money: 16, standing: 3, power: 0.5, days: 4 } } },
      { label: '另有打算', success: { text: '田埂上的管事冲你背影嘟囔了一句“懒骨头”。' } },
    ],
  },
  {
    id: 'summer-flood', title: '河堤告急',
    text: '连下了几天暴雨，河水漫过了堤脚。里正敲着锣满村喊人去扛沙袋。',
    choices: [
      {
        label: '上堤扛沙袋', check: { stat: 'power', difficulty: 4 },
        success: { text: '你和乡亲们在堤上守了两天两夜，堤总算没垮。', effects: { reputation: 4, standing: 4, money: 10, days: 2 } },
        failure: { text: '一个浪头打过来，你被冲下了堤坡，好在有人一把拽住了你。', effects: { reputation: 2, injury: 1, days: 2 } },
      },
      { label: '先顾自己', success: { text: '你收拾好东西，往高处去了。' } },
    ],
  },
  {
    id: 'temple-fair', title: '赶庙会',
    text: '镇上赶庙会。卖糖人的、耍猴的、算命的，把一条街挤得插不进脚。',
    choices: [
      {
        label: '摆摊替人写信算账', check: { stat: 'charisma', difficulty: 3 },
        success: { text: '一天下来，找你写信的人排起了长队。', effects: { money: 18, reputation: 1 } },
        failure: { text: '摊前冷冷清清，一天只接了两单。', effects: { money: 4 } },
      },
      { label: '逛逛', cost: { money: 5 }, success: { text: '你喝了碗羊汤，挤在人堆里看了一出社戏。', effects: { hp: 30 } } },
    ],
  },
  {
    id: 'old-bookstall', title: '旧书摊',
    text: '街角的旧书摊上，摊主举着一本《养气入门诀》冲你招手：“正经的养气功夫，一百二十灵石，不讲价！”',
    choices: [
      { label: '买下', cost: { money: 120 }, success: { text: '你把书揣进怀里，一路上隔着衣裳摸了好几回。', effects: { items: [{ itemId: 'apprentice-manual', quantity: 1 }] } } },
      {
        label: '讲讲价', check: { stat: 'charisma', difficulty: 4 },
        success: { text: '摊主嘬着牙花子：“看你是真想学……九十，不能再少了。”', next: 'old-bookstall-deal' },
        failure: { text: '摊主把书往怀里一揣：“不卖了！”', effects: { standing: -1 } },
      },
      { label: '翻两页就走', success: { text: '你翻了两页，摊主咳了一声，你只好放下了。' } },
    ],
  },
  {
    id: 'old-bookstall-deal', title: '旧书摊',
    text: '摊主把书推到你面前：“九十，拿走。”',
    choices: [
      { label: '成交', cost: { money: 90 }, success: { text: '你数了钱，把书用布包了两层。', effects: { items: [{ itemId: 'apprentice-manual', quantity: 1 }] } } },
      { label: '还是买不起', success: { text: '摊主摆摆手：“攒够了再来。”' } },
    ],
  },
  {
    id: 'npc-errand', title: '熟人托事',
    text: '{npc}想托你帮个忙：要两株雾心草入药，给你十五灵石。',
    choices: [
      { label: '把雾心草拿给{npc}', cost: { items: [{ itemId: 'mist-herb', quantity: 2 }] }, success: { text: '{npc}接过药，连声道谢。', effects: { money: 15, affinity: 6 } } },
      { label: '答应下来去采', success: { text: '你跑了两天，把药交到了{npc}手里。', effects: { money: 15, affinity: 5, days: 2 } } },
      { label: '推说没空', success: { text: '{npc}笑了笑，没再说什么。', effects: { affinity: -2 } } },
    ],
  },
  {
    id: 'jadegate-herb-garden', title: '行院药圃',
    text: '行院药圃里的灵草生了虫。管药圃的师兄急得团团转，正招人捉虫翻土。',
    choices: [
      {
        label: '翻开叶子捉虫', check: { stat: 'insight', difficulty: 5 },
        success: { text: '你翻着叶子背面一片片找虫卵。两天下来，药圃干干净净，师兄问了你的名字。', effects: { money: 10, standing: 4, days: 2 } },
        failure: { text: '你翻叶子时手重，折断了两株灵草的嫩茎。师兄心疼得直咂嘴，工钱还是给了。', effects: { money: 6, standing: 1, days: 2 } },
      },
      { label: '只帮着翻土', success: { text: '粗活干了两天，出了一身汗。师兄拍了拍你肩上的土。', effects: { money: 6, standing: 2, days: 2 } } },
    ],
  },
  {
    id: 'jadegate-escort-furnace', title: '护送丹炉',
    text: '行院从山下铸坊订了一尊丹炉，要运上山。外务执事缺个护送的人，山道上常有野兽。',
    choices: [
      {
        label: '护着丹炉上山',
        fight: { danger: 3 },
        success: { text: '你把扑上来的野兽打退，丹炉稳稳当当进了山门。执事难得笑了一下。', effects: { money: 18, standing: 6 } },
        failure: { text: '丹炉磕掉了一只耳朵。执事叹了口气：“下回小心。”', effects: { standing: 1 } },
      },
      { label: '推说力气不够', success: { text: '执事“嗯”了一声，转头问别人去了。' } },
    ],
  },
  {
    id: 'jadegate-errand', title: '行院外务',
    text: '玉阙行院的外务执事在找人跑腿：往山下送封信，回来顺道采些药。',
    choices: [
      {
        label: '接下差事', check: { stat: 'power', difficulty: 6 },
        success: { text: '你一路小跑把信送到，采回来的药也挑不出毛病。执事在簿子上给你记了一笔。', effects: { money: 15, standing: 4 } },
        failure: { text: '山路难走，你晚了一天才回来。执事皱了皱眉，还是收下了药。', effects: { money: 8, standing: 2, days: 1 } },
      },
      { label: '不接', success: { text: '执事也不多话，喊了下一个。' } },
    ],
  },
]
