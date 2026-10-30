// chapter-design Acceptance Criteria that are about data and loading
// (design/gdd/chapter-design.md rules 6-9, 13, 14). Each test names its AC.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadChapters, resolveNeed } from '../../../src/rules/chapter-loader.mjs';
import { CHAPTER_DATA, TEXTS, ENEMIES } from '../../../src/data/chapters.mjs';
import { releaseData, bossChapter, pressChapter, deckOfPairs, dataWith } from '../../helpers/chapter-design-fakes.mjs';

const OK6 = ['dao', 'dao', 'gu', 'gu', 'qi', 'qi'];
const DEV = { dev: true, slow: false };
const RELEASE = { dev: false, slow: false };
const ids = (book) => book.chapters.map((c) => c.id);
const fields = (list, id) => list.filter((x) => x.id === id).map((x) => x.field);
const byId = (book, id) => book.chapters.find((c) => c.id === id);

test('AC1 release 10 chapters with starters [guan_yu] load with 0 rejections and 0 warnings', () => {
  const book = loadChapters(CHAPTER_DATA, DEV);
  assert.deepEqual(book.rejected, []);
  assert.deepEqual(book.warnings, []);
  assert.deepEqual(book.errors, []);
  assert.deepEqual(ids(book), ['ch01', 'ch02', 'ch03', 'ch04', 'ch05', 'ch06', 'ch07', 'ch08', 'ch09', 'ch10']);
  assert.deepEqual(book.starters, ['guan_yu']);
});

test('AC1 rule 13 numbers: press interval 12000, ch10 steps 7/6 and hp 16+18, food slack 3/2', () => {
  const book = loadChapters(CHAPTER_DATA, DEV);
  for (const id of ['ch01', 'ch06', 'ch08']) assert.equal(byId(book, id).press.interval, 12000);
  const ch10 = byId(book, 'ch10').boss;
  assert.deepEqual([ch10.steps, ch10.phase2.steps, ch10.hp, ch10.phase2.hp], [7, 6, 16, 18]);
  assert.equal(byId(book, 'ch04').food.slack, 3);
  assert.equal(byId(book, 'ch07').food.slack, 2);
  for (const c of book.chapters) assert.equal(c.cols, 5);
});

test('AC2 a deck kind with 3 blocks refuses the chapter and names id and kind', () => {
  const deck = { gu: 8, dao: 6, qi: 6, ying: 5, jiu: 5 };
  const book = loadChapters(dataWith([bossChapter({ deck })]), DEV);
  assert.deepEqual(ids(book), []);
  assert.ok(book.rejected.some((r) => r.id === 'tb' && r.field === 'deck.ying'));
});

test('AC3 boss rows 6 cols 5: deck 28 and 62 refused, 30 / 44 / 60 load', () => {
  for (const [pairs, ok] of [[14, false], [15, true], [22, true], [30, true], [31, false]]) {
    const book = loadChapters(dataWith([bossChapter({ deck: deckOfPairs(pairs) })]), DEV);
    assert.equal(book.chapters.length, ok ? 1 : 0, 'sum ' + pairs * 2);
    if (!ok) assert.ok(fields(book.rejected, 'tb').indexOf('deck') !== -1);
  }
});

test('AC4 cols 7 refused; no cols with rows 6 and 36 blocks loads as 6 columns', () => {
  const bad = loadChapters(dataWith([bossChapter({ cols: 7 })]), DEV);
  assert.ok(fields(bad.rejected, 'tb').indexOf('cols') !== -1);
  const chapter = bossChapter({ deck: deckOfPairs(18) });
  delete chapter.cols;
  const book = loadChapters(dataWith([chapter]), DEV);
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0].cols, 6);
});

test('AC5 press cols 5 startRows 4 with 24 blocks is refused (must be 20)', () => {
  const book = loadChapters(dataWith([pressChapter({ deck: { dao: 6, qi: 6, jiu: 6, gu: 6 } })]), DEV);
  assert.deepEqual(ids(book), []);
  assert.ok(fields(book.rejected, 'tp').indexOf('deck') !== -1);
});

