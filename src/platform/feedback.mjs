// Sound and haptic feedback (ui-interaction rules 21d, 21e; user decisions 2026-10-31).
// Sounds are Kenney CC0 recordings embedded as base64 MP3 (src/view/sfx-assets.mjs; the
// 小工具 package takes no audio files) and decoded with Web Audio; until a sound's samples
// are decoded, or if they cannot be, its synthesized fallback plays (src/view/sounds.mjs).
// Haptics use the host's vibrateShort (client 9.50+), then navigator.vibrate; anything
// missing or throwing is skipped silently. Background music (src/view/bgm-assets.mjs) loops
// under the effects; the mute switch silences both and is remembered (rule 21f).

/** Master volume applied to every voice. */
export const MASTER_GAIN = 0.6;
/** A sound repeated sooner than this (ms) is dropped, so a burst of events does not stack. */
export const SOUND_REPEAT_MS = 35;
/** A haptic sooner than this (ms) after the last one is dropped. */
export const HAPTIC_REPEAT_MS = 50;
/** navigator.vibrate lengths when the host API is missing. */
export const HAPTIC_MS = Object.freeze({ light: 12, medium: 30, heavy: 60 });
/** A decoded sample starts at its first sample louder than this (skips MP3 encoder padding). */
export const SAMPLE_ONSET = 0.01;
/** The same for music, whose loop starts mid-phrase and so is never near silent. */
export const MUSIC_ONSET = 0.0001;
/** Background music volume, under the master gain. */
export const MUSIC_GAIN = 0.35;
/** Seconds a track takes to fade in or out when the music changes. */
export const MUSIC_FADE_S = 0.8;
/** Storage key of the mute switch ('1' muted). */
export const MUTE_KEY = 'pslk.muted';

const DEFAULT_ATTACK = 0.003;
const SILENT = 0.0001;

function pick(table, name, combo) {
  const entry = table && table[name];
  return typeof entry === 'function' ? entry(combo) : entry;
}

/**
 * Creates the feedback player and starts decoding the samples. Nothing sounds until
 * `unlock()` runs inside a user gesture (browsers start audio suspended); input.mjs calls it
 * on every press until it holds. Audio suspends while the page is hidden.
 * @param {Object} win the window (injected for tests)
 * @param {{sounds?: {samples?: Object, synth?: Object, data?: Object<string, string>},
 *   music?: Object<string, {data: string, loop: number}>,
 *   storage?: {read: function(string): (string|null), write: function(string, string): void},
 *   reducedMotion?: function(): boolean, now?: function(): number}} [opts]
 *   `sounds.samples` / `sounds.synth` are sounds.mjs's SAMPLE_SOUNDS / SOUNDS, `sounds.data`
 *   is sfx-assets.mjs's SFX_DATA; `music` is bgm-assets.mjs's BGM_DATA; `storage` keeps the
 *   mute switch (storage.mjs's port; failures are ignored); `reducedMotion` true turns haptics
 *   off (rule 21d); `now` is a ms clock for the repeat guards
 * @returns {{unlock: function(): void, play: function(string, number=): void,
 *   music: function((string|null)): void, setMuted: function(boolean): void, muted: function(): boolean,
 *   haptic: function(string): void, unlocked: function(): boolean, decoded: function(): Array<string>}}
 * @example
 * const fb = createFeedback(window, { sounds: { samples: SAMPLE_SOUNDS, synth: SOUNDS, data: SFX_DATA } });
 * fb.unlock(); fb.play('tap'); fb.play('match', 3); fb.haptic('light');
 */
