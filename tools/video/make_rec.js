// Make dist/rec.html: the dev build (BUILD.dev true, so ?seed= is read) plus capture hooks for
// record.py: manual frames (__frame advances rAF and every CSS animation by a fixed step), a log of
// every audio buffer start/stop against that clock (__alog), and window.__screens / __queue for the bot.
// usage: node tools/build/build.mjs && node tools/video/make_rec.js dist && node tools/build/build.mjs --release
// dist/ is gitignored; rec.html never ships.
const fs = require('fs');
const path = require('path');
const dist = process.argv[2];
let h = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
if (!/dev:\s*true/.test(h)) throw new Error('expected a dev build (BUILD.dev true) so ?seed= is read');

const INIT = `<script>
(function () {
  Object.defineProperty(document, 'visibilityState', { get: function () { return 'visible'; } });
  Object.defineProperty(document, 'hidden', { get: function () { return false; } });
  try {
    var ch = {}; ['ch01','ch02','ch03','ch04','ch05','ch06','ch07','ch08','ch09'].forEach(function (id) { ch[id] = { stars: 3, wins: 1, plays: 1 }; });
    localStorage.setItem('pslk.save', JSON.stringify({ v: 1, chapters: ch, updatedAt: Date.now() }));
    localStorage.setItem('pslk.muted', '0');
  } catch (e) {}
  // Manual frames: the page only advances when __frame(dt) is called.
  window.__q = []; window.__t = 1000; window.__vt = 0;
  window.requestAnimationFrame = function (cb) { window.__q.push(cb); return window.__q.length; };
  var seen = new WeakMap();
  window.__frame = function (dt) {
    var q = window.__q; window.__q = []; window.__t += dt; window.__vt += dt;
    for (var j = 0; j < q.length; j++) q[j](window.__t);
    document.getAnimations().forEach(function (a) {
      if (!seen.has(a)) seen.set(a, window.__vt - (a.currentTime || 0));
      try { a.pause(); a.currentTime = window.__vt - seen.get(a); } catch (e) {}
    });
  };
  // Audio: pretend the context runs (no user gesture here), tag decoded buffers in call order,
  // and log every buffer source start/stop against the virtual clock.
  var AC = window.AudioContext || window.webkitAudioContext;
  Object.defineProperty(AC.prototype, 'state', { get: function () { return 'running'; } });
  AC.prototype.resume = function () { return Promise.resolve(); };
  var decIdx = 0, dec = AC.prototype.decodeAudioData;
  AC.prototype.decodeAudioData = function (buf, ok, err) {
    var idx = decIdx++;
    return dec.call(this, buf, function (b) { b.__idx = idx; if (ok) ok(b); }, err);
  };
  var conn = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (d) { this.__dest = d; return conn.apply(this, arguments); };
  window.__alog = [];
  var st = AudioBufferSourceNode.prototype.start, sp = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.start = function (when, off) {
    var b = this.buffer, g = this.__dest;
    if (b && b.__idx !== undefined) window.__alog.push({ ev: 'start', t: window.__vt, idx: b.__idx, rate: this.playbackRate.value,
      loop: this.loop, ls: this.loopStart, le: this.loopEnd, off: off || 0, vol: g && g.gain ? g.gain.value : 1,
      delay: Math.max(0, (when || 0) - this.context.currentTime) });
    return st.apply(this, arguments);
  };
  AudioBufferSourceNode.prototype.stop = function (when) {
    var b = this.buffer;
    if (b && b.__idx !== undefined) window.__alog.push({ ev: 'stop', t: window.__vt, idx: b.__idx, delay: Math.max(0, (when || 0) - this.context.currentTime) });
    return sp.apply(this, arguments);
  };
})();
</script>`;

h = h.replace('<head>', '<head>' + INIT);
const a = 'const screens = createScreens({ chapters, salt: resolveSalt(';
const i = h.indexOf(a);
if (i < 0) throw new Error('screens line not found');
const end = h.indexOf(';\n', i);
h = h.slice(0, end + 1) + ' window.__screens = screens;' + h.slice(end + 1);
if (h.indexOf('const queue = [];') < 0) throw new Error('queue line not found');
h = h.replace('const queue = [];', 'const queue = []; window.__queue = queue;');
fs.writeFileSync(path.join(dist, 'rec.html'), h);
console.log('ok', h.length);
