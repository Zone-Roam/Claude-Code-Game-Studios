// Sound recipes (ui-interaction rule 21e), played by src/platform/feedback.mjs.
// SAMPLE_SOUNDS (2026-10-31, user: the synthesized ones sounded dull) play the Kenney CC0
// recordings in sfx-assets.mjs: a voice is { sample, at?, rate?, vol? } (`rate` shifts pitch).
// SOUNDS are the synthesized fallbacks, used while the samples decode or if they cannot:
// an oscillator { wave, f, to?, at, dur, vol } (`to` glides the pitch) or a noise burst
// { noise: filter type, f, q?, at, dur, vol }. `at` and `dur` are seconds, `vol` is 0..1
// before the master gain; `attack` (s) is optional, default 0.003.
// Both tables have the same names; `match` is a function of the combo count in each.

/** Major pentatonic from C5, one step per combo link (match sound). */
export const MATCH_NOTES = Object.freeze([523, 587, 659, 784, 880, 1047, 1175, 1319]);
/** Semitones above the pair sample's own pitch per combo link: a major scale up to one octave,
 * so the 啵 rises without turning shrill. */
export const MATCH_SEMITONES = Object.freeze([0, 2, 4, 5, 7, 9, 11, 12]);

function comboStep(combo) {
  return Math.max(0, Math.min(MATCH_NOTES.length - 1, (combo | 0) - 1));
}

function pluck(f, at) {
  return [
    { wave: 'triangle', f, at, dur: 0.22, vol: 0.4 },
    { wave: 'sine', f: f * 2, at, dur: 0.1, vol: 0.12 },
  ];
}

const XINGMU = [
  { noise: 'highpass', f: 1400, at: 0, dur: 0.05, vol: 0.9 },
  { wave: 'sine', f: 240, to: 110, at: 0, dur: 0.12, vol: 0.7 },
  { wave: 'triangle', f: 950, at: 0, dur: 0.03, vol: 0.3 },
];

const DRUM = [
  { wave: 'sine', f: 130, to: 52, at: 0, dur: 0.32, vol: 1 },
  { noise: 'lowpass', f: 420, at: 0, dur: 0.07, vol: 0.45 },
];

const GONG = [
  { wave: 'sine', f: 196, at: 0, dur: 1.5, vol: 0.4, attack: 0.006 },
  { wave: 'sine', f: 311, at: 0, dur: 1.1, vol: 0.22, attack: 0.006 },
  { wave: 'sine', f: 467, at: 0, dur: 0.8, vol: 0.14, attack: 0.006 },
  { wave: 'sine', f: 622, at: 0, dur: 0.5, vol: 0.08, attack: 0.006 },
  { noise: 'bandpass', f: 900, q: 1.2, at: 0, dur: 0.06, vol: 0.25 },
];

function shift(voices, at) {
  return voices.map((v) => Object.assign({}, v, { at: v.at + at }));
}

/**
 * Every named sound. `match` is built per combo step by matchSound().
 * @type {Object<string, Array<Object>>}
 */
