// Fixture factories for chapter-loader tests (design/gdd/chapter-design.md).
// These are test fixtures, not release chapters. Dev-only; never shipped.
import { CHAPTER_DATA } from '../../src/data/chapters.mjs';

/** A deep copy of the release data file, safe to mutate in one test. */
export function releaseData() {
  return JSON.parse(JSON.stringify(CHAPTER_DATA));
}

/** A valid 5-column boss chapter (30 blocks, no stacking); `over` is shallow-merged. */
export function bossChapter(over) {
  return Object.assign({
    id: 'tb', no: '测试', title: '敌将夹具', mode: 'boss', rows: 6, cols: 5,
    deck: { gu: 8, dao: 6, qi: 6, ying: 6, jiu: 4 },
    boss: { enemy: 'lv_bu', steps: 8, hearts: 3, addPairs: 2 },
    slots: 2, lead: 'zhang_fei', recommend: ['zhang_fei', 'guan_yu'],
  }, over || {});
}

/** A valid 5-column press chapter (startRows 4, 20 blocks); `over` is shallow-merged. */
export function pressChapter(over) {
  return Object.assign({
    id: 'tp', no: '测试', title: '压境夹具', mode: 'press', rows: 8, cols: 5,
    deck: { dao: 6, qi: 6, jiu: 4, gu: 4 },
    press: { startRows: 4, waves: 6, interval: 12000 },
    slots: 1, lead: 'guan_yu', recommend: ['guan_yu'],
  }, over || {});
}

/** A deck of `pairs` pairs spread over the 12 kinds, guan_yu/zhang_fei kinds included. */
export function deckOfPairs(pairs) {
  const kinds = ['dao', 'gu', 'qi', 'jiu', 'ying', 'dun', 'shu', 'gong', 'huo', 'ma', 'shui', 'cheng'];
  const deck = {};
  for (let i = 0; i < pairs; i += 1) {
    const kind = kinds[i % kinds.length];
    deck[kind] = (deck[kind] || 0) + 2;
  }
  return deck;
}

/** Wraps chapters in a data file that uses the release enemies, texts and starters. */
export function dataWith(chapters) {
  const data = releaseData();
  data.chapters = chapters;
  return data;
}
