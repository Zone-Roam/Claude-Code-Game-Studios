// progress-save: save record, validation, re-read merge (rule 13 table), boot and
// storage states (rules 14-17), notices (rule 18), loadout and duplicate settle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, SAVE_KEY, SAVE_BAD_KEY, SAVE_PROBE_KEY, PROGRESS_TEXTS } from '../../../src/rules/progress-save.mjs';
import { fakeStorage, roundResult, saveText, TEST_CHAPTERS } from '../../helpers/progress-save-fakes.mjs';

function make(st, over) {
  return createProgress(Object.assign({ storage: st.port, chapters: TEST_CHAPTERS, now: () => 42 }, over));
}
const saved = (st) => JSON.parse(st.data[SAVE_KEY]);
const win = (chapterId, over) => roundResult(Object.assign({ chapterId, mode: TEST_CHAPTERS.find((c) => c.id === chapterId).mode }, over));

// ---- corrupt / invalid saves (rules 11, 16) ----

test('AC corrupt "abc{" then win ch01 → valid v1 save with ch01 win, .bad still "abc{"', () => {
  const st = fakeStorage({ [SAVE_KEY]: 'abc{' });
  const p = make(st);
  p.boot();
  p.settle(win('ch01'));
  assert.equal(saved(st).v, 1);
  assert.equal(saved(st).chapters.ch01.wins, 1);
  assert.equal(st.data[SAVE_BAD_KEY], 'abc{');
});

test('AC boot with corrupt "abc{" → backed up to .bad, blank progress, notice "存档读不出来，已从头开始"', () => {
  const st = fakeStorage({ [SAVE_KEY]: 'abc{' });
  const p = make(st);
  const booted = p.boot();
  assert.equal(st.data[SAVE_BAD_KEY], 'abc{');
  assert.deepEqual(p.catalog().map((r) => r.plays), [0, 0, 0]);
  assert.equal(booted.notice, 'corrupt');
  assert.deepEqual(p.nextNotice(), { kind: 'corrupt', text: '存档读不出来，已从头开始' });
});

test('AC chapters is an array → treated as corrupt', () => {
  const raw = JSON.stringify({ v: 1, chapters: [{ stars: 1 }] });
  const st = fakeStorage({ [SAVE_KEY]: raw });
  const p = make(st);
  p.boot();
  assert.equal(st.data[SAVE_BAD_KEY], raw);
  assert.equal(p.nextNotice().kind, 'corrupt');
});

test('AC ch01 {stars: 7} and ch02 valid at boot → ch01 dropped, ch02 kept', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 7, wins: 1, plays: 1 }, ch02: { stars: 1, wins: 1, plays: 2 } }) });
  const p = make(st);
  p.boot();
  assert.equal(p.record('ch01'), null);
  assert.deepEqual(p.record('ch02'), { stars: 1, wins: 1, plays: 2 });
});

test('AC ch01 {stars: 7} at boot, win ch02 → written chapters has no ch01, ch02 wins 1', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 7, wins: 1, plays: 1 } }) });
  const p = make(st);
  p.boot();
  p.settle(win('ch02', { metrics: { dangerMs: 0 } }));
  const chapters = saved(st).chapters;
  assert.equal('ch01' in chapters, false);
  assert.equal(chapters.ch02.wins, 1);
});

test('rule 11: wins > plays and stars > 0 with wins 0 are each dropped', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 0, wins: 2, plays: 1 }, ch02: { stars: 1, wins: 0, plays: 1 } }) });
  const p = make(st);
  p.boot();
  assert.deepEqual([p.record('ch01'), p.record('ch02')], [null, null]);
});

// ---- newer version (rule 15) ----

test('AC v = 2 save with ch01 2 stars → ch01 shows 2 stars, notice newer; win ch02 leaves the save unchanged', () => {
  const text = saveText({ ch01: { stars: 2, wins: 1, plays: 1 } }, { v: 2 });
  const st = fakeStorage({ [SAVE_KEY]: text });
  const p = make(st);
  p.boot();
  assert.equal(p.catalog()[0].bestStars, 2);
  assert.equal(p.storageState(), 'readonly');
  assert.deepEqual(p.nextNotice(), { kind: 'newer', text: '存档来自新版本，这次的进度不会保存' });
  const out = p.settle(win('ch02'));
  assert.equal(st.data[SAVE_KEY], text);
  assert.equal(out.saved, false);
});

