/* ==========================================================
   App 3 — Paiement Mobile Money
   L'argent va directement à l'entité, jamais à ALIBORA.
   Réglage : connexion du compte de paiement, paiement test, historique, remboursement.
   Dossier : « Demander un paiement » (montant, motif ou commande), suivi du statut, renvoi.
   Téléphone : carte « Payer », choix de l'opérateur et du numéro, « Validez sur votre téléphone », reçu.
   À vérifier avant le développement : le fournisseur retenu, ses écrans imposés et ses conditions.
   ========================================================== */
'use strict';

(function () {
  var B = window.BOUTIQUE, esc = C.esc, money = C.money, icon = C.icon;
  var S = {};
  var ST = {
    pending: ['En attente', 'warn'], paid: ['Payé', 'ok'], failed: ['Échoué', 'bad'],
    expired: ['Expiré', 'bad'], refunded: ['Remboursé', 'info'], cancelled: ['Annulé', '']
  };
  var OPS = { mtn: { name: 'MTN MoMo', color: '#FFCB05' }, moov: { name: 'Moov Money', color: '#0066B3' } };
  var PROVIDERS = ['FedaPay', 'KKiaPay'];

  function pay(id) { return S.pays.filter(function (p) { return p.id === id; })[0]; }
  function badge(p) { return '<span class="badge badge--' + ST[p.status][1] + '">' + ST[p.status][0] + '</span>'; }
  function ref() { return 'PAY-' + Math.random().toString(36).slice(2, 7).toUpperCase(); }
  function mask(n) { var d = n.replace(/\D/g, ''); return d.length === 10 ? d.slice(0, 2) + ' ' + d.slice(2, 4) + ' •• •• ' + d.slice(8) : n; }
  function opDot(op) { return '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + OPS[op].color + '"></span>'; }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var head = '<header class="page-head"><div><h1>Paiement mobile</h1><p>MTN MoMo et Moov Money. L\'argent arrive directement sur le compte de votre entreprise.</p></div></header>';
    if (S.loading) return head + '<div class="card" style="margin-bottom:14px"><span class="skel" style="height:18px;width:40%"></span><span class="skel" style="height:12px;width:60%;margin-top:10px"></span></div>' + C.skelRows(5);
    return head + account() + (S.connected ? history() : '');
  }

  function account() {
    if (!S.connected) {
      var c = S.connect;
      return '<section class="card" style="max-width:640px"><div class="card__head"><h2>Connecter votre compte de paiement</h2><span class="badge">Non connecté</span></div>' +
        '<div class="stack">' +
          '<div class="field">1. Votre fournisseur de paiement<div class="grid-2">' + PROVIDERS.map(function (p) {
            return '<button type="button" class="ph-option ' + (c.provider === p ? 'is-on' : '') + '" data-act="provider" data-p="' + p + '">' + icon('wallet') + '<span><strong>' + p + '</strong><small>MTN MoMo, Moov Money</small></span></button>';
          }).join('') + '</div><span class="field__hint">Vous n\'avez pas encore de compte ? Créez-le d\'abord chez le fournisseur choisi.</span></div>' +
          '<label class="field">2. Identifiant marchand<input class="input mono" value="' + esc(c.id) + '" data-on-input="connect" data-k="id" placeholder="Fourni par ' + (c.provider || 'votre fournisseur') + '"></label>' +
          '<label class="field">3. Code secret du compte<input class="input" type="password" value="' + esc(c.secret) + '" data-on-input="connect" data-k="secret" placeholder="••••••••"><span class="field__hint">Gardé chez vous, dans votre console. ALIBORA ne le voit pas.</span></label>' +
          (c.error ? '<div class="alert alert--bad">' + icon('alert') + c.error + '</div>' : '') +
          '<div class="row" style="justify-content:flex-end"><button type="button" class="btn btn--primary" data-act="connect"' + (c.busy ? ' disabled' : '') + '>' + (c.busy ? '<span class="spinner"></span>Vérification…' : icon('link') + 'Connecter') + '</button></div>' +
        '</div></section>';
    }
    var t = S.test;
    return '<section class="card" style="margin-bottom:14px"><div class="row row--between row--wrap">' +
      '<div class="row"><span class="empty__icon" style="width:44px;height:44px">' + icon('wallet') + '</span><div><strong style="font-size:16px">Compte connecté · ' + S.connect.provider + '</strong><div class="small muted">Montres Azur · encaissements MTN MoMo et Moov Money</div></div></div>' +
      '<div class="row"><button type="button" class="btn" data-act="test"' + (t === 'busy' ? ' disabled' : '') + '>' + (t === 'busy' ? '<span class="spinner"></span>Test en cours…' : icon('refresh') + 'Faire un paiement test de 100 FCFA') + '</button><button type="button" class="btn btn--ghost btn--danger" data-act="disconnect">Déconnecter</button></div></div>' +
      (t === 'ok' ? '<div class="alert alert--ok" style="margin-top:12px">' + icon('check') + 'Paiement test réussi : 100 FCFA reçus puis remboursés automatiquement.</div>' : '') +
      '</section>';
  }

  function history() {
    var today = S.pays.filter(function (p) { return p.status === 'paid'; }).reduce(function (t, p) { return t + p.amount; }, 0);
    var waiting = S.pays.filter(function (p) { return p.status === 'pending'; }).length;
    var fails = S.pays.filter(function (p) { return p.status === 'failed' || p.status === 'expired'; }).length;
    var rows = S.pays.filter(function (p) { return !S.filter || p.status === S.filter; });
    return '<div class="grid-2" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px">' +
      '<div class="card"><span class="small muted">Encaissé</span><strong style="display:block;font-size:22px" class="tnum">' + money(today) + '</strong></div>' +
      '<div class="card"><span class="small muted">En attente</span><strong style="display:block;font-size:22px">' + waiting + '</strong></div>' +
      '<div class="card"><span class="small muted">Échoués ou expirés</span><strong style="display:block;font-size:22px">' + fails + '</strong></div></div>' +
      '<div class="card__head"><h2>Historique des paiements</h2><select class="select" style="width:180px" data-on-change="filter" aria-label="Statut"><option value="">Tous les statuts</option>' + Object.keys(ST).map(function (k) { return '<option value="' + k + '"' + (S.filter === k ? ' selected' : '') + '>' + ST[k][0] + '</option>'; }).join('') + '</select></div>' +
      (rows.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Client</th><th>Motif</th><th>Opérateur</th><th class="num">Montant</th><th>Statut</th><th>Référence</th><th></th></tr></thead><tbody>' +
        rows.map(function (p) {
          return '<tr><td class="muted">' + p.when + '</td><td><a href="#" data-act="go-dossier" style="color:var(--brand);font-weight:600">' + esc(p.client) + '</a></td><td>' + esc(p.reason) + '</td><td>' + (p.op ? '<span class="row" style="gap:6px">' + opDot(p.op) + OPS[p.op].name + '</span>' : '<span class="muted">—</span>') + '</td><td class="num">' + money(p.amount) + '</td><td>' + badge(p) + (p.error ? '<div class="small muted">' + esc(p.error) + '</div>' : '') + '</td><td class="tnum muted">' + (p.ref || '—') + '</td>' +
            '<td>' + (p.status === 'paid' ? '<button type="button" class="btn btn--sm" data-act="open-refund" data-id="' + p.id + '">' + icon('undo') + 'Rembourser</button>' : '') + '</td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="card"><div class="empty"><span class="empty__icon">' + icon('receipt') + '</span><strong>Aucun paiement</strong><p>Les demandes de paiement envoyées par vos agents apparaîtront ici.</p></div></div>');
  }

  function refundModal() {
    var p = pay(S.target);
    return '<div class="modal__head"><h2>Rembourser ' + money(p.amount) + ' ?</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body"><p>L\'argent sera renvoyé sur le ' + OPS[p.op].name + ' de ' + esc(p.client) + ' (' + mask(p.number) + '). Le client est prévenu dans la discussion.</p>' +
      '<label class="field">Motif<input class="input" value="' + esc(S.refundWhy) + '" data-on-input="refund-why" placeholder="Ex. Article retourné"></label></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="confirm-refund">' + icon('undo') + 'Rembourser</button></div>';
  }

  /* ---------- Dossier : « Demander un paiement » ---------- */
  function askModal() {
    var a = S.ask;
    return '<div class="modal__head"><h2>Demander un paiement</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body">' +
        '<label class="pick ' + (a.kind === 'order' ? 'is-on' : '') + '"><input type="radio" name="kind" data-act="ask-kind" data-k="order"' + (a.kind === 'order' ? ' checked' : '') + '><span class="pick__main"><strong>Commande CMD-0143</strong><span>1 × Montre Dorée Élégance (M), livraison Akpakpa</span></span><strong class="tnum">' + money(43500) + '</strong></label>' +
        '<label class="pick ' + (a.kind === 'free' ? 'is-on' : '') + '"><input type="radio" name="kind" data-act="ask-kind" data-k="free"' + (a.kind === 'free' ? ' checked' : '') + '><span class="pick__main"><strong>Autre montant</strong><span>Acompte, réparation, facture…</span></span></label>' +
        (a.kind === 'free' ? '<div class="grid-2"><label class="field">Montant<span class="input-group"><input class="input tnum ' + (a.err ? 'input--error' : '') + '" inputmode="numeric" value="' + esc(a.amount) + '" data-on-input="ask" data-k="amount"><span>FCFA</span></span>' + (a.err ? '<span class="small" style="color:var(--bad)">' + a.err + '</span>' : '') + '</label><label class="field">Motif<input class="input" value="' + esc(a.reason) + '" data-on-input="ask" data-k="reason" placeholder="Ex. Acompte réparation"></label></div>' : '') +
        '<p class="small muted">La demande reste valable 15 minutes. Vous pourrez la renvoyer si elle expire.</p>' +
      '</div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="send-ask">' + icon('send') + 'Envoyer la demande</button></div>';
  }

  /* ---------- Cartes ---------- */
  function card(m, side) {
    var p = pay(m.data.pid);
    if (m.card === 'receipt') return receipt(p, side);
    if (side === 'desk') {
      return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('wallet') + 'Demande de paiement</span>' + badge(p) + '</div>' +
        '<div class="dcard__body"><strong style="font-size:20px" class="tnum">' + money(p.amount) + '</strong><span class="muted">' + esc(p.reason) + '</span>' +
        (p.status === 'pending' ? '<span class="small muted">' + (p.step === 'validating' ? 'Le client valide sur son téléphone…' : 'Le client n\'a pas encore payé') + '</span>' : '') +
        (p.error ? '<div class="alert alert--bad small">' + icon('alert') + esc(p.error) + '</div>' : '') + '</div>' +
        (p.status === 'failed' || p.status === 'expired' ? '<div class="dcard__foot"><button type="button" class="btn btn--primary btn--sm" data-act="resend" data-id="' + p.id + '">' + icon('refresh') + 'Renvoyer la demande</button></div>' : '') +
        (p.status === 'pending' ? '<div class="dcard__foot"><button type="button" class="btn btn--sm" data-act="cancel-ask" data-id="' + p.id + '">Annuler la demande</button></div>' : '') +
        '</div>';
    }
    var foot = p.status === 'pending' ? '<div class="pcard__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-pay" data-id="' + p.id + '">Payer ' + money(p.amount) + '</button></div>'
      : p.status === 'paid' || p.status === 'refunded' ? '<div class="pcard__foot">' + badge(p) + '</div>'
      : '<div class="pcard__foot">' + badge(p) + '<span class="small muted" style="align-self:center">' + (p.status === 'cancelled' ? 'Demande annulée par la boutique' : 'La boutique peut vous la renvoyer') + '</span></div>';
    return '<div class="pcard"><div class="pcard__title">' + icon('wallet') + 'Paiement demandé</div><div class="pcard__list"><strong style="font-size:24px" class="tnum">' + money(p.amount) + '</strong><span class="muted">' + esc(p.reason) + '</span></div>' + foot + '</div>';
  }
  function receipt(p, side) {
    var refunded = p.status === 'refunded';
    var rows = '<div class="lines"><div><span class="muted">Montant</span><strong class="tnum">' + money(p.amount) + '</strong></div><div><span class="muted">Motif</span><span>' + esc(p.reason) + '</span></div><div><span class="muted">Payé avec</span><span>' + OPS[p.op].name + ' · ' + mask(p.number) + '</span></div><div><span class="muted">Référence</span><span class="tnum">' + p.ref + '</span></div><div><span class="muted">Date</span><span>' + p.when + '</span></div></div>' +
      (refunded ? '<div class="alert alert--info small">' + icon('undo') + 'Remboursé : ' + esc(p.refundWhy) + '</div>' : '');
    if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('receipt') + 'Reçu de paiement</span>' + badge(p) + '</div><div class="dcard__body">' + rows + '</div></div>';
    return '<div class="pcard" style="width:280px"><div class="pcard__title"><span class="avatar" style="width:26px;height:26px;background:var(--ok-bg);color:var(--ok)">' + icon('check') + '</span>Reçu de paiement<span style="margin-left:auto">' + badge(p) + '</span></div><div class="pcard__list">' + rows + '</div></div>';
  }

  /* ---------- Téléphone : payer ---------- */
  function paySheet() {
    var p = pay(S.payId), f = S.payForm;
    if (f.stage === 'wait') {
      return '<div class="ph-sheet__body"><div class="wait"><span class="wait__ring">' + icon('phone') + '</span><h3>Validez sur votre téléphone</h3><p class="muted">' + OPS[f.op].name + ' va vous demander votre code secret pour payer <strong>' + money(p.amount) + '</strong> à Montres Azur.</p><span class="badge badge--warn tnum">Il reste ' + Math.floor(f.left / 60) + ':' + ('0' + f.left % 60).slice(-2) + '</span></div></div>' +
        '<div class="ph-sheet__foot"><button type="button" class="btn ph-btn" data-act="close-layer">Fermer, je valide plus tard</button></div>';
    }
    if (f.stage === 'ok') {
      return '<div class="ph-sheet__body"><div class="wait"><span class="wait__ring wait__ring--ok">' + icon('check') + '</span><h3>Paiement réussi</h3><p class="muted">' + money(p.amount) + ' payés à Montres Azur. Votre reçu est dans la discussion.</p></div></div>' +
        '<div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="close-layer">Voir le reçu</button></div>';
    }
    if (f.stage === 'error') {
      return '<div class="ph-sheet__body"><div class="wait"><span class="wait__ring wait__ring--bad">' + icon('x') + '</span><h3>' + f.title + '</h3><p class="muted">' + f.text + '</p></div></div>' +
        '<div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-retry">Réessayer</button><button type="button" class="btn ph-btn" data-act="ph-change-number">Payer avec un autre numéro</button></div>';
    }
    return '<div class="ph-sheet__head"><h2>Payer ' + money(p.amount) + '</h2><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="ph-sheet__body"><span class="muted small">' + esc(p.reason) + ' · Montres Azur</span>' +
        Object.keys(OPS).map(function (k) {
          return '<button type="button" class="ph-option ' + (f.op === k ? 'is-on' : '') + '" data-act="ph-op" data-op="' + k + '"><span style="width:34px;height:34px;border-radius:10px;background:' + OPS[k].color + ';display:grid;place-items:center;color:' + (k === 'mtn' ? '#1F2937' : '#fff') + '">' + icon('wallet') + '</span><span><strong>' + OPS[k].name + '</strong></span>' + (f.op === k ? '<span class="ph-option__end" style="color:var(--brand)">' + icon('check') + '</span>' : '') + '</button>';
        }).join('') +
        '<label class="field">Numéro ' + OPS[f.op].name + '<input class="input tnum" inputmode="tel" value="' + esc(f.number) + '" data-on-input="ph-number"></label>' +
      '</div>' +
      '<div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-confirm"' + (f.busy ? ' aria-disabled="true"' : '') + '>' + (f.busy ? '<span class="spinner"></span>Envoi de la demande…' : 'Payer ' + money(p.amount)) + '</button><span class="small muted" style="text-align:center">' + icon('lock') + ' Paiement sécurisé par votre opérateur</span></div>';
  }

  var timer = null;
  function startWait() {
    var p = pay(S.payId), f = S.payForm;
    clearInterval(timer);
    f.stage = 'wait'; f.left = 120; f.busy = false;
    p.step = 'validating';
    var outcome = S.outcome;
    var ticks = 0;
    timer = setInterval(function () {
      ticks++;
      f.left = Math.max(0, f.left - (outcome === 'expire' ? 24 : 1));
      if (outcome === 'ok' && ticks >= 3) finish('ok');
      else if (outcome === 'solde' && ticks >= 3) finish('solde');
      else if (outcome === 'expire' && f.left === 0) finish('expire');
      C.render();
    }, 1000);
  }
  function finish(kind) {
    clearInterval(timer);
    var p = pay(S.payId), f = S.payForm;
    p.step = null;
    if (kind === 'ok') {
      p.status = 'paid'; p.op = f.op; p.number = f.number; p.ref = ref(); p.when = 'Aujourd\'hui, ' + C.time();
      f.stage = 'ok';
      C.say({ from: 'agent', agent: 'Montres Azur', card: 'receipt', data: { pid: p.id } });
    } else if (kind === 'solde') {
      p.status = 'failed'; p.error = 'Solde insuffisant'; p.op = f.op;
      f.stage = 'error'; f.title = 'Solde insuffisant'; f.text = 'Votre compte ' + OPS[f.op].name + ' n\'a pas assez d\'argent. Rechargez-le, ou payez avec un autre numéro.';
      S.outcome = 'ok';
    } else {
      p.status = 'expired'; p.error = 'Le client n\'a pas validé à temps';
      f.stage = 'error'; f.title = 'Délai dépassé'; f.text = 'Vous n\'avez pas validé le paiement à temps. Aucun argent n\'a été prélevé.';
      S.outcome = 'ok';
    }
  }

  /* ---------- Cas ---------- */
  function seedHistory() {
    return [
      { id: 'h1', client: 'Rodrigue H.', reason: 'Commande CMD-0139', amount: 47500, status: 'paid', op: 'mtn', number: '0161000012', ref: 'PAY-K3V9Q', when: 'Hier, 17:42' },
      { id: 'h2', client: 'Aïcha K.', reason: 'Acompte bracelet sur mesure', amount: 10000, status: 'expired', op: null, when: 'Hier, 11:05', error: 'Non validé à temps' },
      { id: 'h3', client: 'Serge A.', reason: 'Commande CMD-0136', amount: 28500, status: 'paid', op: 'moov', number: '0195000033', ref: 'PAY-2M8XD', when: 'Lun., 09:30' },
      { id: 'h4', client: 'Client · 01 66 •• •• 19', reason: 'Commande CMD-0138', amount: 32000, status: 'failed', op: 'mtn', when: 'Lun., 08:12', error: 'Solde insuffisant' }
    ];
  }
  function newPay(amount, reason) {
    var p = { id: 'p' + C.uid(), client: C.app.citizen.name, reason: reason, amount: amount, status: 'pending', op: null, when: 'Aujourd\'hui, ' + C.time() };
    S.pays.unshift(p);
    return p;
  }

  C.define({
    id: 'paiement', title: 'Paiement Mobile Money', icon: 'wallet', priority: 1,
    entity: B.entity,
    cases: [
      { key: 'normal', label: 'Parcours normal' },
      { key: 'solde', label: 'Solde insuffisant' },
      { key: 'expire', label: 'Le client ne valide pas (expiration)' },
      { key: 'double', label: 'Double appui sur « Payer »' },
      { key: 'rembourse', label: 'Remboursement', view: 'admin' },
      { key: 'nonconnecte', label: 'Compte de paiement pas encore connecté', view: 'admin' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      clearInterval(timer);
      S = { connected: k !== 'nonconnecte', connect: { provider: k === 'nonconnecte' ? '' : 'FedaPay', id: '', secret: '' }, pays: seedHistory(), filter: '', loading: k === 'chargement',
        outcome: k === 'solde' ? 'solde' : k === 'expire' ? 'expire' : 'ok', test: null, ask: { kind: 'order', amount: '', reason: '' } };
      C.say({ from: 'citizen', text: 'Bonjour, je confirme la montre dorée taille M, livrée à Akpakpa.' });
      if (k === 'nonconnecte') { C.say({ from: 'agent', text: 'Parfait, je prépare votre commande.' }); return; }
      C.say({ from: 'agent', text: 'Merci ! Voici la demande de paiement pour votre commande.' });
      var p = newPay(43500, 'Commande CMD-0143');
      C.say({ from: 'agent', card: 'pay', data: { pid: p.id } });
      if (k === 'rembourse') {
        p.status = 'paid'; p.op = 'mtn'; p.number = '0197000047'; p.ref = 'PAY-7F3K2'; p.when = 'Aujourd\'hui, 09:16';
        C.say({ from: 'agent', agent: 'Montres Azur', card: 'receipt', data: { pid: p.id } });
        C.say({ from: 'citizen', text: 'La montre ne me va pas, je l\'ai rapportée à la boutique ce matin.' });
      }
      if (k === 'double') setTimeout(function () { S.payId = p.id; S.payForm = { op: 'mtn', number: '01 97 00 00 47', stage: 'form' }; C.layer(paySheet); }, 0);
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    tools: function () { return [{ act: 'open-ask', icon: 'wallet', label: S.connected ? 'Demander un paiement' : 'Paiement non configuré', isNew: true }]; },
    side: function () {
      var mine = S.pays.filter(function (p) { return p.client === C.app.citizen.name; });
      return '<div><h3>Paiements du client</h3>' + (mine.length ? '<div class="stack" style="gap:8px">' + mine.map(function (p) { return '<div class="row row--between small"><span><strong class="tnum">' + money(p.amount) + '</strong><br><span class="muted">' + esc(p.reason) + '</span></span>' + badge(p) + '</div>'; }).join('') + '</div>' : '<p class="small muted">Aucun paiement.</p>') + '</div>';
    },
    card: card,
    act: {
      provider: function (el) { S.connect.provider = el.dataset.p; C.render(); },
      connect: function () {
        var c = S.connect;
        if (!c.provider) { c.error = 'Choisissez votre fournisseur de paiement.'; C.render(); return; }
        if (!c.id.trim() || !c.secret.trim()) { c.error = 'Saisissez l\'identifiant marchand et le code secret.'; C.render(); return; }
        c.error = ''; c.busy = true; C.render();
        C.later(1200, function () {
          c.busy = false;
          if (c.secret.length < 6) { c.error = 'Le fournisseur refuse ces informations. Vérifiez le code secret.'; return; }
          S.connected = true; C.toast('Compte de paiement connecté');
        });
      },
      disconnect: function () { S.connected = false; S.connect = { provider: '', id: '', secret: '' }; S.test = null; C.render(); },
      test: function () { S.test = 'busy'; C.render(); C.later(1400, function () { S.test = 'ok'; }); },
      'go-dossier': function () { C.go('agent'); },
      'open-refund': function (el) { S.target = el.dataset.id; S.refundWhy = 'Article retourné en boutique'; C.modal(refundModal); },
      'confirm-refund': function () {
        var p = pay(S.target);
        p.status = 'refunded'; p.refundWhy = S.refundWhy || 'Remboursement';
        if (p.client === C.app.citizen.name) C.say({ from: 'system', text: 'Montres Azur vous a remboursé ' + money(p.amount) + ' sur votre ' + OPS[p.op].name });
        C.modalFn = null; C.render(); C.toast('Remboursement envoyé');
      },

      'open-ask': function () {
        if (!S.connected) { C.toast('Un administrateur doit d\'abord connecter le compte de paiement'); return; }
        S.ask = { kind: 'order', amount: '', reason: '' }; C.modal(askModal);
      },
      'ask-kind': function (el) { S.ask.kind = el.dataset.k; C.render(); },
      'send-ask': function () {
        var a = S.ask, p;
        if (a.kind === 'free') {
          var n = +String(a.amount).replace(/\D/g, '');
          if (!(n >= 100)) { a.err = 'Au moins 100 FCFA.'; C.render(); return; }
          p = newPay(n, a.reason || 'Paiement');
        } else p = newPay(43500, 'Commande CMD-0143');
        C.say({ from: 'agent', card: 'pay', data: { pid: p.id } });
        C.modalFn = null; C.render();
      },
      resend: function (el) {
        var old = pay(el.dataset.id);
        var p = newPay(old.amount, old.reason);
        C.say({ from: 'agent', card: 'pay', data: { pid: p.id } });
        C.render();
      },
      'cancel-ask': function (el) { pay(el.dataset.id).status = 'cancelled'; C.render(); },

      'ph-pay': function (el) {
        var p = pay(el.dataset.id);
        if (p.step === 'validating') { C.layer(paySheet); return; }
        S.payId = p.id; S.payForm = { op: 'mtn', number: '01 97 00 00 47', stage: 'form' };
        C.layer(paySheet);
      },
      'ph-op': function (el) { S.payForm.op = el.dataset.op; C.render(); },
      'ph-confirm': function () {
        var f = S.payForm;
        if (f.busy) { C.toast('Paiement déjà en cours : une seule demande est envoyée', 'phone'); return; }
        f.busy = true; C.render();
        C.later(C.caseKey === 'double' ? 1800 : 900, startWait);
      },
      'ph-retry': function () { S.payForm.stage = 'form'; var p = pay(S.payId); p.status = 'pending'; p.error = null; C.render(); },
      'ph-change-number': function () { var f = S.payForm; f.stage = 'form'; f.op = f.op === 'mtn' ? 'moov' : 'mtn'; f.number = ''; var p = pay(S.payId); p.status = 'pending'; p.error = null; C.render(); }
    },
    input: {
      connect: function (el) { S.connect[el.dataset.k] = el.value; },
      'refund-why': function (el) { S.refundWhy = el.value; },
      ask: function (el) { S.ask[el.dataset.k] = el.value; },
      'ph-number': function (el) { S.payForm.number = el.value; }
    },
    change: {
      filter: function (el) { S.filter = el.value; C.render(); }
    }
  });
})();
