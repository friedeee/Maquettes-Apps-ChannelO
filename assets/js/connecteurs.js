/* ==========================================================
   App 10 — Connecteurs (Google Sheets, webhook)
   Réglage : liste avec « Activer » ; Google Sheets (feuille, données copiées) ; webhook (adresse, événements, « Tester », journal).
   Dossier : repère discret quand un élément a été transmis, comme le ticket GLPI.
   Téléphone : rien de visible.
   ========================================================== */
'use strict';

(function () {
  var B = window.BOUTIQUE, esc = C.esc, money = C.money, icon = C.icon;
  var S = {};
  var SHEETS = ['Ventes 2026', 'Clients', 'Suivi des formulaires'];
  var EVENTS = { message: 'Nouveau message', order: 'Commande', payment: 'Paiement' };
  var COPIES = { orders: 'Commandes', forms: 'Réponses aux formulaires' };
  var LST = { ok: ['Réussi', 'ok'], fail: ['Échec', 'bad'], busy: ['Nouvel essai…', 'info'] };

  function close(act) { return '<button type="button" class="icon-btn" data-act="' + (act || 'close-modal') + '" aria-label="Fermer">' + icon('x') + '</button>'; }
  function entry(id) { return S.log.filter(function (l) { return l.id === id; })[0]; }
  function failed() { return S.log.filter(function (l) { return l.status === 'fail'; }); }
  function sheetState() { return !S.gs.on ? 'off' : S.gs.expired ? 'expired' : 'on'; }
  function urlOk(u) { return /^https:\/\/[^\s/]+\.[^\s]+/.test(u); }

  /* Enregistre un envoi dans le journal et met un repère dans le dossier (jamais sur le téléphone) */
  function send(target, event, ref, ok, why) {
    var l = { id: 'l' + C.uid(), when: 'Aujourd\'hui, ' + C.time(), target: target, event: event, ref: ref, status: ok ? 'ok' : 'fail', why: ok ? '' : why, tries: 1, mine: true };
    S.log.unshift(l);
    return l;
  }
  function mark(l) {
    var m = C.say({ from: 'system', only: 'desk', text: markText(l), data: { lid: l.id } });
    l.msg = m.id;
  }
  function markText(l) {
    if (l.status === 'ok') return icon('check') + ' ' + (l.target === 'Google Sheets' ? 'Copié dans Google Sheets' : 'Transmis à votre outil') + ' · ' + esc(l.ref);
    if (l.status === 'busy') return 'Nouvel essai vers ' + esc(l.target) + '…';
    return icon('alert') + ' Non transmis à ' + esc(l.target) + ' · ' + esc(l.ref);
  }
  function refresh(l) { var m = l.msg && C.find(l.msg); if (m) m.text = markText(l); }
  function dispatch(event, ref) {
    var out = [];
    if (sheetState() !== 'off' && ((event === 'Commande' && S.gs.copy.orders) || (event === 'Réponse au formulaire' && S.gs.copy.forms))) {
      out.push(send('Google Sheets', event, ref + ' → ' + S.gs.sheet, sheetState() === 'on', 'La connexion à Google a expiré'));
    }
    var key = event === 'Commande' ? 'order' : event === 'Paiement' ? 'payment' : event === 'Nouveau message' ? 'message' : null;
    if (S.hook.on && key && S.hook.events[key]) out.push(send('Webhook', event, ref, !S.hook.down, 'Votre outil n\'a pas répondu'));
    return out;
  }
  function retry(l) {
    if (l.target === 'Google Sheets' && S.gs.expired) { C.toast('Reconnectez d\'abord Google Sheets'); return; }
    l.status = 'busy'; l.tries++; refresh(l); C.render();
    C.later(1000, function () {
      if (l.target === 'Webhook' && S.hook.down && l.tries < 3) { l.status = 'fail'; l.when = 'Aujourd\'hui, ' + C.time(); refresh(l); C.toast('Nouvel échec : votre outil ne répond toujours pas'); return; }
      if (l.target === 'Webhook') S.hook.down = false;
      l.status = 'ok'; l.why = ''; l.when = 'Aujourd\'hui, ' + C.time(); refresh(l); C.toast('Envoi réussi');
    });
  }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var n = failed().length;
    var head = '<header class="page-head"><div><h1>Connecteurs</h1><p>' + (S.loading ? 'Chargement…' : 'Brancher ChannelO sur les outils que vous utilisez déjà') + '</p></div></header>' +
      '<div class="subtabs" role="tablist"><button type="button" role="tab" data-act="tab" data-tab="list" aria-selected="' + (S.tab === 'list') + '">Connecteurs</button><button type="button" role="tab" data-act="tab" data-tab="log" aria-selected="' + (S.tab === 'log') + '">Journal des envois' + (n ? ' <span class="badge badge--bad">' + n + '</span>' : '') + '</button></div>';
    if (S.loading) return head + C.skelRows(4);
    return head + (S.tab === 'list' ? listView() : logView());
  }
  function tile(id, ico, name, desc, badge, detail, btn) {
    return '<section class="card"><div class="card__head" style="margin-bottom:8px"><div class="row"><span class="empty__icon" style="width:44px;height:44px">' + icon(ico) + '</span><h2>' + name + '</h2></div>' + badge + '</div><p class="muted">' + desc + '</p>' + (detail ? '<p class="small" style="margin-top:8px">' + detail + '</p>' : '') + '<div style="margin-top:12px">' + btn + '</div></section>';
  }
  function listView() {
    var gs = sheetState(), h = S.hook;
    var alerts = gs === 'expired' ? '<div class="alert alert--bad" style="margin-bottom:14px">' + icon('alert') + '<span><strong>La connexion à Google a expiré.</strong> Plus rien n\'est copié dans votre feuille. Reconnectez-vous : les envois en attente repartiront.</span></div>' : '';
    if (h.on && h.down) alerts += '<div class="alert alert--bad" style="margin-bottom:14px">' + icon('alert') + '<span><strong>Votre outil ne répond pas.</strong> ' + failed().length + ' envoi(s) en échec. Voyez le journal pour réessayer.</span></div>';
    return alerts + '<div class="grid-2">' +
      tile('gs', 'grid', 'Google Sheets', 'Copie vos commandes ou vos réponses aux formulaires dans une feuille de calcul.',
        gs === 'on' ? '<span class="badge badge--ok">Activé</span>' : gs === 'expired' ? '<span class="badge badge--bad">Connexion expirée</span>' : '<span class="badge">Désactivé</span>',
        gs === 'off' ? '' : 'Feuille : <strong>' + esc(S.gs.sheet) + '</strong>',
        gs === 'off' ? '<button type="button" class="btn btn--primary" data-act="open-gs">Activer</button>' : gs === 'expired' ? '<button type="button" class="btn btn--primary" data-act="gs-reconnect">' + (S.gs.busy ? '<span class="spinner"></span>Connexion…' : icon('refresh') + 'Reconnecter') + '</button>' : '<button type="button" class="btn" data-act="open-gs">' + icon('settings') + 'Configurer</button>') +
      tile('hook', 'link', 'Webhook', 'Envoie les événements choisis à l\'adresse de votre propre outil.',
        h.on ? (h.down ? '<span class="badge badge--bad">En échec</span>' : '<span class="badge badge--ok">Activé</span>') : '<span class="badge">Désactivé</span>',
        h.on ? '<span class="mono">' + esc(h.url) + '</span>' : '',
        h.on ? '<button type="button" class="btn" data-act="open-hook">' + icon('settings') + 'Configurer</button>' : '<button type="button" class="btn btn--primary" data-act="open-hook">Activer</button>') +
      tile('glpi', 'form', 'GLPI', 'Crée un ticket depuis une conversation.', '<span class="badge badge--ok">Déjà en service</span>', '', '<button type="button" class="btn" data-act="desk-noop">' + icon('settings') + 'Configurer</button>') +
      '</div>';
  }
  function logView() {
    if (!S.log.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('refresh') + '</span><strong>Aucun envoi</strong><p>Les envois vers vos outils apparaîtront ici dès qu\'un connecteur est activé.</p></div></div>';
    var rows = S.log.filter(function (l) { return !S.filter || l.status === S.filter; });
    return '<div class="card__head"><span class="small muted">' + S.log.length + ' envois</span><select class="select" style="width:170px" aria-label="État" data-on-change="filter"><option value="">Tous les états</option><option value="ok"' + (S.filter === 'ok' ? ' selected' : '') + '>Réussis</option><option value="fail"' + (S.filter === 'fail' ? ' selected' : '') + '>En échec</option></select></div>' +
      (rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Vers</th><th>Événement</th><th>Élément</th><th>État</th><th></th></tr></thead><tbody>' + rows.map(function (l) {
        return '<tr><td class="muted">' + esc(l.when) + '</td><td>' + esc(l.target) + '</td><td>' + esc(l.event) + '</td><td class="tnum">' + esc(l.ref) + '</td><td><span class="badge badge--' + LST[l.status][1] + '">' + LST[l.status][0] + '</span>' + (l.why ? '<div class="small muted">' + esc(l.why) + '</div>' : '') + '</td><td class="num">' + (l.status === 'fail' ? '<button type="button" class="btn btn--sm" data-act="retry" data-id="' + l.id + '">' + icon('refresh') + 'Réessayer</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>' : '<div class="card"><div class="empty"><strong>Aucun envoi dans cet état</strong></div></div>');
  }

  function gsDrawer() {
    var g = S.gs, f = S.gsForm;
    return '<div class="row row--between" style="padding:16px"><h2 style="font-size:17px">Google Sheets</h2>' + close('close-drawer') + '</div><div class="stack" style="padding:0 16px 16px">' +
      (f.linked ? '<div class="alert alert--ok">' + icon('check') + '<span>Compte connecté : <strong>' + esc(f.account) + '</strong></span></div>' :
        '<p class="muted">Connectez le compte Google de votre entreprise. Les données copiées quitteront ChannelO pour ce compte.</p><div><button type="button" class="btn btn--primary" data-act="gs-link"' + (f.busy ? ' disabled' : '') + '>' + (f.busy ? '<span class="spinner"></span>Connexion…' : icon('link') + 'Connecter un compte Google') + '</button></div>') +
      (f.linked ? '<label class="field">Feuille où copier<select class="select" data-on-change="gs-sheet">' + SHEETS.map(function (s) { return '<option' + (f.sheet === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></label>' +
        '<div class="field">Que copier ?' + Object.keys(COPIES).map(function (k) { return '<label class="pick ' + (f.copy[k] ? 'is-on' : '') + '"><input type="checkbox" data-act="gs-copy" data-k="' + k + '"' + (f.copy[k] ? ' checked' : '') + '><span class="pick__main"><strong>' + COPIES[k] + '</strong></span></label>'; }).join('') + '</div>' +
        (f.err ? '<div class="alert alert--bad">' + icon('alert') + f.err + '</div>' : '') +
        '<div class="row row--between">' + (g.on ? '<button type="button" class="btn btn--ghost btn--danger" data-act="gs-off">Désactiver</button>' : '<span></span>') + '<div class="row"><button type="button" class="btn" data-act="close-drawer">Annuler</button><button type="button" class="btn btn--primary" data-act="gs-save">' + icon('check') + 'Enregistrer</button></div></div>' : '') + '</div>';
  }
  function hookDrawer() {
    var f = S.hookForm, on = S.hook.on;
    return '<div class="row row--between" style="padding:16px"><h2 style="font-size:17px">Webhook</h2>' + close('close-drawer') + '</div><div class="stack" style="padding:0 16px 16px">' +
      '<label class="field">Adresse de votre outil<input class="input mono ' + (f.urlErr ? 'input--error' : '') + '" value="' + esc(f.url) + '" data-on-input="hook-url" placeholder="https://monoutil.exemple.com/channelo">' + (f.urlErr ? '<span class="small" style="color:var(--bad)">' + f.urlErr + '</span>' : '<span class="field__hint">Une adresse qui commence par https://</span>') + '</label>' +
      '<div class="field">Quoi envoyer ?' + Object.keys(EVENTS).map(function (k) { return '<label class="pick ' + (f.events[k] ? 'is-on' : '') + '"><input type="checkbox" data-act="hook-event" data-k="' + k + '"' + (f.events[k] ? ' checked' : '') + '><span class="pick__main"><strong>' + EVENTS[k] + '</strong></span></label>'; }).join('') + '</div>' +
      '<label class="field">Code de vérification<span class="row" style="gap:6px"><input class="input mono" style="min-width:0" value="' + (f.show ? esc(f.secret) : '••••••••••••••••') + '" readonly aria-label="Code de vérification"><button type="button" class="icon-btn" data-act="hook-show" aria-label="' + (f.show ? 'Masquer' : 'Afficher') + ' le code">' + icon(f.show ? 'eye-off' : 'eye') + '</button></span><span class="field__hint">Votre outil s\'en sert pour vérifier que l\'envoi vient bien de ChannelO.</span></label>' +
      '<div class="row row--wrap"><button type="button" class="btn" data-act="hook-test"' + (f.testing ? ' disabled' : '') + '>' + (f.testing ? '<span class="spinner"></span>Test en cours…' : icon('send') + 'Tester') + '</button></div>' +
      (f.test === 'ok' ? '<div class="alert alert--ok">' + icon('check') + 'Votre outil a bien répondu.</div>' : f.test === 'fail' ? '<div class="alert alert--bad">' + icon('alert') + 'Votre outil n\'a pas répondu. Vérifiez l\'adresse et qu\'il est bien en marche.</div>' : '') +
      (f.err ? '<div class="alert alert--bad">' + icon('alert') + f.err + '</div>' : '') +
      '<div class="row row--between">' + (on ? '<button type="button" class="btn btn--ghost btn--danger" data-act="hook-off">Désactiver</button>' : '<span></span>') + '<div class="row"><button type="button" class="btn" data-act="close-drawer">Annuler</button><button type="button" class="btn btn--primary" data-act="hook-save">' + icon('check') + 'Enregistrer</button></div></div></div>';
  }

  /* ---------- Cartes ---------- */
  function orderLines() { return '<div class="lines"><div><span>1 × Montre Dorée Élégance (M)</span><span class="tnum">' + money(42000) + '</span></div><div class="total"><span>Total</span><span class="tnum">' + money(42000) + '</span></div></div>'; }
  function card(m, side) {
    var done = S.confirmed;
    var bad = done ? '<span class="badge badge--ok">Confirmée</span>' : '<span class="badge badge--warn">Reçue</span>';
    if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('bag') + 'Commande CMD-0150</span>' + bad + '</div><div class="dcard__body">' + orderLines() + '</div>' + (done ? '' : '<div class="dcard__foot"><button type="button" class="btn btn--primary btn--sm" data-act="confirm">' + icon('check') + 'Confirmer la commande</button></div>') + '</div>';
    return '<div class="pcard" style="width:270px"><div class="pcard__title">' + icon('bag') + 'Commande CMD-0150<span style="margin-left:auto">' + bad + '</span></div><div class="pcard__list">' + orderLines() + '</div></div>';
  }

  /* ---------- Cas ---------- */
  function seedLog() {
    return [
      { id: 's1', when: 'Aujourd\'hui, 08:42', target: 'Google Sheets', event: 'Commande', ref: 'CMD-0149 → Ventes 2026', status: 'ok', tries: 1 },
      { id: 's2', when: 'Aujourd\'hui, 08:42', target: 'Webhook', event: 'Commande', ref: 'CMD-0149', status: 'ok', tries: 1 },
      { id: 's3', when: 'Hier, 17:10', target: 'Webhook', event: 'Paiement', ref: 'PAY-K3V9Q', status: 'ok', tries: 2 }
    ];
  }

  C.define({
    id: 'connecteurs', title: 'Connecteurs', icon: 'link', priority: 3,
    entity: B.entity,
    cases: [
      { key: 'normal', label: 'Parcours normal (connecteurs activés)' },
      { key: 'expiree', label: 'Connexion expirée' },
      { key: 'echec', label: 'Envoi en échec et nouvel essai' },
      { key: 'vide', label: 'Aucun connecteur activé' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      var vide = k === 'vide';
      S = {
        tab: 'list', loading: k === 'chargement', filter: '', confirmed: false,
        gs: { on: !vide, expired: k === 'expiree', account: 'contact@montres-azur.exemple', sheet: SHEETS[0], copy: { orders: true, forms: false } },
        hook: { on: !vide, down: k === 'echec', url: vide ? '' : 'https://outils.montres-azur.exemple/channelo', events: { message: false, order: true, payment: true }, secret: 'exemple-fictif-7f3k2m9q' },
        log: vide ? [] : seedLog()
      };
      C.say({ from: 'citizen', text: 'Bonjour, je prends la montre dorée, taille M.' });
      C.say({ from: 'agent', text: 'Bien noté, voici votre commande.' });
      C.say({ from: 'agent', card: 'order', data: {} });
      if (k === 'expiree' || k === 'echec') {
        S.confirmed = true;
        dispatch('Commande', 'CMD-0150').forEach(mark);
      }
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    onCitizenText: function () { dispatch('Nouveau message', 'Message de ' + C.app.citizen.name); },
    side: function () {
      var mine = S.log.filter(function (l) { return l.mine; });
      return '<div><h3>Transmis à vos outils</h3>' + (mine.length ? '<div class="stack" style="gap:8px">' + mine.map(function (l) {
        return '<div class="small"><div class="row row--between"><strong>' + esc(l.target) + '</strong><span class="badge badge--' + LST[l.status][1] + '">' + LST[l.status][0] + '</span></div><span class="muted">' + esc(l.ref) + '</span>' + (l.status === 'fail' ? '<div style="margin-top:6px"><button type="button" class="btn btn--sm" data-act="retry" data-id="' + l.id + '">' + icon('refresh') + 'Réessayer</button></div>' : '') + '</div>';
      }).join('') + '</div>' : '<p class="small muted">Rien pour cette conversation.</p>') + '</div>';
    },
    card: card,
    act: {
      tab: function (el) { S.tab = el.dataset.tab; C.render(); },
      confirm: function () {
        S.confirmed = true;
        var out = dispatch('Commande', 'CMD-0150');
        C.say({ from: 'system', text: 'Commande CMD-0150 confirmée' });
        out.forEach(mark);
        C.render();
      },
      retry: function (el) { retry(entry(el.dataset.id)); },

      'open-gs': function () {
        var g = S.gs;
        S.gsForm = { linked: g.on, account: g.account, sheet: g.sheet, copy: Object.assign({}, g.copy) };
        C.drawer(gsDrawer);
      },
      'gs-link': function () {
        var f = S.gsForm; f.busy = true; C.render();
        C.later(1000, function () { f.busy = false; f.linked = true; });
      },
      'gs-copy': function (el) { S.gsForm.copy[el.dataset.k] = el.checked; S.gsForm.err = null; C.render(); },
      'gs-save': function () {
        var f = S.gsForm;
        if (!f.copy.orders && !f.copy.forms) { f.err = 'Choisissez au moins une chose à copier.'; C.render(); return; }
        S.gs.on = true; S.gs.expired = false; S.gs.sheet = f.sheet; S.gs.copy = f.copy;
        C.drawerFn = null; C.render(); C.toast('Google Sheets activé');
      },
      'gs-off': function () { S.gs.on = false; C.drawerFn = null; C.render(); C.toast('Google Sheets désactivé'); },
      'gs-reconnect': function () {
        S.gs.busy = true; C.render();
        C.later(1000, function () {
          S.gs.busy = false; S.gs.expired = false;
          S.log.filter(function (l) { return l.target === 'Google Sheets' && l.status === 'fail'; }).forEach(function (l) { l.status = 'ok'; l.why = ''; l.tries++; refresh(l); });
          C.toast('Reconnecté : les envois en attente sont repartis');
        });
      },

      'open-hook': function () {
        var h = S.hook;
        S.hookForm = { url: h.url, events: Object.assign({}, h.events), secret: h.secret, show: false };
        C.drawer(hookDrawer);
      },
      'hook-event': function (el) { S.hookForm.events[el.dataset.k] = el.checked; S.hookForm.err = null; C.render(); },
      'hook-show': function () { S.hookForm.show = !S.hookForm.show; C.render(); },
      'hook-test': function () {
        var f = S.hookForm;
        if (!urlOk(f.url)) { f.urlErr = 'Saisissez une adresse complète qui commence par https://'; C.render(); return; }
        f.urlErr = null; f.testing = true; f.test = null; C.render();
        C.later(1100, function () { f.testing = false; f.test = S.hook.down ? 'fail' : 'ok'; });
      },
      'hook-save': function () {
        var f = S.hookForm;
        if (!urlOk(f.url)) { f.urlErr = 'Saisissez une adresse complète qui commence par https://'; C.render(); return; }
        if (!Object.keys(f.events).some(function (k) { return f.events[k]; })) { f.err = 'Choisissez au moins un événement.'; C.render(); return; }
        S.hook.on = true; S.hook.url = f.url.trim(); S.hook.events = f.events;
        C.drawerFn = null; C.render(); C.toast('Webhook enregistré');
      },
      'hook-off': function () { S.hook.on = false; S.hook.down = false; C.drawerFn = null; C.render(); C.toast('Webhook désactivé'); }
    },
    input: {
      'hook-url': function (el) { S.hookForm.url = el.value; S.hookForm.test = null; }
    },
    change: {
      filter: function (el) { S.filter = el.value; C.render(); },
      'gs-sheet': function (el) { S.gsForm.sheet = el.value; }
    }
  });
})();
