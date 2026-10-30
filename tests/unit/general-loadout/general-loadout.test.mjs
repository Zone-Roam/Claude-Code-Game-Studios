// general-loadout ACs (design/gdd/general-loadout.md Acceptance Criteria) and Edge Cases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SLOT_MAX, unlockedGenerals, availableGenerals, showPicker, grayCards, fillSlots,
  loadoutToSave, checkChapters, createLoadout, savedLoadoutValid,
} from '../../../src/rules/general-loadout.mjs';
import {
  GENERALS, STARTERS, CHAPTERS, CH01, CH02, CH03, CH08, CH09, winsOf, slotBtn, pickBtn, clearBtn,
} from '../../helpers/general-loadout-fakes.mjs';

const unlocked = (wins) => unlockedGenerals({ starters: STARTERS, chapters: CHAPTERS, winsOf: winsOf(wins) });
const open = (chapter, wins, extra) => createLoadout(Object.assign({ chapter, generals: GENERALS, unlocked: unlocked(wins) }, extra));
const SIX = { ch01: 1, ch03: 1, ch04: 1, ch07: 1, ch08: 1 };

test('SLOT_MAX is 3', () => {
  assert.equal(SLOT_MAX, 3);
});

test('AC1: empty save, ch01 shows only the 关羽 lead slot, no picker', () => {
  const p = open(CH01, {});
  assert.deepEqual(p.slots(), ['guan_yu']);
  assert.equal(p.showPicker(), false);
  p.press(slotBtn(0));
  assert.equal(p.expanded(), null);
});

test('AC2: 关羽+张飞 unlocked, replaying ch01 (slots 1) still has only the lead and no picker', () => {
  const p = open(CH01, { ch01: 1 });
  assert.deepEqual(p.slots(), ['guan_yu']);
  assert.equal(p.showPicker(), false);
});

test('AC3: first win of ch01 unlocks 张飞', () => {
  assert.deepEqual(unlocked({ ch01: 1 }), ['guan_yu', 'zhang_fei']);
});

test('AC4: winning ch01 again does not change the unlocked set', () => {
  assert.deepEqual(unlocked({ ch01: 2 }), unlocked({ ch01: 1 }));
});

test('AC5: ch02 first open: 张飞 (lead) and 关羽; slot 2 does not expand', () => {
  const p = open(CH02, { ch01: 1 });
  assert.deepEqual(p.slots(), ['zhang_fei', 'guan_yu']);
  assert.equal(p.showPicker(), false);
  p.press(slotBtn(1));
  assert.equal(p.expanded(), null);
  p.press(clearBtn(1));
  assert.deepEqual(p.slots(), ['zhang_fei', 'guan_yu']);
});

test('AC6: ch03 first open: 赵云 (lead, locked) and 关羽; slot 2 offers only 张飞', () => {
  const p = open(CH03, { ch01: 1, ch02: 1 });
  assert.deepEqual(p.slots(), ['zhao_yun', 'guan_yu']);
  assert.equal(p.showPicker(), true);
  p.press(slotBtn(0));
  assert.equal(p.expanded(), null, 'the lead slot never opens');
  p.press(clearBtn(0));
  assert.equal(p.slots()[0], 'zhao_yun');
  p.press(slotBtn(1));
  assert.equal(p.expanded(), 1);
  assert.deepEqual(p.choices(), ['zhang_fei']);
});

test('AC7: swap 关羽 for 张飞 in ch03, lose and settle; reopening gives 赵云, 张飞', () => {
  const p = open(CH03, { ch01: 1 });
  p.press(slotBtn(1));
  p.press(pickBtn('zhang_fei'));
  const fielded = p.slots().filter(Boolean);
  // A lost round still settles: the record's loadout becomes the fielded list.
  const saved = loadoutToSave(['zhao_yun', 'guan_yu'], fielded);
  assert.deepEqual(saved, ['zhao_yun', 'zhang_fei']);
  const again = open(CH03, { ch01: 1 }, { saved });
  assert.deepEqual(again.slots(), ['zhao_yun', 'zhang_fei']);
});