export function createFeedback(win, opts) {
  const o = opts || {};
  const sounds = o.sounds || {};
  const reducedMotion = o.reducedMotion || (() => false);
  const now = o.now || (() => Date.now());
  const buffers = {};
  const tracks = {};
  let master = null;
  let musicBus = null;
  let wantTrack = null;
  let playing = null; // { name, src, gain }
  let muted = false;
  try { muted = !!o.storage && o.storage.read(MUTE_KEY) === '1'; } catch (e) { /* storage refused: not muted */ }
  let noise = null;
  let lastHaptic = -1e9;
  const lastPlayed = {};

  function hidden() {
    return !!(win.document && win.document.visibilityState === 'hidden');
  }

  function makeContext() {
    const Ctor = win.AudioContext || win.webkitAudioContext;
    if (typeof Ctor !== 'function') return null;
    try {
      const c = new Ctor();
      master = c.createGain();
      master.gain.value = muted ? 0 : MASTER_GAIN;
      master.connect(c.destination);
      musicBus = c.createGain();
      musicBus.gain.value = MUSIC_GAIN;
      musicBus.connect(master);
      return c;
    } catch (e) {
      return null;
    }
  }

  // The context exists from the start (suspended) so the samples decode before the first press.
  const ctx = makeContext();

  function onset(buffer, threshold) {
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) if (Math.abs(data[i]) > threshold) return i / buffer.sampleRate;
    return 0;
  }

  function decode(base64, ok) {
    try {
      const bin = win.atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      // Callback form for old WebKit; newer engines also return a promise, caught here.
      const p = ctx.decodeAudioData(bytes.buffer, ok, () => {});
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) { /* stays undecoded: its fallback (or silence, for music) plays */ }
  }

  function decodeAll() {
    const data = sounds.data || {};
    for (const name of Object.keys(data)) {
      decode(data[name], (buffer) => { buffers[name] = { buffer, start: onset(buffer, SAMPLE_ONSET) }; });
    }
    const music = o.music || {};
    for (const name of Object.keys(music)) {
      decode(music[name].data, (buffer) => {
        tracks[name] = { buffer, start: onset(buffer, MUSIC_ONSET), loop: music[name].loop };
        if (wantTrack === name) switchMusic();
      });
    }
  }
  if (ctx) decodeAll();

  // Fades the playing track out and the wanted one in (once it is decoded).
  function switchMusic() {
    const name = wantTrack;
    if (playing && playing.name === name) return;
    try {
      const t = ctx.currentTime;
      if (playing) {
        const old = playing;
        old.gain.gain.setValueAtTime(old.gain.gain.value, t);
        old.gain.gain.linearRampToValueAtTime(0, t + MUSIC_FADE_S);
        old.src.stop(t + MUSIC_FADE_S + 0.05);
        playing = null;
      }
      const track = name ? tracks[name] : null;
      if (!track) return;
      const src = ctx.createBufferSource();
      src.buffer = track.buffer;
      src.loop = true;
      src.loopStart = track.start;
      src.loopEnd = track.start + track.loop;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(1, t + MUSIC_FADE_S);
      src.connect(gain);
      gain.connect(musicBus);
      src.start(t, track.start);
      playing = { name, src, gain };
    } catch (e) { /* the music just stays off */ }
  }

  function noiseBuffer() {
    if (noise) return noise;
    const len = Math.floor(ctx.sampleRate * 0.5);
    noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noise.getChannelData(0);
    // A fixed LCG so the hiss is the same every run; it needs no real randomness.
    let s = 12345;
    for (let i = 0; i < len; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      data[i] = s / 0x3fffffff - 1;
    }
    return noise;
  }

  function envelope(v, t0) {
    const g = ctx.createGain();
    const start = t0 + v.at;
    const attack = v.attack || DEFAULT_ATTACK;
    g.gain.setValueAtTime(SILENT, start);
    g.gain.exponentialRampToValueAtTime(Math.max(SILENT, v.vol), start + attack);
    g.gain.exponentialRampToValueAtTime(SILENT, start + Math.max(attack + 0.01, v.dur));
    g.connect(master);
    return { g, start, end: start + v.dur + 0.02 };
  }

  function sampleVoice(v, t0) {
    const b = buffers[v.sample];
    const src = ctx.createBufferSource();
    src.buffer = b.buffer;
    if (v.rate) src.playbackRate.value = v.rate;
    const g = ctx.createGain();
    g.gain.value = v.vol === undefined ? 1 : v.vol;
    src.connect(g);
    g.connect(master);
    src.start(t0 + (v.at || 0), b.start);
  }

  function synthVoice(v, t0) {
    const env = envelope(v, t0);
    if (v.noise) {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer();
      const filter = ctx.createBiquadFilter();
      filter.type = v.noise;
      filter.frequency.value = v.f;
      if (v.q) filter.Q.value = v.q;
      src.connect(filter);
      filter.connect(env.g);
      src.start(env.start);
      src.stop(env.end);
      return;
    }
    const osc = ctx.createOscillator();
    osc.type = v.wave || 'sine';
    osc.frequency.setValueAtTime(v.f, env.start);
    if (v.to) osc.frequency.exponentialRampToValueAtTime(v.to, env.start + v.dur);
    osc.connect(env.g);
    osc.start(env.start);
    osc.stop(env.end);
  }

  if (win.document && typeof win.document.addEventListener === 'function') {
    win.document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      try {
        if (hidden()) ctx.suspend();
        else ctx.resume();
      } catch (e) { /* the host may refuse; sounds just stay off */ }
    });
  }

  return {
    /** Starts or resumes audio; call from inside a press handler. Safe to call often. */
    unlock() {
      if (!ctx || ctx.state === 'running') return;
      try {
        const p = ctx.resume();
        if (p && typeof p.catch === 'function') p.catch(() => {});
        // iOS starts the output only once a buffer plays inside the gesture.
        const src = ctx.createBufferSource();
        src.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        src.connect(ctx.destination);
        src.start(0);
      } catch (e) { /* stay silent */ }
    },

    /** @returns {boolean} whether audio is running */
    unlocked: () => !!(ctx && ctx.state === 'running'),

    /** @returns {Array<string>} sample and track names decoded so far */
    decoded: () => Object.keys(buffers).concat(Object.keys(tracks)),

    /**
     * Sets the background track: a BGM_DATA name, or null for silence. Calling it again with
     * the same name does nothing, so the view may call it every frame. A change fades over
     * MUSIC_FADE_S; a track not yet decoded starts as soon as it is.
     * @param {(string|null)} name
     */
    music(name) {
      const next = name || null;
      if (next === wantTrack) return;
      wantTrack = next;
      if (ctx) switchMusic();
    },

    /**
     * The mute switch: silences music and effects (haptics stay) and remembers the choice.
     * @param {boolean} on
     */
    setMuted(on) {
      muted = !!on;
      try { if (o.storage) o.storage.write(MUTE_KEY, muted ? '1' : '0'); } catch (e) { /* not remembered */ }
      if (!ctx) return;
      try {
        const t = ctx.currentTime;
        master.gain.setValueAtTime(master.gain.value, t);
        master.gain.linearRampToValueAtTime(muted ? 0 : MASTER_GAIN, t + 0.15);
      } catch (e) { /* stays as it was */ }
    },

    /** @returns {boolean} whether the mute switch is on */
    muted: () => muted,

    /**
     * Plays a named sound now: its samples when all are decoded, else its synthesized
     * fallback. Does nothing before unlock, while hidden, for an unknown name, or when the
     * same name played less than SOUND_REPEAT_MS ago.
     * @param {string} name a SAMPLE_SOUNDS / SOUNDS key
     * @param {number} [combo] combo count, for `match`
     */
    play(name, combo) {
      if (!ctx || ctx.state !== 'running' || hidden() || muted) return;
      const t = now();
      if (name in lastPlayed && t - lastPlayed[name] < SOUND_REPEAT_MS) return;
      const sampled = pick(sounds.samples, name, combo);
      const useSamples = !!(sampled && sampled.every((v) => buffers[v.sample]));
      const voices = useSamples ? sampled : pick(sounds.synth, name, combo);
      if (!voices) return;
      lastPlayed[name] = t;
      try {
        const t0 = ctx.currentTime + 0.005;
        for (const v of voices) {
          if (useSamples) sampleVoice(v, t0);
          else synthVoice(v, t0);
        }
      } catch (e) { /* a refused node just leaves this sound out */ }
    },

    /**
     * One short vibration: 'light' | 'medium' | 'heavy'. Off under reduced motion,
     * while hidden, and within HAPTIC_REPEAT_MS of the last one.
     * @param {string} level
     */
    haptic(level) {
      if (reducedMotion() || hidden()) return;
      const t = now();
      if (t - lastHaptic < HAPTIC_REPEAT_MS) return;
      lastHaptic = t;
      try {
        const mini = win.xhs && win.xhs.miniTool;
        if (mini && typeof mini.vibrateShort === 'function') {
          const p = mini.vibrateShort({ type: level });
          if (p && typeof p.catch === 'function') p.catch(() => {});
          return;
        }
        const nav = win.navigator;
        if (nav && typeof nav.vibrate === 'function') nav.vibrate(HAPTIC_MS[level] || HAPTIC_MS.light);
      } catch (e) { /* no substitute feedback */ }
    },
  };
}
