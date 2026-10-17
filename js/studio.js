/* Colour Party Kids — the colouring studio.
   Fill shapes, undo/redo, magic fill, save as PNG, print, sounds. */
(function (root) {
  'use strict';

  var PALETTE = [
    '#E53935', '#F44336', '#FF8A80', '#EC407A', '#F06292', '#F8BBD0', '#D81B60',
    '#FB8C00', '#FFA726', '#FFCC80', '#FFD54F', '#FFEB3B', '#FFF59D', '#F57F17',
    '#43A047', '#66BB6A', '#A5D6A7', '#7CB342', '#C0CA33', '#9CCC65', '#2E7D32',
    '#00ACC1', '#26C6DA', '#80DEEA', '#1E88E5', '#42A5F5', '#90CAF9', '#1565C0',
    '#8E24AA', '#AB47BC', '#CE93D8', '#E1BEE7', '#5E35B1', '#9575CD', '#D1C4E9',
    '#6D4C41', '#8D6E63', '#BCAAA4', '#FFDBC1', '#FFB74D', '#D7CCC8', '#A1887F',
    '#FFFFFF', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#616161', '#212121', '#FFD700',
    '#1DE9B6', '#00BFA5', '#0091EA', '#651FFF', '#F50057', '#FF6D00', '#76FF03'
  ];

  var S = {
    tpl: null,
    regions: [],
    fills: [],
    undo: [],
    redo: [],
    tool: 'fill',
    colour: '#F44336',
    sound: true,
    zoom: 1,
    baseW: 0,
    saveTimer: 0,
    celebrated: false,
    booted: false
  };

  var el = {};
  var toastTimer = 0;
  var AC = null;

  function $(sel) { return document.querySelector(sel); }
  function on(node, ev, fn) { if (node) node.addEventListener(ev, fn); }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function init() {
    el.view = $('#view-studio');
    if (!el.view) return;
    el.title = $('#studio-title');
    el.sub = $('#studio-sub');
    el.host = $('#svg-host');
    el.stage = $('#studio-stage');
    el.scroll = $('#studio-scroll');
    el.palette = $('#palette-grid');
    el.custom = $('#custom-color');
    el.progressBar = $('#progress-fill');
    el.progressText = $('#progress-text');
    el.undo = $('#btn-undo');
    el.redo = $('#btn-redo');
    el.soundBtn = $('#btn-sound');
    el.cele = $('#celebrate');

    buildPalette();
    bind();
    try { S.sound = localStorage.getItem('ck.sound') !== 'off'; } catch (e) {}
    paintSound();
    paintPalette();
    S.booted = true;
  }

  function buildPalette() {
    var html = '';
    PALETTE.forEach(function (c) {
      html += '<button type="button" class="swatch" data-colour="' + c + '" style="background:' + c + '" aria-label="Colour ' + c + '"></button>';
    });
    el.palette.innerHTML = html;
  }

  function paintPalette() {
    each(el.palette.querySelectorAll('.swatch'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-colour').toUpperCase() === S.colour.toUpperCase());
    });
  }

  function bind() {
    on(el.palette, 'click', function (e) {
      var b = e.target.closest('.swatch');
      if (!b) return;
      setColour(b.getAttribute('data-colour'));
      blip(520 + Math.random() * 160);
    });
    on(el.custom, 'input', function () { setColour(el.custom.value); });
    each(document.querySelectorAll('[data-tool]'), function (b) {
      on(b, 'click', function () { setTool(b.getAttribute('data-tool')); });
    });
    on(el.undo, 'click', undo);
    on(el.redo, 'click', redo);
    on($('#btn-clear'), 'click', clearAll);
    on($('#btn-magic'), 'click', magicFill);
    on($('#btn-save'), 'click', savePng);
    on($('#btn-print'), 'click', printPage);
    on($('#btn-zoom-in'), 'click', function () { setZoom(S.zoom + 0.25); });
    on($('#btn-zoom-out'), 'click', function () { setZoom(S.zoom - 0.25); });
    on($('#btn-zoom-reset'), 'click', function () { setZoom(1); });
    on(el.soundBtn, 'click', toggleSound);
    on(el.host, 'click', onCanvasClick);
    on($('#btn-studio-back'), 'click', function () { location.hash = '#/gallery'; });
    on($('#btn-studio-random'), 'click', function () { open(root.CT.random().id); });
    on($('#celebrate-save'), 'click', function () { savePng(); });
    on($('#celebrate-close'), 'click', hideCelebrate);
    on($('#celebrate-new'), 'click', function () { hideCelebrate(); open(root.CT.random().id); });
    on(document, 'keydown', onKey);
    window.addEventListener('resize', function () { if (S.zoom === 1) fit(); });
    window.addEventListener('afterprint', function () { document.body.classList.remove('print-mode'); });
  }

  function setColour(c) {
    S.colour = c;
    paintPalette();
  }

  function setTool(t) {
    S.tool = t;
    each(document.querySelectorAll('[data-tool]'), function (b) {
      var active = b.getAttribute('data-tool') === t;
      b.classList.toggle('active', active);
      b.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    if (el.stage) el.stage.classList.toggle('erase-mode', t === 'erase');
  }

  function open(id) {
    var tpl = root.CT.byId(id);
    hideCelebrate();
    if (!tpl) {
      if (el.title) el.title.textContent = 'Oops!';
      if (el.sub) el.sub.textContent = 'That page could not be found.';
      if (el.host) el.host.innerHTML = '<div class="oops"><p>We could not find that colouring page.</p><p><a href="#/gallery">Back to all colouring pages</a></p></div>';
      document.title = "Page not found — Rudra Studio";
      return;
    }

    if (root.Auth && !root.Auth.canAccess(tpl.id)) {
      location.hash = '#/gallery';
      root.Auth.showPaywall(tpl.id);
      return;
    }

    if (root.Auth) {
      var rec = root.Auth.recordAccess(tpl.id);
      if (rec && rec.newlyUnlocked && !rec.isPro) {
        setTimeout(function () {
          toast('Pattern ' + rec.count + ' of ' + root.Auth.MAX_STARTER_PATTERNS + ' unlocked! 🎨');
        }, 350);
      }
    }

    S.tpl = tpl;
    S.celebrated = false;
    S.zoom = 1;
    el.title.textContent = tpl.title;
    document.title = tpl.title + " — Rudra Studio";
    var cat = null;
    root.CT.CATEGORIES.forEach(function (c) { if (c.key === tpl.cat) cat = c; });
    if (el.sub) el.sub.textContent = (cat ? cat.emoji + ' ' + cat.name + ' · ' : '') + 'Tap a shape to colour it in!';
    var out = root.CT.render(tpl);
    el.host.innerHTML = out.svg;
    S.regions = Array.prototype.slice.call(el.host.querySelectorAll('.region'));
    S.undo = [];
    S.redo = [];
    S.fills = [];
    for (var i = 0; i < S.regions.length; i++) S.fills.push('#ffffff');
    restore();
    fit();
    updateUndoButtons();
    updateProgress(true);
    updateToolbar();
    addRecent(tpl.id);
    blip(600);
  }

  function restore() {
    try {
      var raw = localStorage.getItem('ck.fills.' + S.tpl.id);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (data && Array.isArray(data.f)) {
        for (var i = 0; i < Math.min(data.f.length, S.regions.length); i++) {
          if (data.f[i] && String(data.f[i]).toUpperCase() !== '#FFFFFF') {
            S.fills[i] = data.f[i];
            S.regions[i].setAttribute('fill', data.f[i]);
          }
        }
        var resumed = false;
        for (i = 0; i < S.fills.length; i++) if (S.fills[i].toUpperCase() !== '#FFFFFF') { resumed = true; break; }
        if (resumed) toast('Picked up where you left off ✏️');
        if (resumed && filledCount() >= S.regions.length && S.regions.length > 1) S.celebrated = true;
      }
    } catch (e) {}
  }

  function onCanvasClick(e) {
    var t = e.target.closest ? e.target.closest('.region') : null;
    if (!t || !el.host.contains(t)) return;
    var i = S.regions.indexOf(t);
    if (i < 0) return;
    if (S.tool === 'erase') apply(i, '#ffffff', true, 340);
    else apply(i, S.colour, true, 480 + Math.random() * 300);
  }

  function apply(i, colour, record, freq) {
    var node = S.regions[i];
    var prev = S.fills[i] || '#ffffff';
    if (String(prev).toUpperCase() === String(colour).toUpperCase()) { blip(freq); return; }
    S.fills[i] = colour;
    node.setAttribute('fill', colour);
    node.classList.remove('pop');
    if (node.getBoundingClientRect) void node.getBoundingClientRect();
    node.classList.add('pop');
    clearTimeout(node._popT);
    node._popT = setTimeout(function () { node.classList.remove('pop'); }, 300);
    if (record) {
      S.undo.push({ i: i, prev: prev, next: colour });
      if (S.undo.length > 500) S.undo.shift();
      S.redo = [];
    }
    blip(freq || 520);
    updateUndoButtons();
    updateProgress();
    scheduleSave();
  }

  function undoEntry(a) {
    if (a.group) a.group.forEach(function (x) { S.regions[x.i].setAttribute('fill', x.prev); S.fills[x.i] = x.prev; });
    else { S.regions[a.i].setAttribute('fill', a.prev); S.fills[a.i] = a.prev; }
  }
  function redoEntry(a) {
    if (a.group) a.group.forEach(function (x) { S.regions[x.i].setAttribute('fill', x.next); S.fills[x.i] = x.next; });
    else { S.regions[a.i].setAttribute('fill', a.next); S.fills[a.i] = a.next; }
  }
  function undo() {
    var a = S.undo.pop();
    if (!a) return;
    undoEntry(a);
    S.redo.push(a);
    blip(340);
    updateUndoButtons();
    updateProgress();
    scheduleSave();
  }
  function redo() {
    var a = S.redo.pop();
    if (!a) return;
    redoEntry(a);
    S.undo.push(a);
    blip(640);
    updateUndoButtons();
    updateProgress();
    scheduleSave();
  }

  function clearAll() {
    var group = [];
    for (var i = 0; i < S.regions.length; i++) {
      if (String(S.fills[i]).toUpperCase() !== '#FFFFFF') {
        group.push({ i: i, prev: S.fills[i], next: '#ffffff' });
        S.fills[i] = '#ffffff';
        S.regions[i].setAttribute('fill', '#ffffff');
      }
    }
    if (!group.length) return;
    S.undo.push({ group: group });
    S.redo = [];
    toast('All clear — start again! 🧽');
    blip(300);
    updateUndoButtons();
    updateProgress();
    scheduleSave();
  }

  function magicFill() {
    var pool = PALETTE.filter(function (c) { return c.toUpperCase() !== '#FFFFFF'; });
    pool = pool.slice().sort(function () { return Math.random() - 0.5; });
    var group = [], k = 0;
    for (var i = 0; i < S.regions.length; i++) {
      var c = pool[k++ % pool.length];
      if (String(S.fills[i]).toUpperCase() !== c.toUpperCase()) {
        group.push({ i: i, prev: S.fills[i], next: c });
        S.fills[i] = c;
        S.regions[i].setAttribute('fill', c);
      }
    }
    if (!group.length) return;
    S.undo.push({ group: group });
    S.redo = [];
    blip(660);
    setTimeout(function () { blip(920); }, 110);
    toast('Magic rainbow colours! 🪄');
    updateUndoButtons();
    updateProgress();
    scheduleSave();
  }

  function filledCount() {
    var c = 0;
    for (var i = 0; i < S.fills.length; i++) {
      if (S.fills[i] && String(S.fills[i]).toUpperCase() !== '#FFFFFF') c++;
    }
    return c;
  }

  function updateProgress(silent) {
    var total = S.regions.length || 1;
    var done = filledCount();
    var pct = Math.round(done / total * 100);
    if (el.progressBar) el.progressBar.style.width = pct + '%';
    if (el.progressText) el.progressText.textContent = done + ' of ' + S.regions.length + ' shapes coloured · ' + pct + '%';
    if (!silent && done >= total && total > 1 && !S.celebrated) {
      S.celebrated = true;
      celebrate();
    }
  }

  function updateUndoButtons() {
    if (el.undo) el.undo.disabled = S.undo.length === 0;
    if (el.redo) el.redo.disabled = S.redo.length === 0;
  }

  function updateToolbar() {
    setTool(S.tool || 'fill');
  }

  function scheduleSave() {
    clearTimeout(S.saveTimer);
    S.saveTimer = setTimeout(function () {
      try {
        if (S.tpl) localStorage.setItem('ck.fills.' + S.tpl.id, JSON.stringify({ f: S.fills, u: Date.now() }));
      } catch (e) {}
    }, 450);
  }

  /* ---------- save as PNG ---------- */
  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'colouring-page';
  }
  function savePng() {
    try {
      var svg = el.host.querySelector('svg');
      if (!svg) return;
      var clone = svg.cloneNode(true);
      clone.setAttribute('width', '1600');
      clone.setAttribute('height', '1600');
      var data = new XMLSerializer().serializeToString(clone);
      var blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var cv = document.createElement('canvas');
        cv.width = 1600;
        cv.height = 1600;
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1600, 1600);
        ctx.drawImage(img, 0, 0, 1600, 1600);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) {
          if (!b) { fallback(url); return; }
          var a = document.createElement('a');
          a.href = URL.createObjectURL(b);
          a.download = slug(S.tpl.title) + '-coloured.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
          toast('Saved! Check your Downloads 🖼️');
          blip(780);
        }, 'image/png');
      };
      img.onerror = function () { fallback(url); };
      img.src = url;
      function fallback(u) {
        window.open(u, '_blank');
        toast('Picture opened — right-click or long-press to save it');
      }
    } catch (e) {
      toast('Saving did not work here — try the Print button');
    }
  }

  function printPage() {
    document.body.classList.add('print-mode');
    setTimeout(function () { window.print(); }, 70);
  }

  /* ---------- zoom ---------- */
  function fit() {
    if (!el.scroll) return;
    var w = el.scroll.clientWidth - 30;
    S.baseW = Math.max(260, Math.min(w || 600, 640));
    applyZoom();
  }
  function setZoom(z) {
    S.zoom = Math.max(1, Math.min(3, z));
    applyZoom();
  }
  function applyZoom() {
    var svg = el.host.querySelector('svg');
    if (!svg) return;
    svg.style.width = Math.round(S.baseW * S.zoom) + 'px';
    svg.style.height = 'auto';
  }

  /* ---------- sound ---------- */
  function blip(freq) {
    if (!S.sound) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      AC = AC || new Ctx();
      if (AC.state === 'suspended') AC.resume();
      var o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine';
      o.frequency.value = freq || 600;
      g.gain.setValueAtTime(0.0001, AC.currentTime);
      g.gain.exponentialRampToValueAtTime(0.07, AC.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 0.2);
      o.connect(g);
      g.connect(AC.destination);
      o.start();
      o.stop(AC.currentTime + 0.22);
    } catch (e) {}
  }
  function toggleSound() {
    S.sound = !S.sound;
    try { localStorage.setItem('ck.sound', S.sound ? 'on' : 'off'); } catch (e) {}
    paintSound();
  }
  function paintSound() {
    if (!el.soundBtn) return;
    el.soundBtn.textContent = S.sound ? '🔊 Sound on' : '🔇 Sound off';
    el.soundBtn.setAttribute('aria-pressed', S.sound ? 'true' : 'false');
  }

  /* ---------- celebration ---------- */
  function celebrate() {
    if (el.cele) { el.cele.hidden = false; el.cele.classList.add('show'); }
    confetti();
    [660, 880, 990, 1320].forEach(function (f, i) { setTimeout(function () { blip(f); }, i * 120); });
  }
  function hideCelebrate() { if (el.cele) { el.cele.hidden = true; el.cele.classList.remove('show'); } }
  function confetti() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var box = document.getElementById('confetti');
    if (!box) return;
    box.hidden = false;
    var html = '';
    for (var i = 0; i < 70; i++) {
      var c = PALETTE[i % 42];
      var left = Math.random() * 100;
      var delay = Math.random() * 0.7;
      var dur = 1.8 + Math.random() * 1.6;
      var sz = 8 + Math.random() * 10;
      html += '<i style="left:' + left.toFixed(2) + '%;background:' + c + ';width:' + sz.toFixed(1) + 'px;height:' + (sz * 1.3).toFixed(1) + 'px;animation-delay:' + delay.toFixed(2) + 's;animation-duration:' + dur.toFixed(2) + 's"></i>';
    }
    box.innerHTML = html;
    setTimeout(function () { box.hidden = true; box.innerHTML = ''; }, 3800);
  }

  /* ---------- shared helpers ---------- */
  function toast(msg) {
    var node = document.getElementById('toast');
    if (!node) return;
    node.textContent = msg;
    node.hidden = false;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { node.classList.remove('show'); node.hidden = true; }, 2400);
  }
  function addRecent(id) {
    try {
      var a = JSON.parse(localStorage.getItem('ck.recent') || '[]');
      a = a.filter(function (x) { return x !== id; });
      a.unshift(id);
      localStorage.setItem('ck.recent', JSON.stringify(a.slice(0, 12)));
    } catch (e) {}
  }
  function onKey(e) {
    if (!el.view || el.view.hidden) return;
    var tag = ((e.target && e.target.tagName) || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === 'Escape') {
      if (el.cele && !el.cele.hidden) hideCelebrate();
      else location.hash = '#/gallery';
      return;
    }
    var mod = e.metaKey || e.ctrlKey;
    if (!mod) return;
    if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') { e.preventDefault(); redo(); }
  }

  root.CKStudio = { init: init, open: open, toast: toast };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