test('AC8: first win of ch03 unlocks 赵云: 关羽, 张飞, 赵云', () => {
  assert.deepEqual(unlocked({ ch01: 1, ch03: 1 }), ['guan_yu', 'zhang_fei', 'zhao_yun']);
});

test('AC9: six unlocked, ch09 without 鼓: picker shows, 张飞 is a grey card (kind gu) and picking him does nothing', () => {
  const u = unlocked(SIX);
  assert.equal(u.length, 6);
  const avail = availableGenerals(CH09, u, GENERALS);
  assert.deepEqual(avail.slice().sort(), ['guan_yu', 'huang_zhong', 'liu_bei', 'zhao_yun', 'zhuge_liang']);
  const p = open(CH09, SIX);
  assert.equal(p.showPicker(), true);
  assert.deepEqual(p.grayCards(), [{ general: 'zhang_fei', kind: 'gu' }]);
  p.press(slotBtn(1));
  const before = p.slots();
  p.press(pickBtn('zhang_fei'));
  assert.deepEqual(p.slots(), before);
  assert.equal(p.expanded(), 1, 'a grey card leaves the choice open');
});

test('AC10: ch08 without 旗: available is 3, no picker, no grey cards, slots filled by rule 9', () => {
  const u = unlocked({ ch01: 1, ch03: 1, ch04: 1 });
  assert.deepEqual(u, ['guan_yu', 'zhang_fei', 'zhao_yun', 'liu_bei']);
  assert.equal(availableGenerals(CH08, u, GENERALS).length, 3);
  assert.equal(showPicker(CH08, availableGenerals(CH08, u, GENERALS)), false);
  assert.deepEqual(grayCards(CH08, u, GENERALS), []);
  const p = open(CH08, { ch01: 1, ch03: 1, ch04: 1 });
  assert.deepEqual(p.grayCards(), []);
  assert.deepEqual(p.choices(), []);
  assert.deepEqual(p.slots(), ['zhao_yun', 'guan_yu', 'zhang_fei']);
});

test('AC11: saved loadout with the lead second: lead goes first, then saved, then recommend', () => {
  const p = open(CH09, SIX, { saved: ['huang_zhong', 'zhuge_liang'] });
  assert.deepEqual(p.slots(), ['zhuge_liang', 'huang_zhong', 'zhao_yun']);
});

test('AC11: saved loadout with the lead twice: the lead sits once, no repeats', () => {
  const p = open(CH09, SIX, { saved: ['zhuge_liang', 'zhuge_liang', 'liu_bei'] });
  const slots = p.slots();
  assert.equal(slots[0], 'zhuge_liang');
  assert.equal(slots.filter((id) => id === 'zhuge_liang').length, 1);
  assert.equal(new Set(slots).size, slots.length);
});

test('AC12: 3 slots, slot 3 cleared: 再来一回 keeps it empty; re-entering from the catalog refills it from recommend', () => {
  const p = open(CH09, SIX);
  assert.deepEqual(p.slots(), ['zhuge_liang', 'zhao_yun', 'guan_yu']);
  p.press(clearBtn(2));
  const memory = p.slots();
  assert.deepEqual(memory, ['zhuge_liang', 'zhao_yun', null]);
  const saved = loadoutToSave(undefined, memory.filter(Boolean));
  assert.deepEqual(saved, ['zhuge_liang', 'zhao_yun'], 'the saved loadout never holds empties');
  const retry = open(CH09, SIX, { saved, retrySlots: memory });
  assert.deepEqual(retry.slots(), ['zhuge_liang', 'zhao_yun', null]);
  const reentry = open(CH09, SIX, { saved });
  assert.deepEqual(reentry.slots(), ['zhuge_liang', 'zhao_yun', 'guan_yu']);
});

test('AC13: an empty RoundResult.loadout keeps the record loadout unchanged', () => {
  const prev = ['zhao_yun', 'zhang_fei'];
  assert.equal(loadoutToSave(prev, []), prev);
  assert.equal(loadoutToSave(undefined, []), undefined);
});

