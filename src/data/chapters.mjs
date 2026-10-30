// Chapter data for the release book, chapters 1-10 (design/gdd/chapter-design.md
// rules 1-5 and 13; user-approved 2026-10-30). Only `export const` data: no logic.
// Unit kind ids are UNIT_KINDS in src/core/constants.mjs:
// 鼓 gu, 刀 dao, 盾 dun, 旗 qi, 酒 jiu, 营 ying, 弓 gong, 火 huo, 马 ma, 水 shui, 城 cheng, 书 shu.
// General ids are design/gdd/general-skills.md rule 1. Validated at start-up by
// src/rules/chapter-loader.mjs (rule 6); every value here is a tuning knob.

/** Generals the player owns from the start (rule 1, user decision 2026-10-30). */
export const STARTERS = Object.freeze(['guan_yu']);

/** Enemy table (rule 3). `specialNames` overrides the default special display names. */
export const ENEMIES = Object.freeze({
  lv_bu: { name: '吕布', lines: ['人中吕布！', '谁敢挡我！'] },
  wen_chou: { name: '文丑', lines: ['河北文丑在此！', '公孙瓒休走！'] },
  cao_cao: { name: '曹操', lines: ['八十三万大军！', '对酒当歌！'], specialNames: { chain: '铁索连环' } },
  xiahou_yuan: { name: '夏侯渊', lines: ['吾乃夏侯妙才！', '三日行五百！'], specialNames: { charge: '布鹿角' } },
});

/**
 * Shared texts (rule 4). Braces are filled by the UI at display time with the
 * effective (post-`slow`) values; the rules layer never formats them.
 */
export const TEXTS = Object.freeze({
  ruleLine: {
    press: '敌军每 {interval} 秒压下一排，最下一排有兵时再压就破城',
    food: '每消一对耗一份粮，连不上也扣，粮尽就输',
    boss: '{enemy}走满 {steps} 步就出手，{hearts} 颗心没了就输',
  },
  effectLine: {
    huo: '火烧连营：消一对火，烧掉所有营',
    ma: '铁骑冲阵：消一对马，冲散所有弓',
    shui: '水淹七军：消一对水，冲垮所有城',
  },
  failHint: {
    破城: '最下一排快满时，试试关羽',
    粮草断绝: '营、弓、城别手动消，留给火、马、水',
    城破: '连着消、不连错，{COMBO_THRESHOLD} 连斩起能让{enemy}退步',
  },
  /** Settle-card preview: next loadable chapter, or the last-chapter line (rule 2 `preview`). */
  previewNext: '下回：{title}',
  previewLast: '全书未完，下回分解',
  /** Error page when every chapter is refused (Edge Cases). */
  errorPage: '戏本出错，请稍后再来',
  /** Skill line per general and mode (rule 4; wording owned by general-skills rule 18). */
  skillLine: {
    guan_yu: { boss: '点选一排，整排斩掉', press: '点选一排，整排斩掉', food: '点选一排，整排斩掉' },
    zhang_fei: { boss: '敌将退三步，三步不涨', press: '底排有兵时，吓退一次', food: '抢回三份粮' },
    zhao_yun: { boss: '挡下敌将下一招', press: '下一对同种兵必消', food: '下一对同种兵必消' },
    zhuge_liang: { boss: '清最多的兵，破下一个特技', press: '清掉最多的那种兵', food: '清掉最多的那种兵' },
    liu_bei: { boss: '补一颗心，众将各蓄一格', press: '众将各蓄一格', food: '补两份粮，众将各蓄一格' },
    huang_zhong: { boss: '点选一列，整列射穿', press: '点选一列，整列射穿', food: '点选一列，整列射穿' },
  },
});

/**
 * The book in catalog order (rule 13). All chapters use 5 columns.
 * `stackDepth` (boss / food only; press buries nothing): most face-down cards
 * under one cell. User decision 2026-10-30 "往后逐步加深": chapters 1-4 at most
 * 1, 5-7 at most 2, 8-10 at most 3; the ch05, ch07, ch09, ch10 decks grew with
 * it (prototypes/chapter-balance-sim/stackdepth-results.md).
 */
