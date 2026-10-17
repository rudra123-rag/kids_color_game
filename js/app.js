/* Rudra Studio — home page, gallery, filters, favourites, auth UI, routing. */
(function (root) {
  'use strict';
  var CT = root.CT;

  var G = { cat: 'all', q: '', detail: 'any', fav: false, sort: 'fun', page: 1, per: 24 };
  var favs = new Set();
  var els = {};

  function $(s) { return document.querySelector(s); }
  function $$(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmt(n) { return Number(n).toLocaleString('en-GB'); }
  function tryRender(t) { try { return CT.render(t); } catch (e) { return null; } }
  function loadFavs() { try { (JSON.parse(localStorage.getItem('ck.favs') || '[]') || []).forEach(function (id) { favs.add(id); }); } catch (e) {} }
  function saveFavs() { try { localStorage.setItem('ck.favs', JSON.stringify(Array.from(favs))); } catch (e) {} }
  function savedFills(id) {
    try {
      var d = JSON.parse(localStorage.getItem('ck.fills.' + id) || 'null');
      return d && Array.isArray(d.f) ? d.f : null;
    } catch (e) { return null; }
  }
  function catByKey(key) {
    for (var i = 0; i < CT.CATEGORIES.length; i++) if (CT.CATEGORIES[i].key === key) return CT.CATEGORIES[i];
    return { emoji: '\uD83C\uDFA8', name: 'Colouring' };
  }
  function doneCount(id) {
    var f = savedFills(id);
    if (!f) return 0;
    var c = 0;
    for (var i = 0; i < f.length; i++) if (f[i] && String(f[i]).toUpperCase() !== '#FFFFFF') c++;
    return c;
  }

  /* ---------------- Auth & Quota UI ---------------- */
  function renderHeaderAuth() {
    var container = $('#header-auth');
    if (!container || !root.Auth) return;

    var user = root.Auth.getUser();
    var isPro = root.Auth.isPro();
    var count = root.Auth.getUnlockedCount();

    if (user.isGuest) {
      container.innerHTML =
        '<button type="button" class="btn ghost small" id="btn-open-login">🔑 Log in</button>' +
        '<button type="button" class="btn primary small" id="btn-open-register">✨ Sign up</button>';
    } else {
      var planBadge = isPro ?
        '<span class="user-badge badge-pro">⭐ Pro</span>' :
        '<span class="user-badge badge-starter">' + count + '/30</span>';

      container.innerHTML =
        '<div class="user-pill-wrap">' +
          '<button type="button" class="user-pill" id="btn-user-menu" aria-expanded="false" aria-haspopup="true">' +
            '<span class="user-avatar" aria-hidden="true">🎨</span>' +
            '<span class="user-name">' + esc(user.name) + '</span>' +
            planBadge +
            '<span class="user-caret" aria-hidden="true">▾</span>' +
          '</button>' +
          '<div class="user-dropdown" id="user-dropdown" hidden>' +
            '<div class="dropdown-header">' +
              '<strong>' + esc(user.name) + '</strong>' +
              '<small>' + esc(user.email) + '</small>' +
            '</div>' +
            '<div class="dropdown-plan">' +
              '<span>Membership:</span>' +
              '<strong>' + (isPro ? '🌟 Unlimited Pro' : 'Starter (30 patterns)') + '</strong>' +
            '</div>' +
            (!isPro ? '<button type="button" class="btn coral small btn-block dropdown-upgrade" data-trigger-paywall>⭐ Upgrade to Pro</button>' : '') +
            '<button type="button" class="dropdown-item" id="btn-logout">🚪 Log out</button>' +
          '</div>' +
        '</div>';
    }
  }

  function renderQuotaBanner() {
    var banner = $('#gallery-quota-banner');
    if (!banner || !root.Auth) return;

    if (root.Auth.isPro()) {
      banner.hidden = true;
      return;
    }

    banner.hidden = false;
    var count = root.Auth.getUnlockedCount();
    var max = root.Auth.MAX_STARTER_PATTERNS;
    var pct = Math.min(100, Math.round(count / max * 100));

    var countText = $('#quota-count-text');
    if (countText) countText.textContent = count + ' of ' + max;

    var bar = $('#quota-progress-bar');
    if (bar) bar.style.width = pct + '%';
  }

  /* ---------------- cards ---------------- */
  function cardHtml(t) {
    var cat = catByKey(t.cat);
    var lvl = { easy: 'Easy', medium: 'Medium', detailed: 'Detailed' }[t.detail] || 'Medium';
    var fav = favs.has(t.id);

    var isLocked = false;
    if (root.Auth && !root.Auth.isPro() && root.Auth.getUnlockedCount() >= root.Auth.MAX_STARTER_PATTERNS) {
      var unl = root.Auth.getUnlockedPatterns();
      if (unl.indexOf(t.id) === -1) {
        isLocked = true;
      }
    }

    return '<article class="card' + (isLocked ? ' card-locked' : '') + '">' +
      '<i class="ribbon' + (isLocked ? ' ribbon-pro' : '') + '" data-ribbon="' + t.id + '"' + (isLocked ? '' : ' hidden') + '>' + (isLocked ? '🔒 Pro' : '') + '</i>' +
      '<button type="button" class="thumb" data-open="' + t.id + '" aria-label="Open ' + esc(t.title) + ' in the colouring studio">' +
      '<span class="thumb-art" data-thumb="' + t.id + '"></span>' +
      (isLocked ? '<span class="thumb-lock-overlay" aria-hidden="true"><span>🔒 Pro</span></span>' : '') +
      '</button>' +
      '<div class="card-body">' +
      '<h3 class="card-title">' + esc(t.title) + '</h3>' +
      '<div class="card-meta">' +
      '<span class="chip">' + cat.emoji + ' ' + esc(cat.name) + '</span>' +
      '<span class="chip" data-count="' + t.id + '">\u2026</span>' +
      '<span class="chip lvl lvl-' + t.detail + '">' + lvl + '</span>' +
      '</div>' +
      '<div class="card-actions">' +
      '<button type="button" class="btn ' + (isLocked ? 'sun' : 'primary') + '" data-open="' + t.id + '">' + (isLocked ? '🔒 Unlock' : '\uD83D\uDD8D\uFE0F Colour') + '</button>' +
      '<button type="button" class="btn ghost fav-btn' + (fav ? ' fav-on' : '') + '" data-fav="' + t.id + '" aria-pressed="' + fav + '" aria-label="Add to favourites">' + (fav ? '\u2764\uFE0F' : '\uD83E\uDD0D') + '</button>' +
      '</div></div></article>';
  }

  function afterCards(container, list) {
    list.forEach(function (t) {
      var info = tryRender(t);
      var holder = container.querySelector('[data-thumb="' + t.id + '"]');
      if (holder && info) holder.innerHTML = info.svg;
      var ce = container.querySelector('[data-count="' + t.id + '"]');
      if (ce && info) ce.textContent = info.count + ' shapes';
      var rb = container.querySelector('[data-ribbon="' + t.id + '"]');
      if (rb && info && !rb.classList.contains('ribbon-pro')) {
        var done = doneCount(t.id);
        if (done > 0 && done < info.count) { rb.textContent = 'In progress \u270F\uFE0F'; rb.hidden = false; }
        else if (done > 0 && done >= info.count) { rb.textContent = 'Finished \u2B50'; rb.hidden = false; }
      }
    });
  }

  /* ---------------- home ---------------- */
  function renderHome() {
    var c1 = $('#stat-count');
    if (c1) c1.textContent = fmt(CT.count);
    var c2 = $('#stat-cats');
    if (c2) c2.textContent = CT.CATEGORIES.length;

    var ch = '';
    CT.CATEGORIES.forEach(function (c, i) {
      ch += '<a class="cat-card g' + (i % 8) + '" href="#/gallery?cat=' + c.key + '">' +
        '<span class="cat-emoji" aria-hidden="true">' + c.emoji + '</span>' +
        '<span class="cat-name">' + esc(c.name) + '</span>' +
        '<span class="cat-count">' + fmt(c.count) + ' pages</span>' +
        '<span class="cat-blurb">' + esc(c.blurb) + '</span></a>';
    });
    var grid = $('#category-grid');
    if (grid) grid.innerHTML = ch;

    var picks = [];
    ['animals', 'vegetables', 'fruits', 'sea', 'vehicles', 'food', 'mandalas', 'dinos', 'space', 'flowers'].forEach(function (key) {
      var t = CT.catalog.filter(function (x) { return x.cat === key; })[7];
      if (t) picks.push(t);
    });
    var pop = $('#popular-grid');
    if (pop) {
      var h = '';
      picks.slice(0, 10).forEach(function (t) { h += cardHtml(t); });
      pop.innerHTML = h;
      afterCards(pop, picks.slice(0, 10));
    }
  }

  function renderRecents() {
    var sec = $('#recent-section');
    var grid = $('#recent-grid');
    if (!sec || !grid) return;
    var list = [];
    try { list = JSON.parse(localStorage.getItem('ck.recent') || '[]'); } catch (e) {}
    var items = list.map(function (id) { return CT.byId(id); }).filter(Boolean).slice(0, 4);
    if (!items.length) { sec.hidden = true; return; }
    sec.hidden = false;
    grid.innerHTML = items.map(cardHtml).join('');
    afterCards(grid, items);
  }

  /* ---------------- gallery ---------------- */
  function buildChips() {
    var host = $('#filters-chips');
    if (!host) return;
    var all = [{ key: 'all', name: 'All pages (' + fmt(CT.count) + ')', emoji: '🌈' }].concat(
      CT.CATEGORIES.map(function (c) { return { key: c.key, name: c.name + ' (' + fmt(c.count) + ')', emoji: c.emoji }; })
    );
    var h = '';
    all.forEach(function (c) {
      h += '<button type="button" class="chip-btn" data-cat="' + c.key + '">' + c.emoji + ' ' + esc(c.name) + '</button>';
    });
    host.innerHTML = h;
  }

  function syncControls() {
    var search = $('#search-input');
    if (search && search.value !== G.q) search.value = G.q;
    var sort = $('#sort-select');
    if (sort) sort.value = G.sort;
    var detail = $('#detail-select');
    if (detail) detail.value = G.detail;
    var favT = $('#fav-toggle');
    if (favT) favT.checked = G.fav;
    $$('#filters-chips .chip-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-cat') === G.cat);
    });
    renderQuotaBanner();
  }

  function renderGallery() {
    renderQuotaBanner();
    var res = CT.search({
      q: G.q,
      cat: G.cat,
      detail: G.detail,
      fav: G.fav,
      favs: favs,
      sort: G.sort,
      page: G.page,
      per: G.per
    });

    var summary = $('#active-summary');
    if (summary) {
      var parts = ['Showing ' + fmt(res.total) + ' colouring page' + (res.total === 1 ? '' : 's')];
      if (G.cat !== 'all') parts.push('in ' + catByKey(G.cat).name);
      if (G.detail !== 'any') parts.push('(' + G.detail + ')');
      if (G.fav) parts.push('saved as favourite');
      if (G.q) parts.push('matching “' + esc(G.q) + '”');
      summary.innerHTML = parts.join(' ') +
        (G.q || G.cat !== 'all' || G.detail !== 'any' || G.fav ? ' · <button type="button" class="link-btn js-reset">Reset filters</button>' : '');
    }

    if (!els.grid) return;
    if (!res.items.length) {
      els.grid.innerHTML = '<div class="empty-state"><h3>No colouring pages found</h3><p>Try clearing the search box or picking another category.</p><button type="button" class="btn primary js-reset">Show all pages</button></div>';
      $('#pagination').innerHTML = '';
      return;
    }
    els.grid.innerHTML = res.items.map(cardHtml).join('');
    afterCards(els.grid, res.items);
    renderPagination(res.page, res.pages);
  }

  function renderPagination(cur, total) {
    var nav = $('#pagination');
    if (!nav) return;
    if (total <= 1) { nav.innerHTML = ''; return; }
    var h = '<button type="button" class="btn ghost small" data-page="' + (cur - 1) + '"' + (cur <= 1 ? ' disabled' : '') + '>← Prev</button>';
    var maxB = 7;
    var start = Math.max(1, cur - Math.floor(maxB / 2));
    var end = Math.min(total, start + maxB - 1);
    if (end - start + 1 < maxB) start = Math.max(1, end - maxB + 1);
    if (start > 1) h += '<button type="button" class="btn ghost small" data-page="1">1</button>' + (start > 2 ? '<span class="gap">…</span>' : '');
    for (var i = start; i <= end; i++) {
      h += '<button type="button" class="btn ' + (i === cur ? 'primary' : 'ghost') + ' small" data-page="' + i + '">' + i + '</button>';
    }
    if (end < total) h += (end < total - 1 ? '<span class="gap">…</span>' : '') + '<button type="button" class="btn ghost small" data-page="' + total + '">' + total + '</button>';
    h += '<button type="button" class="btn ghost small" data-page="' + (cur + 1) + '"' + (cur >= total ? ' disabled' : '') + '>Next →</button>';
    nav.innerHTML = h;
  }

  function initHero() {
    var box = $('#hero-art');
    if (!box) return;
    var sample = CT.catalog.filter(function (t) { return t.cat === 'animals'; })[0];
    if (sample) {
      var r = tryRender(sample);
      if (r) box.innerHTML = r.svg;
    }
  }

  /* ---------------- events ---------------- */
  function bindControls() {
    var search = $('#search-input');
    if (search) {
      var debounce = 0;
      search.addEventListener('input', function () {
        clearTimeout(debounce);
        debounce = setTimeout(function () {
          G.q = search.value;
          G.page = 1;
          renderGallery();
        }, 120);
      });
    }
    var sort = $('#sort-select');
    if (sort) sort.addEventListener('change', function () { G.sort = sort.value; G.page = 1; renderGallery(); });
    var detail = $('#detail-select');
    if (detail) detail.addEventListener('change', function () { G.detail = detail.value; G.page = 1; renderGallery(); });
    var favT = $('#fav-toggle');
    if (favT) favT.addEventListener('change', function () { G.fav = favT.checked; G.page = 1; renderGallery(); });
    $$('.js-reset').forEach(function (clearB) {
      clearB.addEventListener('click', function () {
        G.cat = 'all'; G.q = ''; G.detail = 'any'; G.fav = false; G.sort = 'fun'; G.page = 1;
        syncControls();
        renderGallery();
      });
    });
    $$('[data-surprise]').forEach(function (b) {
      b.addEventListener('click', function () {
        var pool = G.cat !== 'all' ? CT.catalog.filter(function (t) { return t.cat === G.cat; }) : CT.catalog;
        var t = pool[Math.floor(Math.random() * pool.length)];
        if (root.Auth && !root.Auth.canAccess(t.id)) {
          root.Auth.showPaywall(t.id);
          return;
        }
        location.hash = '#/studio?id=' + t.id;
      });
    });
    var y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  function bindDelegates() {
    document.addEventListener('click', function (e) {
      // Header Auth buttons
      if (e.target && e.target.id === 'btn-open-login') {
        if (root.Auth) root.Auth.showAuthModal('login');
        return;
      }
      if (e.target && e.target.id === 'btn-open-register') {
        if (root.Auth) root.Auth.showAuthModal('register');
        return;
      }
      if (e.target && e.target.closest('[data-trigger-paywall]')) {
        if (root.Auth) root.Auth.showPaywall();
        return;
      }
      if (e.target && e.target.id === 'paywall-login-link') {
        if (root.Auth) {
          root.Auth.hidePaywall();
          root.Auth.showAuthModal('login');
        }
        return;
      }
      if (e.target && e.target.closest('#btn-user-menu')) {
        var drop = $('#user-dropdown');
        if (drop) {
          drop.hidden = !drop.hidden;
          var btn = $('#btn-user-menu');
          if (btn) btn.setAttribute('aria-expanded', String(!drop.hidden));
        }
        return;
      } else {
        var userMenu = $('#user-dropdown');
        if (userMenu && !userMenu.hidden && !e.target.closest('.user-pill-wrap')) {
          userMenu.hidden = true;
          var b = $('#btn-user-menu');
          if (b) b.setAttribute('aria-expanded', 'false');
        }
      }
      if (e.target && e.target.id === 'btn-logout') {
        if (root.Auth) {
          root.Auth.logout();
          if (root.CKStudio && root.CKStudio.toast) {
            root.CKStudio.toast('Logged out successfully 👋');
          }
        }
        return;
      }

      var chip = e.target.closest('#filters-chips .chip-btn');
      if (chip) {
        G.cat = chip.getAttribute('data-cat');
        G.page = 1;
        syncControls();
        renderGallery();
        return;
      }
      var favB = e.target.closest('[data-fav]');
      if (favB) {
        var id = favB.getAttribute('data-fav');
        if (favs.has(id)) favs.delete(id); else favs.add(id);
        saveFavs();
        var onNow = favs.has(id);
        favB.classList.toggle('fav-on', onNow);
        favB.setAttribute('aria-pressed', String(onNow));
        favB.textContent = onNow ? '\u2764\uFE0F' : '\uD83E\uDD0D';
        return;
      }
      var openB = e.target.closest('[data-open]');
      if (openB) {
        var pid = openB.getAttribute('data-open');
        if (root.Auth && !root.Auth.canAccess(pid)) {
          root.Auth.showPaywall(pid);
          return;
        }
        location.hash = '#/studio?id=' + pid;
        return;
      }
      var pag = e.target.closest('#pagination [data-page]');
      if (pag) {
        var p = parseInt(pag.getAttribute('data-page'), 10);
        if (p && p !== G.page) {
          G.page = p;
          renderGallery();
          var top = $('#gallery-top');
          if (top) top.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        return;
      }
      var goto = e.target.closest('[data-goto]');
      if (goto) {
        e.preventDefault();
        var target = goto.getAttribute('data-goto');
        if (target === 'gallery') { location.hash = '#/gallery'; return; }
        var jump = function () {
          var s = document.getElementById(target);
          if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        if ((location.hash || '#/') === '#/' || location.hash === '') jump();
        else { location.hash = '#/'; setTimeout(jump, 80); }
      }
    });
  }

  /* ---------------- routing ---------------- */
  function show(name) {
    var views = [['home', $('#view-home')], ['gallery', $('#view-gallery')], ['studio', $('#view-studio')]];
    views.forEach(function (p) { if (p[1]) p[1].hidden = p[0] !== name; });
    document.body.setAttribute('data-view', name);
    if (name === 'home') {
      document.title = "Rudra Studio \u2014 10,000+ colouring pages for kids";
    } else if (name === 'gallery') {
      document.title = "Colouring pages gallery \u2014 Rudra Studio";
    }
    if (name !== 'studio') window.scrollTo(0, 0);
  }

  function route() {
    var h = location.hash || '#/';
    if (h.indexOf('#/studio') === 0) {
      var id = (h.split('id=')[1] || '').split('&')[0];
      var decId = decodeURIComponent(id);
      if (root.Auth && !root.Auth.canAccess(decId)) {
        location.hash = '#/gallery';
        root.Auth.showPaywall(decId);
        return;
      }
      show('studio');
      if (root.CKStudio) root.CKStudio.open(decId);
      return;
    }
    if (h.indexOf('#/gallery') === 0) {
      var q = {};
      ((h.split('?')[1] || '')).split('&').forEach(function (kv) {
        if (!kv) return;
        var p = kv.split('=');
        q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
      });
      G.cat = q.cat || 'all';
      G.q = q.q || '';
      G.detail = q.detail || 'any';
      G.fav = q.fav === '1';
      G.sort = q.sort || 'fun';
      G.page = parseInt(q.page, 10) || 1;
      show('gallery');
      syncControls();
      renderGallery();
      return;
    }
    show('home');
    renderRecents();
  }

  function init() {
    loadFavs();
    els.grid = $('#cards-grid');
    renderHeaderAuth();
    renderHome();
    buildChips();
    bindControls();
    bindDelegates();
    initHero();

    if (root.Auth) {
      root.Auth.onChange(function () {
        renderHeaderAuth();
        renderQuotaBanner();
        var currentView = document.body.getAttribute('data-view');
        if (currentView === 'gallery') renderGallery();
        else if (currentView === 'home') renderHome();
      });
    }

    window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(typeof window !== 'undefined' ? window : globalThis);