test('AC another page rewrites the save to v = 2 after boot → our win does not write, readonly, newer notice', () => {
  const st = fakeStorage();
  const p = make(st);
  p.boot();
  const other = saveText({}, { v: 2 });
  st.data[SAVE_KEY] = other;
  const out = p.settle(win('ch01'));
  assert.equal(st.data[SAVE_KEY], other);
  assert.equal(out.saved, false);
  assert.equal(p.storageState(), 'readonly');
  assert.equal(p.nextNotice().text, PROGRESS_TEXTS.newer);
});

// ---- rule 13 re-read table ----

test('rule 13 row: re-read throws → no write, memory-only, saved false', () => {
  const st = fakeStorage();
  const p = make(st);
  p.boot();
  st.fail.read = true;
  const writes = st.calls.write;
  const out = p.settle(win('ch01'));
  assert.equal(out.saved, false);
  assert.equal(st.calls.write, writes);
  assert.equal(p.storageState(), 'memory');
  assert.equal(p.record('ch01').wins, 1);
});

test('rule 13 row: no save on re-read → memory progress is written', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 1, wins: 1, plays: 1 } }) });
  const p = make(st);
  p.boot();
  delete st.data[SAVE_KEY];
  p.settle(win('ch02', { metrics: { dangerMs: 0 } }));
  assert.deepEqual(Object.keys(saved(st).chapters).sort(), ['ch01', 'ch02']);
  assert.equal(saved(st).updatedAt, 42);
});

test('rule 13 row: v lower than current → migrated then merged (version 2 with a v1 → v2 step)', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 2, wins: 1, plays: 1 } }) });
  const migrations = { 1: (r) => Object.assign({}, r, { v: 2 }) };
  const p = make(st, { version: 2, migrations });
  p.boot();
  p.settle(win('ch02', { metrics: { dangerMs: 0 } }));
  assert.equal(saved(st).v, 2);
  assert.equal(saved(st).chapters.ch01.stars, 2);
});

test('rule 15: a migration that throws is treated as corrupt', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({}) });
  const p = make(st, { version: 2, migrations: { 1: () => { throw new Error('x'); } } });
  p.boot();
  assert.equal(p.nextNotice().kind, 'corrupt');
});

test('rule 13 row: corrupt on re-read → memory progress written, .bad untouched', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 1, wins: 1, plays: 1 } }) });
  const p = make(st);
  p.boot();
  st.data[SAVE_KEY] = '}{';
  p.settle(win('ch02', { metrics: { dangerMs: 0 } }));
  assert.equal(saved(st).chapters.ch01.wins, 1);
  assert.equal(SAVE_BAD_KEY in st.data, false);
});

test('rule 13 row: one invalid re-read chapter record → memory wins for it, rest merged', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 1, wins: 1, plays: 1 } }) });
  const p = make(st);
  p.boot();
  st.data[SAVE_KEY] = saveText({ ch01: { stars: 9, wins: 1, plays: 1 }, ch03: { stars: 2, wins: 1, plays: 1 } });
  p.settle(win('ch02', { metrics: { dangerMs: 0 } }));
  const ch = saved(st).chapters;
  assert.deepEqual(ch.ch01, { stars: 1, wins: 1, plays: 1 });
  assert.equal(ch.ch03.stars, 2);
});

test('AC page A wins ch01, then page B (no ch01 in memory) wins ch02 → both wins in the save', () => {
  const st = fakeStorage();
  const a = make(st);
  const b = make(st);
  a.boot();
  b.boot();
  a.settle(win('ch01'));
  b.settle(win('ch02', { metrics: { dangerMs: 0 } }));
  assert.deepEqual([saved(st).chapters.ch01.wins, saved(st).chapters.ch02.wins], [1, 1]);
});

