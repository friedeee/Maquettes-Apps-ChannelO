/* ==========================================================
   ChannelO — moteur commun des maquettes
   - Construit la scène : barre de la maquette, console web (Réglage / Dossier), téléphone.
   - Une seule discussion, affichée des deux côtés : ce que l'agent envoie, le citoyen le reçoit.
   - Chaque app (js/<app>.js) appelle C.define({...}) avec ses vues, ses cartes et ses cas.
   Aucune donnée n'est envoyée : tout est simulé dans le navigateur.
   ========================================================== */
'use strict';

(function () {
  var C = window.C = {};

  /* ---------- Petits outils ---------- */
  C.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  C.money = function (n) {
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA';
  };
  C.icon = function (name, extra) {
    return '<svg class="i ' + (extra || '') + '" aria-hidden="true"><use href="#i-' + name + '"></use></svg>';
  };
  C.$ = function (sel, root) { return (root || document).querySelector(sel); };
  C.uid = function () { return Math.random().toString(36).slice(2, 9); };
  C.later = function (ms, fn) { return setTimeout(function () { fn(); C.render(); }, ms); };

  /* ---------- Icônes (une seule bibliothèque pour toutes les pages) ---------- */
  var ICONS = {
    logo: '<path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-5.2A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
    chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    chevron: '<path d="M9 6l6 6-6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    bag: '<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3 10h18M7 15h4"/>',
    wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7z"/><path d="M4 7l11-3v3"/><circle cx="16" cy="13.5" r="1.3"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    truck: '<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    form: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16Z"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    'eye-off': '<path d="M3 3l18 18M10.6 5.1A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.4 9.4 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    photo: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
    send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4 18-7z"/>',
    mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0m-7 7v5m-4 0h8"/>',
    clip: '<path d="m21.4 11.1-8.5 8.5a5.5 5.5 0 0 1-7.8-7.8l9.2-9.2a3.7 3.7 0 0 1 5.2 5.2L9.9 17.4a1.8 1.8 0 0 1-2.6-2.6l8.5-8.5"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    alert: '<path d="M12 3l9.5 17h-19L12 3z"/><path d="M12 10v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.6 4.5L20 16M20 20v-4h-4"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    store: '<path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M10 20v-5h4v5"/>',
    receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z"/><path d="M9 8h6M9 12h6M9 16h3"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4l2-2zM10 20a2 2 0 0 0 4 0"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7Z"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    signal: '<path d="M4 18h2v-3H4zM9 18h2v-6H9zM14 18h2V9h-2zM19 18h2V6h-2z" fill="currentColor" stroke="none"/>',
    battery: '<rect x="2.5" y="7" width="17" height="10" rx="2.5"/><path d="M22 10.5v3"/><rect x="4.5" y="9" width="11" height="6" rx="1" fill="currentColor" stroke="none"/>',
    verified: '<path fill="currentColor" stroke="none" d="M12 2l2.4 2.1 3.2-.3.9 3.1 2.8 1.6-1.2 3 1.2 3-2.8 1.6-.9 3.1-3.2-.3L12 22l-2.4-2.1-3.2.3-.9-3.1-2.8-1.6 1.2-3-1.2-3 2.8-1.6.9-3.1 3.2.3z"/><path d="M8.5 12l2.3 2.3L15.5 9.6" stroke="#fff"/>'
  };
  function sprite() {
    var s = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>';
    Object.keys(ICONS).forEach(function (k) { s += '<symbol id="i-' + k + '" viewBox="0 0 24 24">' + ICONS[k] + '</symbol>'; });
    return s + '</defs></svg>';
  }

  /* ---------- Thème clair / sombre (mémorisé dans ce navigateur) ---------- */
  function initialTheme() {
    try { var t = localStorage.getItem('channelo-maquette-theme'); if (t === 'light' || t === 'dark') return t; } catch (e) { /* ignoré */ }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  C.setTheme = function (t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('channelo-maquette-theme', t); } catch (e) { /* ignoré */ }
    document.querySelectorAll('[data-act="theme"]').forEach(function (b) {
      b.innerHTML = C.icon(t === 'dark' ? 'sun' : 'moon') + '<span>' + (t === 'dark' ? 'Mode clair' : 'Mode sombre') + '</span>';
    });
  };
  document.documentElement.dataset.theme = initialTheme();

  /* ---------- Discussion partagée ---------- */
  var clock = 9 * 60 + 12;
  C.msgs = [];
  C.time = function () {
    clock += 1 + Math.floor(Math.random() * 2);
    var h = Math.floor(clock / 60) % 24, m = clock % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  };
  /* msg : { from: 'citizen' | 'agent' | 'auto' | 'system', text, card, data, only: 'desk' | 'phone' } */
  C.say = function (msg) {
    msg.id = msg.id || C.uid();
    msg.time = msg.time || C.time();
    if (msg.from === 'agent' && !msg.agent) msg.agent = C.app.agent.name;
    C.msgs.push(msg);
    notifyOther(msg);
    return msg;
  };
  C.find = function (id) { return C.msgs.filter(function (m) { return m.id === id; })[0]; };
  C.resetChat = function () { C.msgs = []; clock = 9 * 60 + 12; };

  /* ---------- Couches : fenêtre de la console, panneau latéral, panneaux du téléphone ---------- */
  C.modalFn = null; C.drawerFn = null; C.layers = [];
  C.modal = function (fn) { C.modalFn = fn; C.render(); focusFirst('.modal'); };
  C.closeModal = function () { C.modalFn = null; C.render(); };
  C.drawer = function (fn) { C.drawerFn = fn; C.render(); focusFirst('.drawer'); };
  C.closeDrawer = function () { C.drawerFn = null; C.render(); };
  /* opts.full : plein écran (vitrine), sinon feuille du bas */
  C.layer = function (fn, opts) { C.layers.push({ fn: fn, full: !!(opts && opts.full) }); C.render(); };
  C.replaceLayer = function (fn, opts) { C.layers.pop(); C.layer(fn, opts); };
  C.backLayer = function () { C.layers.pop(); C.render(); };
  C.closeLayers = function () { C.layers = []; C.render(); };
  function focusFirst(sel) {
    setTimeout(function () { var el = C.$(sel + ' input, ' + sel + ' select, ' + sel + ' textarea'); if (el) el.focus(); }, 30);
  }

  var toastTimers = {};
  C.toast = function (text, where) {
    where = where || 'desk';
    if (where === 'phone' && C.screen !== 'mobile') where = 'desk';
    else if (where === 'desk' && C.screen === 'mobile') where = 'phone';
    var host = where === 'phone' ? C.$('.phone__screen') : C.$('.desk');
    var old = host.querySelector('.toast, .ph-toast'); if (old) old.remove();
    var t = document.createElement('div');
    t.className = where === 'phone' ? 'ph-toast' : 'toast';
    t.setAttribute('role', 'status');
    t.textContent = text;
    host.appendChild(t);
    clearTimeout(toastTimers[where]);
    toastTimers[where] = setTimeout(function () { t.remove(); }, 2600);
  };

  /* Squelettes de chargement */
  C.skelRows = function (n) {
    var h = '';
    for (var i = 0; i < n; i++) {
      h += '<div class="row" style="padding:12px 14px;border-bottom:1px solid var(--line-soft)"><span class="skel" style="width:44px;height:44px;border-radius:10px"></span><div style="flex:1;display:grid;gap:6px"><span class="skel" style="height:12px;width:' + (40 + (i * 13) % 40) + '%"></span><span class="skel" style="height:10px;width:25%"></span></div><span class="skel" style="width:70px;height:20px;border-radius:99px"></span></div>';
    }
    return '<div class="table-wrap" aria-busy="true" aria-label="Chargement">' + h + '</div>';
  };

  /* ---------- Trois interfaces séparées : mobile (citoyen), agent, console (administrateur) ---------- */
  var SCREENS = { mobile: 'Mobile · citoyen', agent: 'Agent · dossier', admin: 'Console · administrateur' };
  C.screen = 'mobile';
  C.view = 'agent';
  C.unread = { mobile: 0, agent: 0 };
  C.go = function (screen) {
    if (!SCREENS[screen]) screen = 'mobile';
    C.screen = screen;
    if (screen !== 'mobile') C.view = screen;
    if (screen in C.unread) C.unread[screen] = 0;
    C.drawerFn = screen === 'admin' ? C.drawerFn : null;
    document.body.dataset.screen = screen;
    if (location.hash !== '#' + screen) history.replaceState(null, '', '#' + screen);
    C.render();
  };
  function screenFromHash() { var h = location.hash.replace('#', ''); return SCREENS[h] ? h : 'mobile'; }
  window.addEventListener('hashchange', function () { C.go(screenFromHash()); });

  /* Un message arrive dans une interface qu'on ne regarde pas : pastille sur son onglet */
  function notifyOther(msg) {
    if (C.seeding || msg.from === 'system') return;
    var target = msg.from === 'citizen' ? 'agent' : 'mobile';
    if (msg.only === 'desk' && target === 'mobile') return;
    if (C.screen === target) return;
    C.unread[target]++;
    C.toast(target === 'mobile' ? 'Reçu sur le téléphone du citoyen · onglet Mobile' : 'Nouveau message dans le dossier · onglet Agent');
  }

  /* ---------- Construction de la scène ---------- */
  C.define = function (app) {
    C.app = app;
    app.agent = app.agent || { name: 'Awa', initials: 'AW' };
    app.citizen = app.citizen || { name: 'Mireille D.', phone: '01 97 00 00 47', initials: 'MD', since: 'mars 2026' };
    document.addEventListener('DOMContentLoaded', boot);
  };

  function boot() {
    var a = C.app;
    document.title = a.title + ' — maquette ChannelO';
    var cases = (a.cases || []).map(function (c) { return '<option value="' + c.key + '">' + C.esc(c.label) + '</option>'; }).join('');
    document.body.insertAdjacentHTML('afterbegin', sprite() +
      '<header class="pbar">' +
        '<a class="pbar__back" href="index.html">' + C.icon('back') + 'Toutes les apps</a>' +
        '<div class="pbar__title">' + C.icon(a.icon) + C.esc(a.title) + '<span class="badge badge--info badge--plain">Priorité ' + a.priority + '</span></div>' +
        '<nav class="screens" role="tablist" aria-label="Interface">' + Object.keys(SCREENS).map(function (k) {
          return '<a role="tab" href="#' + k + '" data-act="screen" data-s="' + k + '">' + C.icon(k === 'mobile' ? 'phone' : k === 'agent' ? 'chat' : 'settings') + SCREENS[k] + '<span class="screens__dot" data-dot="' + k + '" hidden></span></a>';
        }).join('') + '</nav>' +
        '<span class="pbar__spacer"></span>' +
        '<label>Cas à montrer <select class="select" data-on-change="case">' + cases + '</select></label>' +
        '<button type="button" class="btn" data-act="theme"></button>' +
      '</header>' +
      '<main class="stage">' +
        '<section class="stage__desk" aria-label="Console web de l\'entité"><p class="stage__label" id="desk-label"></p>' +
          '<div class="desk">' +
            '<div class="desk__bar">' +
              '<span class="desk__brand"><span class="desk__brand-mark">' + C.icon('logo') + '</span><span>ChannelO<small id="desk-space">ESPACE AGENTS</small></span></span>' +

              '<div class="desk__who" id="desk-who"></div>' +
            '</div>' +
            '<div class="desk__body"><nav class="rail" id="rail" aria-label="Navigation de la console"></nav><div id="desk-view" class="view"></div></div>' +
            '<div id="desk-layer"></div>' +
          '</div>' +
        '</section>' +
        '<section class="stage__phone" aria-label="Application mobile du citoyen"><p class="stage__label">' + C.icon('phone') + 'Application ChannelO · téléphone du citoyen</p>' +
          '<div class="phone"><div class="phone__screen">' +
            '<div class="ph-status"><span>10:24</span><span>' + C.icon('signal') + C.icon('battery') + '</span></div>' +
            '<div class="ph-head" id="ph-head"></div>' +
            '<div class="ph-msgs" id="ph-msgs" aria-live="polite"></div>' +
            '<div class="ph-quick" id="ph-quick"></div>' +
            '<div class="ph-compose"><div class="ph-input"><button type="button" class="icon-btn" data-act="ph-attach" aria-label="Joindre">' + C.icon('plus') + '</button><input id="ph-text" placeholder="Écrire un message" aria-label="Message" autocomplete="off"></div><button type="button" class="ph-send" data-act="phone-send" aria-label="Envoyer">' + C.icon('send') + '</button></div>' +
            '<div id="ph-layer"></div>' +
          '</div></div>' +
        '</section>' +
      '</main>');
    C.setTheme(document.documentElement.dataset.theme);
    C.screen = screenFromHash();
    if (C.screen !== 'mobile') C.view = C.screen;
    document.body.dataset.screen = C.screen;
    reset((a.cases && a.cases[0] && a.cases[0].key) || 'normal');
  }

  function reset(caseKey) {
    C.caseKey = caseKey;
    C.modalFn = null; C.drawerFn = null; C.layers = [];
    C.resetChat();
    C.seeding = true;
    C.app.reset(caseKey);
    C.seeding = false;
    C.unread = { mobile: 0, agent: 0 };
    C.render();
    var thread = C.$('.thread__msgs'); if (thread) thread.scrollTop = thread.scrollHeight;
  }
  C.reset = reset;

  /* ---------- Rendu ---------- */
  var lastCount = -1;
  C.render = function () {
    var a = C.app;
    document.querySelectorAll('[data-act="screen"]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.s === C.screen)); });
    document.querySelectorAll('[data-dot]').forEach(function (d) { var n = C.unread[d.dataset.dot] || 0; d.hidden = !n; d.textContent = n; });
    C.$('#desk-space').textContent = C.view === 'admin' ? 'ADMINISTRATION' : 'ESPACE AGENTS';
    C.$('#desk-label').innerHTML = C.view === 'admin'
      ? C.icon('settings') + 'Console web · page de réglage de l\'app (administrateur de ' + C.esc(a.entity.name) + ')'
      : C.icon('chat') + 'Console web · dossier de conversation (agent de ' + C.esc(a.entity.name) + ')';
    C.$('#desk-who').innerHTML = C.view === 'admin'
      ? '<span class="avatar">KS</span><span><strong>Koffi S.</strong><small>Administrateur</small></span>'
      : '<span class="avatar">' + a.agent.initials + '</span><span><strong>' + a.agent.name + '</strong><small>Agent</small></span>';

    // Navigation de gauche : l'icône de l'app est mise en avant en vue Réglage
    var rail = [['chat', 'Conversations', 'agent'], ['form', 'Formulaires'], [a.icon, a.title, 'admin'], ['chart', 'Statistiques'], ['clock', 'Horaires d\'ouverture'], ['users', 'Agents'], ['settings', 'Paramètres']];
    C.$('#rail').innerHTML = rail.map(function (r, i) {
      return (i === 2 ? '<hr>' : '') + '<span class="' + (r[2] === C.view ? 'is-on' : '') + '" title="' + C.esc(r[1]) + '">' + C.icon(r[0]) + '</span>' + (i === 2 ? '<hr>' : '');
    }).join('');

    // Vue de la console (on garde la position de défilement)
    var view = C.$('#desk-view');
    var keep = view.dataset.v === C.view ? view.scrollTop : 0;
    var threadEl = C.$('.thread__msgs'), threadKeep = threadEl ? threadEl.scrollTop : null;
    var draft = C.$('#desk-text') ? C.$('#desk-text').value : '';
    view.dataset.v = C.view;
    view.className = 'view ' + (C.view === 'admin' ? 'view--admin' : 'view--agent');
    view.innerHTML = C.view === 'admin' ? a.admin() : dossier();
    view.scrollTop = keep;
    if (C.$('#desk-text') && !C.clearDraft) C.$('#desk-text').value = draft;
    C.clearDraft = false;

    var desk = '';
    if (C.drawerFn && C.view === 'admin') desk += '<aside class="drawer" role="dialog" aria-modal="true">' + C.drawerFn() + '</aside>';
    if (C.modalFn) desk += '<div class="modal" data-act="modal-backdrop"><div class="modal__panel ' + (C.modalLarge ? 'modal__panel--lg' : '') + '" role="dialog" aria-modal="true">' + C.modalFn() + '</div></div>';
    C.$('#desk-layer').innerHTML = desk;

    // Téléphone
    C.$('#ph-head').innerHTML =
      '<button type="button" class="icon-btn" aria-label="Retour" data-act="ph-noop">' + C.icon('back') + '</button>' +
      '<span class="avatar">' + a.entity.initials + '</span>' +
      '<div class="ph-head__who"><strong>' + C.esc(a.entity.name) + '<span class="verified">' + C.icon('verified') + '</span></strong><small>' + C.esc(a.entity.sub) + '</small></div>' +
      (a.phoneHead ? a.phoneHead() : '');
    var ph = C.$('#ph-msgs');
    if (a.phoneLoading && a.phoneLoading()) {
      ph.innerHTML = '<span class="ph-day">Aujourd\'hui</span>' +
        '<div class="pmsg" style="width:70%"><span class="skel" style="height:12px;width:90%"></span><span class="skel" style="height:12px;width:60%;margin-top:6px"></span></div>' +
        '<div class="pmsg pmsg--card"><div class="pcard"><span class="skel" style="display:block;aspect-ratio:16/10;border-radius:0"></span><div class="pcard__body"><span class="skel" style="height:12px;width:70%"></span><span class="skel" style="height:12px;width:40%"></span></div></div></div>';
    } else {
      ph.innerHTML = '<span class="ph-day">Aujourd\'hui</span>' + C.msgs.filter(function (m) { return m.only !== 'desk'; }).map(phoneMsg).join('');
    }
    C.$('#ph-quick').innerHTML = a.quick ? a.quick() : '';
    C.$('#ph-quick').hidden = !C.$('#ph-quick').innerHTML;
    C.$('#ph-layer').innerHTML = C.layers.length ? (function () {
      var top = C.layers[C.layers.length - 1];
      return '<div class="ph-layer ' + (top.full ? 'ph-layer--full' : '') + '" data-act="layer-backdrop"><div class="ph-sheet" role="dialog" aria-modal="true">' + (top.full ? '' : '<span class="ph-sheet__grab"></span>') + top.fn() + '</div></div>';
    })() : '';

    // Faire défiler vers le bas quand un message arrive
    var thread = C.$('.thread__msgs');
    if (C.msgs.length !== lastCount) {
      if (thread) thread.scrollTop = thread.scrollHeight;
      ph.scrollTop = ph.scrollHeight;
      lastCount = C.msgs.length;
    } else if (thread && threadKeep != null) {
      thread.scrollTop = threadKeep;
    }
  };

  function phoneMsg(m) {
    if (m.from === 'system') return '<p class="ph-sys">' + m.text + '</p>';
    var me = m.from === 'citizen';
    if (m.card) {
      return '<div class="pmsg pmsg--card ' + (me ? 'pmsg--me' : '') + '">' + C.app.card(m, 'phone') + '<span class="pmsg__meta">' + m.time + '</span></div>';
    }
    return '<div class="pmsg ' + (me ? 'pmsg--me' : '') + (m.from === 'auto' ? ' pmsg--auto' : '') + '">' +
      (m.from === 'auto' ? '<span class="pmsg__auto">' + C.icon('bolt') + 'Réponse automatique</span>' : '') +
      '<p>' + C.esc(m.text) + '</p><span class="pmsg__meta">' + m.time + '</span></div>';
  }

  function deskMsg(m) {
    if (m.from === 'system') return '<p class="sysline">' + m.text + '</p>';
    var agent = m.from === 'agent' || m.from === 'auto';
    var who = m.from === 'citizen' ? C.app.citizen.name : m.from === 'auto' ? 'Réponse automatique' : (m.agent === C.app.agent.name ? m.agent + ' (vous)' : m.agent);
    var body = m.card ? C.app.card(m, 'desk') : '<p>' + C.esc(m.text) + '</p>';
    return '<div class="dmsg ' + (agent ? 'dmsg--agent' : '') + (m.card ? ' dmsg--card' : '') + '"><div class="dmsg__bubble">' + body + '</div><span class="dmsg__meta">' + C.esc(who) + ' · ' + m.time + '</span></div>';
  }

  function dossier() {
    var a = C.app, c = a.citizen;
    var others = a.queue || [
      { n: 'Client · 01 66 •• •• 19', p: 'Bonjour, vous livrez à Calavi ?', t: '09:58' },
      { n: 'Rodrigue H.', p: 'Merci, bien reçu', t: 'Hier' }
    ];
    var queue = '<aside class="queue" aria-label="File des conversations"><h2>En cours</h2>' +
      '<div class="queue__item is-on"><span class="avatar">' + c.initials + '</span><div><strong>' + C.esc(c.name) + '</strong><p>' + C.esc(lastText()) + '</p></div></div>' +
      others.map(function (o) { return '<div class="queue__item"><span class="avatar">' + o.n.slice(0, 2).toUpperCase() + '</span><div><strong>' + C.esc(o.n) + '</strong><p>' + C.esc(o.p) + '</p></div></div>'; }).join('') +
      '</aside>';
    var loading = a.deskLoading && a.deskLoading();
    var tools = (a.tools ? a.tools() : []).map(function (t) {
      return '<button type="button" class="icon-btn composer__tool ' + (t.isNew ? 'is-new' : '') + '" data-act="' + t.act + '" title="' + C.esc(t.label) + '" aria-label="' + C.esc(t.label) + '">' + C.icon(t.icon) + '</button>';
    }).join('');
    var thread = '<section class="thread" aria-label="Conversation">' +
      '<header class="thread__head"><span class="avatar">' + c.initials + '</span><div><strong>' + C.esc(c.name) + '</strong><small>' + c.phone + ' · Prise en charge par vous</small></div><span style="margin-left:auto" class="badge badge--info">En cours</span></header>' +
      '<div class="thread__msgs">' + (loading ? '<span class="skel" style="height:40px;width:55%;border-radius:12px"></span><span class="skel" style="height:40px;width:40%;border-radius:12px;align-self:flex-end"></span><span class="skel" style="height:120px;width:330px;border-radius:14px"></span>' : C.msgs.filter(function (m) { return m.only !== 'phone'; }).map(deskMsg).join('')) + '</div>' +
      '<div class="composer"><div class="composer__row">' +
        '<div class="composer__tools">' +
          '<button type="button" class="icon-btn" title="Joindre un média" aria-label="Joindre un média" data-act="desk-noop">' + C.icon('clip') + '</button>' +
          '<button type="button" class="icon-btn" title="Envoyer un formulaire" aria-label="Envoyer un formulaire" data-act="desk-noop">' + C.icon('form') + '</button>' +
          tools +
        '</div>' +
        '<input class="input" id="desk-text" placeholder="Répondre à ' + C.esc(c.name) + '…" aria-label="Réponse" autocomplete="off">' +
        '<button type="button" class="btn btn--primary" data-act="desk-send">' + C.icon('send') + 'Envoyer</button>' +
      '</div></div>' +
      '</section>';
    var side = '<aside class="side" aria-label="Dossier du citoyen">' +
      '<div><h3>Citoyen</h3><dl class="facts"><div><dt>Nom</dt><dd>' + C.esc(c.name) + '</dd></div><div><dt>Numéro</dt><dd class="tnum">' + c.phone + '</dd></div><div><dt>Client depuis</dt><dd>' + c.since + '</dd></div></dl></div>' +
      (a.side ? a.side() : '') +
      '</aside>';
    return '<div class="dossier">' + queue + thread + side + '</div>';
  }
  function lastText() {
    for (var i = C.msgs.length - 1; i >= 0; i--) {
      var m = C.msgs[i];
      if (m.from === 'citizen') return m.text || (m.card ? 'A envoyé une ' + (m.cardLabel || 'carte') : '');
    }
    return 'Nouvelle conversation';
  }

  /* ---------- Événements ---------- */
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el) return;
    var act = el.dataset.act;
    if ((act === 'modal-backdrop' || act === 'layer-backdrop') && e.target !== el) return;
    switch (act) {
      case 'theme': C.setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); return;
      case 'screen': e.preventDefault(); C.go(el.dataset.s); return;
      case 'modal-backdrop': case 'close-modal': C.closeModal(); return;
      case 'close-drawer': C.closeDrawer(); return;
      case 'layer-backdrop': case 'close-layer': C.closeLayers(); return;
      case 'back-layer': C.backLayer(); return;
      case 'desk-send': return deskSend();
      case 'phone-send': return phoneSend();
      case 'desk-noop': C.toast('Fonction existante de la console, hors de cette maquette'); return;
      case 'ph-noop': C.toast('Hors de cette maquette', 'phone'); return;
      case 'ph-attach': C.toast('Photo, document, note vocale : déjà dans l\'app', 'phone'); return;
    }
    var fn = C.app.act && C.app.act[act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  ['input', 'change'].forEach(function (type) {
    document.addEventListener(type, function (e) {
      var el = e.target.closest('[data-on-' + type + ']');
      if (!el) return;
      var name = el.getAttribute('data-on-' + type);
      if (type === 'change' && name === 'case') { reset(el.value); return; }
      var fn = C.app[type] && C.app[type][name];
      if (fn) fn(el, e);
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (C.layers.length) return C.backLayer();
      if (C.modalFn) return C.closeModal();
      if (C.drawerFn) return C.closeDrawer();
    }
    if (e.key === 'Enter' && e.target.id === 'desk-text') deskSend();
    if (e.key === 'Enter' && e.target.id === 'ph-text') phoneSend();
  });

  function deskSend() {
    var input = C.$('#desk-text'), text = input.value.trim();
    if (!text) return;
    C.say({ from: 'agent', text: text });
    C.clearDraft = true;
    C.render();
    C.$('#desk-text').focus();
  }
  function phoneSend() {
    var input = C.$('#ph-text'), text = input.value.trim();
    if (!text) return;
    input.value = '';
    C.say({ from: 'citizen', text: text });
    if (C.app.onCitizenText) C.app.onCitizenText(text);
    C.render();
  }
})();
