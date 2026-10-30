// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// 第一回 data, copied from design/gdd/chapter-design.md rule 13 and rule 4 (texts).

export const CHAPTERS = [
  {
    id: 'ch01',
    no: '第一回',
    title: '虎牢关三英战吕布',
    mode: 'boss',
    rows: 6,
    // slice v6 (DESIGN-v6.md): 5 columns for bigger tiles; 44 tiles on 30 cells, so 14 cells hold a buried tile
    cols: 5,
    deck: { huo: 2, ying: 6, dao: 6, gu: 6, dun: 6, shu: 8, qi: 6, jiu: 4 },
    boss: {
      enemy: 'lv_bu', chargeMs: 10000, hearts: 3, addPairs: 2,
      // slice experiments: two phases, 12 + 18 hp (v4); the bar fills by moves (v5)
      hp: 12,
      steps: 8,
      phase2: { hp: 18, steps: 6, chargeMs: 8000, name: '暴怒吕布', shout: '吕布暴怒！', lines: ['方天画戟在此！', '挡我者死！'] },
    },
    generals: ['guan_yu', 'zhang_fei', 'zhao_yun', 'zhuge_liang'],
    need: { guan_yu: 2, zhang_fei: 3, zhao_yun: 3, zhuge_liang: 4 },
    newEffect: 'huo',
  },
];

export const ENEMIES = {
  lv_bu: { name: '吕布', lines: ['人中吕布！', '谁敢挡我！'] },
};

export const TEXTS = {
  ruleLine: { boss: '每走一步敌将蓄一格，蓄满扣你一颗心' },
  effectLine: { huo: '火烧连营：消一对火，烧掉所有营' },
  failHint: { '城破': '少连错；{COMBO_THRESHOLD} 连斩能让敌将退一步' },
  skillLine: {
    guan_yu: { boss: '斩掉最下一排' },
    zhang_fei: { boss: '敌将退三步，三步不涨' },
    zhao_yun: { boss: '挡下敌将下一招' },
    zhuge_liang: { boss: '清最多的兵，破下一个特技' },
  },
  preview: '全书未完，下回分解',
};