test('AC6 recommend whose first entry is not the lead is refused on field recommend; a one-entry recommend too', () => {
  const deck = { gu: 8, dao: 6, dun: 6, ying: 6, jiu: 4 };
  const first = loadChapters(dataWith([bossChapter({ deck, lead: 'zhao_yun', recommend: ['guan_yu', 'zhao_yun'] })]), DEV);
  assert.deepEqual(ids(first), []);
  assert.ok(fields(first.rejected, 'tb').indexOf('recommend') !== -1);
  const short = loadChapters(dataWith([bossChapter({ deck, lead: 'zhao_yun', recommend: ['zhao_yun'] })]), DEV);
  assert.deepEqual(ids(short), []);
  assert.ok(fields(short.rejected, 'tb').indexOf('recommend') !== -1);
});

test('AC7 lead zhang_fei without gu is refused on field lead; recommended zhao_yun without dun only warns', () => {
  const noGu = loadChapters(dataWith([bossChapter({ deck: { dao: 8, qi: 8, ying: 8, jiu: 6 } })]), DEV);
  assert.deepEqual(ids(noGu), []);
  assert.ok(fields(noGu.rejected, 'tb').indexOf('lead') !== -1);
  const noDun = loadChapters(dataWith([bossChapter({ recommend: ['zhang_fei', 'zhao_yun'] })]), DEV);
  assert.equal(noDun.chapters.length, 1);
  assert.deepEqual(fields(noDun.warnings, 'tb'), ['recommend']);
});

test('AC8 no need written: huang_zhong, zhuge_liang, liu_bei get 3, 4, 3', () => {
  const book = loadChapters(CHAPTER_DATA, DEV);
  const ch10 = byId(book, 'ch10');
  assert.deepEqual(['huang_zhong', 'zhuge_liang', 'liu_bei'].map((g) => ch10.needs[g]), [3, 4, 3]);
  assert.deepEqual(['huang_zhong', 'zhuge_liang', 'liu_bei'].map((g) => resolveNeed({}, g)), [3, 4, 3]);
  assert.equal(resolveNeed({ need: { guan_yu: 4 } }, 'zhang_fei'), 3);
  assert.equal(resolveNeed({ need: 1 }, 'zhuge_liang'), 1);
});

test('AC9 press chapter with rows 7 is refused', () => {
  const book = loadChapters(dataWith([pressChapter({ rows: 7 })]), DEV);
  assert.deepEqual(ids(book), []);
  assert.ok(fields(book.rejected, 'tp').indexOf('rows') !== -1);
});

test('AC10 press interval 3000 refused; 5000 loads with a safe-range warning', () => {
  const low = loadChapters(dataWith([pressChapter({ press: { startRows: 4, waves: 6, interval: 3000 } })]), DEV);
  assert.deepEqual(ids(low), []);
  const warn = loadChapters(dataWith([pressChapter({ press: { startRows: 4, waves: 6, interval: 5000 } })]), DEV);
  assert.equal(warn.chapters.length, 1);
  assert.deepEqual(fields(warn.warnings, 'tp'), ['press.interval']);
});

test('AC11 boss.enemy missing from the enemies table is refused', () => {
  const book = loadChapters(dataWith([bossChapter({ boss: { enemy: 'dong_zhuo', steps: 8, hearts: 3, addPairs: 2 } })]), DEV);
  assert.deepEqual(ids(book), []);
  assert.ok(fields(book.rejected, 'tb').indexOf('boss.enemy') !== -1);
});

test('AC12 two chapters with the same id: the second is refused', () => {
  const book = loadChapters(dataWith([bossChapter({ title: '甲' }), bossChapter({ title: '乙' })]), DEV);
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0].title, '甲');
  assert.deepEqual(book.rejected.map((r) => r.field), ['id']);
});

test('AC13 recommended general with 2 charge blocks and need 2 only warns', () => {
  const chapter = bossChapter({ deck: { gu: 8, dao: 6, qi: 6, ying: 6, jiu: 2, dun: 2 }, recommend: ['zhang_fei', 'zhao_yun'], need: { zhao_yun: 2 } });
  const book = loadChapters(dataWith([chapter]), DEV);
  assert.equal(book.chapters.length, 1);
  assert.deepEqual(fields(book.warnings, 'tb'), ['recommend']);
});