test('AC14: a lead whose charge kind is not in the deck refuses the chapter, naming the chapter and field lead', () => {
  const bad = Object.assign({}, CH02, { id: 'chX', deck: { dao: 6, jiu: 6 } });
  const { errors } = checkChapters([bad], { starters: STARTERS, generals: GENERALS });
  assert.ok(errors.some((e) => e.chapter === 'chX' && e.field === 'lead'));
  assert.equal(checkChapters(CHAPTERS, { starters: STARTERS, generals: GENERALS }).errors.length, 0);
});

test('AC15: saved ch03 loadout with an unknown id ["zhao_yun","lv_bu"] is dropped: slots follow recommend', () => {
  assert.equal(savedLoadoutValid(['zhao_yun', 'lv_bu'], 2, GENERALS), false);
  const p = open(CH03, { ch01: 1 }, { saved: ['zhao_yun', 'lv_bu'] });
  assert.deepEqual(p.slots(), ['zhao_yun', 'guan_yu']);
});

test('AC17: storage unavailable, session wins of ch01 and ch02: ch03 slot 2 offers 张飞', () => {
  const session = {};
  session.ch01 = 1;
  session.ch02 = 1;
  const p = open(CH03, session);
  p.press(slotBtn(1));
  assert.deepEqual(p.choices(), ['zhang_fei']);
});

test('AC18: storage unavailable, after a reload only 关羽 is unlocked and ch01 has only his lead slot', () => {
  assert.deepEqual(unlocked({}), ['guan_yu']);
  assert.deepEqual(open(CH01, {}).slots(), ['guan_yu']);
});

test('Edge: recommend shape errors, starter/duplicate unlock warnings, recommend charge missing warns and is skipped', () => {
  const chapters = [
    Object.assign({}, CH02, { id: 'a', recommend: ['guan_yu', 'zhang_fei'] }),
    Object.assign({}, CH02, { id: 'b', recommend: ['zhang_fei'] }),
    Object.assign({}, CH01, { id: 'c', unlock: 'guan_yu' }),
    Object.assign({}, CH01, { id: 'd' }),
    Object.assign({}, CH01, { id: 'e' }),
    Object.assign({}, CH02, { id: 'f', recommend: ['zhang_fei', 'zhao_yun'] }),
  ];
  const r = checkChapters(chapters, { starters: STARTERS, generals: GENERALS });
  assert.deepEqual(r.errors.map((e) => e.chapter + ':' + e.field), ['a:recommend', 'b:recommend']);
  assert.deepEqual(r.warnings.map((w) => w.chapter + ':' + w.field + ':' + w.reason),
    ['c:unlock:isStarter', 'e:unlock:duplicate', 'f:recommend:chargeNotInDeck']);
  // 赵云 (no 盾 in deck) is skipped; recommend is used up, so rule 9.4 leaves the slot empty.
  assert.deepEqual(fillSlots(chapters[5], { unlocked: STARTERS, generals: GENERALS }), ['zhang_fei', null]);
});

test('Edge: a saved general now unavailable is skipped and recommend fills the gap', () => {
  const p = open(CH08, SIX, { saved: ['zhao_yun', 'liu_bei', 'zhang_fei'] });
  assert.deepEqual(p.slots(), ['zhao_yun', 'zhang_fei', 'guan_yu']);
});

test('Edge: a saved loadout longer than slots is dropped', () => {
  const p = open(CH03, { ch01: 1 }, { saved: ['zhao_yun', 'zhang_fei', 'guan_yu'] });
  assert.deepEqual(p.slots(), ['zhao_yun', 'guan_yu']);
});

test('Edge: lead and recommend generals are available before they are unlocked (rule 8)', () => {
  assert.ok(availableGenerals(CH03, STARTERS, GENERALS).indexOf('zhao_yun') !== -1);
});

test('Rule 10: a seated general is not offered; pick fills the open slot and closes it', () => {
  const p = open(CH09, SIX);
  p.press(slotBtn(2));
  assert.deepEqual(p.choices(), ['liu_bei', 'huang_zhong']);
  p.press(pickBtn('zhao_yun'));
  assert.deepEqual(p.slots(), ['zhuge_liang', 'zhao_yun', 'guan_yu']);
  p.press(pickBtn('huang_zhong'));
  assert.deepEqual(p.slots(), ['zhuge_liang', 'zhao_yun', 'huang_zhong']);
  assert.equal(p.expanded(), null);
});
