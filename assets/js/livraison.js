/* ==========================================================
   App 5 — Livraison et suivi (dépend de Commande)
   Réglage : zones et frais, délais annoncés, livreurs, liste des livraisons.
   Dossier : affecter un livreur, étapes (Préparée → En route → Livrée), preuve, paiement à la livraison, problèmes.
   Téléphone : suivi dans la discussion (étapes, livreur, heure estimée), « Je ne suis pas disponible ».
   ========================================================== */
'use strict';

(function () {
  var B = window.BOUTIQUE, esc = C.esc, money = C.money, icon = C.icon;
  var S = {};
  var STEPS = [['preparee', 'Préparée'], ['enroute', 'En route'], ['livree', 'Livrée']];
  var LATER = ['Plus tard aujourd\'hui', 'Demain matin', 'Demain après-midi'];
  var ISSUES = {
    injoignable: { label: 'Client injoignable', hint: 'Le livreur a appelé sans réponse.', phone: 'Le livreur n\'arrive pas à vous joindre' },
    adresse: { label: 'Adresse introuvable', hint: 'Le livreur ne trouve pas le lieu.', phone: 'Le livreur ne trouve pas votre adresse' },
    retour: { label: 'Retour du colis', hint: 'Le colis repart à la boutique.', phone: 'Votre colis est retourné à la boutique' }
  };

  function d() { return S.delivery; }
  function courier(id) { return S.couriers.filter(function (c) { return c.id === id; })[0]; }
  function zone(id) { return S.zones.filter(function (z) { return z.id === id; })[0]; }
  function total(x) { return x.amount + x.fee; }
  function stepLabel(x) { return x.step === 'retour' ? 'Retournée' : x.step === 'attente' ? 'À affecter' : STEPS.filter(function (s) { return s[0] === x.step; })[0][1]; }
  function badge(x) {
    var t = x.step === 'livree' ? 'ok' : x.step === 'retour' ? 'bad' : x.issue ? 'warn' : x.step === 'attente' ? 'warn' : 'info';
    return '<span class="badge badge--' + t + '">' + (x.issue ? ISSUES[x.issue].label : stepLabel(x)) + '</span>';
  }
  function close() { return '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button>'; }

  /* Preuve dessinée : aucune image réelle */
  function proofArt(kind) {
    if (kind === 'signature') return '<svg class="proof" viewBox="0 0 220 90" role="img" aria-label="Signature du client"><rect width="220" height="90" fill="#fff"/><path d="M18 62c18-30 26-42 32-38 8 6-14 42-6 44 10 2 18-30 28-28 8 2-4 22 4 24 10 2 16-16 26-14 8 2 2 12 12 12 14 0 26-14 44-12 12 1 26 4 40 0" fill="none" stroke="#10245C" stroke-width="2.4" stroke-linecap="round"/><path d="M14 76h192" stroke="#C9CED6" stroke-dasharray="3 4"/></svg>';
    return '<svg class="proof" viewBox="0 0 220 110" role="img" aria-label="Photo du colis déposé"><rect width="220" height="110" fill="#DCE6F7"/><rect y="78" width="220" height="32" fill="#B9C6DC"/><rect x="150" y="14" width="46" height="66" rx="3" fill="#7F93B5"/><circle cx="188" cy="48" r="2.5" fill="#F4F6FA"/><rect x="70" y="48" width="56" height="42" rx="3" fill="#C99A5E"/><path d="M70 62h56M98 48v42" stroke="#A67C43" stroke-width="3"/></svg>';
  }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var head = '<header class="page-head"><div><h1>Livraison</h1><p>' + (S.loading ? 'Chargement…' : S.couriers.filter(function (c) { return c.active; }).length + ' livreurs disponibles · ' + S.zones.length + ' zones') + '</p></div>' +
      (S.tab === 'zones' && !S.loading ? '<div class="page-head__actions"><button type="button" class="btn btn--primary" data-act="new-zone">' + icon('plus') + 'Ajouter une zone</button></div>' : '') +
      (S.tab === 'couriers' && !S.loading ? '<div class="page-head__actions"><button type="button" class="btn btn--primary" data-act="new-courier">' + icon('plus') + 'Ajouter un livreur</button></div>' : '') + '</header>' +
      '<div class="subtabs" role="tablist">' + [['list', 'Livraisons'], ['zones', 'Zones et délais'], ['couriers', 'Livreurs']].map(function (t) {
        return '<button type="button" role="tab" data-act="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    if (S.loading) return head + C.skelRows(5);
    return head + ({ list: listView, zones: zonesView, couriers: couriersView })[S.tab]();
  }

  function allDeliveries() {
    return [d()].concat(S.history);
  }
  function listView() {
    if (!S.couriers.length && !S.history.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('truck') + '</span><strong>Aucune livraison</strong><p>Ajoutez d\'abord vos zones et vos livreurs.</p></div></div>';
    var rows = allDeliveries();
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Commande</th><th>Client</th><th>Zone</th><th>Livreur</th><th>Heure estimée</th><th class="num">À encaisser</th><th>État</th></tr></thead><tbody>' +
      rows.map(function (x) {
        var c = courier(x.courier);
        return '<tr><td class="tnum"><strong>' + x.id + '</strong></td><td>' + esc(x.client) + '</td><td>' + esc(zone(x.zone).name) + '</td><td>' + (c ? esc(c.name) : '<span class="muted">Pas encore affecté</span>') + '</td><td class="tnum">' + (x.step === 'livree' || x.step === 'retour' ? '<span class="muted">—</span>' : esc(x.eta || '—')) + '</td><td class="num">' + (x.cod && !x.codPaid ? money(total(x)) : '<span class="muted">—</span>') + '</td><td>' + badge(x) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function zonesView() {
    if (!S.zones.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('pin') + '</span><strong>Aucune zone de livraison</strong><p>Sans zone, le client ne peut choisir que le retrait en boutique.</p><button type="button" class="btn btn--primary" data-act="new-zone">' + icon('plus') + 'Ajouter une zone</button></div></div>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Zone</th><th class="num">Frais</th><th>Délai annoncé au client</th><th></th></tr></thead><tbody>' +
      S.zones.map(function (z) {
        return '<tr><td><strong>' + esc(z.name) + '</strong></td><td class="num">' + (z.fee ? money(z.fee) : 'Gratuit') + '</td><td>' + esc(z.delay) + '</td><td class="num"><button type="button" class="icon-btn" data-act="edit-zone" data-id="' + z.id + '" aria-label="Modifier ' + esc(z.name) + '">' + icon('edit') + '</button><button type="button" class="icon-btn" data-act="del-zone" data-id="' + z.id + '" aria-label="Supprimer ' + esc(z.name) + '">' + icon('trash') + '</button></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function couriersView() {
    if (!S.couriers.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('truck') + '</span><strong>Aucun livreur</strong><p>Ajoutez vos livreurs : leur nom et leur numéro sont montrés au client pendant la livraison.</p><button type="button" class="btn btn--primary" data-act="new-courier">' + icon('plus') + 'Ajouter un livreur</button></div></div>';
    return '<div class="grid-2">' + S.couriers.map(function (c) {
      return '<section class="card"><div class="card__head" style="margin-bottom:0"><div class="row"><span class="avatar">' + esc(c.name.slice(0, 2).toUpperCase()) + '</span><div><strong>' + esc(c.name) + '</strong><div class="small muted tnum">' + esc(c.phone) + '</div></div></div><input type="checkbox" class="switch" data-act="courier-active" data-id="' + c.id + '"' + (c.active ? ' checked' : '') + ' aria-label="Disponible"></div>' + (c.active ? '' : '<p class="small muted" style="margin-top:8px">Indisponible : ne peut pas recevoir de livraison.</p>') + '</section>';
    }).join('') + '</div>';
  }
  function zoneModal() {
    var f = S.zform;
    return '<div class="modal__head"><h2>' + (f.id ? 'Modifier la zone' : 'Nouvelle zone') + '</h2>' + close() + '</div><div class="modal__body">' +
      '<label class="field">Nom de la zone<input class="input ' + (f.err ? 'input--error' : '') + '" value="' + esc(f.name) + '" data-on-input="zform" data-k="name" placeholder="Ex. Godomey">' + (f.err ? '<span class="small" style="color:var(--bad)">' + f.err + '</span>' : '') + '</label>' +
      '<div class="grid-2"><label class="field">Frais<span class="input-group"><input class="input tnum" inputmode="numeric" value="' + esc(f.fee) + '" data-on-input="zform" data-k="fee"><span>FCFA</span></span><span class="field__hint">0 = gratuit</span></label>' +
      '<label class="field">Délai annoncé<input class="input" value="' + esc(f.delay) + '" data-on-input="zform" data-k="delay" placeholder="Ex. Le jour même"></label></div></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="save-zone">' + icon('check') + 'Enregistrer</button></div>';
  }
  function courierModal() {
    var f = S.cform;
    return '<div class="modal__head"><h2>Nouveau livreur</h2>' + close() + '</div><div class="modal__body">' +
      '<label class="field">Nom<input class="input ' + (f.err ? 'input--error' : '') + '" value="' + esc(f.name) + '" data-on-input="cform" data-k="name" placeholder="Ex. Fidèle A.">' + (f.err ? '<span class="small" style="color:var(--bad)">' + f.err + '</span>' : '') + '</label>' +
      '<label class="field">Téléphone<input class="input tnum" inputmode="tel" value="' + esc(f.phone) + '" data-on-input="cform" data-k="phone" placeholder="01 00 00 00 00"><span class="field__hint">Le client voit ce numéro pendant la livraison.</span></label></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="save-courier">' + icon('check') + 'Ajouter</button></div>';
  }

  /* ---------- Dossier (agent) ---------- */
  function assignModal() {
    var f = S.aform, list = S.couriers.filter(function (c) { return c.active; });
    return '<div class="modal__head"><h2>' + (d().courier ? 'Changer de livreur' : 'Affecter un livreur') + '</h2>' + close() + '</div><div class="modal__body">' +
      '<div class="small muted">Commande ' + d().id + ' · ' + esc(d().addr) + '</div>' +
      (list.length ? '<div class="field">Livreur' + list.map(function (c) {
        var on = f.courier === c.id;
        return '<label class="pick ' + (on ? 'is-on' : '') + '"><input type="radio" name="courier" data-act="pick-courier" data-id="' + c.id + '"' + (on ? ' checked' : '') + '><span class="pick__main"><strong>' + esc(c.name) + '</strong><span class="tnum">' + esc(c.phone) + '</span></span></label>';
      }).join('') + '</div><label class="field">Heure estimée<input class="input tnum" value="' + esc(f.eta) + '" data-on-input="aform" data-k="eta"><span class="field__hint">Délai de la zone ' + esc(zone(d().zone).name) + ' : ' + esc(zone(d().zone).delay) + '</span></label>'
        : '<div class="alert alert--warn">' + icon('alert') + 'Aucun livreur disponible. Un administrateur doit en ajouter dans Livraison.</div>') + '</div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="save-assign"' + (f.courier ? '' : ' disabled') + '>' + icon('check') + 'Affecter</button></div>';
  }
  function deliveredModal() {
    var f = S.dform, x = d();
    return '<div class="modal__head"><h2>Marquer livrée</h2>' + close() + '</div><div class="modal__body">' +
      '<div class="field">Preuve de livraison, envoyée par le livreur<div class="grid-2">' + [['photo', 'photo', 'Photo du colis'], ['signature', 'edit', 'Signature du client']].map(function (k) {
        return '<button type="button" class="ph-option ' + (f.proof === k[0] ? 'is-on' : '') + '" data-act="pick-proof" data-k="' + k[0] + '">' + icon(k[1]) + '<span><strong>' + k[2] + '</strong></span></button>';
      }).join('') + '</div></div>' +
      (f.proof ? proofArt(f.proof) : '') +
      (f.err ? '<div class="alert alert--bad">' + icon('alert') + f.err + '</div>' : '') +
      (x.cod ? '<label class="pick ' + (f.cod ? 'is-on' : '') + '"><input type="checkbox" data-act="toggle-cod"' + (f.cod ? ' checked' : '') + '><span class="pick__main"><strong>Paiement à la livraison encaissé</strong><span>Le livreur a reçu l\'argent du client</span></span><strong class="tnum">' + money(total(x)) + '</strong></label>' : '') + '</div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="save-delivered">' + icon('check') + 'Confirmer la livraison</button></div>';
  }
  function issueModal() {
    return '<div class="modal__head"><h2>Signaler un problème</h2>' + close() + '</div><div class="modal__body">' +
      Object.keys(ISSUES).map(function (k) {
        var on = S.iform === k;
        return '<label class="pick ' + (on ? 'is-on' : '') + '"><input type="radio" name="issue" data-act="pick-issue" data-k="' + k + '"' + (on ? ' checked' : '') + '><span class="pick__main"><strong>' + ISSUES[k].label + '</strong><span>' + ISSUES[k].hint + '</span></span></label>';
      }).join('') + '<p class="small muted">Le client est prévenu dans la discussion.</p></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="save-issue">' + icon('send') + 'Prévenir le client</button></div>';
  }

  /* ---------- Cartes ---------- */
  function stepsHtml(x) {
    if (x.step === 'retour') return '<div class="alert alert--bad small">' + icon('undo') + '<span><strong>' + ISSUES.retour.phone + '</strong><br>' + esc(x.note || '') + '</span></div>';
    var cur = STEPS.map(function (s) { return s[0]; }).indexOf(x.step);
    return '<div class="steps">' + STEPS.map(function (s, i) {
      var cls = x.step === 'livree' || i < cur ? 'is-done' : i === cur ? 'is-now' : '';
      var sub = i === cur && x.step === 'enroute' && x.eta ? 'Arrivée estimée : ' + esc(x.eta) : '';
      return '<div class="step ' + cls + '"><span class="step__dot">' + (cls === 'is-done' ? icon('check') : '') + '</span><div><strong>' + s[1] + '</strong>' + (sub ? '<span>' + sub + '</span>' : '') + '</div></div>';
    }).join('') + '</div>';
  }
  function deskCard(x) {
    var c = courier(x.courier), foot = '';
    if (x.step === 'attente') foot = '<button type="button" class="btn btn--primary btn--sm" data-act="open-assign">' + icon('truck') + 'Affecter un livreur</button>';
    else if (x.step === 'preparee') foot = '<button type="button" class="btn btn--primary btn--sm" data-act="go-route">' + icon('truck') + 'Marquer en route</button><button type="button" class="btn btn--sm" data-act="open-assign">Changer de livreur</button>';
    else if (x.step === 'enroute') foot = x.issue
      ? '<button type="button" class="btn btn--primary btn--sm" data-act="retry">' + icon('refresh') + 'Nouvel essai</button><button type="button" class="btn btn--sm btn--danger" data-act="back-shop">' + icon('undo') + 'Retour à la boutique</button>'
      : '<button type="button" class="btn btn--primary btn--sm" data-act="open-delivered">' + icon('check') + 'Marquer livrée</button><button type="button" class="btn btn--sm" data-act="open-issue">' + icon('alert') + 'Signaler un problème</button>';
    else if (x.step === 'retour') foot = '<button type="button" class="btn btn--primary btn--sm" data-act="new-try">' + icon('refresh') + 'Relivrer</button>';
    return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('truck') + 'Livraison ' + x.id + '</span>' + badge(x) + '</div><div class="dcard__body">' +
      (x.step === 'attente' ? '<span class="muted">Commande prête, aucun livreur pour l\'instant.</span>' : stepsHtml(x)) +
      '<div class="small"><strong>' + esc(x.addr) + '</strong><br><span class="muted">' + (c ? 'Livreur : ' + esc(c.name) + ' · ' + esc(c.phone) : 'Zone ' + esc(zone(x.zone).name)) + '</span></div>' +
      (x.cod ? '<div class="row row--between small"><span>' + (x.codPaid ? 'Encaissé à la livraison' : 'À encaisser à la livraison') + '</span><strong class="tnum">' + money(total(x)) + '</strong></div>' : '') +
      (x.issue ? '<div class="alert alert--warn small">' + icon('alert') + '<span><strong>' + ISSUES[x.issue].label + '</strong>' + (x.note ? '<br>' + esc(x.note) : '') + '</span></div>' : '') +
      (x.unavailable ? '<div class="alert alert--info small">' + icon('clock') + '<span>Le client n\'est pas disponible. Il propose : <strong>' + esc(x.unavailable) + '</strong></span></div>' : '') +
      (x.proof ? proofArt(x.proof) : '') +
      '</div>' + (foot ? '<div class="dcard__foot">' + foot + '</div>' : '') + '</div>';
  }
  function phoneCard(x) {
    var c = courier(x.courier), foot = '';
    if (x.step === 'enroute' && x.issue === 'injoignable') foot = '<button type="button" class="btn btn--primary ph-btn" data-act="ph-here">Je suis là</button><button type="button" class="btn ph-btn" data-act="ph-later">Je ne suis pas disponible</button>';
    else if (x.step === 'enroute' && x.issue === 'adresse') foot = '<button type="button" class="btn btn--primary ph-btn" data-act="ph-address">Préciser mon adresse</button>';
    else if (x.step === 'enroute' || x.step === 'preparee') foot = '<button type="button" class="btn ph-btn" data-act="ph-later"' + (x.unavailable ? ' disabled' : '') + '>' + (x.unavailable ? 'Boutique prévenue' : 'Je ne suis pas disponible') + '</button>';
    else if (x.step === 'retour') foot = '<button type="button" class="btn btn--primary ph-btn" data-act="ph-again"' + (x.askAgain ? ' disabled' : '') + '>' + (x.askAgain ? 'Demande envoyée' : 'Demander une nouvelle livraison') + '</button>';
    return '<div class="pcard" style="width:280px"><div class="pcard__title">' + icon('truck') + 'Livraison ' + x.id + '</div><div class="pcard__list">' +
      (x.step === 'attente' ? '<span class="muted">Votre commande est prête. La boutique cherche un livreur.</span>' : stepsHtml(x)) +
      (x.issue && x.issue !== 'retour' ? '<div class="alert alert--warn small">' + icon('alert') + ISSUES[x.issue].phone + '</div>' : '') +
      (x.unavailable ? '<div class="alert alert--info small">' + icon('clock') + 'Nouveau moment demandé : ' + esc(x.unavailable) + '</div>' : '') +
      (c && x.step !== 'livree' && x.step !== 'retour' ? '<div class="row row--between"><span class="row" style="gap:8px"><span class="avatar">' + esc(c.name.slice(0, 2).toUpperCase()) + '</span><span><strong>' + esc(c.name) + '</strong><br><span class="small muted tnum">' + esc(c.phone) + '</span></span></span><button type="button" class="icon-btn" data-act="ph-call" aria-label="Appeler le livreur">' + icon('phone') + '</button></div>' : '') +
      (x.step === 'livree' ? '<span class="small muted">Livrée à ' + esc(x.doneAt) + (x.codPaid ? ' · ' + money(total(x)) + ' payés à la livraison' : '') + '</span>' + (x.proof ? proofArt(x.proof) : '') : '') +
      '</div>' + (foot ? '<div class="pcard__foot" style="flex-direction:column">' + foot + '</div>' : '') + '</div>';
  }

  /* ---------- Téléphone : feuilles ---------- */
  function laterSheet() {
    return '<div class="ph-sheet__head"><h2>Je ne suis pas disponible</h2><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('x') + '</button></div><div class="ph-sheet__body"><span class="muted small">Quand pouvons-nous vous livrer ?</span>' +
      LATER.map(function (l, i) { return '<button type="button" class="ph-option" data-act="ph-later-pick" data-i="' + i + '">' + icon('clock') + '<span><strong>' + l + '</strong></span></button>'; }).join('') + '</div>';
  }
  function addressSheet() {
    return '<div class="ph-sheet__head"><h2>Préciser mon adresse</h2><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('x') + '</button></div><div class="ph-sheet__body"><label class="field">Un repère pour le livreur<textarea class="textarea" data-on-input="ph-addr" placeholder="Ex. Derrière le marché, portail vert">' + esc(S.addrText || '') + '</textarea></label>' + (S.addrErr ? '<div class="alert alert--bad small">' + icon('alert') + S.addrErr + '</div>' : '') + '</div><div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-addr-send">' + icon('send') + 'Envoyer au livreur</button></div>';
  }

  /* ---------- Cas ---------- */
  function seedZones() {
    return [
      { id: 'z1', name: 'Cotonou centre', fee: 1000, delay: 'Le jour même' },
      { id: 'z2', name: 'Akpakpa', fee: 1500, delay: 'Le jour même' },
      { id: 'z3', name: 'Calavi', fee: 2500, delay: 'Sous 24 h' },
      { id: 'z4', name: 'Porto-Novo', fee: 4000, delay: 'Sous 48 h' }
    ];
  }
  function seedCouriers() {
    return [
      { id: 'c1', name: 'Fidèle A.', phone: '01 90 00 00 21', active: true },
      { id: 'c2', name: 'Romuald T.', phone: '01 91 00 00 34', active: true },
      { id: 'c3', name: 'Sylvain K.', phone: '01 92 00 00 58', active: false }
    ];
  }

  C.define({
    id: 'livraison', title: 'Livraison et suivi', icon: 'truck', priority: 2,
    entity: B.entity,
    cases: [
      { key: 'normal', label: 'Parcours normal (commande à livrer)' },
      { key: 'enroute', label: 'Livraison en route' },
      { key: 'injoignable', label: 'Client injoignable' },
      { key: 'adresse', label: 'Adresse introuvable' },
      { key: 'retour', label: 'Retour du colis' },
      { key: 'vide', label: 'Aucun livreur, aucune zone' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      var vide = k === 'vide', moving = ['enroute', 'injoignable', 'adresse'].indexOf(k) !== -1;
      S = {
        tab: 'list', loading: k === 'chargement',
        zones: vide ? [] : seedZones(), couriers: vide ? [] : seedCouriers(),
        delivery: { id: 'CMD-0143', client: C.app.citizen.name, zone: 'z2', addr: 'Akpakpa, rue des Manguiers, maison bleue', amount: 42000, fee: 1500, cod: true, codPaid: false, courier: moving || k === 'retour' ? 'c1' : null, eta: moving ? '11:30' : '', step: moving ? 'enroute' : k === 'retour' ? 'retour' : 'attente' },
        history: vide ? [] : [
          { id: 'CMD-0141', client: 'Rodrigue H.', zone: 'z3', amount: 47500, fee: 2500, cod: false, courier: 'c2', eta: '15:00', step: 'enroute' },
          { id: 'CMD-0139', client: 'Serge A.', zone: 'z1', amount: 28500, fee: 1000, cod: true, codPaid: true, courier: 'c1', step: 'livree' }
        ]
      };
      if (vide) S.tab = 'couriers';
      C.say({ from: 'citizen', text: 'Bonjour, ma commande arrive quand ? Je paierai à la livraison.' });
      if (vide) { C.say({ from: 'agent', text: 'Bonjour, nous revenons vers vous dès que possible.' }); return; }
      C.say({ from: 'agent', text: 'Bonjour, elle est prête. Vous pouvez la suivre ici.' });
      C.say({ from: 'agent', card: 'delivery', data: {} });
      var x = S.delivery;
      if (k === 'injoignable') { x.issue = 'injoignable'; x.note = 'Deux appels sans réponse à 11:05 et 11:12.'; C.say({ from: 'system', text: ISSUES.injoignable.phone }); }
      if (k === 'adresse') { x.issue = 'adresse'; x.note = 'Le livreur est à Akpakpa, la maison bleue reste introuvable.'; C.say({ from: 'system', text: ISSUES.adresse.phone }); }
      if (k === 'retour') { x.note = 'Après deux essais de livraison sans réponse.'; C.say({ from: 'system', text: ISSUES.retour.phone }); }
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    tools: function () { return [{ act: 'open-track', icon: 'truck', label: 'Suivi de livraison', isNew: true }]; },
    side: function () {
      var x = d(), c = courier(x.courier);
      return '<div><h3>Livraison</h3><dl class="facts"><div><dt>Commande</dt><dd class="tnum">' + x.id + '</dd></div><div><dt>État</dt><dd>' + badge(x) + '</dd></div><div><dt>Livreur</dt><dd>' + (c ? esc(c.name) : '—') + '</dd></div><div><dt>Adresse</dt><dd>' + esc(x.addr) + '</dd></div>' + (x.cod ? '<div><dt>À la livraison</dt><dd class="tnum">' + (x.codPaid ? 'Encaissé' : money(total(x))) + '</dd></div>' : '') + '</dl></div>';
    },
    card: function (m, side) { return side === 'desk' ? deskCard(d()) : phoneCard(d()); },
    act: {
      tab: function (el) { S.tab = el.dataset.tab; C.render(); },
      'new-zone': function () { S.zform = { name: '', fee: '', delay: '' }; C.modal(zoneModal); },
      'edit-zone': function (el) { var z = zone(el.dataset.id); S.zform = { id: z.id, name: z.name, fee: z.fee, delay: z.delay }; C.modal(zoneModal); },
      'del-zone': function (el) {
        if (allDeliveries().some(function (x) { return x.zone === el.dataset.id; })) { C.toast('Une livraison utilise cette zone'); return; }
        S.zones = S.zones.filter(function (z) { return z.id !== el.dataset.id; }); C.render(); C.toast('Zone supprimée');
      },
      'save-zone': function () {
        var f = S.zform;
        if (!f.name.trim()) { f.err = 'Donnez un nom à la zone.'; C.render(); return; }
        var data = { name: f.name.trim(), fee: +String(f.fee).replace(/\D/g, '') || 0, delay: f.delay.trim() || 'À convenir' };
        if (f.id) Object.assign(zone(f.id), data); else S.zones.push(Object.assign({ id: 'z' + C.uid() }, data));
        C.modalFn = null; C.render(); C.toast('Zone enregistrée');
      },
      'new-courier': function () { S.cform = { name: '', phone: '' }; C.modal(courierModal); },
      'courier-active': function (el) { courier(el.dataset.id).active = el.checked; C.render(); },
      'save-courier': function () {
        var f = S.cform;
        if (!f.name.trim() || !f.phone.trim()) { f.err = 'Indiquez le nom et le téléphone.'; C.render(); return; }
        S.couriers.push({ id: 'c' + C.uid(), name: f.name.trim(), phone: f.phone.trim(), active: true });
        C.modalFn = null; C.render(); C.toast('Livreur ajouté');
      },

      'open-track': function () {
        if (!S.couriers.length) { C.toast('Un administrateur doit d\'abord ajouter un livreur'); return; }
        if (!C.msgs.some(function (m) { return m.card === 'delivery'; })) C.say({ from: 'agent', card: 'delivery', data: {} });
        if (d().step === 'attente') { S.aform = { courier: d().courier, eta: d().eta || '11:30' }; C.modal(assignModal); return; }
        C.render(); C.toast('Le suivi est déjà dans la discussion');
      },
      'open-assign': function () { S.aform = { courier: d().courier, eta: d().eta || '11:30' }; C.modal(assignModal); },
      'pick-courier': function (el) { S.aform.courier = el.dataset.id; C.render(); },
      'save-assign': function () {
        var x = d(); x.courier = S.aform.courier; x.eta = S.aform.eta; if (x.step === 'attente') x.step = 'preparee';
        C.modalFn = null;
        C.say({ from: 'system', text: 'Livreur affecté : ' + esc(courier(x.courier).name) });
        C.render();
      },
      'go-route': function () { var x = d(); x.step = 'enroute'; C.say({ from: 'system', text: 'Votre livraison est en route' }); C.render(); },
      'open-delivered': function () { S.dform = { proof: null, cod: d().cod && !d().codPaid }; C.modal(deliveredModal); },
      'pick-proof': function (el) { S.dform.proof = el.dataset.k; S.dform.err = null; C.render(); },
      'toggle-cod': function () { S.dform.cod = !S.dform.cod; C.render(); },
      'save-delivered': function () {
        var f = S.dform, x = d();
        if (!f.proof) { f.err = 'Ajoutez une photo ou une signature.'; C.render(); return; }
        x.step = 'livree'; x.proof = f.proof; x.doneAt = C.time(); x.issue = null; x.unavailable = null;
        if (x.cod) x.codPaid = !!f.cod;
        C.modalFn = null;
        C.say({ from: 'system', text: 'Commande livrée' });
        C.render();
      },
      'open-issue': function () { S.iform = 'injoignable'; C.modal(issueModal); },
      'pick-issue': function (el) { S.iform = el.dataset.k; C.render(); },
      'save-issue': function () {
        var k = S.iform, x = d();
        C.modalFn = null;
        if (k === 'retour') { x.step = 'retour'; x.issue = null; x.note = 'Le colis repart à la boutique.'; }
        else { x.issue = k; x.note = ISSUES[k].hint; }
        C.say({ from: 'system', text: ISSUES[k].phone });
        C.render();
      },
      retry: function () { var x = d(); x.issue = null; x.note = ''; C.say({ from: 'system', text: 'Le livreur fait un nouvel essai' }); C.render(); },
      'back-shop': function () { var x = d(); x.step = 'retour'; x.issue = null; x.note = 'Le colis repart à la boutique.'; C.say({ from: 'system', text: ISSUES.retour.phone }); C.render(); },
      'new-try': function () { var x = d(); x.step = 'preparee'; x.note = ''; x.askAgain = false; x.unavailable = null; C.say({ from: 'system', text: 'Nouvelle livraison prévue' }); C.render(); },

      'ph-call': function () { C.toast('Appel du livreur avec le téléphone du client', 'phone'); },
      'ph-later': function () { C.layer(laterSheet); },
      'ph-later-pick': function (el) {
        var x = d(); x.unavailable = LATER[+el.dataset.i]; C.layers = [];
        C.say({ from: 'citizen', text: 'Je ne suis pas disponible. Vous pouvez livrer : ' + x.unavailable.toLowerCase() + '.' });
        C.render();
      },
      'ph-here': function () { var x = d(); x.issue = null; x.note = ''; C.say({ from: 'citizen', text: 'Je suis là, vous pouvez venir.' }); C.render(); },
      'ph-address': function () { S.addrText = ''; S.addrErr = null; C.layer(addressSheet); },
      'ph-addr-send': function () {
        var t = (S.addrText || '').trim();
        if (!t) { S.addrErr = 'Écrivez un repère pour le livreur.'; C.render(); return; }
        var x = d(); x.addr = x.addr + ' · ' + t; x.issue = null; x.note = ''; C.layers = [];
        C.say({ from: 'citizen', text: 'Précision pour le livreur : ' + t });
        C.render();
      },
      'ph-again': function () { var x = d(); x.askAgain = true; C.say({ from: 'citizen', text: 'Je voudrais une nouvelle livraison, s\'il vous plaît.' }); C.render(); }
    },
    input: {
      zform: function (el) { S.zform[el.dataset.k] = el.value; },
      cform: function (el) { S.cform[el.dataset.k] = el.value; },
      aform: function (el) { S.aform[el.dataset.k] = el.value; },
      'ph-addr': function (el) { S.addrText = el.value; }
    }
  });
})();