test('AC14 stars {t3: 9000, t2: 2000} in release: loads, default thresholds, logged', () => {
  const book = loadChapters(dataWith([pressChapter({ stars: { t3: 9000, t2: 2000 } })]), RELEASE);
  assert.equal(book.chapters.length, 1);
  assert.equal(book.chapters[0].stars, undefined);
  assert.deepEqual(book.log.map((l) => [l.id, l.field]), [['tp', 'stars']]);
  const dev = loadChapters(dataWith([pressChapter({ stars: { t3: 9000, t2: 2000 } })]), DEV);
  assert.deepEqual(dev.errors.map((l) => [l.id, l.field]), [['tp', 'stars']]);
});

test('AC15 ch02 refused: ch01 next is ch03 赵子龙磐河大战', () => {
  const data = releaseData();
  data.chapters[1].deck.gu = 7;
  const book = loadChapters(data, DEV);
  assert.equal(ids(book).indexOf('ch02'), -1);
  assert.deepEqual(byId(book, 'ch01').next, { id: 'ch03', title: '赵子龙磐河大战' });
});

test('AC16 every chapter refused: empty list and allRejected (screens shows the error page)', () => {
  const data = releaseData();
  data.chapters.forEach((c) => { c.cols = 7; });
  const book = loadChapters(data, DEV);
  assert.deepEqual(book.chapters, []);
  assert.equal(book.allRejected, true);
  assert.equal(book.texts.errorPage, '戏本出错，请稍后再来');
});

test('AC17 slow=1: ch01 and ch08 interval 15600, fixture 7000 -> 9100, ch05 steps 9 and 8', () => {
  const book = loadChapters(CHAPTER_DATA, { dev: true, slow: true });
  assert.equal(byId(book, 'ch01').press.interval, 15600);
  assert.equal(byId(book, 'ch08').press.interval, 15600);
  assert.deepEqual([byId(book, 'ch05').boss.steps, byId(book, 'ch05').boss.phase2.steps], [9, 8]);
  // Test fixture, not a release chapter: covers the one-decimal display branch's input.
  const fixture = loadChapters(dataWith([pressChapter({ press: { startRows: 4, waves: 6, interval: 7000 } })]), { slow: true });
  assert.equal(fixture.chapters[0].press.interval, 9100);
  // slow never mutates the source data.
  assert.equal(CHAPTER_DATA.chapters[0].press.interval, 12000);
});

test('AC19 water-board data: ch07 newEffect huo with its line, ch01 none, ch03 enemy 文丑, rule templates', () => {
  const book = loadChapters(CHAPTER_DATA, DEV);
  assert.equal(byId(book, 'ch07').newEffect, 'huo');
  assert.equal(book.texts.effectLine.huo, '火烧连营：消一对火，烧掉所有营');
  assert.equal(byId(book, 'ch01').newEffect, undefined);
  assert.equal(TEXTS.ruleLine.press, '敌军每 {interval} 秒压下一排，最下一排有兵时再压就破城');
  assert.equal(book.enemies[byId(book, 'ch03').boss.enemy].name, '文丑');
  assert.equal(TEXTS.ruleLine.boss, '{enemy}走满 {steps} 步就出手，{hearts} 颗心没了就输');
});

test('AC20 preview data: ch01 next is 虎牢关三英战吕布; ch10 has no next', () => {
  const book = loadChapters(CHAPTER_DATA, DEV);
  assert.equal(byId(book, 'ch01').next.title, '虎牢关三英战吕布');
  assert.equal(byId(book, 'ch10').next, null);
  assert.equal(book.texts.previewLast, '全书未完，下回分解');
});

test('AC21 城破 default hint is a template on COMBO_THRESHOLD and enemy', () => {
  assert.equal(TEXTS.failHint['城破'], '连着消、不连错，{COMBO_THRESHOLD} 连斩起能让{enemy}退步');
});

test('AC22 chapter fail hints: ch10 城破 先蓄黄忠，再消马; ch06 破城 关羽斩排能破拒马', () => {
  const book = loadChapters(CHAPTER_DATA, DEV);
  assert.equal(byId(book, 'ch10').failHint['城破'], '先蓄黄忠，再消马');
  assert.equal(byId(book, 'ch06').failHint['破城'], '关羽斩排能破拒马');
});