test('AC ch99 (not in chapter data) kept as is when ch01 is written back', () => {
  const ch99 = { stars: 3, wins: 4, plays: 5, extra: 'x' };
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch99 }, { future: { a: 1 } }) });
  const p = make(st);
  p.boot();
  p.settle(win('ch01', { win: false }));
  assert.deepEqual(saved(st).chapters.ch99, ch99);
  assert.deepEqual(saved(st).future, { a: 1 });
  assert.equal(p.catalog().some((r) => r.id === 'ch99'), false);
});

// ---- boot, probe and storage states (rules 14, 17, 18) ----

test('AC normal storage boot → save untouched by the probe, no pslk.probe left', () => {
  const text = saveText({ ch01: { stars: 1, wins: 1, plays: 1 } });
  const st = fakeStorage({ [SAVE_KEY]: text });
  const p = make(st);
  const booted = p.boot();
  assert.equal(st.data[SAVE_KEY], text);
  assert.equal(SAVE_PROBE_KEY in st.data, false);
  assert.deepEqual(booted, { state: 'normal', notice: null });
});

test('AC read ok but probe fails → progress shown, notice "这台手机存不了新进度…"', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 2, wins: 1, plays: 1 } }) });
  st.fail.write = true;
  const p = make(st);
  p.boot();
  assert.equal(p.catalog()[0].bestStars, 2);
  assert.equal(p.storageState(), 'memory');
  assert.deepEqual(p.nextNotice(), { kind: 'noWrite', text: '这台手机存不了新进度，这次打的关掉后不会保留' });
});

test('AC read throws (no storage) → notice "存不了进度"; win ch01 2 stars shows in catalog, saved false; reload has no stars, all 3 open', () => {
  const st = fakeStorage();
  st.fail.read = true;
  st.fail.write = true;
  const p = make(st);
  p.boot();
  assert.equal(p.nextNotice().text, '这台手机存不了进度，关掉后要从头讲起');
  const out = p.settle(win('ch01', { metrics: { heartsLost: 1 } }));
  assert.equal(out.saved, false);
  assert.equal(p.catalog()[0].bestStars, 2);
  const reloaded = make(st);
  reloaded.boot();
  assert.equal(reloaded.catalog()[0].bestStars, 0);
  assert.deepEqual(reloaded.catalog().map((r) => r.unlocked), [true, true, true]);
});

test('AC first write throws mid-run → saved false, noWrite notice, two more settles make 0 write calls', () => {
  const st = fakeStorage();
  const p = make(st);
  p.boot();
  st.fail.write = true;
  const first = p.settle(win('ch01'));
  assert.equal(first.saved, false);
  assert.equal(p.nextNotice().text, PROGRESS_TEXTS.noWrite);
  const count = st.calls.write;
  p.settle(win('ch02'));
  p.settle(win('ch03'));
  assert.equal(st.calls.write - count, 0);
});

test('AC write fails or state readonly/memory → saved false; write ok → saved true', () => {
  const ok = fakeStorage();
  const p = make(ok);
  p.boot();
  assert.equal(p.settle(win('ch01')).saved, true);
  const ro = fakeStorage({ [SAVE_KEY]: saveText({}, { v: 2 }) });
  const q = make(ro);
  q.boot();
  assert.equal(q.settle(win('ch01')).saved, false);
});

test('AC ended round then page closed mid stamp → stars and plays already in the save on reopen', () => {
  const st = fakeStorage();
  make(st).boot();
  const p = make(st);
  p.boot();
  p.settle(win('ch01', { metrics: { heartsLost: 1 } }));
  const reopened = make(st);
  reopened.boot();
  assert.deepEqual([reopened.record('ch01').stars, reopened.record('ch01').plays], [2, 1]);
});

test('AC page reloaded before the round decided (no settle) → plays not increased', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 1, wins: 1, plays: 1 } }) });
  make(st).boot(); // a round started, the page was refreshed: settle never ran
  const p = make(st);
  p.boot();
  assert.equal(p.record('ch01').plays, 1);
});

test('rule 18: notices one at a time by priority, each at most once per load', () => {
  const st = fakeStorage({ [SAVE_KEY]: 'abc{' });
  st.fail.write = true; // backup and probe fail
  const p = make(st);
  const booted = p.boot();
  assert.equal(booted.notice, 'noWrite');
  assert.deepEqual([p.nextNotice().kind, p.nextNotice().kind, p.nextNotice()], ['noWrite', 'corrupt', null]);
});

