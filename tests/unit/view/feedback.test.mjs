// ui-interaction rules 21d, 21e (2026-10-31): sounds after a press unlocks audio, Kenney
// samples once decoded (synthesized fallback before or without them), host vibrateShort
// first and navigator.vibrate as fallback, nothing under reduced motion or in the
// background, and no error when an API is missing or throws.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFeedback, HAPTIC_MS, SOUND_REPEAT_MS, MUTE_KEY } from '../../../src/platform/feedback.mjs';
import { musicFor } from '../../../src/view/view.mjs';
import { SOUNDS, SAMPLE_SOUNDS, MATCH_NOTES, MATCH_SEMITONES, matchSound, matchSample } from '../../../src/view/sounds.mjs';
import { SFX_DATA } from '../../../src/view/sfx-assets.mjs';

const SOUND_TABLES = { samples: SAMPLE_SOUNDS, synth: SOUNDS };

function fakeParam() {
  return { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} };
}

// A fake buffer whose first `lead` samples are silent, at 1000 samples per second.
function fakeBuffer(lead) {
  const data = new Float32Array(100);
  data.fill(0.5, lead || 0);
  return { sampleRate: 1000, getChannelData: () => data };
}

// opts.decode: 'ok' calls back with a buffer, 'fail' calls the error callback, 'hold' never answers,
// 'later' keeps the callbacks in opts.pending for the test to call.
function fakeAudio(log, opts) {
  const o = opts || {};
  return class FakeAudioContext {
    constructor() { this.state = 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
    createGain() { return { gain: fakeParam(), connect() {} }; }
    createOscillator() {
      const n = { type: '', frequency: fakeParam(), connect() {}, start() { log.push('osc:' + n.type); }, stop() {} };
      return n;
    }
    createBufferSource() {
      const n = { buffer: null, playbackRate: fakeParam(), loop: false, connect() {},
        stop() { if (n.buffer && n.buffer.tag) log.push('stop:' + n.buffer.tag); },
        start(when, offset) {
          if (n.loop) log.push('loop:' + n.buffer.tag + ' ' + n.loopStart + '-' + n.loopEnd);
          else log.push(n.buffer && n.buffer.tag ? 'sample:' + n.buffer.tag + '@' + (offset || 0) + 'x' + (n.playbackRate.value || 1) : 'buffer');
        } };
      return n;
    }
    createBiquadFilter() { return { type: '', frequency: fakeParam(), Q: fakeParam(), connect() {} }; }
    createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
    decodeAudioData(bytes, ok, fail) {
      const tag = String.fromCharCode.apply(null, new Uint8Array(bytes));
      if (o.decode === 'fail') fail(new Error('cannot decode'));
      else if (o.decode === 'later') o.pending.push(() => ok(Object.assign(fakeBuffer(o.lead), { tag })));
      else if (o.decode !== 'hold') ok(Object.assign(fakeBuffer(o.lead), { tag }));
    }
  };
}

function fakeWindow(extra) {
  const listeners = {};
  const win = {
    document: {
      visibilityState: 'visible',
      addEventListener(type, fn) { listeners[type] = fn; },
    },
    navigator: {},
    atob: (s) => Buffer.from(s, 'base64').toString('latin1'),
    fire(type) { listeners[type](); },
  };
  return Object.assign(win, extra);
}

function clock() {
  let t = 0;
  const now = () => t;
  now.advance = (ms) => { t += ms; };
  return now;
}

// Sample data whose decoded "tag" is the sample's own name, so the log says which one played.
function taggedData(names) {
  const data = {};
  for (const n of names) data[n] = Buffer.from(n, 'latin1').toString('base64');
  return data;
}

function player(log, audioOpts, data) {
  const fb = createFeedback(fakeWindow({ AudioContext: fakeAudio(log, audioOpts) }), {
    now: clock(),
    sounds: Object.assign({ data: data || {} }, SOUND_TABLES),
  });
  fb.unlock();
  log.length = 0; // the silent iOS kick buffer
  return fb;
}

test('play: nothing sounds before a press unlocks audio', () => {
  // Arrange
  const log = [];
  const fb = createFeedback(fakeWindow({ AudioContext: fakeAudio(log) }), { sounds: SOUND_TABLES });
  // Act
  fb.play('tap');
  // Assert
  assert.deepEqual(log, []);
  assert.equal(fb.unlocked(), false);
});

test('play: a decoded sample plays from its first audible sample (MP3 padding skipped)', () => {
  const log = [];
  const fb = player(log, { lead: 25 }, taggedData(['tap']));
  fb.play('tap');
  assert.deepEqual(fb.decoded(), ['tap']);
  assert.deepEqual(log, ['sample:tap@0.025x1']);
});

test('play: match plays the pair sample one scale step higher per combo link', () => {
  const log = [];
  const now = clock();
  const fb = createFeedback(fakeWindow({ AudioContext: fakeAudio(log) }), {
    now, sounds: Object.assign({ data: taggedData(['pair']) }, SOUND_TABLES),
  });
  fb.unlock();
  log.length = 0;
  fb.play('match', 1);
  now.advance(SOUND_REPEAT_MS);
  fb.play('match', 3);
  assert.deepEqual(log, ['sample:pair@0x1', 'sample:pair@0x' + Math.pow(2, 4 / 12)]);
});

test('play: while samples are undecoded (or failed), the synthesized fallback plays', () => {
  const held = [];
  player(held, { decode: 'hold' }, taggedData(['tap'])).play('tap');
  const failed = [];
  player(failed, { decode: 'fail' }, taggedData(['tap'])).play('tap');
  assert.deepEqual(held, ['osc:sine', 'buffer']);
  assert.deepEqual(failed, ['osc:sine', 'buffer']);
});

test('play: a sound needing two samples falls back unless both decoded', () => {
  const log = [];
  const fb = player(log, {}, taggedData(['drum'])); // rage needs drum and bell
  fb.play('rage');
  assert.ok(log.every((l) => !l.startsWith('sample:')), log.join());
  assert.ok(log.length > 0);
});

test('play: the same sound within SOUND_REPEAT_MS plays once; after it, again', () => {
  const log = [];
  const now = clock();
  const fb = createFeedback(fakeWindow({ AudioContext: fakeAudio(log) }), { now, sounds: SOUND_TABLES });
  fb.unlock();
  log.length = 0;
  fb.play('miss');
  now.advance(SOUND_REPEAT_MS - 1);
  fb.play('miss');
  assert.equal(log.length, 1);
  now.advance(1);
  fb.play('miss');
  assert.equal(log.length, 2);
});

test('play: an unknown name is silent', () => {
  const log = [];
  player(log, {}, {}).play('nope');
  assert.deepEqual(log, []);
});

test('play: silent while the page is hidden, and audio suspends then resumes with visibility', () => {
  const log = [];
  const win = fakeWindow({ AudioContext: fakeAudio(log) });
  const fb = createFeedback(win, { now: clock(), sounds: SOUND_TABLES });
  fb.unlock();
  log.length = 0;
  win.document.visibilityState = 'hidden';
  win.fire('visibilitychange');
  fb.play('tap');
  assert.deepEqual(log, []);
  assert.equal(fb.unlocked(), false);
  win.document.visibilityState = 'visible';
  win.fire('visibilitychange');
  assert.equal(fb.unlocked(), true);
});

test('play: no AudioContext at all (or a throwing one) is silent and does not throw', () => {
  const none = createFeedback(fakeWindow({}), { sounds: Object.assign({ data: SFX_DATA }, SOUND_TABLES) });
  none.unlock();
  none.play('gong');
  assert.equal(none.unlocked(), false);
  const ThrowingCtx = function () { throw new Error('blocked'); };
  assert.doesNotThrow(() => {
    const broken = createFeedback(fakeWindow({ AudioContext: ThrowingCtx }), { sounds: SOUND_TABLES });
    broken.unlock();
    broken.play('gong');
  });
});

test('haptic: the host vibrateShort gets the level and wins over navigator.vibrate', () => {
  const calls = [];
  const win = fakeWindow({
    xhs: { miniTool: { vibrateShort: (o) => { calls.push('xhs:' + o.type); return Promise.resolve(); } } },
    navigator: { vibrate: (ms) => calls.push('nav:' + ms) },
  });
  createFeedback(win, { now: clock() }).haptic('heavy');
  assert.deepEqual(calls, ['xhs:heavy']);
});

test('haptic: without the host API, navigator.vibrate gets the HAPTIC_MS length', () => {
  const calls = [];
  createFeedback(fakeWindow({ navigator: { vibrate: (ms) => calls.push(ms) } }), { now: clock() }).haptic('medium');
  assert.deepEqual(calls, [HAPTIC_MS.medium]);
});

test('haptic: reduced motion or a hidden page makes no call', () => {
  const calls = [];
  const win = fakeWindow({ navigator: { vibrate: (ms) => calls.push(ms) } });
  createFeedback(win, { now: clock(), reducedMotion: () => true }).haptic('heavy');
  win.document.visibilityState = 'hidden';
  createFeedback(win, { now: clock() }).haptic('heavy');
  assert.deepEqual(calls, []);
});

test('haptic: a missing API, a throwing one or a rejected promise is silent (iOS case)', async () => {
  assert.doesNotThrow(() => createFeedback(fakeWindow({}), { now: clock() }).haptic('light'));
  const throwing = fakeWindow({ navigator: { vibrate() { throw new Error('denied'); } } });
  assert.doesNotThrow(() => createFeedback(throwing, { now: clock() }).haptic('light'));
  const rejecting = fakeWindow({ xhs: { miniTool: { vibrateShort: () => Promise.reject(new Error('old client')) } } });
  createFeedback(rejecting, { now: clock() }).haptic('light');
  await new Promise((r) => setImmediate(r)); // an unhandled rejection would fail the run
});

test('matchSound / matchSample: one step per combo link, capped at the top step', () => {
  assert.equal(matchSound(1)[0].f, MATCH_NOTES[0]);
  assert.equal(matchSound(3)[0].f, MATCH_NOTES[2]);
  assert.equal(matchSound(99)[0].f, MATCH_NOTES[MATCH_NOTES.length - 1]);
  assert.equal(matchSound(0)[0].f, MATCH_NOTES[0]);
  assert.equal(matchSample(99)[0].rate, Math.pow(2, MATCH_SEMITONES[MATCH_SEMITONES.length - 1] / 12));
});

test('sound tables: the same names in both, every sample exists in SFX_DATA, every synth voice is sane', () => {
  assert.deepEqual(Object.keys(SAMPLE_SOUNDS).sort(), Object.keys(SOUNDS).sort());
  for (const name of Object.keys(SOUNDS)) {
    const sampled = typeof SAMPLE_SOUNDS[name] === 'function' ? SAMPLE_SOUNDS[name](1) : SAMPLE_SOUNDS[name];
    for (const v of sampled) assert.ok(typeof SFX_DATA[v.sample] === 'string' && SFX_DATA[v.sample].length > 100, name + ':' + v.sample);
    const synth = typeof SOUNDS[name] === 'function' ? SOUNDS[name](1) : SOUNDS[name];
    assert.ok(synth.length > 0, name);
    for (const v of synth) {
      assert.ok(v.dur > 0 && v.at >= 0, name);
      assert.ok(v.vol > 0 && v.vol <= 1, name);
      assert.ok(v.f > 0, name);
    }
  }
});

// Music data whose decoded tag is the track name; loop lengths in seconds.
function musicData(names) {
  const m = {};
  for (const n of names) m[n] = { data: Buffer.from(n, 'latin1').toString('base64'), loop: 1 };
  return m;
}

function memoryStorage(initial) {
  const map = Object.assign({}, initial);
  return { map, read: (k) => (k in map ? map[k] : null), write: (k, v) => { map[k] = v; } };
}

test('music: a decoded track loops from its first audible sample for its loop length', () => {
  const log = [];
  const fb = createFeedback(fakeWindow({ AudioContext: fakeAudio(log, { lead: 25 }) }), { music: musicData(['calm']) });
  fb.music('calm');
  assert.deepEqual(log, ['loop:calm 0.025-1.025']);
});

test('music: the same name again does nothing; a new one stops the old and starts the new', () => {
  const log = [];
  const fb = createFeedback(fakeWindow({ AudioContext: fakeAudio(log) }), { music: musicData(['calm', 'battle']) });
  fb.music('calm');
  fb.music('calm');
  fb.music('battle');
  fb.music(null);
  assert.deepEqual(log, ['loop:calm 0-1', 'stop:calm', 'loop:battle 0-1', 'stop:battle']);
});

test('music: a track asked for before it decodes starts when it does; one dropped meanwhile does not', () => {
  const log = [];
  const pending = [];
  const fb = createFeedback(fakeWindow({ AudioContext: fakeAudio(log, { decode: 'later', pending }) }), { music: musicData(['calm', 'battle']) });
  fb.music('battle');
  assert.deepEqual(log, []);
  pending[0](); // calm decodes: not wanted
  pending[1](); // battle decodes: wanted
  assert.deepEqual(log, ['loop:battle 0-1']);
});

test('mute: setMuted silences effects and is written to storage; a stored "1" starts muted', () => {
  const log = [];
  const storage = memoryStorage();
  const fb = createFeedback(fakeWindow({ AudioContext: fakeAudio(log) }), { now: clock(), sounds: SOUND_TABLES, storage });
  fb.unlock();
  log.length = 0;
  fb.setMuted(true);
  fb.play('tap');
  assert.deepEqual(log, []);
  assert.equal(storage.map[MUTE_KEY], '1');
  const again = createFeedback(fakeWindow({ AudioContext: fakeAudio([]) }), { storage });
  assert.equal(again.muted(), true);
  again.setMuted(false);
  assert.equal(storage.map[MUTE_KEY], '0');
});

test('mute: a storage that throws leaves sound on and does not throw', () => {
  const storage = { read() { throw new Error('denied'); }, write() { throw new Error('denied'); } };
  const fb = createFeedback(fakeWindow({ AudioContext: fakeAudio([]) }), { storage });
  assert.equal(fb.muted(), false);
  assert.doesNotThrow(() => fb.setMuted(true));
  assert.equal(fb.muted(), true);
});

test('musicFor: calm on title, catalog, intro and result; battle while playing; silent in the ending', () => {
  assert.equal(musicFor('title', null), 'calm');
  assert.equal(musicFor('catalog', null), 'calm');
  assert.equal(musicFor('round', 'open'), 'calm');
  assert.equal(musicFor('round', 'starting'), 'battle');
  assert.equal(musicFor('round', 'play'), 'battle');
  assert.equal(musicFor('round', 'end'), null);
  assert.equal(musicFor('round', 'settle'), 'calm');
  assert.equal(musicFor('error', null), null);
});