test('AC23 failHint with an unknown reason warns and the key is dropped', () => {
  const book = loadChapters(dataWith([bossChapter({ failHint: { 城破了: '……' } })]), DEV);
  assert.equal(book.chapters.length, 1);
  assert.deepEqual(fields(book.warnings, 'tb'), ['failHint']);
  assert.deepEqual(book.chapters[0].failHint, {});
});

test('AC24 phase-2 specials: ch05 defaults to sweep/charge/roar, ch09 [chain], ch10 [charge, roar]', () => {
  const book = loadChapters(CHAPTER_DATA, DEV);
  assert.deepEqual(byId(book, 'ch05').boss.phase2.specials, ['sweep', 'charge', 'roar']);
  assert.deepEqual(byId(book, 'ch09').boss.phase2.specials, ['chain']);
  assert.deepEqual(byId(book, 'ch10').boss.phase2.specials, ['charge', 'roar']);
  assert.equal(byId(book, 'ch02').boss.phase2, undefined);
});

test('AC25 phase2.specials [] or with fire refused on phase2.specials; specialNames key dash refused', () => {
  const phase2 = (specials) => ({ enemy: 'lv_bu', hp: 10, steps: 8, hearts: 3, addPairs: 2, phase2: { hp: 10, steps: 6, specials } });
  for (const specials of [[], ['sweep', 'fire']]) {
    const book = loadChapters(dataWith([bossChapter({ boss: phase2(specials) })]), DEV);
    assert.deepEqual(ids(book), []);
    assert.ok(fields(book.rejected, 'tb').indexOf('phase2.specials') !== -1);
  }
  const data = releaseData();
  data.enemies.xiahou_yuan.specialNames.dash = '冲';
  const book = loadChapters(data, DEV);
  assert.equal(ids(book).indexOf('ch10'), -1);
  assert.ok(book.rejected.some((r) => r.field === 'enemies.xiahou_yuan.specialNames'));
});

test('AC26 special display names: xiahou_yuan charge is 布鹿角, lv_bu keeps the default', () => {
  assert.equal(ENEMIES.xiahou_yuan.specialNames.charge, '布鹿角');
  assert.equal(ENEMIES.lv_bu.specialNames, undefined);
});

test('AC27 ch06 waveList loads; an item 盾 jm jm 盾 营 is refused; jm in a 6-column press wave is refused', () => {
  const data = releaseData();
  assert.ok(ids(loadChapters(data, DEV)).indexOf('ch06') !== -1);
  data.chapters[5].press.waveList[2] = ['dun', 'jm', 'jm', 'dun', 'ying'];
  assert.equal(ids(loadChapters(data, DEV)).indexOf('ch06'), -1);
  const six = pressChapter({
    cols: 6, deck: { dao: 8, qi: 8, jiu: 4, gu: 4 },
    press: { startRows: 4, waves: 4, interval: 12000, waveList: [OK6, OK6, OK6, ['dao', 'dao', 'gu', 'gu', 'qi', 'jm']] },
  });
  const book = loadChapters(dataWith([six]), DEV);
  assert.deepEqual(ids(book), []);
  assert.ok(fields(book.rejected, 'tp').indexOf('press.waveList') !== -1);
});

test('AC30 6-column wave with odd kinds, or only 5 ids, is refused', () => {
  const make = (wave) => pressChapter({
    cols: 6, deck: { dao: 8, qi: 8, jiu: 4, gu: 4 },
    press: { startRows: 4, waves: 4, interval: 12000, waveList: [OK6, OK6, OK6, wave] },
  });
  for (const wave of [['dao', 'dao', 'gu', 'dun', 'dun', 'qi'], ['dao', 'dao', 'gu', 'gu', 'qi']]) {
    const book = loadChapters(dataWith([make(wave)]), DEV);
    assert.deepEqual(ids(book), []);
  }
  const ok = loadChapters(dataWith([make(['dao', 'dao', 'gu', 'gu', 'qi', 'qi'])]), DEV);
  assert.equal(ok.chapters.length, 1);
});

test('rule 9: loaded chapters fill pool and boss.hp defaults from the deck', () => {
  const book = loadChapters(dataWith([bossChapter()]), DEV);
  const c = book.chapters[0];
  assert.equal(c.boss.hp, 15);
  assert.deepEqual(c.pool, { ying: 3, dao: 3, gu: 4, qi: 3, jiu: 2 });
});
