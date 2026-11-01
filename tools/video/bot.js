// Demo bot, evaluated inside dist/rec.html by record.py. window.__tick() = one bot decision + one
// 1/24 s frame. It plays the chapter named by the page's ?chapter= (default ch05): start, pick the
// chapter, 开讲, then every few frames one pair that board.findPath links (so it never misses),
// a ready general's skill (a targeted one aims at the fullest row). Same ?seed= -> same playthrough.
(function () {
  var W = window, DT = 1000 / 24;
  var chapter = new URLSearchParams(location.search).get('chapter') || 'ch05';
  var B = W.__bot = { f: 0, wait: 0, pend: null, log: [], chapter: chapter };
  function tapEl(el) {
    var r = el.getBoundingClientRect();
    var o = { bubbles: true, isPrimary: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
    el.dispatchEvent(new PointerEvent('pointerdown', o));
    el.dispatchEvent(new PointerEvent('pointerup', o));
  }
  function round() { return W.__screens.screen() === 'round' ? W.__screens.round() : null; }
  function board() { var r = round(); return r ? r.systems().board : null; }
  function tileEl(b, r, c) { return document.querySelectorAll('#board .tile')[(r - 1) * b.cols + (c - 1)]; }
  function live(b) { return b.cells().filter(function (x) { return x.top !== null && x.top !== 'jm'; }); }
  function findPair(b) {
    var cs = live(b);
    for (var i = 0; i < cs.length; i++) for (var j = i + 1; j < cs.length; j++) {
      if (cs[i].top !== cs[j].top) continue;
      if (b.findPath({ r: cs[i].r, c: cs[i].c }, { r: cs[j].r, c: cs[j].c })) return [cs[i], cs[j]];
    }
    return null;
  }
  function busy() {
    var hero = document.getElementById('hero'), mask = document.getElementById('mask');
    return (hero && hero.className === 'on') || (mask && /skill/.test(mask.className)) || !!document.querySelector('#banner.on');
  }
  function snapshot() {
    var r = round(), foe = document.getElementById('foe'), combo = document.querySelector('.combo');
    return { f: B.f, screen: W.__screens.screen(), state: r ? r.state() : '', overlay: r ? r.overlay() : '',
      foe: foe ? foe.innerText.replace(/\s+/g, ' ') : '', hero: (document.getElementById('hero') || {}).className || '',
      banner: (document.querySelector('#banner.on') || {}).innerText || '', mask: (document.getElementById('mask') || {}).className || '',
      combo: combo ? combo.innerText : '' };
  }
  function decide() {
    var s = W.__screens.screen();
    if (B.wait > 0) { B.wait--; return; }
    if (s === 'title') { tapEl(document.querySelector('#title-screen .start')); B.wait = 18; return; }
    if (s === 'catalog') { var cb = document.querySelector('button[data-chapter=' + B.chapter + ']'); if (cb) { tapEl(cb); B.wait = 30; } return; }
    var r = round(); if (!r) return;
    var st = r.state(), ov = r.overlay();
    if (ov === 'open') { var go = [].slice.call(document.querySelectorAll('#card-open button')).filter(function (x) { return /开讲/.test(x.innerText); })[0]; if (go) { tapEl(go); B.wait = 30; } return; }
    if (st !== 'play' || ov) return;
    if (B.pend) { var p = B.pend; B.pend = null; tapEl(tileEl(board(), p.r, p.c)); B.wait = 9; return; }
    if (busy()) return;
    var b = board();
    var armed = document.querySelector('.gcard.armed');
    if (armed) {
      var rows = {}; live(b).forEach(function (x) { rows[x.r] = (rows[x.r] || 0) + 1; });
      var best = Object.keys(rows).sort(function (a, c) { return rows[c] - rows[a]; })[0];
      var cell = live(b).filter(function (x) { return String(x.r) === best; })[0];
      if (cell) { tapEl(tileEl(b, cell.r, cell.c)); B.wait = 30; }
      return;
    }
    var ready = document.querySelector('.gcard.ready');
    if (ready) { W.__queue.push({ type: 'card', general: ready.getAttribute('data-general') }); B.wait = 30; B.log.push({ f: B.f, act: 'skill', g: ready.getAttribute('data-general') }); return; }
    var pr = findPair(b);
    if (!pr) return;
    tapEl(tileEl(b, pr[0].r, pr[0].c)); B.pend = pr[1]; B.wait = 4;
  }
  W.__tick = function () { decide(); W.__frame(DT); B.f++; var sn = snapshot(); B.last = sn; return sn; };
  W.__run = function (n, every) {
    var out = [];
    for (var i = 0; i < n; i++) { var sn = W.__tick(); if (every && B.f % every === 0) out.push(sn); if (sn.overlay === 'win' || sn.overlay === 'lose') { out.push(sn); break; } }
    return out;
  };
})();
