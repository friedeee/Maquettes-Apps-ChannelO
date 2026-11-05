/* ==========================================================
   App 8 — Diffusions, promotions avec accord (dépend d'Actualités, déjà dans la console)
   Réglage : composer (texte, image, bouton), cibler, programmer, voir les résultats, limite par semaine.
   Dossier : rien à faire ; les réponses arrivent dans la file avec le repère « réponse à la diffusion X ».
   Téléphone : demande d'accord explicite ; message de diffusion avec « Ne plus recevoir » en un clic.
   ========================================================== */
'use strict';

(function () {
  var B = window.BOUTIQUE, esc = C.esc, money = C.money, icon = C.icon;
  var S = {};
  var TARGETS = { all: 'Tous les abonnés', ordered: 'Ceux qui ont commandé', city: 'Par ville' };
  var CITIES = { Cotonou: 251, Calavi: 97, 'Porto-Novo': 64 };
  var WHEN = [
    { key: 'now', label: 'Maintenant', text: 'Aujourd\'hui', week: 0 },
    { key: 'tomorrow', label: 'Demain à 9 h', text: 'Ven. 6 nov. à 9 h', week: 0 },
    { key: 'saturday', label: 'Samedi à 9 h', text: 'Sam. 7 nov. à 9 h', week: 0 },
    { key: 'monday', label: 'Lundi 9 novembre à 9 h', text: 'Lun. 9 nov. à 9 h', week: 1 }
  ];
  var ST = { sent: ['Envoyée', 'ok'], scheduled: ['Programmée', 'info'], draft: ['Brouillon', ''] };

  function bc(id) { return S.list.filter(function (b) { return b.id === id; })[0]; }
  function product(id) { return S.products.filter(function (p) { return p.id === id; })[0]; }
  function when(k) { return WHEN.filter(function (w) { return w.key === k; })[0]; }
  function pct(a, b) { return b ? Math.round(a * 100 / b) + ' %' : '—'; }
  function close() { return '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button>'; }
  function badge(b) { return '<span class="badge badge--' + ST[b.status][1] + '">' + ST[b.status][0] + '</span>'; }
  function subscribers() { return Object.keys(CITIES).reduce(function (t, c) { return t + CITIES[c]; }, 0) - S.gone; }
  function audience(f) {
    if (!S.hasSubs) return 0;
    if (f.target === 'ordered') return 168;
    if (f.target === 'city') return CITIES[f.city];
    return subscribers();
  }
  function usedThisWeek() { return S.list.filter(function (b) { return b.week === 0 && b.status !== 'draft'; }).length; }
  function limitReached() { return usedThisWeek() >= S.limit; }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var head = '<header class="page-head"><div><h1>Diffusions</h1><p>' + (S.loading ? 'Chargement…' : (S.hasSubs ? subscribers() + ' abonnés ont donné leur accord' : 'Aucun abonné pour l\'instant')) + '</p></div>' +
      (S.loading || S.tab !== 'list' ? '' : '<div class="page-head__actions"><button type="button" class="btn btn--primary" data-act="new-bc">' + icon('plus') + 'Nouvelle diffusion</button></div>') + '</header>' +
      '<div class="subtabs" role="tablist">' + [['list', 'Diffusions'], ['compose', 'Composer'], ['rules', 'Limite d\'envoi']].map(function (t) {
        return '<button type="button" role="tab" data-act="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    if (S.loading) return head + C.skelRows(5);
    return head + ({ list: listView, compose: composeView, rules: rulesView })[S.tab]();
  }
  function listView() {
    if (!S.list.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('megaphone') + '</span><strong>Aucune diffusion</strong><p>Annoncez une promotion ou une information à vos abonnés.</p><button type="button" class="btn btn--primary" data-act="new-bc">' + icon('plus') + 'Nouvelle diffusion</button></div></div>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Diffusion</th><th>Cible</th><th>Date</th><th class="num">Envoyées</th><th class="num">Lues</th><th class="num">Clics</th><th class="num">Désabonnements</th><th>État</th></tr></thead><tbody>' + S.list.map(function (b) {
      var sent = b.status === 'sent';
      return '<tr><td><strong>' + esc(b.title) + '</strong></td><td>' + esc(b.targetText) + '</td><td class="muted">' + esc(b.date) + '</td><td class="num">' + (sent ? b.sent : '—') + '</td><td class="num">' + (sent ? b.read + ' <span class="muted small">(' + pct(b.read, b.sent) + ')</span>' : '—') + '</td><td class="num">' + (sent ? b.clicks : '—') + '</td><td class="num">' + (sent ? b.unsub : '—') + '</td><td>' + badge(b) + (b.status === 'scheduled' ? ' <button type="button" class="btn btn--sm" data-act="cancel-bc" data-id="' + b.id + '">Annuler</button>' : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function composeView() {
    var f = S.form, n = audience(f), w = when(f.when), blocked = w.week === 0 && limitReached(), p = f.product ? product(f.product) : null;
    return '<div class="grid-2" style="align-items:start"><div class="stack">' +
      (blocked ? '<div class="alert alert--warn">' + icon('alert') + '<span><strong>Limite atteinte</strong> : ' + S.limit + ' diffusions cette semaine. Programmez celle-ci à partir de lundi 9 novembre.</span></div>' : '') +
      '<section class="card"><div class="card__head"><h2>Message</h2></div><div class="stack">' +
        '<label class="field">Nom de la diffusion<input class="input ' + (f.errTitle ? 'input--error' : '') + '" value="' + esc(f.title) + '" data-on-input="form" data-k="title" placeholder="Ex. Soldes de novembre"><span class="field__hint">Pour vous et vos agents, le client ne le voit pas.</span></label>' +
        '<label class="field">Texte<textarea class="textarea ' + (f.errText ? 'input--error' : '') + '" maxlength="300" data-on-input="form-text" placeholder="Votre message aux abonnés">' + esc(f.text) + '</textarea><span class="field__hint"><span id="bc-count">' + f.text.length + '</span> / 300 signes</span></label>' +
        '<label class="field">Image et bouton<select class="select" data-on-change="form-product"><option value="">Pas d\'image, pas de bouton</option>' + S.products.filter(function (x) { return !x.hidden; }).map(function (x) { return '<option value="' + x.id + '"' + (f.product === x.id ? ' selected' : '') + '>Produit : ' + esc(x.name) + '</option>'; }).join('') + '<option value="form"' + (f.product === 'form' ? ' selected' : '') + '>Formulaire : Avis des clients</option></select></label>' +
      '</div></section>' +
      '<section class="card"><div class="card__head"><h2>À qui</h2><span class="badge badge--info">' + n + ' personnes</span></div><div class="stack" style="gap:6px">' + Object.keys(TARGETS).map(function (t) {
        var on = f.target === t;
        return '<label class="pick ' + (on ? 'is-on' : '') + '"><input type="radio" name="tgt" data-act="form-target" data-t="' + t + '"' + (on ? ' checked' : '') + '><span class="pick__main"><strong>' + TARGETS[t] + '</strong></span></label>';
      }).join('') + (f.target === 'city' ? '<select class="select" aria-label="Ville" data-on-change="form-city">' + Object.keys(CITIES).map(function (c) { return '<option' + (f.city === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select>' : '') + '<p class="small muted">Seuls les clients qui ont accepté reçoivent ce message.</p></div></section>' +
      '<section class="card"><div class="card__head"><h2>Quand</h2><span class="small muted tnum">' + usedThisWeek() + ' sur ' + S.limit + ' cette semaine</span></div><select class="select" aria-label="Date d\'envoi" data-on-change="form-when">' + WHEN.map(function (x) { return '<option value="' + x.key + '"' + (f.when === x.key ? ' selected' : '') + '>' + x.label + '</option>'; }).join('') + '</select>' +
        '</section>' +
      (f.err ? '<div class="alert alert--bad">' + icon('alert') + f.err + '</div>' : '') +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="tab" data-tab="list">Annuler</button><button type="button" class="btn btn--primary" data-act="send-bc"' + (blocked || !n ? ' disabled' : '') + '>' + icon(f.when === 'now' ? 'send' : 'clock') + (f.when === 'now' ? 'Envoyer à ' + n + ' personnes' : 'Programmer') + '</button></div></div>' +
      '<div><p class="small muted" style="margin-bottom:8px">' + icon('eye') + ' Ce que le client reçoit</p><div id="bc-preview">' + bcCardPhone({ text: f.text || 'Votre message apparaîtra ici.', product: f.product }, true) + '</div></div></div>';
  }
  function rulesView() {
    return '<section class="card" style="max-width:560px"><div class="card__head"><h2>Limite d\'envoi</h2></div><label class="field">Nombre de diffusions par semaine, au maximum<select class="select" data-on-change="limit">' + [1, 2, 3].map(function (n) { return '<option value="' + n + '"' + (S.limit === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select><span class="field__hint">Au-delà, les clients se désabonnent. La semaine commence le lundi.</span></label></section>';
  }

  /* ---------- Cartes ---------- */
  function buttonLabel(prod) { return prod === 'form' ? 'Donner mon avis' : 'Voir le produit'; }
  function bcCardPhone(b, preview) {
    var p = b.product && b.product !== 'form' ? product(b.product) : null, gone = S.citizen === 'out';
    return '<div class="pcard" style="width:270px">' + (p ? '<div class="pcard__img">' + B.art(p.art) + '</div>' : '') +
      '<div class="pcard__list"><span class="pmsg__auto">' + icon('megaphone') + 'Offre de ' + esc(C.app.entity.name) + '</span><span style="white-space:pre-wrap">' + esc(b.text) + '</span>' + (p ? '<span class="pcard__price tnum">' + money(p.price) + '</span>' : '') + '</div>' +
      '<div class="pcard__foot" style="flex-direction:column">' + (b.product ? '<button type="button" class="btn btn--primary ph-btn" ' + (preview ? 'disabled' : 'data-act="ph-open" data-id="' + b.id + '"') + '>' + buttonLabel(b.product) + '</button>' : '') +
      (preview ? '<button type="button" class="btn btn--ghost ph-btn" disabled>Ne plus recevoir</button>' : gone ? '<span class="small muted" style="text-align:center">Vous ne recevez plus ces offres</span>' : '<button type="button" class="btn btn--ghost ph-btn" data-act="ph-stop" data-id="' + b.id + '">Ne plus recevoir</button>') + '</div></div>';
  }
  function card(m, side) {
    if (m.card === 'optin') {
      if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('megaphone') + 'Demande d\'accord</span>' + citizenBadge() + '</div><div class="dcard__body"><span class="small muted">Message automatique, rien à faire.</span></div></div>';
      return '<div class="pcard" style="width:270px"><div class="pcard__list"><strong>Recevoir les offres de ' + esc(C.app.entity.name) + ' ?</strong><span class="muted">Au maximum ' + S.limit + ' messages par semaine. Vous pouvez arrêter à tout moment.</span></div>' +
        (S.citizen === 'ask' ? '<div class="pcard__foot"><button type="button" class="btn" data-act="ph-no">Non merci</button><button type="button" class="btn btn--primary" data-act="ph-yes">Oui, recevoir</button></div>' : '<div class="pcard__foot">' + citizenBadge() + '</div>') + '</div>';
    }
    var b = bc(m.data.id);
    if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('megaphone') + 'Diffusion envoyée</span><span class="badge">Automatique</span></div><div class="dcard__body"><strong>' + esc(b.title) + '</strong><span class="muted small">' + esc(b.text) + '</span></div></div>';
    return bcCardPhone(b);
  }
  function citizenBadge() {
    return S.citizen === 'in' ? '<span class="badge badge--ok">Abonné</span>' : S.citizen === 'out' ? '<span class="badge">Désabonné</span>' : S.citizen === 'no' ? '<span class="badge">A refusé</span>' : '<span class="badge badge--warn">En attente</span>';
  }

  /* ---------- Téléphone : produit ouvert depuis la diffusion ---------- */
  function productSheet() {
    var b = bc(S.openId), p = b.product === 'form' ? null : product(b.product);
    if (!p) return '<div class="ph-sheet__head"><h2>Avis des clients</h2><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('x') + '</button></div><div class="ph-sheet__body"><p class="muted">Le formulaire s\'ouvre ici, comme les formulaires déjà dans l\'app.</p></div>';
    return '<div class="ph-sheet__head"><h2>' + esc(p.name) + '</h2><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('x') + '</button></div><div class="ph-sheet__body"><div style="border-radius:14px;overflow:hidden;aspect-ratio:16/10">' + B.art(p.art) + '</div><strong class="pcard__price tnum">' + money(p.price) + '</strong><p class="muted">' + esc(p.desc) + '</p></div><div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-order">Ce produit m\'intéresse</button></div>';
  }

  /* Une réponse à une diffusion arrive avec un repère, côté agent seulement */
  function markReply() {
    var last = S.lastBc && bc(S.lastBc);
    if (!last) return;
    var m = C.msgs.pop();
    C.say({ from: 'system', only: 'desk', text: icon('megaphone') + ' Réponse à la diffusion « ' + esc(last.title) + ' »' });
    C.msgs.push(m);
    S.replied = last.title;
  }

  /* ---------- Cas ---------- */
  function emptyForm() { return { title: '', text: '', product: '', target: 'all', city: 'Cotonou', when: 'now' }; }
  function seedList() {
    return [
      { id: 'b1', title: 'Soldes de novembre', text: 'Jusqu\'à samedi : 15 % sur toutes les montres connectées. Répondez à ce message pour réserver la vôtre.', product: 'p3', targetText: 'Tous les abonnés', date: 'Lun. 2 nov.', status: 'sent', week: 0, sent: 408, read: 287, clicks: 64, unsub: 4 },
      { id: 'b2', title: 'Nouveaux bracelets', text: 'De nouveaux bracelets cuir sont arrivés en boutique.', product: 'p7', targetText: 'Ceux qui ont commandé', date: 'Mar. 27 oct.', status: 'sent', week: -1, sent: 162, read: 129, clicks: 31, unsub: 1 }
    ];
  }

  C.define({
    id: 'diffusions', title: 'Diffusions', icon: 'megaphone', priority: 2,
    entity: B.entity,
    queue: [{ n: 'Rodrigue H.', p: 'Réponse à « Soldes de novembre » : valable à Calavi ?', t: '09:40' }, { n: 'Serge A.', p: 'Merci !', t: 'Hier' }],
    cases: [
      { key: 'normal', label: 'Demande d\'accord au client' },
      { key: 'recue', label: 'Diffusion reçue et réponse du client' },
      { key: 'desabonne', label: 'Client désabonné' },
      { key: 'limite', label: 'Limite par semaine atteinte' },
      { key: 'vide', label: 'Aucune diffusion, aucun abonné' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      var vide = k === 'vide';
      S = { tab: k === 'limite' ? 'compose' : 'list', loading: k === 'chargement', limit: 2, gone: 0, hasSubs: !vide, citizen: k === 'recue' ? 'in' : k === 'desabonne' ? 'out' : 'ask', products: B.seed(), list: vide ? [] : seedList(), form: emptyForm() };
      if (k === 'limite') {
        S.citizen = 'in';
        S.list.unshift({ id: 'b3', title: 'Livraison offerte', text: 'Livraison offerte ce week-end à Cotonou.', product: '', targetText: 'Par ville : Cotonou', date: 'Mer. 4 nov.', status: 'sent', week: 0, sent: 251, read: 140, clicks: 22, unsub: 2 });
        S.form.title = 'Dernier jour des soldes'; S.form.text = 'Dernier jour pour profiter des soldes.';
      }
      C.say({ from: 'citizen', text: 'Bonjour, vous avez des montres pour enfant ?' });
      C.say({ from: 'agent', text: 'Bonjour, oui, à partir de 15 000 FCFA.' });
      C.say({ from: 'auto', card: 'optin', data: {} });
      if (k === 'recue' || k === 'desabonne') {
        S.lastBc = 'b1';
        C.say({ from: 'agent', agent: B.entity.name, card: 'bc', data: { id: 'b1' } });
      }
      if (k === 'recue') {
        C.say({ from: 'citizen', text: 'Bonjour, la remise marche aussi pour la couleur rose ?' });
        markReply();
      }
      if (k === 'desabonne') {
        S.gone = 1;
        C.say({ from: 'system', text: 'Vous ne recevez plus les offres de ' + esc(B.entity.name) });
      }
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    quick: function () { return !S.loading && S.citizen === 'out' ? '<button type="button" data-act="ph-yes">' + icon('bell') + 'Recevoir à nouveau les offres</button>' : ''; },
    onCitizenText: function () { markReply(); },
    side: function () {
      return '<div><h3>Offres de la boutique</h3><dl class="facts"><div><dt>Accord</dt><dd>' + citizenBadge() + '</dd></div>' + (S.replied ? '<div><dt>A répondu à</dt><dd>' + esc(S.replied) + '</dd></div>' : '') + '</dl>' + (S.citizen === 'out' ? '<p class="small muted" style="margin-top:8px">Ce client ne recevra plus de diffusion. Répondre à ses messages reste possible.</p>' : '') + '</div>';
    },
    card: card,
    act: {
      tab: function (el) { S.tab = el.dataset.tab; C.render(); },
      'new-bc': function () { S.form = emptyForm(); S.tab = 'compose'; C.render(); },
      'form-target': function (el) { S.form.target = el.dataset.t; C.render(); },
      'cancel-bc': function (el) { S.list = S.list.filter(function (b) { return b.id !== el.dataset.id; }); C.render(); C.toast('Diffusion annulée'); },
      'send-bc': function () {
        var f = S.form, w = when(f.when);
        f.errTitle = !f.title.trim(); f.errText = !f.text.trim();
        if (f.errTitle || f.errText) { f.err = 'Donnez un nom et un texte à la diffusion.'; C.render(); return; }
        if (w.week === 0 && limitReached()) return;
        var n = audience(f), now = f.when === 'now';
        var b = { id: 'b' + C.uid(), title: f.title.trim(), text: f.text.trim(), product: f.product, targetText: TARGETS[f.target] + (f.target === 'city' ? ' : ' + f.city : ''), date: w.text, status: now ? 'sent' : 'scheduled', week: w.week, sent: now ? n : 0, read: 0, clicks: 0, unsub: 0 };
        S.list.unshift(b); S.form = emptyForm(); S.tab = 'list';
        if (now) {
          if (S.citizen === 'in') { S.lastBc = b.id; C.say({ from: 'agent', agent: B.entity.name, card: 'bc', data: { id: b.id } }); }
          else C.toast(S.citizen === 'out' ? C.app.citizen.name + ' ne reçoit plus les offres : rien ne lui est envoyé' : C.app.citizen.name + ' n\'a pas donné son accord : rien ne lui est envoyé');
          C.later(1500, function () { b.read = Math.round(b.sent * 0.3); b.clicks = Math.round(b.sent * 0.06); });
        } else C.toast('Diffusion programmée : ' + w.text);
        C.render();
      },

      'ph-yes': function () {
        var back = S.citizen === 'out';
        S.citizen = 'in'; if (back) S.gone = 0;
        C.say({ from: 'system', text: 'Vous recevez maintenant les offres de ' + esc(B.entity.name) });
        C.render();
      },
      'ph-no': function () { S.citizen = 'no'; C.render(); C.toast('C\'est noté : aucune offre ne vous sera envoyée', 'phone'); },
      'ph-open': function (el) { var b = bc(el.dataset.id); b.clicks++; S.openId = b.id; S.lastBc = b.id; C.layer(productSheet); },
      'ph-order': function () {
        var b = bc(S.openId), p = product(b.product);
        C.layers = [];
        C.say({ from: 'citizen', text: 'Bonjour, ce produit m\'intéresse : ' + p.name + '.' });
        markReply();
        C.render();
      },
      'ph-stop': function (el) {
        var b = bc(el.dataset.id);
        b.unsub++; S.citizen = 'out'; S.gone++;
        C.say({ from: 'system', text: 'Vous ne recevez plus les offres de ' + esc(B.entity.name) });
        C.render();
      }
    },
    input: {
      form: function (el) { S.form[el.dataset.k] = el.value; S.form.errTitle = false; S.form.err = null; el.classList.remove('input--error'); },
      'form-text': function (el) {
        S.form.text = el.value; S.form.errText = false; S.form.err = null; el.classList.remove('input--error');
        C.$('#bc-count').textContent = el.value.length;
        C.$('#bc-preview').innerHTML = bcCardPhone({ text: el.value || 'Votre message apparaîtra ici.', product: S.form.product }, true);
      }
    },
    change: {
      'form-product': function (el) { S.form.product = el.value; C.render(); },
      'form-city': function (el) { S.form.city = el.value; C.render(); },
      'form-when': function (el) { S.form.when = el.value; C.render(); },
      limit: function (el) { S.limit = +el.value; C.render(); C.toast('Limite enregistrée'); }
    }
  });
})();
