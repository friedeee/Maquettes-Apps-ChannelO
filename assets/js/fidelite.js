/* ==========================================================
   App 9 — Fidélité et coupons (dépend de Commande)
   Réglage : règle des points, récompenses, coupons (code, réduction, dates, utilisations), parrainage.
   Dossier : solde de points du citoyen, envoyer un coupon, appliquer un code à une commande.
   Téléphone : carte de fidélité (points, prochaine récompense), coupons reçus, saisie d'un code au panier.
   ========================================================== */
'use strict';

(function () {
  var B = window.BOUTIQUE, esc = C.esc, money = C.money, icon = C.icon;
  var S = {};
  var NOW = '2026-11-05';
  var CST = { active: ['Actif', 'ok'], expired: ['Expiré', 'bad'], full: ['Épuisé', 'warn'], soon: ['À venir', 'info'] };

  function day(iso) { return new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function coupon(code) { return S.coupons.filter(function (c) { return c.code === code; })[0]; }
  function state(c) { return c.end < NOW ? 'expired' : c.max && c.used >= c.max ? 'full' : c.start > NOW ? 'soon' : 'active'; }
  function cBadge(c) { var s = CST[state(c)]; return '<span class="badge badge--' + s[1] + '">' + s[0] + '</span>'; }
  function offText(c) { return c.type === 'percent' ? c.value + ' %' : money(c.value); }
  function publicCoupons() { return S.coupons.filter(function (c) { return !c.personal; }); }
  function close(act) { return '<button type="button" class="icon-btn" data-act="' + (act || 'close-modal') + '" aria-label="Fermer">' + icon('x') + '</button>'; }

  /* Vérifie un code pour le client de la maquette : renvoie { err } ou { c, off } */
  function check(raw) {
    var code = String(raw || '').trim().toUpperCase();
    if (!code) return { err: 'Saisissez un code.' };
    var c = coupon(code);
    if (!c) return { err: 'Ce code n\'existe pas. Vérifiez l\'orthographe.' };
    if (state(c) === 'expired') return { err: 'Ce code a expiré le ' + day(c.end) + '.' };
    if (state(c) === 'soon') return { err: 'Ce code sera valable à partir du ' + day(c.start) + '.' };
    if (state(c) === 'full') return { err: 'Ce code a déjà été utilisé par trop de clients.' };
    if (S.usedCodes.indexOf(code) !== -1) return { err: 'Ce code a déjà été utilisé sur ce compte.' };
    return { c: c, off: c.type === 'percent' ? Math.round(S.order.amount * c.value / 100) : Math.min(c.value, S.order.amount) };
  }
  function apply(res) {
    S.order.code = res.c.code; S.order.off = res.off;
    if (S.order.placed) markUsed(res.c.code);
  }
  function markUsed(code) {
    if (S.usedCodes.indexOf(code) === -1) { S.usedCodes.push(code); coupon(code).used++; }
  }
  function total() { return S.order.amount - (S.order.off || 0); }
  function earned(amount) { return Math.floor(amount / S.rule.per) * S.rule.pts; }
  function sortedRewards() { return S.rewards.slice().sort(function (a, b) { return a.points - b.points; }); }
  function nextReward() { return sortedRewards().filter(function (r) { return r.points > S.points; })[0]; }
  function meter(r) {
    var pct = Math.min(100, Math.round(S.points * 100 / r.points));
    return '<div class="paybar" role="img" aria-label="' + S.points + ' points sur ' + r.points + '"><span style="width:' + pct + '%"></span></div><span class="small muted">Encore ' + (r.points - S.points) + ' points pour : ' + esc(r.name) + '</span>';
  }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var head = '<header class="page-head"><div><h1>Fidélité et coupons</h1><p>' + (S.loading ? 'Chargement…' : publicCoupons().filter(function (c) { return state(c) === 'active'; }).length + ' coupons actifs · ' + S.rewards.length + ' récompenses') + '</p></div>' +
      (S.loading || S.tab === 'referral' ? '' : '<div class="page-head__actions"><button type="button" class="btn btn--primary" data-act="' + (S.tab === 'coupons' ? 'new-coupon' : 'new-reward') + '">' + icon('plus') + (S.tab === 'coupons' ? 'Créer un coupon' : 'Ajouter une récompense') + '</button></div>') + '</header>' +
      '<div class="subtabs" role="tablist">' + [['points', 'Points et récompenses'], ['coupons', 'Coupons'], ['referral', 'Parrainage']].map(function (t) {
        return '<button type="button" role="tab" data-act="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    if (S.loading) return head + C.skelRows(5);
    return head + ({ points: pointsView, coupons: couponsView, referral: referralView })[S.tab]();
  }
  function pointsView() {
    var r = S.rule;
    var rule = '<section class="card" style="margin-bottom:14px"><div class="card__head"><h2>Règle des points</h2></div><div class="row row--wrap" style="gap:10px"><span class="input-group" style="width:100px"><input class="input tnum" inputmode="numeric" value="' + r.pts + '" aria-label="Points gagnés" data-on-change="rule" data-k="pts"></span><span>point par tranche de</span><span class="input-group" style="width:170px"><input class="input tnum" inputmode="numeric" value="' + r.per + '" aria-label="Montant de la tranche" data-on-change="rule" data-k="per"><span>FCFA</span></span></div><p class="small muted" style="margin-top:10px">Exemple : une commande de ' + money(42000) + ' donne ' + earned(42000) + ' points, une fois livrée.</p></section>';
    if (!S.rewards.length) return rule + '<div class="card"><div class="empty"><span class="empty__icon">' + icon('star') + '</span><strong>Aucune récompense</strong><p>Ajoutez ce que vos clients peuvent obtenir avec leurs points.</p></div></div>';
    return rule + '<div class="table-wrap"><table class="table"><thead><tr><th>Récompense</th><th class="num">Points</th><th class="num">Valeur</th><th></th></tr></thead><tbody>' + sortedRewards().map(function (x) {
      return '<tr><td><strong>' + esc(x.name) + '</strong></td><td class="num">' + x.points + '</td><td class="num">' + money(x.value) + '</td><td class="num"><button type="button" class="icon-btn" data-act="del-reward" data-id="' + x.id + '" aria-label="Supprimer ' + esc(x.name) + '">' + icon('trash') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function couponsView() {
    var list = publicCoupons();
    if (!list.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('tag') + '</span><strong>Aucun coupon</strong><p>Créez un code promo pour vos clients.</p></div></div>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Réduction</th><th>Dates</th><th class="num">Utilisations</th><th>État</th><th></th></tr></thead><tbody>' + list.map(function (c) {
      return '<tr><td class="mono"><strong>' + esc(c.code) + '</strong></td><td>' + offText(c) + '</td><td class="muted">' + day(c.start) + ' → ' + day(c.end) + '</td><td class="num">' + c.used + (c.max ? ' / ' + c.max : '') + '</td><td>' + cBadge(c) + '</td><td class="num"><button type="button" class="icon-btn" data-act="del-coupon" data-id="' + esc(c.code) + '" aria-label="Supprimer ' + esc(c.code) + '">' + icon('trash') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function referralView() {
    var x = S.ref;
    return '<section class="card" style="max-width:560px"><div class="card__head"><h2>Parrainage</h2><input type="checkbox" class="switch" data-act="ref-on"' + (x.on ? ' checked' : '') + ' aria-label="Activer le parrainage"></div>' +
      (x.on ? '<p class="small muted" style="margin-bottom:12px">Chaque client a un code à partager. Les points sont donnés après la première commande livrée du proche.</p><div class="grid-2"><label class="field">Points pour le client qui parraine<input class="input tnum" inputmode="numeric" value="' + x.sponsor + '" data-on-input="ref" data-k="sponsor"></label><label class="field">Points pour le proche parrainé<input class="input tnum" inputmode="numeric" value="' + x.friend + '" data-on-input="ref" data-k="friend"></label></div>' : '<p class="small muted">Désactivé : les clients ne voient pas de code à partager.</p>') + '</section>';
  }
  function couponModal() {
    var f = S.cform;
    return '<div class="modal__head"><h2>Créer un coupon</h2>' + close() + '</div><div class="modal__body">' +
      '<label class="field">Code<input class="input mono ' + (f.errField === 'code' ? 'input--error' : '') + '" value="' + esc(f.code) + '" data-on-input="cform" data-k="code" placeholder="Ex. NOEL2026"></label>' +
      '<div class="grid-2"><label class="field">Type de réduction<select class="select" data-on-change="cform-type"><option value="percent"' + (f.type === 'percent' ? ' selected' : '') + '>Pourcentage</option><option value="fcfa"' + (f.type === 'fcfa' ? ' selected' : '') + '>Montant fixe</option></select></label>' +
      '<label class="field">Réduction<span class="input-group"><input class="input tnum ' + (f.errField === 'value' ? 'input--error' : '') + '" inputmode="numeric" value="' + esc(f.value) + '" data-on-input="cform" data-k="value"><span>' + (f.type === 'percent' ? '%' : 'FCFA') + '</span></span></label></div>' +
      '<div class="grid-2"><label class="field">Début<input class="input" type="date" value="' + f.start + '" data-on-input="cform" data-k="start"></label><label class="field">Fin<input class="input ' + (f.errField === 'end' ? 'input--error' : '') + '" type="date" value="' + f.end + '" data-on-input="cform" data-k="end"></label></div>' +
      '<label class="field">Nombre d\'utilisations<input class="input tnum" inputmode="numeric" value="' + esc(f.max) + '" data-on-input="cform" data-k="max" placeholder="Sans limite"><span class="field__hint">Chaque client ne peut utiliser un code qu\'une fois.</span></label>' +
      (f.err ? '<div class="alert alert--bad">' + icon('alert') + f.err + '</div>' : '') + '</div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="save-coupon">' + icon('check') + 'Créer le coupon</button></div>';
  }
  function rewardModal() {
    var f = S.rform;
    return '<div class="modal__head"><h2>Nouvelle récompense</h2>' + close() + '</div><div class="modal__body"><label class="field">Nom<input class="input" value="' + esc(f.name) + '" data-on-input="rform" data-k="name" placeholder="Ex. Pile offerte"></label><div class="grid-2"><label class="field">Points nécessaires<input class="input tnum" inputmode="numeric" value="' + esc(f.points) + '" data-on-input="rform" data-k="points"></label><label class="field">Valeur<span class="input-group"><input class="input tnum" inputmode="numeric" value="' + esc(f.value) + '" data-on-input="rform" data-k="value"><span>FCFA</span></span></label></div>' + (f.err ? '<div class="alert alert--bad">' + icon('alert') + f.err + '</div>' : '') + '</div><div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="save-reward">' + icon('check') + 'Ajouter</button></div>';
  }

  /* ---------- Dossier (agent) ---------- */
  function sendModal() {
    var list = publicCoupons().filter(function (c) { return state(c) === 'active' && S.usedCodes.indexOf(c.code) === -1; });
    return '<div class="modal__head"><h2>Envoyer un coupon</h2>' + close() + '</div><div class="modal__body">' + (list.length ? list.map(function (c) {
      var on = S.pick === c.code;
      return '<label class="pick ' + (on ? 'is-on' : '') + '"><input type="radio" name="cp" data-act="pick-coupon" data-id="' + esc(c.code) + '"' + (on ? ' checked' : '') + '><span class="pick__main"><strong class="mono">' + esc(c.code) + '</strong><span>Jusqu\'au ' + day(c.end) + '</span></span><strong>− ' + offText(c) + '</strong></label>';
    }).join('') : '<div class="empty"><span class="empty__icon">' + icon('tag') + '</span><strong>Aucun coupon à envoyer</strong><p>Un administrateur peut en créer dans Fidélité et coupons.</p></div>') + '</div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="send-coupon"' + (S.pick ? '' : ' disabled') + '>' + icon('send') + 'Envoyer au client</button></div>';
  }
  function side() {
    var nr = nextReward(), o = S.order;
    return '<div><h3>Fidélité</h3><strong style="font-size:24px" class="tnum">' + S.points + ' points</strong><div class="stack" style="gap:6px;margin-top:6px">' + (nr ? meter(nr) : S.rewards.length ? '<span class="small muted">Toutes les récompenses sont accessibles.</span>' : '<span class="small muted">Aucune récompense pour l\'instant.</span>') + '</div></div>' +
      '<div><h3>Commande ' + o.id + '</h3><div class="lines small"><div><span>Articles</span><span class="tnum">' + money(o.amount) + '</span></div>' + (o.code ? '<div><span>Code <span class="mono">' + esc(o.code) + '</span></span><span class="tnum">− ' + money(o.off) + '</span></div>' : '') + '<div class="total"><span>Total</span><span class="tnum">' + money(total()) + '</span></div></div>' +
      (o.code ? (o.placed ? '' : '<button type="button" class="btn btn--sm" style="margin-top:8px" data-act="remove-code">' + icon('x') + 'Retirer le code</button>') :
        '<label class="field" style="margin-top:10px">Appliquer un code<span class="row" style="gap:6px"><input class="input mono ' + (S.deskErr ? 'input--error' : '') + '" style="min-width:0" value="' + esc(S.deskCode || '') + '" data-on-input="desk-code" aria-label="Code"><button type="button" class="btn btn--sm" data-act="desk-apply">Appliquer</button></span>' + (S.deskErr ? '<span class="small" style="color:var(--bad)">' + esc(S.deskErr) + '</span>' : '') + '</label>') + '</div>';
  }

  /* ---------- Cartes ---------- */
  function card(m, side) {
    if (m.card === 'loyalty') {
      var nr = nextReward();
      if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('star') + 'Carte de fidélité envoyée</span></div><div class="dcard__body"><strong class="tnum">' + S.points + ' points</strong></div></div>';
      return '<div class="pcard" style="width:270px"><div class="pcard__title">' + icon('star') + 'Ma carte de fidélité</div><div class="pcard__list"><strong style="font-size:24px" class="tnum">' + S.points + ' points</strong>' + (nr ? meter(nr) : '') + '</div><div class="pcard__foot"><button type="button" class="btn ph-btn" data-act="ph-card">Voir mes récompenses</button></div></div>';
    }
    var c = coupon(m.data.code);
    var used = S.usedCodes.indexOf(c.code) !== -1, st = state(c);
    var flag = used ? '<span class="badge">Déjà utilisé</span>' : st === 'expired' ? '<span class="badge badge--bad">Expiré</span>' : '<span class="badge badge--ok">Valable</span>';
    if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('tag') + 'Coupon envoyé</span>' + flag + '</div><div class="dcard__body"><strong class="mono">' + esc(c.code) + '</strong><span class="muted small">− ' + offText(c) + ' · jusqu\'au ' + day(c.end) + '</span></div></div>';
    return '<div class="pcard" style="width:270px"><div class="ticket"><span class="ticket__off">− ' + offText(c) + '</span><span class="mono ticket__code">' + esc(c.code) + '</span><span class="small muted">Jusqu\'au ' + day(c.end) + '</span>' + flag + '</div>' +
      (used || st === 'expired' || S.order.placed ? '' : '<div class="pcard__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-use" data-code="' + esc(c.code) + '">Utiliser au panier</button></div>') + '</div>';
  }

  /* ---------- Téléphone ---------- */
  function cardLayer() {
    var nr = nextReward(), mine = S.wallet.map(coupon).filter(Boolean);
    return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('back') + '</button><h2>Ma carte de fidélité</h2></div><div class="ph-sheet__body">' +
      '<div class="loyalty"><span class="small">' + esc(B.entity.name) + '</span><strong class="tnum">' + S.points + ' points</strong>' + (nr ? meter(nr) : '') + '</div>' +
      '<h3 class="ph-h3">Récompenses</h3>' + (S.rewards.length ? sortedRewards().map(function (r) {
        var can = S.points >= r.points;
        return '<div class="ph-option" style="cursor:default">' + icon('star') + '<span><strong>' + esc(r.name) + '</strong><small class="tnum">' + r.points + ' points</small></span><span class="ph-option__end">' + (can ? '<button type="button" class="btn btn--sm btn--primary" data-act="ph-swap" data-id="' + r.id + '">Échanger</button>' : '<span class="small muted">Il manque ' + (r.points - S.points) + '</span>') + '</span></div>';
      }).join('') : '<p class="small muted">Aucune récompense pour l\'instant.</p>') +
      '<h3 class="ph-h3">Mes coupons</h3>' + (mine.length ? mine.map(function (c) {
        var used = S.usedCodes.indexOf(c.code) !== -1, st = state(c);
        return '<div class="ph-option" style="cursor:default">' + icon('tag') + '<span><strong class="mono">' + esc(c.code) + '</strong><small>− ' + offText(c) + ' · ' + (used ? 'déjà utilisé' : st === 'expired' ? 'expiré' : 'jusqu\'au ' + day(c.end)) + '</small></span>' + (used || st === 'expired' || S.order.placed ? '' : '<span class="ph-option__end"><button type="button" class="btn btn--sm" data-act="ph-use" data-code="' + esc(c.code) + '">Utiliser</button></span>') + '</div>';
      }).join('') : '<p class="small muted">Aucun coupon reçu.</p>') +
      (S.ref.on ? '<h3 class="ph-h3">Parrainer un proche</h3><div class="ph-option" style="cursor:default">' + icon('users') + '<span><strong class="mono">MIREILLE47</strong><small>' + esc(S.ref.sponsor) + ' points pour vous, ' + esc(S.ref.friend) + ' pour votre proche</small></span><span class="ph-option__end"><button type="button" class="btn btn--sm" data-act="ph-share">Partager</button></span></div>' : '') +
      '</div>';
  }
  function cartSheet() {
    var o = S.order, pts = earned(total());
    if (o.placed) return '<div class="ph-sheet__head"><h2>Commande ' + o.id + '</h2>' + close('close-layer') + '</div><div class="ph-sheet__body"><div class="lines"><div><span>Montre Dorée Élégance (M)</span><span class="tnum">' + money(o.amount) + '</span></div>' + (o.code ? '<div><span>Code ' + esc(o.code) + '</span><span class="tnum">− ' + money(o.off) + '</span></div>' : '') + '<div class="total"><span>Total</span><span class="tnum">' + money(total()) + '</span></div></div><p class="small muted">Commande envoyée. ' + pts + ' points seront ajoutés après la livraison.</p></div>';
    return '<div class="ph-sheet__head"><h2>Mon panier</h2>' + close('close-layer') + '</div><div class="ph-sheet__body"><div class="lines"><div><span>1 × Montre Dorée Élégance (M)</span><span class="tnum">' + money(o.amount) + '</span></div>' + (o.code ? '<div style="color:var(--ok)"><span>Code ' + esc(o.code) + '</span><span class="tnum">− ' + money(o.off) + '</span></div>' : '') + '<div class="total"><span>Total</span><span class="tnum">' + money(total()) + '</span></div></div>' +
      (o.code ? '<button type="button" class="btn btn--sm" data-act="remove-code">' + icon('x') + 'Retirer le code</button>' :
        '<label class="field">Code promo<span class="row" style="gap:6px"><input class="input mono ' + (S.codeErr ? 'input--error' : '') + '" style="min-width:0" value="' + esc(S.cartCode || '') + '" data-on-input="cart-code" placeholder="Ex. BIENVENUE10"><button type="button" class="btn" data-act="ph-apply">Appliquer</button></span>' + (S.codeErr ? '<span class="small" style="color:var(--bad)">' + esc(S.codeErr) + '</span>' : '') + '</label>') +
      '<p class="small muted">' + icon('star') + ' Vous gagnerez ' + pts + ' points après la livraison.</p></div><div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-order">Commander · ' + money(total()) + '</button></div>';
  }

  /* ---------- Cas ---------- */
  function seedCoupons() {
    return [
      { code: 'BIENVENUE10', type: 'percent', value: 10, start: '2026-11-01', end: '2026-12-31', max: 200, used: 37 },
      { code: 'AZUR5000', type: 'fcfa', value: 5000, start: '2026-11-01', end: '2026-11-30', max: 50, used: 12 },
      { code: 'RENTREE15', type: 'percent', value: 15, start: '2026-09-01', end: '2026-09-30', max: 100, used: 88 }
    ];
  }
  function seedRewards() {
    return [
      { id: 'w1', name: 'Bracelet cuir offert', points: 100, value: 6500 },
      { id: 'w2', name: 'Réduction de 5 000 FCFA', points: 150, value: 5000 },
      { id: 'w3', name: 'Écrin de rangement offert', points: 300, value: 9000 }
    ];
  }

  C.define({
    id: 'fidelite', title: 'Fidélité et coupons', icon: 'tag', priority: 3,
    entity: B.entity,
    cases: [
      { key: 'normal', label: 'Parcours normal (coupon reçu)' },
      { key: 'expire', label: 'Coupon expiré' },
      { key: 'utilise', label: 'Coupon déjà utilisé' },
      { key: 'points', label: 'Points insuffisants' },
      { key: 'vide', label: 'Aucun coupon, aucune récompense' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      var vide = k === 'vide';
      S = {
        tab: 'points', loading: k === 'chargement', points: k === 'points' ? 40 : vide ? 0 : 120,
        rule: { pts: 1, per: 1000 }, rewards: vide ? [] : seedRewards(), coupons: vide ? [] : seedCoupons(),
        ref: { on: !vide, sponsor: 50, friend: 20 }, usedCodes: [], wallet: [],
        order: { id: 'CMD-0144', amount: 42000 }
      };
      C.say({ from: 'citizen', text: 'Bonjour, vous avez une réduction en ce moment ?' });
      function give(code) { S.wallet.push(code); C.say({ from: 'agent', card: 'coupon', data: { code: code } }); }
      if (k === 'normal') { C.say({ from: 'agent', text: 'Bonjour, voici un coupon pour votre panier.' }); give('BIENVENUE10'); }
      if (k === 'expire') {
        C.say({ from: 'agent', text: 'Bonjour, voici le coupon de la rentrée.' }); give('RENTREE15');
        S.cartCode = S.deskCode = 'RENTREE15'; S.codeErr = S.deskErr = check('RENTREE15').err;
      }
      if (k === 'utilise') {
        C.say({ from: 'agent', text: 'Bonjour, voici un coupon pour votre panier.' }); give('AZUR5000');
        S.usedCodes.push('AZUR5000');
        S.cartCode = S.deskCode = 'AZUR5000'; S.codeErr = S.deskErr = check('AZUR5000').err;
      }
      if (k === 'points') {
        C.say({ from: 'citizen', text: 'Je peux avoir le bracelet avec mes points ?' });
        C.say({ from: 'agent', text: 'Il vous manque encore des points pour le bracelet. Voici votre carte.' });
        C.say({ from: 'agent', card: 'loyalty', data: {} });
      }
      if (vide) C.say({ from: 'agent', text: 'Bonjour, pas de réduction pour le moment.' });
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    quick: function () {
      if (S.loading) return '';
      return '<button type="button" data-act="ph-card">' + icon('star') + 'Ma carte · ' + S.points + ' points</button><button type="button" data-act="ph-cart">' + icon('bag') + (S.order.placed ? 'Ma commande' : 'Mon panier') + '</button>';
    },
    tools: function () { return [{ act: 'open-send', icon: 'tag', label: 'Envoyer un coupon', isNew: true }]; },
    side: side,
    card: card,
    act: {
      tab: function (el) { S.tab = el.dataset.tab; C.render(); },
      'new-coupon': function () { S.cform = { code: '', type: 'percent', value: '', start: NOW, end: '2026-11-30', max: '' }; C.modal(couponModal); },
      'save-coupon': function () {
        var f = S.cform, code = f.code.trim().toUpperCase(), v = +String(f.value).replace(/\D/g, '');
        f.err = null; f.errField = null;
        if (!/^[A-Z0-9-]{3,}$/.test(code)) { f.err = 'Le code doit avoir au moins 3 lettres ou chiffres, sans espace.'; f.errField = 'code'; }
        else if (coupon(code)) { f.err = 'Ce code existe déjà.'; f.errField = 'code'; }
        else if (!v || (f.type === 'percent' && v > 100)) { f.err = f.type === 'percent' ? 'La réduction doit être entre 1 et 100 %.' : 'Indiquez le montant de la réduction.'; f.errField = 'value'; }
        else if (!f.start || !f.end || f.end < f.start) { f.err = 'La date de fin doit venir après la date de début.'; f.errField = 'end'; }
        if (f.err) { C.render(); return; }
        S.coupons.unshift({ code: code, type: f.type, value: v, start: f.start, end: f.end, max: +String(f.max).replace(/\D/g, '') || 0, used: 0 });
        C.modalFn = null; C.render(); C.toast('Coupon créé');
      },
      'del-coupon': function (el) {
        var c = coupon(el.dataset.id);
        if (c.used || S.wallet.indexOf(c.code) !== -1) { C.toast('Ce coupon a déjà servi : il reste dans la liste pour garder l\'historique'); return; }
        S.coupons = S.coupons.filter(function (x) { return x !== c; }); C.render(); C.toast('Coupon supprimé');
      },
      'new-reward': function () { S.rform = { name: '', points: '', value: '' }; C.modal(rewardModal); },
      'save-reward': function () {
        var f = S.rform, p = +String(f.points).replace(/\D/g, ''), v = +String(f.value).replace(/\D/g, '');
        if (!f.name.trim() || !p || !v) { f.err = 'Remplissez le nom, les points et la valeur.'; C.render(); return; }
        S.rewards.push({ id: 'w' + C.uid(), name: f.name.trim(), points: p, value: v });
        C.modalFn = null; C.render(); C.toast('Récompense ajoutée');
      },
      'del-reward': function (el) { S.rewards = S.rewards.filter(function (r) { return r.id !== el.dataset.id; }); C.render(); C.toast('Récompense supprimée'); },
      'ref-on': function (el) { S.ref.on = el.checked; C.render(); },

      'open-send': function () { S.pick = null; C.modal(sendModal); },
      'pick-coupon': function (el) { S.pick = el.dataset.id; C.render(); },
      'send-coupon': function () {
        if (S.wallet.indexOf(S.pick) === -1) S.wallet.push(S.pick);
        C.modalFn = null;
        C.say({ from: 'agent', card: 'coupon', data: { code: S.pick } });
        C.render();
      },
      'desk-apply': function () {
        var res = check(S.deskCode);
        if (res.err) { S.deskErr = res.err; C.render(); return; }
        S.deskErr = null; S.deskCode = ''; S.codeErr = null; apply(res);
        C.say({ from: 'system', text: 'Code ' + esc(res.c.code) + ' appliqué à la commande ' + S.order.id + ' : − ' + money(res.off) });
        C.render();
      },
      'remove-code': function () { S.order.code = null; S.order.off = 0; C.render(); },

      'ph-card': function () { C.layer(cardLayer, { full: true }); },
      'ph-cart': function () { C.layer(cartSheet); },
      'ph-use': function (el) {
        C.layers = [];
        if (!S.order.placed && !S.order.code) {
          S.cartCode = el.dataset.code;
          var res = check(S.cartCode);
          if (res.err) S.codeErr = res.err; else { S.codeErr = null; apply(res); }
        }
        C.layer(cartSheet);
      },
      'ph-apply': function () {
        var res = check(S.cartCode);
        if (res.err) { S.codeErr = res.err; C.render(); return; }
        S.codeErr = null; apply(res); C.render();
      },
      'ph-order': function () {
        var o = S.order; o.placed = true;
        if (o.code) markUsed(o.code);
        C.layers = [];
        C.say({ from: 'citizen', text: 'Je commande : 1 × Montre Dorée Élégance (M)' + (o.code ? ', avec le code ' + o.code : '') + '.' });
        C.say({ from: 'system', text: 'Commande ' + o.id + ' envoyée · ' + money(total()) + ' · ' + earned(total()) + ' points après la livraison' });
        C.render();
      },
      'ph-swap': function (el) {
        var r = S.rewards.filter(function (x) { return x.id === el.dataset.id; })[0];
        if (S.points < r.points) return;
        var code = 'CADEAU-' + (S.wallet.length + 101);
        S.points -= r.points;
        S.coupons.push({ code: code, type: 'fcfa', value: r.value, start: NOW, end: '2027-01-31', max: 1, used: 0, personal: true });
        S.wallet.push(code);
        C.layers = [];
        C.say({ from: 'system', text: esc(r.name) + ' : ' + r.points + ' points échangés' });
        C.say({ from: 'agent', agent: B.entity.name, card: 'coupon', data: { code: code } });
        C.render();
      },
      'ph-share': function () { C.toast('Code copié : à envoyer à votre proche', 'phone'); }
    },
    input: {
      cform: function (el) { S.cform[el.dataset.k] = el.value; },
      rform: function (el) { S.rform[el.dataset.k] = el.value; },
      ref: function (el) { S.ref[el.dataset.k] = el.value; },
      'desk-code': function (el) { S.deskCode = el.value; },
      'cart-code': function (el) { S.cartCode = el.value; }
    },
    change: {
      'cform-type': function (el) { S.cform.type = el.value; C.render(); },
      rule: function (el) { S.rule[el.dataset.k] = Math.max(1, +el.value.replace(/\D/g, '') || 1); C.render(); }
    }
  });
})();