// ---- unlocks (rules 8-9) ----

test('AC MVP package, new save → ch01, ch02, ch03 all open', () => {
  const p = make(fakeStorage());
  p.boot();
  assert.deepEqual(p.catalog().map((r) => r.unlocked), [true, true, true]);
});

test('AC story unlock, new save → only ch01; win ch01 opens ch02; a loss in ch02 keeps it open', () => {
  const st = fakeStorage();
  const p = make(st, { unlock: 'story' });
  p.boot();
  assert.deepEqual(p.catalog().map((r) => r.unlocked), [true, false, false]);
  p.settle(win('ch01'));
  assert.deepEqual(p.catalog().map((r) => r.unlocked), [true, true, false]);
  p.settle(win('ch02', { win: false }));
  assert.equal(p.catalog()[1].unlocked, true);
});

test('AC story unlock, ch03 has wins and ch02 none → ch01-ch03 all open', () => {
  const p = make(fakeStorage({ [SAVE_KEY]: saveText({ ch03: { stars: 1, wins: 1, plays: 1 } }) }), { unlock: 'story' });
  p.boot();
  assert.deepEqual(p.catalog().map((r) => r.unlocked), [true, true, true]);
});

// ---- loadout and general unlocks ----

test('AC v1 ch01 without loadout at boot → valid, 2 stars, no notice, save not rewritten', () => {
  const text = saveText({ ch01: { stars: 2, wins: 1, plays: 2 } });
  const st = fakeStorage({ [SAVE_KEY]: text });
  const p = make(st);
  p.boot();
  assert.equal(p.catalog()[0].bestStars, 2);
  assert.equal(p.nextNotice(), null);
  assert.equal(st.data[SAVE_KEY], text);
});

test('AC same save, lose ch01 with guan_yu + zhang_fei → ch01 {stars 2, wins 1, plays 3, loadout}, v 1', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 2, wins: 1, plays: 2 } }) });
  const p = make(st);
  p.boot();
  p.settle(win('ch01', { win: false, loadout: ['guan_yu', 'zhang_fei'] }));
  assert.deepEqual(saved(st).chapters.ch01, { stars: 2, wins: 1, plays: 3, loadout: ['guan_yu', 'zhang_fei'] });
  assert.equal(saved(st).v, 1);
});

test('AC ch02 loadout "zhao_yun" (not an array) → stars and wins kept, loadout dropped, dev log names ch02 and loadout', () => {
  const warnings = [];
  const p = make(fakeStorage({ [SAVE_KEY]: saveText({ ch02: { stars: 1, wins: 1, plays: 1, loadout: 'zhao_yun' } }) }),
    { warn: (msg, data) => warnings.push(data) });
  p.boot();
  assert.deepEqual(p.record('ch02'), { stars: 1, wins: 1, plays: 1 });
  assert.ok(warnings.some((w) => w.chapterId === 'ch02' && w.field === 'loadout'));
});

test('AC ch02 loadout duplicate / [] / 4 items → loadout dropped, record kept', () => {
  for (const loadout of [['zhao_yun', 'zhao_yun'], [], ['a', 'b', 'c', 'd']]) {
    const p = make(fakeStorage({ [SAVE_KEY]: saveText({ ch02: { stars: 1, wins: 1, plays: 1, loadout } }) }));
    p.boot();
    assert.deepEqual(p.record('ch02'), { stars: 1, wins: 1, plays: 1 }, JSON.stringify(loadout));
  }
});

test('AC RoundResult.loadout [] keeps the stored ch02 loadout; with none stored, none is written', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch02: { stars: 1, wins: 1, plays: 1, loadout: ['zhang_fei', 'guan_yu'] } }) });
  const p = make(st);
  p.boot();
  p.settle(win('ch02', { loadout: [] }));
  assert.deepEqual(saved(st).chapters.ch02.loadout, ['zhang_fei', 'guan_yu']);
  const st2 = fakeStorage({ [SAVE_KEY]: saveText({ ch02: { stars: 1, wins: 1, plays: 1 } }) });
  const q = make(st2);
  q.boot();
  q.settle(win('ch02', { loadout: [] }));
  assert.equal('loadout' in saved(st2).chapters.ch02, false);
});

