// general-skills PART B: Guan Yu's row cut (rule 11, formula guan_cut) and
// Huang Zhong's column shot (rule 14b, formula huang_cut). GDD Acceptance
// Criteria sections 关羽 and 黄忠, skills side. Select routing (cancel, other
// card, push, pause) runs through round-flow in
// tests/integration/general-skills/row-col-select.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UNIT_KINDS } from '../../../src/core/constants.mjs';
import { SKILL_SHOW_MS } from '../../../src/rules/general-skills.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';
import { fakeSkills, fakePressure, charge } from '../../helpers/general-skills-fakes.mjs';

const E = '. . . . .';
// AC guan_cut example: row 4 营(书 under) 营 刀 鼓 拒马; 刀 and 鼓 on top
// elsewhere; 书 only buried elsewhere (under 旗 at 1,1).
const GUAN_EXAMPLE = [
  'qi/shu qi . . .',
  E,
  'dao . . gu .',
  'ying/shu ying dao gu jm',
  E,
  E,
];
// Extra-cut order: two 刀 candidates (2,4)/(2,5) and (5,2): the bottom one
// wins; three buried 书 off the row (1,1), (2,1), (2,2): top row first.
const GUAN_ORDER = [
  'qi/shu qi . . .',
  'qi/shu qi/shu . dao dao',
  '. . . gu .',
  'ying/shu ying dao gu jm',
  '. dao . . .',
  E,
];
// AC huang_cut example: column 2 top to bottom 营(旗 under) 书 拒马 刀 营 鼓;
// 书 刀 鼓 on top elsewhere; 旗 only buried elsewhere (under 酒 at 1,3).
const HUANG_EXAMPLE = [
  '. ying/qi jiu/qi jiu .',
  '. shu . shu .',
  '. jm . . .',
  '. dao dao . .',
  '. ying . . .',
  '. gu . . gu',
];
const ONLY_BLOCKS = [
  'qi qi . . .',
  'jm jm . . .',
  E, E, E,
  'jm . . . .',
];

function ready(id, kind, n, picture, mode) {
  const board = boardFromPicture(picture);
  const p = fakePressure();
  const f = fakeSkills({ loadout: [id], mode: mode || 'boss', board, pressure: p.impl });
  charge(f.skills, kind, n);
  return Object.assign(f, { board, p });
}

function evenCounts(board) {
  for (const kind of UNIT_KINDS) assert.equal(board.count(kind) % 2, 0, kind + ' count is odd');
}

// ---- 关羽 ----

test('AC Guan Yu enter row select: tapCard returns row, no token, charge stays 2/2, no pressure call', () => {
  const f = ready('guan_yu', 'dao', 2, GUAN_EXAMPLE);
  assert.equal(f.skills.tapCard('guan_yu'), 'row');
  assert.equal(f.tokens.length, 0);
  assert.equal(f.card('guan_yu').charge, 2);
  assert.equal(f.skills.skillsUsed().guan_yu, 0);
  assert.deepEqual(f.p.calls, []);
});

test('AC Guan Yu select state: the card shows select while round-flow is selecting row', () => {
  const board = boardFromPicture(GUAN_EXAMPLE);
  const f = fakeSkills({ loadout: ['guan_yu', 'huang_zhong'], mode: 'boss', board, selecting: 'row' });
  charge(f.skills, 'dao', 2);
  assert.equal(f.card('guan_yu').state, 'select');
  assert.equal(f.card('huang_zhong').state, 'charging');
});

test('AC Guan Yu row with no blocks: rowSelectable is false (rows 2, 5, off-grid); rows with units or only roadblocks are true', () => {
  const f = ready('guan_yu', 'dao', 2, ONLY_BLOCKS);
  assert.equal(f.skills.rowSelectable(3), false);
  assert.equal(f.skills.rowSelectable(0), false);
  assert.equal(f.skills.rowSelectable(7), false);
  assert.equal(f.skills.rowSelectable(1), true);
  assert.equal(f.skills.rowSelectable(2), true);
  f.skills.cutRow(3); // unselectable: nothing happens
  assert.equal(f.tokens.length, 0);
  assert.equal(f.card('guan_yu').charge, 2);
});

test('AC Guan Yu cut row: skill token 950 ms, charge 0/2 and used 1 at once, the row clears only at token end', () => {
  const f = ready('guan_yu', 'dao', 2, GUAN_EXAMPLE);
  f.skills.cutRow(4);
  assert.equal(f.tokens.length, 1);
  assert.equal(f.tokens[0].reason, 'skill');
  assert.equal(f.tokens[0].durationMs, SKILL_SHOW_MS);
  assert.equal(f.card('guan_yu').charge, 0);
  assert.equal(f.card('guan_yu').state, 'show');
  assert.equal(f.skills.skillsUsed().guan_yu, 1);
  assert.equal(f.board.rowContents(4).units.length, 4);
  f.end(f.tokens[0]);
  assert.equal(f.released.length, 1);
  const row = f.board.rowContents(4);
  assert.equal(row.units.length + row.blocks.length + row.buried.length, 0);
  assert.equal(f.emitted('skillResult').length, 0); // no banner for Guan Yu
  assert.deepEqual(f.p.calls, []); // no step, no pressure call; damage goes via dispatch
});

