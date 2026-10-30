// general-skills PART B inside a real round: round-flow's row / column select
// (round-flow rule 5a) routing to the real skills module on a real board, with
// a fake pressure whose tick can emit a push. GDD Acceptance Criteria 关羽,
// 黄忠 and 刘备 (select cancel by Liu Bei).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSkills, SKILL_SHOW_MS } from '../../../src/rules/general-skills.mjs';
import { createRound } from '../../../src/rules/round-flow.mjs';
import { fakeSystems, cardIntent, buttonIntent, OFF_BOARD, PAUSE_STAMP, TEST_CONSTANTS, TEST_SEED } from '../../helpers/round-fakes.mjs';
import { fakePressure, charge } from '../../helpers/general-skills-fakes.mjs';
import { boardFromPicture } from '../../helpers/board-fixtures.mjs';

const DT = 16;
// Row 3 and column 1 hold units; row 2, row 4 and column 5 are empty.
const PICTURE = [
  'qi qi . . .',
  '. . . . .',
  'dao dao gong gong .',
  '. . . . .',
  '. . . . .',
  'ying ying . . .',
];
const KIND = { guan_yu: 'dao', huang_zhong: 'gong', zhang_fei: 'gu', liu_bei: 'qi' };

function cell(row, col) {
  return { type: 'cell', row, col };
}

// A round in play with `ready` generals fully charged.
function selectRound(loadout, ready) {
  const p = fakePressure();
  let pushNext = false;
  const board = boardFromPicture(PICTURE);
  const fakes = fakeSystems({
    pressure: {
      tick(dt, ctx) {
        if (!pushNext) return;
        pushNext = false;
        ctx.emit({ type: 'push' });
      },
    },
  });
  fakes.systems.createBoard = () => board;
  const makePressure = fakes.systems.createPressure;
  fakes.systems.createPressure = (ctx) => Object.assign(makePressure(ctx), p.impl);
  fakes.systems.createSkills = (ctx) => createSkills(ctx);
  const round = createRound({
    chapter: { id: 'test', mode: 'press' }, seed: TEST_SEED, constants: TEST_CONSTANTS,
    progress: fakes.progress, systems: fakes.systems, loadout,
  });
  round.start();
  round.frame(DT, []);
  const skills = round.systems().skills;
  for (const id of ready) charge(skills, KIND[id], skills.cards().find((c) => c.general === id).need);
  round.drainEvents();
  const card = (id) => skills.cards().find((c) => c.general === id);
  return { round, board, skills, p, fakes, card, push: () => { pushNext = true; } };
}

// ---- 关羽 ----

test('AC Guan Yu enter row select in a round: selection cleared, select state, 2/2, no token, no step', () => {
  const t = selectRound(['guan_yu'], ['guan_yu']);
  t.round.frame(DT, [cell(1, 1)]);
  assert.notEqual(t.board.selection(), null);
  t.round.frame(DT, [cardIntent('guan_yu')]);
  assert.equal(t.round.selecting(), 'row');
  assert.equal(t.board.selection(), null);
  assert.equal(t.card('guan_yu').state, 'select');
  assert.equal(t.card('guan_yu').charge, 2);
  assert.equal(t.round.tokens().length, 0);
  assert.equal(t.fakes.calls('pressure.onMatch').length + t.fakes.calls('pressure.onMiss').length, 0);
});

test('AC Guan Yu cancel: tapping Guan Yu again, or off the board, ends row select; 2/2 ready, skillsUsed unchanged', () => {
  for (const cancel of [cardIntent('guan_yu'), OFF_BOARD]) {
    const t = selectRound(['guan_yu'], ['guan_yu']);
    t.round.frame(DT, [cardIntent('guan_yu')]);
    t.round.frame(DT, [cancel]);
    assert.equal(t.round.selecting(), null);
    assert.equal(t.card('guan_yu').state, 'ready');
    assert.equal(t.card('guan_yu').charge, 2);
    assert.equal(t.skills.skillsUsed().guan_yu, 0);
  }
});

test('AC Guan Yu select, tap ready Zhang Fei: only cancels, Zhang Fei does not fire', () => {
  const t = selectRound(['guan_yu', 'zhang_fei'], ['guan_yu', 'zhang_fei']);
  t.round.frame(DT, [cardIntent('guan_yu')]);
  t.round.frame(DT, [cardIntent('zhang_fei')]);
  assert.equal(t.round.selecting(), null);
  assert.equal(t.round.tokens().length, 0);
  assert.equal(t.card('zhang_fei').charge, 3);
  assert.deepEqual(t.p.calls, []);
});