export const CHAPTERS = Object.freeze([
  {
    id: 'ch01', no: '第一回', title: '斩黄巾英雄首立功', mode: 'press', rows: 8, cols: 5,
    deck: { dao: 6, qi: 6, jiu: 4, gu: 4 },
    press: { startRows: 4, waves: 6, interval: 12000 },
    slots: 1, lead: 'guan_yu', recommend: ['guan_yu'], unlock: 'zhang_fei', foe: '黄巾军',
  },
  {
    id: 'ch02', no: '第二回', title: '虎牢关三英战吕布', mode: 'boss', rows: 6, cols: 5,
    stackDepth: 1, deck: { gu: 8, dao: 6, qi: 6, ying: 6, jiu: 4 },
    boss: { enemy: 'lv_bu', hp: 15, steps: 8, hearts: 3, addPairs: 2 },
    slots: 2, lead: 'zhang_fei', recommend: ['zhang_fei', 'guan_yu'],
  },
  {
    id: 'ch03', no: '第三回', title: '赵子龙磐河大战', mode: 'boss', rows: 6, cols: 5,
    stackDepth: 1, deck: { dun: 8, dao: 6, gu: 6, qi: 8, jiu: 6, ying: 6 },
    boss: { enemy: 'wen_chou', hp: 18, steps: 8, hearts: 3, addPairs: 2 },
    slots: 2, lead: 'zhao_yun', recommend: ['zhao_yun', 'guan_yu'], unlock: 'zhao_yun',
  },
  {
    id: 'ch04', no: '第四回', title: '陶恭祖三让徐州', mode: 'food', rows: 6, cols: 5,
    stackDepth: 1, deck: { qi: 8, dao: 6, gu: 6, dun: 6, ying: 6, jiu: 4 },
    food: { slack: 3 },
    slots: 2, lead: 'liu_bei', recommend: ['liu_bei', 'guan_yu'], unlock: 'liu_bei', foe: '曹军（攻徐州）',
  },
  {
    id: 'ch05', no: '第五回', title: '白门楼吕布殒命', mode: 'boss', rows: 6, cols: 5,
    stackDepth: 2, deck: { gu: 8, dao: 8, dun: 8, qi: 8, jiu: 8, ying: 8, gong: 8 },
    boss: {
      enemy: 'lv_bu', hp: 12, steps: 6, hearts: 3, addPairs: 2,
      phase2: { hp: 18, steps: 5, name: '暴怒吕布', shout: '吕布暴怒！', lines: ['方天画戟在此！', '挡我者死！'] },
    },
    slots: 3, lead: 'zhang_fei', recommend: ['zhang_fei', 'guan_yu', 'zhao_yun'],
  },
  {
    id: 'ch06', no: '第六回', title: '关云长过五关斩将', mode: 'press', rows: 8, cols: 5,
    deck: { dao: 6, gu: 6, dun: 6, qi: 2 },
    press: {
      startRows: 4, waves: 8, interval: 12000,
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
    slots: 3, lead: 'guan_yu', recommend: ['guan_yu', 'zhang_fei', 'zhao_yun'], foe: '曹军（五关守将）',
    failHint: { 破城: '关羽斩排能破拒马' },
  },
  {
    id: 'ch07', no: '第七回', title: '博望坡军师初用兵', mode: 'food', rows: 7, cols: 5,
    stackDepth: 2, deck: { huo: 2, ying: 12, shu: 8, dao: 8, gu: 6, jiu: 8, qi: 6 },
    food: { slack: 2 },
    slots: 3, lead: 'zhuge_liang', recommend: ['zhuge_liang', 'guan_yu', 'zhang_fei'], unlock: 'zhuge_liang',
    newEffect: 'huo', foe: '曹军（夏侯惇）',
  },
  {
    id: 'ch08', no: '第八回', title: '赵子龙单骑救主', mode: 'press', rows: 8, cols: 5,
    deck: { ma: 2, gong: 2, dun: 6, gu: 6, dao: 4 },
    pool: { gong: 3, ma: 1, dao: 1, gu: 1, dun: 1, qi: 1, jiu: 2, ying: 1 },
    press: { startRows: 4, waves: 10, interval: 12000 },
    slots: 3, lead: 'zhao_yun', recommend: ['zhao_yun', 'zhang_fei', 'guan_yu'], unlock: 'huang_zhong',
    newEffect: 'ma', foe: '曹军（虎豹骑）',
  },
  {
    id: 'ch09', no: '第九回', title: '七星坛诸葛祭风', mode: 'boss', rows: 7, cols: 5,
    stackDepth: 3, deck: { huo: 2, ying: 12, shu: 10, dao: 8, dun: 8, gong: 8, qi: 8, jiu: 10 },
    pool: { ying: 3, huo: 1, shu: 1, dao: 1, dun: 1, gong: 1, qi: 1, jiu: 1 },
    boss: {
      enemy: 'cao_cao', hp: 14, steps: 7, hearts: 3, addPairs: 2,
      phase2: { hp: 24, steps: 6, name: '横槊曹操', shout: '铁索连舟！', lines: ['连环船稳如平地！'], specials: ['chain'] },
    },
    slots: 3, lead: 'zhuge_liang', recommend: ['zhuge_liang', 'guan_yu', 'zhao_yun'],
  },
  {
    id: 'ch10', no: '第十回', title: '定军山黄忠斩夏侯', mode: 'boss', rows: 7, cols: 5,
    stackDepth: 3, deck: { gong: 10, ma: 2, shu: 10, dun: 8, huo: 2, ying: 10, dao: 8, qi: 8, jiu: 8, gu: 6 },
    pool: { gong: 2, ying: 2, shu: 1, dun: 1, dao: 1, qi: 1, jiu: 1, gu: 1 },
    boss: {
      enemy: 'xiahou_yuan', hp: 16, steps: 7, hearts: 3, addPairs: 2,
      phase2: { hp: 18, steps: 6, name: '虎步夏侯渊', shout: '虎步关右！', lines: ['老卒焉敢犯我！'], specials: ['charge', 'roar'] },
    },
    slots: 3, lead: 'huang_zhong', recommend: ['huang_zhong', 'zhuge_liang', 'zhao_yun'],
    failHint: { 城破: '先蓄黄忠，再消马' },
  },
]);

/** The whole data file in the shape `loadChapters(data, flags)` takes (rule 1). */
export const CHAPTER_DATA = Object.freeze({ chapters: CHAPTERS, enemies: ENEMIES, texts: TEXTS, starters: STARTERS });