test('AC Guan Yu guan_cut example: 4 row units + buried 书 + 拒马, extras 刀 鼓 on top and one buried 书: 8 units, 4 pairs, counts stay even', () => {
  const f = ready('guan_yu', 'dao', 2, GUAN_EXAMPLE);
  f.skills.cutRow(4);
  f.end(f.tokens[0]);
  assert.equal(f.dispatched.length, 1);
  const res = f.dispatched[0];
  assert.equal(res.type, 'clear');
  assert.equal(res.source, 'skill');
  assert.deepEqual(res.cells, [{ r: 3, c: 1 }, { r: 3, c: 4 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }, { r: 4, c: 4 }]);
  assert.equal(res.buried, 2);
  assert.deepEqual(res.blocks, [{ r: 4, c: 5 }]);
  assert.equal(res.pairs, 4);
  assert.equal(res.cells.length + res.buried, 8);
  assert.equal(f.board.depthAt(1, 1), 0); // the buried 书 under 旗 was the extra
  assert.equal(f.board.count('qi'), 2);
  evenCounts(f.board);
});

test('AC Guan Yu extra-cut order is fixed: top layer bottom row up, buried top row down; two runs give the same cut', () => {
  const runs = [0, 1].map(() => {
    const f = ready('guan_yu', 'dao', 2, GUAN_ORDER);
    f.skills.cutRow(4);
    f.end(f.tokens[0]);
    return f;
  });
  assert.deepEqual(runs[0].dispatched, runs[1].dispatched);
  const f = runs[0];
  assert.deepEqual(f.dispatched[0].cells, [{ r: 3, c: 4 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }, { r: 4, c: 4 }, { r: 5, c: 2 }]);
  assert.equal(f.board.count('dao'), 2); // (2,4), (2,5) remain
  assert.equal(f.board.depthAt(1, 1), 0); // first buried 书 top row down
  assert.equal(f.board.depthAt(2, 1), 1);
  assert.equal(f.board.depthAt(2, 2), 1);
  evenCounts(f.board);
});

test('AC Guan Yu row of only roadblocks: roadblocks cleared, pairs 0 (no damage), charge 0/2', () => {
  const f = ready('guan_yu', 'dao', 2, ONLY_BLOCKS);
  f.skills.cutRow(2);
  f.end(f.tokens[0]);
  const res = f.dispatched[0];
  assert.deepEqual(res.blocks, [{ r: 2, c: 1 }, { r: 2, c: 2 }]);
  assert.equal(res.pairs, 0);
  assert.deepEqual(res.cells, []);
  assert.equal(f.card('guan_yu').charge, 0);
  assert.equal(f.board.blocks().length, 1);
});

test('AC Guan Yu target fixed at token start: the cut uses the row as it was when cutRow ran', () => {
  const f = ready('guan_yu', 'dao', 2, GUAN_EXAMPLE);
  f.skills.cutRow(4);
  f.board.set(4, 5, 'huo'); // a board change during the token (cannot happen in play) is not re-read
  f.board.set(6, 5, 'huo');
  f.end(f.tokens[0]);
  assert.equal(f.dispatched[0].pairs, 4);
  assert.equal(f.board.count('huo'), 2);
});

test('AC Guan Yu hp 4, cut of 8 units: dispatch carries pairs 4 for pressure to take 4 hp (damage and win card: battle-pressure / round-flow)', () => {
  const f = ready('guan_yu', 'dao', 2, GUAN_EXAMPLE);
  f.skills.cutRow(4);
  f.end(f.tokens[0]);
  assert.equal(f.dispatched[0].pairs, 4);
});

test('Guan Yu not ready or a token showing: cutRow does nothing', () => {
  const f = ready('guan_yu', 'dao', 1, GUAN_EXAMPLE);
  f.skills.cutRow(4);
  assert.equal(f.tokens.length, 0);
  assert.equal(f.card('guan_yu').charge, 1);
});

// ---- 黄忠 ----

test('AC Huang Zhong charge: three 弓 pairs make 3/3 ready; an effect clear of 弓 does not change it', () => {
  const f = ready('huang_zhong', 'gong', 3, HUANG_EXAMPLE);
  assert.equal(f.card('huang_zhong').charge, 3);
  assert.equal(f.card('huang_zhong').state, 'ready');
  f.skills.onMatch({ type: 'clear', source: 'effect', kind: 'gong', pairs: 3 });
  assert.equal(f.card('huang_zhong').charge, 3);
});

