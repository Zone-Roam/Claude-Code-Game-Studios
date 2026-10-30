// PROTOTYPE - NOT FOR PRODUCTION
// Hypothesis: 正式版前 10 回敌将回目的数值（步数、血量、牌组）在不同连错率下胜率合理
// Date: 2026-10-30

// The release's boss chapters 2, 3, 5, 9, 10, copied from design/gdd/chapter-design.md rule 13 (user-approved
// 2026-10-30). Only the fields the rules read are kept (no texts, preview, unlock, failHint).
// need: not written in rule 13 for any of these, so every general uses his default (rule 9).

export const CHAPTERS = [
  // 2026-10-30: press / food chapters 1, 4, 6, 7, 8 (rule 13). cols 5 like the boss chapters.
  {
    id: 'ch01', no: '第一回', title: '斩黄巾英雄首立功', mode: 'press', rows: 8, cols: 5,
    deck: { dao: 6, qi: 6, jiu: 4, gu: 4 }, // 20 = startRows 4 × 5
    press: { startRows: 4, waves: 6, interval: 12000 }, // was 10000
    slots: 1, lead: 'guan_yu', recommend: ['guan_yu'],
  },
  {
    id: 'ch04', no: '第四回', title: '陶恭祖三让徐州', mode: 'food', rows: 6, cols: 5,
    deck: { qi: 8, dao: 6, gu: 6, dun: 6, ying: 6, jiu: 4 }, // 36, 6 buried; food0 = 18 − 0 + 3 = 21
    food: { slack: 3 },
    slots: 2, lead: 'liu_bei', recommend: ['liu_bei', 'guan_yu'],
  },
  {
    id: 'ch06', no: '第六回', title: '关云长过五关斩将', mode: 'press', rows: 8, cols: 5,
    deck: { dao: 6, gu: 6, dun: 6, qi: 2 }, // 20
    press: {
      startRows: 4, waves: 8, interval: 12000, // was 8000
      waveList: [
        ['qi', 'dao', null, 'dao', 'qi'],
        ['gu', 'jiu', 'jiu', null, 'gu'],
        ['dun', 'ying', 'jm', 'dun', 'ying'],
        [null, 'gong', 'dao', 'gong', 'dao'],
        ['jiu', 'gu', 'jm', 'gu', 'jiu'],
        ['dun', 'qi', 'qi', 'dun', null],
        ['ying', 'jm', 'dao', 'ying', 'dao'],
        ['gu', 'gong', null, 'gong', 'gu'],
      ],
    },
    slots: 3, lead: 'guan_yu', recommend: ['guan_yu', 'zhang_fei', 'zhao_yun'],
  },
  {
    id: 'ch07', no: '第七回', title: '博望坡军师初用兵', mode: 'food', rows: 7, cols: 5,
    deck: { huo: 2, ying: 10, shu: 8, dao: 6, gu: 6, jiu: 8, qi: 4 }, // 44, 9 buried; food0 = 22 − 5 + 2 = 19
    food: { slack: 2 },
    slots: 3, lead: 'zhuge_liang', recommend: ['zhuge_liang', 'guan_yu', 'zhang_fei'],
  },
  {
    id: 'ch08', no: '第八回', title: '赵子龙单骑救主', mode: 'press', rows: 8, cols: 5,
    deck: { ma: 2, gong: 2, dun: 6, gu: 6, dao: 4 }, // 20
    pool: { gong: 3, ma: 1, dao: 1, gu: 1, dun: 1, qi: 1, jiu: 2, ying: 1 },
    press: { startRows: 4, waves: 10, interval: 12000 }, // was 7000
    slots: 3, lead: 'zhao_yun', recommend: ['zhao_yun', 'zhang_fei', 'guan_yu'],
  },
  {
    id: 'ch02', no: '第二回', title: '虎牢关三英战吕布', mode: 'boss', rows: 6, cols: 5,
    deck: { gu: 8, dao: 6, qi: 6, ying: 6, jiu: 4 }, // 30, 0 buried
    boss: { enemy: 'lv_bu', hp: 15, steps: 8, hearts: 3, addPairs: 2 },
    slots: 2, lead: 'zhang_fei', recommend: ['zhang_fei', 'guan_yu'],
  },
  {
    id: 'ch03', no: '第三回', title: '赵子龙磐河大战', mode: 'boss', rows: 6, cols: 5,
    deck: { dun: 8, dao: 6, gu: 6, qi: 8, jiu: 6, ying: 6 }, // 40, 10 buried
    boss: { enemy: 'wen_chou', hp: 18, steps: 8, hearts: 3, addPairs: 2 },
    slots: 2, lead: 'zhao_yun', recommend: ['zhao_yun', 'guan_yu'],
  },
  {
    id: 'ch05', no: '第五回', title: '白门楼吕布殒命', mode: 'boss', rows: 6, cols: 5,
    deck: { gu: 8, dao: 6, dun: 6, qi: 6, jiu: 6, ying: 6, gong: 6 }, // 44, 14 buried
    boss: {
      enemy: 'lv_bu', hp: 12, steps: 6, hearts: 3, addPairs: 2,
      phase2: { hp: 18, steps: 5, name: '暴怒吕布', shout: '吕布暴怒！', lines: ['方天画戟在此！', '挡我者死！'] },
    },
    slots: 3, lead: 'zhang_fei', recommend: ['zhang_fei', 'guan_yu', 'zhao_yun'],
  },
  {
    id: 'ch09', no: '第九回', title: '七星坛诸葛祭风', mode: 'boss', rows: 7, cols: 5,
    deck: { huo: 2, ying: 10, shu: 8, dao: 6, dun: 6, gong: 6, qi: 6, jiu: 8 }, // 52, 17 buried
    pool: { ying: 3, huo: 1, shu: 1, dao: 1, dun: 1, gong: 1, qi: 1, jiu: 1 },
    boss: {
      enemy: 'cao_cao', hp: 14, steps: 7, hearts: 3, addPairs: 2,
      phase2: { hp: 24, steps: 6, name: '横槊曹操', shout: '铁索连舟！', lines: ['连环船稳如平地！'], specials: ['chain'] },
    },
    slots: 3, lead: 'zhuge_liang', recommend: ['zhuge_liang', 'guan_yu', 'zhao_yun'],
  },
  {
    id: 'ch10', no: '第十回', title: '定军山黄忠斩夏侯', mode: 'boss', rows: 7, cols: 5,
    deck: { gong: 8, ma: 2, shu: 8, dun: 6, huo: 2, ying: 8, dao: 6, qi: 6, jiu: 6, gu: 4 }, // 56, 21 buried
    // "弓 2、营 2，其余各 1（不含火、马）": 其余 = the other deck kinds
    pool: { gong: 2, ying: 2, shu: 1, dun: 1, dao: 1, qi: 1, jiu: 1, gu: 1 },
    boss: {
      enemy: 'xiahou_yuan', hp: 16, steps: 7, hearts: 3, addPairs: 2, // was 6 / 5, 16 + 24 (26% at miss 0.2)
      phase2: { hp: 18, steps: 6, name: '虎步夏侯渊', shout: '虎步关右！', lines: ['老卒焉敢犯我！'], specials: ['charge', 'roar'] },
    },
    slots: 3, lead: 'huang_zhong', recommend: ['huang_zhong', 'zhuge_liang', 'zhao_yun'],
  },
];

export const ENEMIES = {
  lv_bu: { name: '吕布', lines: ['人中吕布！', '谁敢挡我！'] },
  wen_chou: { name: '文丑', lines: ['河北文丑在此！'] },
  cao_cao: { name: '曹操', lines: ['宁我负人！'] },
  xiahou_yuan: { name: '夏侯渊', lines: ['看我神射！'], specialNames: { charge: '布鹿角' } },
};