test('AC Guan Yu select, tap a row with no blocks: nothing happens, still selecting', () => {
  const t = selectRound(['guan_yu'], ['guan_yu']);
  t.round.frame(DT, [cardIntent('guan_yu')]);
  t.round.frame(DT, [cell(2, 3)]);
  assert.equal(t.round.selecting(), 'row');
  assert.equal(t.round.tokens().length, 0);
  assert.equal(t.card('guan_yu').charge, 2);
});

test('AC Guan Yu cut row 3: skill token 950 ms, game time frozen, board taps dropped; then row 3 cut, 0/2, used 1', () => {
  const t = selectRound(['guan_yu'], ['guan_yu']);
  t.round.frame(DT, [cardIntent('guan_yu')]);
  t.round.frame(DT, [cell(3, 5)]); // any cell of a row that has blocks
  assert.equal(t.round.selecting(), null);
  assert.ok(t.round.tokens().some((tk) => tk.reason === 'skill'));
  assert.equal(t.card('guan_yu').charge, 0);
  const frozenAt = t.round.gameTime();
  t.round.frame(DT, [cell(1, 1)]);
  assert.equal(t.board.selection(), null);
  for (let i = 0; i < Math.floor(SKILL_SHOW_MS / DT) - 2; i++) t.round.frame(DT, []);
  assert.equal(t.round.gameTime(), frozenAt);
  assert.equal(t.board.rowContents(3).units.length, 4);
  t.round.frame(DT, []);
  t.round.frame(DT, []);
  assert.ok(t.round.tokens().every((tk) => tk.reason !== 'skill'));
  assert.equal(t.board.rowContents(3).units.length, 0);
  assert.equal(t.skills.skillsUsed().guan_yu, 1);
  assert.equal(t.fakes.calls('pressure.onMatch').length + t.fakes.calls('pressure.onMiss').length, 0);
  assert.equal(t.fakes.calls('pressure.onClear').length, 1);
});

test('AC Guan Yu press push during row select: select cancelled, Guan Yu still 2/2 ready', () => {
  const t = selectRound(['guan_yu'], ['guan_yu']);
  t.round.frame(DT, [cardIntent('guan_yu')]);
  t.push();
  t.round.frame(DT, []);
  assert.equal(t.round.selecting(), null);
  assert.equal(t.card('guan_yu').state, 'ready');
  assert.equal(t.card('guan_yu').charge, 2);
});

test('AC Guan Yu background or pause during row select: still selecting after 接着讲, rows still selectable, 2/2', () => {
  for (const leave of ['hidden', 'pause']) {
    const t = selectRound(['guan_yu'], ['guan_yu']);
    t.round.frame(DT, [cardIntent('guan_yu')]);
    if (leave === 'hidden') t.round.onHidden();
    else t.round.frame(DT, [PAUSE_STAMP]);
    t.round.frame(DT, []);
    t.round.onVisible();
    t.round.frame(DT, [buttonIntent(t.round.overlay(), 'resume')]);
    assert.equal(t.round.tokens().length, 0, leave);
    assert.equal(t.round.selecting(), 'row', leave);
    assert.equal(t.skills.rowSelectable(3), true);
    assert.equal(t.card('guan_yu').charge, 2);
  }
});

// ---- 黄忠 ----

test('AC Huang Zhong enter column select in a round: selection cleared, select state, 3/3, no token', () => {
  const t = selectRound(['huang_zhong'], ['huang_zhong']);
  t.round.frame(DT, [cell(1, 1)]);
  t.round.frame(DT, [cardIntent('huang_zhong')]);
  assert.equal(t.round.selecting(), 'col');
  assert.equal(t.board.selection(), null);
  assert.equal(t.card('huang_zhong').state, 'select');
  assert.equal(t.round.tokens().length, 0);
});

test('AC Huang Zhong cancel: tap Huang Zhong again or off the board: 3/3 ready', () => {
  for (const cancel of [cardIntent('huang_zhong'), OFF_BOARD]) {
    const t = selectRound(['huang_zhong'], ['huang_zhong']);
    t.round.frame(DT, [cardIntent('huang_zhong')]);
    t.round.frame(DT, [cancel]);
    assert.equal(t.round.selecting(), null);
    assert.equal(t.card('huang_zhong').state, 'ready');
    assert.equal(t.card('huang_zhong').charge, 3);
  }
});