test('AC Huang Zhong 1/3 and 马 clears a 弓 pair: still 1/3 (effect clears do not charge)', () => {
  const f = ready('huang_zhong', 'gong', 1, HUANG_EXAMPLE);
  f.skills.onMatch({ type: 'clear', source: 'effect', kind: 'gong', pairs: 1 });
  assert.equal(f.card('huang_zhong').charge, 1);
  f.skills.tapCard('huang_zhong');
  assert.deepEqual(f.emitted('cardHint').pop(), { type: 'cardHint', general: 'huang_zhong', reason: 'uncharged', kind: 'gong', short: 2 });
});

test('AC Huang Zhong enter column select: tapCard returns col, no token, charge 3/3, no pressure call', () => {
  const f = ready('huang_zhong', 'gong', 3, HUANG_EXAMPLE);
  assert.equal(f.skills.tapCard('huang_zhong'), 'col');
  assert.equal(f.tokens.length, 0);
  assert.equal(f.card('huang_zhong').charge, 3);
  assert.deepEqual(f.p.calls, []);
});

test('AC Huang Zhong column with no blocks: colSelectable false (col 5, off-grid); a column of only roadblocks is true', () => {
  const f = ready('huang_zhong', 'gong', 3, ONLY_BLOCKS);
  assert.equal(f.skills.colSelectable(3), false);
  assert.equal(f.skills.colSelectable(6), false);
  assert.equal(f.skills.colSelectable(1), true);
  const g = ready('huang_zhong', 'gong', 3, HUANG_EXAMPLE);
  assert.equal(g.skills.colSelectable(1), false);
  assert.equal(g.skills.colSelectable(2), true);
});

test('AC Huang Zhong cut column 2: skill token 950 ms, charge 0/3, used 1, no skillResult banner, no step', () => {
  const f = ready('huang_zhong', 'gong', 3, HUANG_EXAMPLE);
  f.skills.cutCol(2);
  assert.equal(f.tokens.length, 1);
  assert.equal(f.tokens[0].durationMs, SKILL_SHOW_MS);
  assert.equal(f.card('huang_zhong').charge, 0);
  assert.equal(f.skills.skillsUsed().huang_zhong, 1);
  assert.equal(f.board.colContents(2).units.length, 5);
  f.end(f.tokens[0]);
  const col = f.board.colContents(2);
  assert.equal(col.units.length + col.blocks.length + col.buried.length, 0);
  assert.equal(f.emitted('skillResult').length, 0);
  assert.deepEqual(f.p.calls, []);
});

test('AC Huang Zhong huang_cut example: 5 units + buried 旗 + 拒马, extras 书 刀 鼓 on top and buried 旗: 10 units, 5 pairs, counts even', () => {
  const f = ready('huang_zhong', 'gong', 3, HUANG_EXAMPLE);
  f.skills.cutCol(2);
  f.end(f.tokens[0]);
  const res = f.dispatched[0];
  assert.equal(res.source, 'skill');
  assert.equal(res.cells.length, 8); // 5 on the column + 书 (2,4), 刀 (4,3), 鼓 (6,5)
  assert.deepEqual(res.cells.filter((p) => p.c !== 2), [{ r: 2, c: 4 }, { r: 4, c: 3 }, { r: 6, c: 5 }]);
  assert.equal(res.buried, 2);
  assert.deepEqual(res.blocks, [{ r: 3, c: 2 }]);
  assert.equal(res.pairs, 5);
  assert.equal(f.board.depthAt(1, 3), 0); // buried 旗 under 酒 was the extra
  assert.equal(f.board.count('jiu'), 2);
  evenCounts(f.board);
});

test('AC Huang Zhong same board twice: the extra shots land on the same cells', () => {
  const runs = [0, 1].map(() => {
    const f = ready('huang_zhong', 'gong', 3, HUANG_EXAMPLE);
    f.skills.cutCol(2);
    f.end(f.tokens[0]);
    return f.dispatched;
  });
  assert.deepEqual(runs[0], runs[1]);
});

test('AC Huang Zhong column of only roadblocks: roadblocks cleared, pairs 0, charge 0/3', () => {
  const f = ready('huang_zhong', 'gong', 3, [
    'qi qi . . .',
    '. . . . jm',
    E, E, E,
    '. . . . jm',
  ]);
  f.skills.cutCol(5);
  f.end(f.tokens[0]);
  assert.deepEqual(f.dispatched[0].blocks, [{ r: 2, c: 5 }, { r: 6, c: 5 }]);
  assert.equal(f.dispatched[0].pairs, 0);
  assert.equal(f.card('huang_zhong').charge, 0);
});

test('AC Huang Zhong empty board: tapping ready Huang Zhong gives noEffect boardEmpty and does not enter select', () => {
  const f = ready('huang_zhong', 'gong', 3, [E, E, E, E, E, E]);
  assert.equal(f.skills.tapCard('huang_zhong'), null);
  assert.deepEqual(f.emitted('cardHint').pop(), { type: 'cardHint', general: 'huang_zhong', reason: 'noEffect', why: 'boardEmpty' });
  assert.equal(f.card('huang_zhong').charge, 3);
});