export const SOUNDS = Object.freeze({
  /** Tap on a board tile: a high 木鱼 knock. */
  tap: [
    { wave: 'sine', f: 1150, to: 900, at: 0, dur: 0.07, vol: 0.5 },
    { noise: 'bandpass', f: 2600, q: 2, at: 0, dur: 0.02, vol: 0.15 },
  ],
  /** Buttons and general cards: a lower 木鱼 knock. */
  button: [
    { wave: 'sine', f: 720, to: 560, at: 0, dur: 0.09, vol: 0.55 },
    { noise: 'bandpass', f: 1800, q: 2, at: 0, dur: 0.02, vol: 0.12 },
  ],
  /** 开始游戏 (fallback for the orchestral hit). */
  start: XINGMU,
  /** Opening a chapter from the catalog (fallback for the rising pluck). */
  enter: XINGMU,
  /** Two tiles that cannot link. */
  miss: [{ wave: 'triangle', f: 150, to: 92, at: 0, dur: 0.16, vol: 0.45 }],
  /** Clear effects and the reshuffle: a paper swish. */
  swish: [{ noise: 'bandpass', f: 1500, q: 0.8, at: 0, dur: 0.26, vol: 0.4, attack: 0.05 }],
  /** A general's skill. */
  gong: GONG,
  /** The enemy attacks, or a new row is pushed in. */
  drum: DRUM,
  /** Boss rage: three drum hits, then the gong. */
  rage: [].concat(DRUM, shift(DRUM, 0.13), shift(DRUM, 0.26), shift(GONG, 0.4)),
  /** Hearts or rations come back. */
  chime: [
    { wave: 'sine', f: 1319, at: 0, dur: 0.5, vol: 0.22 },
    { wave: 'sine', f: 1976, at: 0.06, dur: 0.36, vol: 0.12 },
  ],
  /** A general is sealed. */
  thud: [
    { wave: 'sine', f: 170, to: 90, at: 0, dur: 0.2, vol: 0.55 },
    { noise: 'lowpass', f: 600, at: 0, dur: 0.05, vol: 0.2 },
  ],
  /** A skill is charged. */
  ping: [{ wave: 'sine', f: 1568, at: 0, dur: 0.28, vol: 0.22 }],
  /** Win: 醒木, then a rising arpeggio. */
  win: [].concat(XINGMU, pluck(523, 0.18), pluck(659, 0.3), pluck(784, 0.42), pluck(1047, 0.54), pluck(1319, 0.54)),
  /** Lose: three falling notes. */
  lose: [].concat(pluck(392, 0), pluck(330, 0.2), pluck(262, 0.4)),
  match: matchSound,
});

/**
 * The match sound for a combo: each link of a combo plays one pentatonic step higher.
 * @param {number} combo current combo count (1 for a lone match)
 * @returns {Array<Object>} voices
 * @example matchSound(1) // C5 pluck; matchSound(3) // E5 pluck
 */
export function matchSound(combo) {
  return pluck(MATCH_NOTES[comboStep(combo)], 0);
}

/**
 * The sampled match sound: the pair 啵 recording, one scale step higher per combo link.
 * @param {number} combo current combo count (1 for a lone match)
 * @returns {Array<Object>} voices
 * @example matchSample(3) // pair at rate 2^(4/12)
 */
export function matchSample(combo) {
  return [{ sample: 'pair', rate: Math.pow(2, MATCH_SEMITONES[comboStep(combo)] / 12), vol: 0.8 }];
}

/**
 * Every named sound as Kenney samples (names match SOUNDS). Sample names are SFX_DATA keys.
 * @type {Object<string, (Array<Object>|function(number): Array<Object>)>}
 */
export const SAMPLE_SOUNDS = Object.freeze({
  tap: [{ sample: 'tap', vol: 0.9 }],
  button: [{ sample: 'button', vol: 0.9 }],
  start: [{ sample: 'start', vol: 0.9 }],
  enter: [{ sample: 'enter', vol: 0.9 }],
  miss: [{ sample: 'miss', vol: 0.9 }],
  swish: [{ sample: 'swish', vol: 0.9 }],
  gong: [{ sample: 'bell', vol: 0.8 }],
  drum: [{ sample: 'drum' }],
  rage: [{ sample: 'drum' }, { sample: 'drum', at: 0.13, rate: 0.94 }, { sample: 'drum', at: 0.26, rate: 0.88 }, { sample: 'bell', at: 0.4, vol: 0.9 }],
  chime: [{ sample: 'chime', vol: 0.7 }],
  thud: [{ sample: 'latch', vol: 0.8 }],
  ping: [{ sample: 'ping', vol: 0.6 }],
  win: [{ sample: 'win' }],
  lose: [{ sample: 'lose' }],
  match: matchSample,
});