test('AC duplicate settle ch01 attempt 1 → same SettleOutcome, plays not added, no write; attempt 2 settles', () => {
  const st = fakeStorage();
  const warnings = [];
  const p = make(st, { warn: (m) => warnings.push(m) });
  p.boot();
  const first = p.settle(win('ch01', { attempt: 1 }));
  const writes = st.calls.write;
  const again = p.settle(win('ch01', { attempt: 1 }));
  assert.equal(again, first);
  assert.equal(p.record('ch01').plays, 1);
  assert.equal(st.calls.write, writes);
  assert.equal(warnings.length, 1);
  p.settle(win('ch01', { attempt: 2 }));
  assert.equal(p.record('ch01').plays, 2);
});

test('AC ch02 loadout ["zhao_yun", "lv_bu"] (valid shape) kept as is, stars used', () => {
  const p = make(fakeStorage({ [SAVE_KEY]: saveText({ ch02: { stars: 1, wins: 1, plays: 1, loadout: ['zhao_yun', 'lv_bu'] } }) }));
  p.boot();
  assert.deepEqual(p.catalog()[1].loadout, ['zhao_yun', 'lv_bu']);
  assert.equal(p.catalog()[1].bestStars, 1);
});

test('AC round abandoned before a result (no settle) → saved loadout unchanged', () => {
  const text = saveText({ ch01: { stars: 1, wins: 1, plays: 1, loadout: ['guan_yu'] } });
  const st = fakeStorage({ [SAVE_KEY]: text });
  const p = make(st);
  p.boot();
  assert.equal(st.data[SAVE_KEY], text);
  assert.deepEqual(p.record('ch01').loadout, ['guan_yu']);
});

test('AC page A wrote ch01 loadout [guan_yu], page B (memory [zhang_fei]) settles ch02 → ch01 stays [guan_yu], ch02 is B\'s', () => {
  const st = fakeStorage({ [SAVE_KEY]: saveText({ ch01: { stars: 1, wins: 1, plays: 1, loadout: ['zhang_fei'] } }) });
  const a = make(st);
  const b = make(st);
  a.boot();
  b.boot();
  a.settle(win('ch01', { loadout: ['guan_yu'] }));
  b.settle(win('ch02', { loadout: ['zhao_yun', 'zhang_fei'], metrics: { dangerMs: 0 } }));
  assert.deepEqual(saved(st).chapters.ch01.loadout, ['guan_yu']);
  assert.deepEqual(saved(st).chapters.ch02.loadout, ['zhao_yun', 'zhang_fei']);
});

test('AC win ch01 on a new save → only the ch01 record added, no unlocked-generals field; wins drive the derivation', () => {
  const st = fakeStorage();
  const p = make(st);
  p.boot();
  p.settle(win('ch01'));
  assert.deepEqual(Object.keys(saved(st)).sort(), ['chapters', 'updatedAt', 'v']);
  assert.deepEqual(Object.keys(saved(st).chapters), ['ch01']);
  const reloaded = make(st);
  reloaded.boot();
  // general-loadout derives unlocked generals from these wins (starters + unlock of chapters with wins ≥ 1)
  assert.deepEqual(reloaded.catalog().map((r) => r.wins), [1, 0, 0]);
});

test('AC ch03 has wins, ch02 none (story unlock) → ch02 open but its wins stay 0 (its unlock general not earned)', () => {
  const p = make(fakeStorage({ [SAVE_KEY]: saveText({ ch03: { stars: 1, wins: 1, plays: 1 } }) }), { unlock: 'story' });
  p.boot();
  const ch02 = p.catalog()[1];
  assert.deepEqual([ch02.unlocked, ch02.wins], [true, 0]);
});

test('ADR-0004: settle never throws, even when the port throws everywhere', () => {
  const st = fakeStorage();
  const p = make(st);
  p.boot();
  st.fail.read = true;
  st.fail.write = true;
  assert.doesNotThrow(() => p.settle(win('ch01')));
});