test('AC Huang Zhong select, tap an empty column: nothing happens, still selecting', () => {
  const t = selectRound(['huang_zhong'], ['huang_zhong']);
  t.round.frame(DT, [cardIntent('huang_zhong')]);
  t.round.frame(DT, [cell(2, 5)]);
  assert.equal(t.round.selecting(), 'col');
  assert.equal(t.round.tokens().length, 0);
});

test('AC Guan Yu and Huang Zhong exclude each other: tapping the other only cancels the current select', () => {
  const t = selectRound(['guan_yu', 'huang_zhong'], ['guan_yu', 'huang_zhong']);
  t.round.frame(DT, [cardIntent('huang_zhong')]);
  t.round.frame(DT, [cardIntent('guan_yu')]);
  assert.equal(t.round.selecting(), null);
  t.round.frame(DT, [cardIntent('guan_yu')]);
  t.round.frame(DT, [cardIntent('huang_zhong')]);
  assert.equal(t.round.selecting(), null);
  assert.equal(t.card('guan_yu').state, 'ready');
  assert.equal(t.card('huang_zhong').state, 'ready');
});

test('AC Huang Zhong press push during column select: still selecting, highlight read from the board, 3/3', () => {
  const t = selectRound(['huang_zhong'], ['huang_zhong']);
  t.round.frame(DT, [cardIntent('huang_zhong')]);
  t.push();
  t.round.frame(DT, []);
  assert.equal(t.round.selecting(), 'col');
  assert.equal(t.card('huang_zhong').state, 'select');
  assert.equal(t.card('huang_zhong').charge, 3);
  t.board.set(4, 5, 'huo'); // the board changed: column 5 now has a block
  assert.equal(t.skills.colSelectable(5), true);
});

test('AC Huang Zhong background during column select: still selecting after 接着讲', () => {
  const t = selectRound(['huang_zhong'], ['huang_zhong']);
  t.round.frame(DT, [cardIntent('huang_zhong')]);
  t.round.onHidden();
  t.round.frame(DT, []);
  t.round.onVisible();
  t.round.frame(DT, [buttonIntent(t.round.overlay(), 'resume')]);
  assert.equal(t.round.selecting(), 'col');
});

test('AC Huang Zhong cut column 1: skill token 950 ms, then column 1 shot, 0/3, used 1, no skillResult banner', () => {
  const t = selectRound(['huang_zhong'], ['huang_zhong']);
  t.round.frame(DT, [cardIntent('huang_zhong')]);
  t.round.frame(DT, [cell(4, 1)]);
  assert.ok(t.round.tokens().some((tk) => tk.reason === 'skill'));
  const frozenAt = t.round.gameTime();
  for (let i = 0; i < Math.ceil(SKILL_SHOW_MS / DT); i++) t.round.frame(DT, []);
  assert.equal(t.round.gameTime() >= frozenAt, true);
  assert.ok(t.round.tokens().every((tk) => tk.reason !== 'skill'));
  assert.equal(t.board.colContents(1).units.length, 0);
  assert.equal(t.board.count('qi') + t.board.count('dao') + t.board.count('ying'), 0); // extras 旗 刀 营
  assert.equal(t.board.count('gong'), 2);
  assert.equal(t.card('huang_zhong').charge, 0);
  assert.equal(t.skills.skillsUsed().huang_zhong, 1);
  assert.equal(t.round.drainEvents().filter((ev) => ev.type === 'skillResult').length, 0);
});

// ---- 刘备 ----

test('AC Liu Bei tapped during Guan Yu row select or Huang Zhong column select: only cancels, Liu Bei keeps 3/3', () => {
  for (const sel of ['guan_yu', 'huang_zhong']) {
    const t = selectRound([sel, 'liu_bei'], ['liu_bei']);
    charge(t.skills, KIND[sel], 1);
    charge(t.skills, KIND[sel], 2); // capped at need: ready
    t.round.frame(DT, [cardIntent(sel)]);
    assert.notEqual(t.round.selecting(), null, sel);
    t.round.frame(DT, [cardIntent('liu_bei')]);
    assert.equal(t.round.selecting(), null, sel);
    assert.equal(t.round.tokens().length, 0, sel);
    assert.equal(t.card('liu_bei').charge, 3, sel);
  }
});
