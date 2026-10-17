/* Rudra Studio — Authentication, Paywall & Quota Manager.
   Manages user accounts, guest sessions, 30-pattern Starter quota,
   and Pro upgrades with localStorage persistence. */
(function (root) {
  'use strict';

  var STORAGE_USERS = 'rs.auth.users';
  var STORAGE_SESSION = 'rs.auth.session';
  var STORAGE_GUEST_UNLOCKED = 'rs.auth.guest_unlocked';
  var STORAGE_GUEST_PLAN = 'rs.auth.guest_plan';
  var MAX_STARTER_PATTERNS = 30;

  var state = {
    users: [],
    currentUser: null,
    guestUnlocked: [],
    guestPlan: 'starter',
    listeners: []
  };

  function safeJson(key, fallback) {
    try {
      var val = localStorage.getItem(key);
      return val ? JSON.parse(val) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function saveJson(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  function init() {
    state.users = safeJson(STORAGE_USERS, []);
    state.guestUnlocked = safeJson(STORAGE_GUEST_UNLOCKED, []);
    state.guestPlan = localStorage.getItem(STORAGE_GUEST_PLAN) || 'starter';

    // Seed default demo accounts if none exist
    if (!state.users.length) {
      state.users = [
        {
          id: 'user-starter',
          name: 'Leo Artist',
          email: 'artist@rudrastudio.com',
          password: 'password123',
          plan: 'starter',
          unlocked: [],
          created: Date.now() - 86400000
        },
        {
          id: 'user-pro',
          name: 'Maya Studio Pro',
          email: 'pro@rudrastudio.com',
          password: 'password123',
          plan: 'pro',
          unlocked: [],
          created: Date.now() - 172800000
        }
      ];
      saveJson(STORAGE_USERS, state.users);
    }

    var sessionEmail = localStorage.getItem(STORAGE_SESSION);
    if (sessionEmail) {
      var found = findUserByEmail(sessionEmail);
      if (found) state.currentUser = found;
    }

    bindModals();
    notify();
  }

  function findUserByEmail(email) {
    if (!email) return null;
    var norm = String(email).trim().toLowerCase();
    for (var i = 0; i < state.users.length; i++) {
      if (state.users[i].email.toLowerCase() === norm) return state.users[i];
    }
    return null;
  }

  function saveCurrent() {
    if (state.currentUser) {
      var idx = state.users.findIndex(function (u) { return u.id === state.currentUser.id; });
      if (idx !== -1) {
        state.users[idx] = state.currentUser;
        saveJson(STORAGE_USERS, state.users);
      }
    } else {
      saveJson(STORAGE_GUEST_UNLOCKED, state.guestUnlocked);
      try {
        localStorage.setItem(STORAGE_GUEST_PLAN, state.guestPlan);
      } catch (e) {}
    }
  }

  function getUser() {
    if (state.currentUser) {
      return {
        id: state.currentUser.id,
        name: state.currentUser.name,
        email: state.currentUser.email,
        plan: state.currentUser.plan,
        isGuest: false
      };
    }
    return {
      id: 'guest',
      name: 'Guest Artist',
      email: '',
      plan: state.guestPlan,
      isGuest: true
    };
  }

  function isPro() {
    return getUser().plan === 'pro';
  }

  function getUnlockedPatterns() {
    if (state.currentUser) {
      state.currentUser.unlocked = state.currentUser.unlocked || [];
      return state.currentUser.unlocked;
    }
    return state.guestUnlocked;
  }

  function getUnlockedCount() {
    return getUnlockedPatterns().length;
  }

  function canAccess(patternId) {
    if (isPro()) return true;
    if (!patternId) return false;
    var list = getUnlockedPatterns();
    if (list.indexOf(patternId) !== -1) return true;
    return list.length < MAX_STARTER_PATTERNS;
  }

  function recordAccess(patternId) {
    if (!patternId) return { allowed: false, count: getUnlockedCount() };
    if (isPro()) return { allowed: true, isPro: true, count: getUnlockedCount() };

    var list = getUnlockedPatterns();
    if (list.indexOf(patternId) !== -1) {
      return { allowed: true, newlyUnlocked: false, count: list.length };
    }

    if (list.length < MAX_STARTER_PATTERNS) {
      list.push(patternId);
      saveCurrent();
      notify();
      return { allowed: true, newlyUnlocked: true, count: list.length };
    }

    return { allowed: false, newlyUnlocked: false, count: list.length };
  }

  function register(name, email, password) {
    name = (name || '').trim();
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();

    if (!name) return { success: false, error: 'Please enter your artist or parent name.' };
    if (!email || email.indexOf('@') === -1 || email.indexOf('.') === -1) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (password.length < 4) {
      return { success: false, error: 'Please choose a password with at least 4 characters.' };
    }
    if (findUserByEmail(email)) {
      return { success: false, error: 'An account with this email already exists. Try logging in!' };
    }

    var newUser = {
      id: 'user-' + Date.now(),
      name: name,
      email: email,
      password: password,
      plan: state.guestPlan === 'pro' ? 'pro' : 'starter',
      unlocked: state.guestUnlocked.slice(),
      created: Date.now()
    };

    state.users.push(newUser);
    saveJson(STORAGE_USERS, state.users);

    state.currentUser = newUser;
    try {
      localStorage.setItem(STORAGE_SESSION, newUser.email);
    } catch (e) {}

    hideAuthModal();
    notify();
    return { success: true, user: getUser() };
  }

  function login(email, password) {
    email = (email || '').trim().toLowerCase();
    password = (password || '').trim();

    if (!email || !password) {
      return { success: false, error: 'Please enter both your email and password.' };
    }

    var user = findUserByEmail(email);
    if (!user || user.password !== password) {
      return { success: false, error: 'Incorrect email or password. Please try again.' };
    }

    state.currentUser = user;
    try {
      localStorage.setItem(STORAGE_SESSION, user.email);
    } catch (e) {}

    hideAuthModal();
    notify();
    return { success: true, user: getUser() };
  }

  function logout() {
    state.currentUser = null;
    try {
      localStorage.removeItem(STORAGE_SESSION);
    } catch (e) {}
    notify();
    return { success: true };
  }

  function upgradePro() {
    if (state.currentUser) {
      state.currentUser.plan = 'pro';
    } else {
      state.guestPlan = 'pro';
    }
    saveCurrent();
    hidePaywall();
    notify();
    return { success: true };
  }

  function onChange(fn) {
    if (typeof fn === 'function') state.listeners.push(fn);
  }

  function notify() {
    var u = getUser();
    var count = getUnlockedCount();
    var pro = isPro();
    state.listeners.forEach(function (fn) {
      try {
        fn({ user: u, isPro: pro, count: count, max: MAX_STARTER_PATTERNS });
      } catch (e) {}
    });
  }

  /* ---------------- Modal Controllers ---------------- */
  function showAuthModal(initialTab) {
    var m = document.getElementById('auth-modal');
    if (!m) return;
    m.hidden = false;
    m.classList.add('show');
    switchAuthTab(initialTab || 'login');
  }

  function hideAuthModal() {
    var m = document.getElementById('auth-modal');
    if (!m) return;
    m.hidden = true;
    m.classList.remove('show');
    var err = document.getElementById('auth-error');
    if (err) { err.hidden = true; err.textContent = ''; }
  }

  function switchAuthTab(tab) {
    var isLogin = tab === 'login';
    var tabLogin = document.getElementById('tab-btn-login');
    var tabReg = document.getElementById('tab-btn-register');
    var formLogin = document.getElementById('form-login');
    var formReg = document.getElementById('form-register');
    var err = document.getElementById('auth-error');

    if (tabLogin) tabLogin.classList.toggle('active', isLogin);
    if (tabReg) tabReg.classList.toggle('active', !isLogin);
    if (formLogin) formLogin.hidden = !isLogin;
    if (formReg) formReg.hidden = isLogin;
    if (err) { err.hidden = true; err.textContent = ''; }

    var targetInput = isLogin ? document.getElementById('login-email') : document.getElementById('reg-name');
    if (targetInput) setTimeout(function () { targetInput.focus(); }, 100);
  }

  function showPaywall(patternId) {
    var p = document.getElementById('paywall-modal');
    if (!p) return;
    p.hidden = false;
    p.classList.add('show');

    var reasonEl = document.getElementById('paywall-reason');
    if (reasonEl) {
      var cnt = getUnlockedCount();
      reasonEl.textContent = 'You have unlocked ' + cnt + ' of ' + MAX_STARTER_PATTERNS + ' starter drawing patterns. Upgrade to Rudra Studio Pro for unlimited access to all 10,000 patterns!';
    }

    if (patternId) {
      p.setAttribute('data-target-pattern', patternId);
    } else {
      p.removeAttribute('data-target-pattern');
    }
  }

  function hidePaywall() {
    var p = document.getElementById('paywall-modal');
    if (!p) return;
    p.hidden = true;
    p.classList.remove('show');
  }

  function bindModals() {
    // Backdrop click to dismiss
    document.addEventListener('click', function (e) {
      if (e.target && e.target.id === 'auth-modal') hideAuthModal();
      if (e.target && e.target.id === 'paywall-modal') hidePaywall();
      if (e.target && e.target.closest('[data-close-auth]')) hideAuthModal();
      if (e.target && e.target.closest('[data-close-paywall]')) hidePaywall();

      // Tab switches
      if (e.target && e.target.id === 'tab-btn-login') switchAuthTab('login');
      if (e.target && e.target.id === 'tab-btn-register') switchAuthTab('register');

      // Paywall upgrade trigger
      var upB = e.target && e.target.closest('[data-upgrade-pro]');
      if (upB) {
        upgradePro();
        if (root.CKStudio && root.CKStudio.toast) {
          root.CKStudio.toast('🌟 Welcome to Rudra Studio Pro! All 10,000 patterns unlocked!');
        }
        var targetPattern = document.getElementById('paywall-modal') ? document.getElementById('paywall-modal').getAttribute('data-target-pattern') : null;
        if (targetPattern) {
          location.hash = '#/studio?id=' + encodeURIComponent(targetPattern);
        }
      }

      // Demo login shortcuts
      if (e.target && e.target.id === 'btn-demo-starter') {
        var em = document.getElementById('login-email');
        var pw = document.getElementById('login-password');
        if (em) em.value = 'artist@rudrastudio.com';
        if (pw) pw.value = 'password123';
      }
      if (e.target && e.target.id === 'btn-demo-pro') {
        var em2 = document.getElementById('login-email');
        var pw2 = document.getElementById('login-password');
        if (em2) em2.value = 'pro@rudrastudio.com';
        if (pw2) pw2.value = 'password123';
      }
    });

    // Forms
    var fLogin = document.getElementById('form-login');
    if (fLogin) {
      fLogin.addEventListener('submit', function (e) {
        e.preventDefault();
        var email = (document.getElementById('login-email') || {}).value;
        var pass = (document.getElementById('login-password') || {}).value;
        var res = login(email, pass);
        var err = document.getElementById('auth-error');
        if (!res.success) {
          if (err) { err.textContent = res.error; err.hidden = false; }
        } else {
          if (root.CKStudio && root.CKStudio.toast) {
            root.CKStudio.toast('👋 Welcome back, ' + res.user.name + '!');
          }
        }
      });
    }

    var fReg = document.getElementById('form-register');
    if (fReg) {
      fReg.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = (document.getElementById('reg-name') || {}).value;
        var email = (document.getElementById('reg-email') || {}).value;
        var pass = (document.getElementById('reg-password') || {}).value;
        var res = register(name, email, pass);
        var err = document.getElementById('auth-error');
        if (!res.success) {
          if (err) { err.textContent = res.error; err.hidden = false; }
        } else {
          if (root.CKStudio && root.CKStudio.toast) {
            root.CKStudio.toast('🎉 Account created! Welcome, ' + res.user.name + '!');
          }
        }
      });
    }

    // Escape key closes modals
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var am = document.getElementById('auth-modal');
        if (am && !am.hidden) { hideAuthModal(); return; }
        var pm = document.getElementById('paywall-modal');
        if (pm && !pm.hidden) { hidePaywall(); return; }
      }
    });
  }

  root.Auth = {
    init: init,
    getUser: getUser,
    isPro: isPro,
    canAccess: canAccess,
    recordAccess: recordAccess,
    getUnlockedPatterns: getUnlockedPatterns,
    getUnlockedCount: getUnlockedCount,
    MAX_STARTER_PATTERNS: MAX_STARTER_PATTERNS,
    login: login,
    register: register,
    logout: logout,
    upgradePro: upgradePro,
    onChange: onChange,
    showAuthModal: showAuthModal,
    hideAuthModal: hideAuthModal,
    showPaywall: showPaywall,
    hidePaywall: hidePaywall
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})(typeof window !== 'undefined' ? window : globalThis);
