/* ==========================================================
   App 2 — Commande (dépend du Catalogue)
   Réglage : modes de remise, frais par zone, minimum, étapes ; liste de toutes les commandes.
   Dossier : carte de commande, faire avancer le statut, modifier une quantité (accord du client), annuler.
   Téléphone : vitrine → « Ma commande » (quantités, remise, adresse) → carte qui se met à jour.
   ========================================================== */
'use strict';

(function () {
  var B = window.BOUTIQUE, esc = C.esc, money = C.money, icon = C.icon;
  var S = {};
  var STATUS = {
    recue: { label: 'Reçue', badge: 'warn', hint: 'La boutique va confirmer' },
    confirmee: { label: 'Confirmée', badge: 'info', hint: 'En préparation' },
    prete: { label: 'Prête', badge: 'info', hint: '' },
    livree: { label: 'Livrée', badge: 'ok', hint: '' },
    annulee: { label: 'Annulée', badge: 'bad', hint: '' }
  };
  var REASONS = ['Article épuisé', 'Client injoignable', 'Adresse hors zone de livraison', 'À la demande du client', 'Autre'];

  function product(id) { return S.products.filter(function (p) { return p.id === id; })[0]; }
  function order(id) { return S.orders.filter(function (o) { return o.id === id; })[0]; }
  function steps() {
    var s = ['recue'];
    if (S.set.confirm) s.push('confirmee');
    if (S.set.ready) s.push('prete');
    s.push('livree');
    return s;
  }
  function lastLabel(o) { return o.mode === 'pickup' ? 'Retirée' : 'Livrée'; }
  function statusLabel(o, st) {
    st = st || o.status;
    if (st === 'livree') return lastLabel(o);
    if (st === 'prete') return o.mode === 'pickup' ? 'Prête à retirer' : 'Prête';
    return STATUS[st].label;
  }
  function subtotal(items) { return items.reduce(function (t, it) { return t + it.price * it.qty; }, 0); }
  function total(o) { return subtotal(o.items) + (o.fee || 0); }
  function countItems(items) { return items.reduce(function (t, it) { return t + it.qty; }, 0); }
  function nextId() { S.seq++; return 'CMD-0' + S.seq; }
  function badge(o) { return '<span class="badge badge--' + STATUS[o.status].badge + '">' + statusLabel(o) + '</span>'; }
  function modeLabel(o) { return o.mode === 'pickup' ? 'Retrait en boutique' : 'Livraison · ' + S.set.zones[o.zone].name; }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var head = '<header class="page-head"><div><h1>Commandes</h1><p>' + (S.loading ? 'Chargement…' : S.orders.length + ' commande' + (S.orders.length > 1 ? 's' : '')) + '</p></div></header>' +
      '<div class="subtabs" role="tablist"><button type="button" role="tab" data-act="admin-tab" data-tab="list" aria-selected="' + (S.tab === 'list') + '">Toutes les commandes</button><button type="button" role="tab" data-act="admin-tab" data-tab="settings" aria-selected="' + (S.tab === 'settings') + '">Réglages</button></div>';
    if (S.loading) return head + C.skelRows(6);
    return head + (S.tab === 'list' ? orderList() : settings());
  }

  function orderList() {
    if (!S.orders.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('bag') + '</span><strong>Aucune commande pour l\'instant</strong><p>Les commandes passées depuis la vitrine apparaîtront ici.</p></div></div>';
    var counts = {}; S.orders.forEach(function (o) { counts[o.status] = (counts[o.status] || 0) + 1; });
    var chips = '<button type="button" class="chip" data-act="admin-filter" data-f="" aria-pressed="' + !S.filter + '">Toutes · ' + S.orders.length + '</button>' +
      Object.keys(STATUS).map(function (k) { return '<button type="button" class="chip" data-act="admin-filter" data-f="' + k + '" aria-pressed="' + (S.filter === k) + '">' + STATUS[k].label + ' · ' + (counts[k] || 0) + '</button>'; }).join('');
    var rows = S.orders.filter(function (o) {
      return (!S.filter || o.status === S.filter) && (!S.q || (o.id + ' ' + o.client).toLowerCase().indexOf(S.q.toLowerCase()) !== -1);
    });
    return '<div class="row row--wrap" style="margin-bottom:12px"><div class="search" style="flex:1;min-width:220px">' + icon('search') + '<input class="input" placeholder="N° de commande ou client" value="' + esc(S.q) + '" data-on-input="admin-q" aria-label="Rechercher une commande"></div></div>' +
      '<div class="chips" style="margin-bottom:14px">' + chips + '</div>' +
      '<div data-part="orders">' + orderRows(rows) + '</div>';
  }
  function orderRows(rows) {
    if (!rows.length) return '<div class="card"><div class="empty"><strong>Aucune commande ne correspond</strong></div></div>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>N°</th><th>Client</th><th>Articles</th><th>Remise</th><th class="num">Total</th><th>Statut</th><th>Passée</th></tr></thead><tbody>' +
      rows.map(function (o) {
        return '<tr><td class="tnum"><strong>' + o.id + '</strong></td><td>' + esc(o.client) + '</td><td>' + countItems(o.items) + ' article' + (countItems(o.items) > 1 ? 's' : '') + '</td><td>' + modeLabel(o) + '</td><td class="num">' + money(total(o)) + '</td><td>' + badge(o) + (o.status === 'annulee' && o.reason ? '<div class="small muted">' + esc(o.reason) + '</div>' : '') + '</td><td class="muted">' + o.when + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function settings() {
    var st = S.set;
    var zones = st.zones.map(function (z, i) {
      return '<tr><td><input class="input" value="' + esc(z.name) + '" data-on-input="zone" data-i="' + i + '" data-k="name" aria-label="Zone"></td><td style="width:170px"><span class="input-group"><input class="input tnum" inputmode="numeric" value="' + z.fee + '" data-on-input="zone" data-i="' + i + '" data-k="fee" aria-label="Frais"><span>FCFA</span></span></td><td style="width:50px"><button type="button" class="icon-btn" data-act="zone-del" data-i="' + i + '" aria-label="Retirer la zone">' + icon('trash') + '</button></td></tr>';
    }).join('');
    var flow = [
      ['recue', 'Reçue', 'Dès que le client envoie sa commande', null],
      ['confirmee', 'Confirmée', 'Vous avez vérifié le stock', 'confirm'],
      ['prete', 'Prête', 'Emballée, prête à partir ou à retirer', 'ready'],
      ['livree', 'Livrée / Retirée', 'Le client a reçu sa commande', null]
    ].map(function (f, i) {
      return '<div class="row" style="padding:10px 0;border-bottom:1px solid var(--line-soft)"><span class="avatar" style="width:26px;height:26px;font-size:12px">' + (i + 1) + '</span><div style="flex:1"><strong>' + f[1] + '</strong><div class="small muted">' + f[2] + '</div></div>' +
        (f[3] ? '<input type="checkbox" class="switch" data-on-change="set" data-k="' + f[3] + '"' + (st[f[3]] ? ' checked' : '') + ' aria-label="Utiliser l\'étape ' + f[1] + '">' : '<span class="small muted">Toujours</span>') + '</div>';
    }).join('');
    return '<div class="grid-2" style="align-items:start">' +
      '<div class="stack">' +
        '<section class="card"><div class="card__head"><h2>Retrait en boutique</h2><input type="checkbox" class="switch" data-on-change="set" data-k="pickup"' + (st.pickup ? ' checked' : '') + ' aria-label="Proposer le retrait en boutique"></div>' +
          (st.pickup ? '<label class="field">Adresse du retrait<input class="input" value="' + esc(st.pickupAddr) + '" data-on-input="set" data-k="pickupAddr"></label>' : '<p class="muted small">Non proposé à vos clients.</p>') + '</section>' +
        '<section class="card"><div class="card__head"><h2>Livraison</h2><input type="checkbox" class="switch" data-on-change="set" data-k="delivery"' + (st.delivery ? ' checked' : '') + ' aria-label="Proposer la livraison"></div>' +
          (st.delivery ? '<div class="table-wrap"><table class="table"><thead><tr><th>Zone</th><th>Frais</th><th></th></tr></thead><tbody>' + zones + '</tbody></table></div><button type="button" class="btn btn--sm" style="margin-top:10px" data-act="zone-add">' + icon('plus') + 'Ajouter une zone</button>' : '<p class="muted small">Non proposée à vos clients.</p>') + '</section>' +
        (!st.pickup && !st.delivery ? '<div class="alert alert--bad">' + icon('alert') + 'Activez au moins un mode de remise : sans cela, vos clients ne peuvent pas commander.</div>' : '') +
      '</div>' +
      '<div class="stack">' +
        '<section class="card"><div class="card__head"><h2>Montant minimum</h2></div><label class="field">Commande minimum (hors livraison)<span class="input-group"><input class="input tnum" inputmode="numeric" value="' + st.min + '" data-on-input="set" data-k="min"><span>FCFA</span></span><span class="field__hint">0 = pas de minimum</span></label></section>' +
        '<section class="card"><div class="card__head"><h2>Étapes de la commande</h2></div>' + flow + '<p class="small muted" style="margin-top:10px">Une commande peut toujours être annulée, avec un motif envoyé au client.</p></section>' +
        '<div class="row" style="justify-content:flex-end"><button type="button" class="btn btn--primary" data-act="save-settings">' + icon('check') + 'Enregistrer</button></div>' +
      '</div></div>';
  }

  /* ---------- Cartes ---------- */
  function card(m, side) {
    if (m.card === 'order') return side === 'phone' ? phoneOrder(order(m.data.oid)) : deskOrder(order(m.data.oid));
    if (m.card === 'change') return changeCard(m, side);
    return '';
  }
  function lines(o) {
    return '<div class="lines">' + o.items.map(function (it) {
      return '<div><span>' + it.qty + ' × ' + esc(it.name) + (it.variant ? ' <span class="muted">(' + esc(it.variant) + ')</span>' : '') + '</span><span class="tnum">' + money(it.price * it.qty) + '</span></div>';
    }).join('') + (o.fee ? '<div class="muted"><span>Livraison</span><span class="tnum">' + money(o.fee) + '</span></div>' : '') +
      '<div class="total"><span>Total</span><span class="tnum">' + money(total(o)) + '</span></div></div>';
  }
  function deskOrder(o) {
    var st = steps(), i = st.indexOf(o.status), next = st[i + 1];
    var actions = '';
    if (o.status !== 'annulee' && o.status !== 'livree') {
      var nextLabel = next === 'confirmee' ? 'Confirmer la commande' : next === 'prete' ? 'Marquer prête' : (o.mode === 'pickup' ? 'Marquer retirée' : 'Marquer livrée');
      actions = '<div class="dcard__foot"><button type="button" class="btn btn--primary btn--sm" data-act="advance" data-id="' + o.id + '">' + icon('check') + nextLabel + '</button>' +
        (o.status === 'recue' || o.status === 'confirmee' ? '<button type="button" class="btn btn--sm" data-act="open-change" data-id="' + o.id + '"' + (o.pending ? ' disabled title="Une modification attend la réponse du client"' : '') + '>' + icon('edit') + 'Modifier une quantité</button>' : '') +
        '<button type="button" class="btn btn--sm btn--danger" data-act="open-cancel" data-id="' + o.id + '">Annuler</button></div>';
    }
    return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('bag') + 'Commande ' + o.id + '</span>' + badge(o) + '</div>' +
      '<div class="dcard__body">' + lines(o) +
      '<div class="small"><strong>' + modeLabel(o) + '</strong>' + (o.mode === 'delivery' ? '<br><span class="muted">' + esc(o.addr) + '</span>' : '') + '<br><span class="muted tnum">' + esc(o.phone) + '</span></div>' +
      (o.status === 'annulee' ? '<div class="alert alert--bad small">' + icon('x') + 'Annulée : ' + esc(o.reason) + '</div>' : '') +
      (o.pending ? '<div class="alert alert--warn small">' + icon('clock') + 'Modification proposée, en attente de l\'accord du client</div>' : '') +
      '</div>' + actions + '</div>';
  }
  function phoneOrder(o) {
    var st = steps();
    var stepper;
    if (o.status === 'annulee') {
      stepper = '<div class="alert alert--bad small">' + icon('x') + '<span><strong>Commande annulée par la boutique</strong><br>' + esc(o.reason) + '</span></div>';
    } else {
      var cur = st.indexOf(o.status);
      stepper = '<div class="steps">' + st.map(function (s, i) {
        var cls = i < cur || o.status === 'livree' ? 'is-done' : i === cur ? 'is-now' : '';
        return '<div class="step ' + cls + '"><span class="step__dot">' + (cls === 'is-done' ? icon('check') : '') + '</span><div><strong>' + statusLabel(o, s) + '</strong>' + (i === cur && STATUS[s].hint && o.status !== 'livree' ? '<span>' + STATUS[s].hint + '</span>' : '') + '</div></div>';
      }).join('') + '</div>';
    }
    return '<div class="pcard" style="width:280px"><div class="pcard__title">' + icon('bag') + 'Commande ' + o.id + '<span style="margin-left:auto">' + badge(o) + '</span></div>' +
      '<div class="pcard__list">' + lines(o) + '<div class="small muted">' + modeLabel(o) + '</div>' + stepper + '</div></div>';
  }
  function changeCard(m, side) {
    var d = m.data, o = order(d.oid);
    var text = d.name + ' : ' + d.from + ' → ' + d.to + (d.to === 0 ? ' (retiré)' : '');
    var state = d.state === 'pending' ? '<span class="badge badge--warn">En attente</span>' : d.state === 'ok' ? '<span class="badge badge--ok">Acceptée</span>' : '<span class="badge badge--bad">Refusée</span>';
    if (side === 'desk') {
      return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('edit') + 'Modification · ' + d.oid + '</span>' + state + '</div><div class="dcard__body"><span>' + esc(text) + '</span><span class="muted small">' + esc(d.why) + '</span></div></div>';
    }
    return '<div class="pcard" style="width:280px"><div class="pcard__title">' + icon('edit') + 'La boutique propose un changement</div><div class="pcard__list"><span><strong>' + esc(text) + '</strong></span><span class="muted">' + esc(d.why) + '</span><span>Nouveau total : <strong>' + money(d.newTotal) + '</strong></span></div>' +
      (d.state === 'pending' ? '<div class="pcard__foot"><button type="button" class="btn" data-act="change-no" data-m="' + m.id + '">Refuser</button><button type="button" class="btn btn--primary" data-act="change-ok" data-m="' + m.id + '">Accepter</button></div>' : '<div class="pcard__foot">' + state + '</div>') + '</div>';
  }

  /* ---------- Téléphone : vitrine, fiche, « Ma commande » ---------- */
  function cartList() { return Object.keys(S.cart).map(function (k) { return S.cart[k]; }); }
  function cartCount() { return countItems(cartList()); }
  function vitrine() {
    var items = S.products.filter(function (p) { return !p.hidden; });
    var n = cartCount();
    return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="close-layer" aria-label="Retour">' + icon('back') + '</button><h2>Vitrine</h2></div>' +
      '<div class="ph-sheet__body" style="padding-top:12px"><div class="ph-grid">' + items.map(function (p) {
        var out = p.stock === 0, inCart = cartList().filter(function (c) { return c.pid === p.id; }).reduce(function (t, c) { return t + c.qty; }, 0);
        return '<div class="ph-tile ' + (out ? 'is-off' : '') + '"><button type="button" style="all:unset;cursor:pointer;display:block" data-act="ph-open" data-id="' + p.id + '">' + B.art(p.art) + '</button>' + (out ? '<span class="badge badge--bad">Épuisé</span>' : '') +
          '<div class="row row--between"><span style="min-width:0"><strong>' + esc(p.name) + '</strong><span class="pcard__price small">' + money(p.price) + '</span></span>' +
          (out ? '' : '<button type="button" class="ph-send" style="width:32px;height:32px" data-act="quick-add" data-id="' + p.id + '" aria-label="Ajouter ' + esc(p.name) + '">' + (inCart ? '<strong style="font-size:13px">' + inCart + '</strong>' : icon('plus')) + '</button>') + '</div></div>';
      }).join('') + '</div></div>' +
      (n ? '<div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-checkout">' + icon('bag') + 'Commander · ' + n + ' article' + (n > 1 ? 's' : '') + ' · ' + money(subtotal(cartList())) + '</button></div>' : '');
  }
  function detail() {
    var p = product(S.open), out = p.stock === 0;
    return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="back-layer" aria-label="Retour">' + icon('back') + '</button><h2>' + esc(p.name) + '</h2></div>' +
      '<div class="ph-sheet__body"><div style="border-radius:16px;overflow:hidden">' + B.art(p.art) + '</div>' +
      '<div class="row row--between"><span class="pcard__price" style="font-size:20px">' + money(p.price) + '</span>' + B.stockBadge(p) + '</div>' +
      p.variants.map(function (v, vi) {
        return '<div style="display:grid;gap:6px"><strong class="small">' + esc(v.label) + '</strong><div class="chips">' + v.options.map(function (o) { return '<button type="button" class="chip" data-act="ph-variant" data-v="' + vi + '" data-o="' + esc(o) + '" aria-pressed="' + (S.variant[vi] === o) + '">' + esc(o) + '</button>'; }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<div class="ph-sheet__foot">' + (out ? '<button type="button" class="btn ph-btn" disabled>Épuisé</button>' : '<button type="button" class="btn btn--primary ph-btn" data-act="ph-add">' + icon('plus') + 'Ajouter au panier</button>') + '</div>';
  }
  function checkout() {
    var items = cartList(), st = S.set, f = S.form;
    var sub = subtotal(items), fee = f.mode === 'delivery' ? st.zones[f.zone].fee : 0;
    var belowMin = st.min > 0 && sub < st.min;
    var soldOut = items.filter(function (it) { return product(it.pid).stock === 0; });
    var body = '';
    if (!items.length) {
      body = '<div class="empty"><span class="empty__icon">' + icon('bag') + '</span><strong>Votre panier est vide</strong><button type="button" class="btn btn--primary" data-act="ph-vitrine">Voir la vitrine</button></div>';
    } else {
      body = (soldOut.length ? '<div class="alert alert--bad small">' + icon('alert') + '<span><strong>' + esc(soldOut.map(function (s) { return s.name; }).join(', ')) + '</strong> vient d\'être épuisé. Retirez-le pour continuer.</span></div>' : '') +
        items.map(function (it) {
          var p = product(it.pid), out = p.stock === 0;
          return '<div class="row" style="' + (out ? 'opacity:.6' : '') + '"><span class="thumb">' + B.art(p.art) + '</span><div style="flex:1;min-width:0"><strong class="small" style="display:block">' + esc(it.name) + '</strong><span class="small muted">' + (it.variant ? esc(it.variant) + ' · ' : '') + money(it.price) + '</span>' + (out ? '<br><span class="badge badge--bad">Épuisé</span>' : '') + '</div>' +
            (out ? '<button type="button" class="btn btn--sm" data-act="cart-del" data-k="' + it.key + '">Retirer</button>' : '<span class="qty"><button type="button" data-act="cart-qty" data-k="' + it.key + '" data-d="-1" aria-label="Moins">−</button><span>' + it.qty + '</span><button type="button" data-act="cart-qty" data-k="' + it.key + '" data-d="1" aria-label="Plus">+</button></span>') + '</div>';
        }).join('') +
        '<strong style="margin-top:6px">Remise</strong>' +
        (st.pickup ? '<button type="button" class="ph-option ' + (f.mode === 'pickup' ? 'is-on' : '') + '" data-act="ph-mode" data-m="pickup">' + icon('store') + '<span><strong>Retrait en boutique</strong><small>' + esc(st.pickupAddr) + '</small></span><span class="ph-option__end">Gratuit</span></button>' : '') +
        (st.delivery ? '<button type="button" class="ph-option ' + (f.mode === 'delivery' ? 'is-on' : '') + '" data-act="ph-mode" data-m="delivery">' + icon('truck') + '<span><strong>Livraison</strong><small>Selon votre quartier</small></span></button>' : '') +
        (f.mode === 'delivery' ? '<label class="field">Quartier<select class="select" data-on-change="ph-zone">' + st.zones.map(function (z, i) { return '<option value="' + i + '"' + (i === +f.zone ? ' selected' : '') + '>' + esc(z.name) + ' · ' + money(z.fee) + '</option>'; }).join('') + '</select></label>' +
          '<label class="field">Adresse de livraison<textarea class="textarea ' + (S.formErr && !f.addr.trim() ? 'input--error' : '') + '" style="min-height:60px" placeholder="Ex. Rue de la pharmacie, maison bleue" data-on-input="ph-form" data-k="addr">' + esc(f.addr) + '</textarea>' + (S.formErr && !f.addr.trim() ? '<span class="small" style="color:var(--bad)">Indiquez où livrer.</span>' : '') + '</label>' : '') +
        '<label class="field">Téléphone pour vous joindre<input class="input tnum" value="' + esc(f.phone) + '" data-on-input="ph-form" data-k="phone" inputmode="tel"></label>' +
        '<div class="lines" style="margin-top:4px"><div><span>Articles</span><span class="tnum">' + money(sub) + '</span></div>' + (fee ? '<div><span>Livraison</span><span class="tnum">' + money(fee) + '</span></div>' : '') + '<div class="total"><span>Total</span><span class="tnum">' + money(sub + fee) + '</span></div></div>' +
        (belowMin ? '<div class="alert alert--warn small">' + icon('info') + 'Commande minimum : ' + money(st.min) + '. Ajoutez encore ' + money(st.min - sub) + '.</div>' : '');
    }
    var other = S.orders.filter(function (o) { return o.client === C.app.citizen.name && o.status !== 'livree' && o.status !== 'annulee'; });
    return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="back-layer" aria-label="Retour">' + icon('back') + '</button><h2>Ma commande</h2></div>' +
      '<div class="ph-sheet__body">' + (items.length && other.length ? '<div class="alert alert--info small">' + icon('info') + 'Votre commande ' + other[0].id + ' est encore en cours. Celle-ci sera traitée à part.</div>' : '') + body + '</div>' +
      (items.length ? '<div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-send-order"' + (belowMin || soldOut.length || S.sending ? ' disabled' : '') + '>' + (S.sending ? '<span class="spinner"></span>Envoi…' : 'Envoyer la commande · ' + money(sub + fee)) + '</button></div>' : '');
  }

  /* ---------- Fenêtres de l'agent ---------- */
  function changeModal() {
    var o = order(S.target), it = o.items[S.chg.i];
    return '<div class="modal__head"><h2>Modifier une quantité · ' + o.id + '</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body"><label class="field">Article<select class="select" data-on-change="chg-item">' + o.items.map(function (x, i) { return '<option value="' + i + '"' + (i === S.chg.i ? ' selected' : '') + '>' + esc(x.name) + ' · ' + x.qty + ' commandé' + (x.qty > 1 ? 's' : '') + '</option>'; }).join('') + '</select></label>' +
      '<label class="field">Nouvelle quantité<span class="qty" style="justify-self:start"><button type="button" data-act="chg-qty" data-d="-1">−</button><span>' + S.chg.to + '</span><button type="button" data-act="chg-qty" data-d="1">+</button></span><span class="field__hint">0 retire l\'article de la commande.</span></label>' +
      '<label class="field">Raison, visible par le client<input class="input" value="' + esc(S.chg.why) + '" data-on-input="chg-why" maxlength="120"></label>' +
      '<div class="alert alert--info small">' + icon('info') + 'Le client reçoit la proposition et l\'accepte ou la refuse. Rien ne change sans son accord.</div></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="send-change"' + (S.chg.to === it.qty ? ' disabled' : '') + '>' + icon('send') + 'Proposer au client</button></div>';
  }
  function cancelModal() {
    var o = order(S.target);
    return '<div class="modal__head"><h2>Annuler la commande ' + o.id + ' ?</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body"><div class="field">Motif, envoyé au client' + REASONS.map(function (r) { return '<label class="pick ' + (S.reason === r ? 'is-on' : '') + '"><input type="radio" name="reason" data-act="pick-reason" data-r="' + esc(r) + '"' + (S.reason === r ? ' checked' : '') + '><span class="pick__main"><strong>' + r + '</strong></span></label>'; }).join('') + '</div>' +
      (S.reason === 'Autre' ? '<input class="input" placeholder="Précisez le motif" value="' + esc(S.reasonText) + '" data-on-input="reason-text">' : '') + '</div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Garder la commande</button><button type="button" class="btn btn--danger-solid" data-act="confirm-cancel"' + (S.reason ? '' : ' disabled') + '>Annuler la commande</button></div>';
  }

  /* ---------- Cas ---------- */
  function mkOrder(id, client, items, mode, zone, status, when, extra) {
    var o = { id: id, client: client, items: items.map(function (x) { var p = product(x[0]); return { pid: p.id, name: p.name, price: p.price, qty: x[1], variant: x[2] || '' }; }), mode: mode, zone: zone || 0, status: status, when: when, phone: '01 97 00 00 47', addr: 'Cadjèhoun, rue 12.054, portail vert' };
    o.fee = mode === 'delivery' ? S.set.zones[o.zone].fee : 0;
    for (var k in extra) o[k] = extra[k];
    return o;
  }
  function history() {
    return [
      mkOrder('CMD-0139', 'Rodrigue H.', [['p9', 1]], 'pickup', 0, 'livree', 'Hier'),
      mkOrder('CMD-0138', 'Client · 01 66 •• •• 19', [['p5', 2, 'Rouge']], 'delivery', 2, 'livree', 'Hier'),
      mkOrder('CMD-0137', 'Aïcha K.', [['p2', 1, 'M'], ['p7', 1, 'Marron']], 'delivery', 0, 'annulee', 'Lun.', { reason: 'Client injoignable' }),
      mkOrder('CMD-0136', 'Serge A.', [['p3', 1, 'Noir']], 'pickup', 0, 'livree', 'Lun.')
    ];
  }

  C.define({
    id: 'commande', title: 'Commande', icon: 'bag', priority: 1,
    entity: B.entity,
    cases: [
      { key: 'normal', label: 'Parcours normal' },
      { key: 'epuise', label: 'Article épuisé pendant la commande' },
      { key: 'annulee', label: 'Commande annulée par la boutique', view: 'agent' },
      { key: 'deux', label: 'Deuxième commande en cours', view: 'agent' },
      { key: 'quantite', label: 'Quantité modifiée (accord du client)', view: 'agent' },
      { key: 'vide', label: 'Aucune commande', view: 'admin' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      S = { products: B.seed(), cart: {}, tab: 'list', filter: '', q: '', seq: 142, loading: k === 'chargement', variant: [],
        set: { pickup: true, pickupAddr: 'Montres Azur, Cadjèhoun, face à la station', delivery: true, zones: [{ name: 'Cotonou centre', fee: 1000 }, { name: 'Akpakpa', fee: 1500 }, { name: 'Abomey-Calavi', fee: 2000 }], min: 10000, confirm: true, ready: true },
        form: { mode: 'delivery', zone: 0, addr: '', phone: '01 97 00 00 47' }, orders: [] };
      if (k !== 'vide') S.orders = history();
      C.say({ from: 'citizen', text: 'Bonjour, je regarde vos montres.' });
      C.say({ from: 'agent', text: 'Bonjour ! Toute la vitrine est en haut à droite. Je reste disponible.' });
      if (k === 'annulee' || k === 'deux' || k === 'quantite') {
        var o1 = mkOrder(nextId(), C.app.citizen.name, [['p1', 2, 'Noir'], ['p7', 1, 'Noir']], 'delivery', 1, k === 'deux' ? 'prete' : 'recue', 'À l\'instant');
        S.orders.unshift(o1);
        C.say({ from: 'citizen', card: 'order', cardLabel: 'commande', data: { oid: o1.id } });
        if (k === 'annulee') {
          o1.status = 'annulee'; o1.reason = 'Article épuisé : le bracelet noir n\'est plus disponible chez notre fournisseur.';
          C.say({ from: 'agent', text: 'Désolée, nous devons annuler : le bracelet noir n\'est plus disponible.' });
        }
        if (k === 'deux') {
          C.say({ from: 'agent', text: 'Votre commande part tout à l\'heure.' });
          var o2 = mkOrder(nextId(), C.app.citizen.name, [['p5', 1, 'Vert']], 'pickup', 0, 'recue', 'À l\'instant');
          S.orders.unshift(o2);
          C.say({ from: 'citizen', card: 'order', cardLabel: 'commande', data: { oid: o2.id } });
        }
        if (k === 'quantite') {
          o1.pending = true;
          var newTotal = total(o1) - o1.items[0].price;
          C.say({ from: 'agent', card: 'change', data: { oid: o1.id, i: 0, name: o1.items[0].name, from: 2, to: 1, why: 'Il ne nous en reste qu\'une en noir.', state: 'pending', newTotal: newTotal } });
        }
      }
      if (k === 'epuise') {
        S.cart = { 'p9|': { key: 'p9|', pid: 'p9', name: product('p9').name, price: product('p9').price, qty: 1, variant: '' }, 'p3|Noir': { key: 'p3|Noir', pid: 'p3', name: product('p3').name, price: product('p3').price, qty: 1, variant: 'Noir' } };
        S.form.addr = 'Akpakpa, derrière le marché, 2e von à gauche'; S.form.zone = 1;
        S.soldOutOnSend = 'p9';
        setTimeout(function () { C.layer(checkout); }, 0);
      }
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    phoneHead: function () {
      var n = cartCount();
      return '<button type="button" class="icon-btn" data-act="ph-vitrine" aria-label="Vitrine" title="Vitrine">' + icon('store') + '</button>' +
        '<button type="button" class="icon-btn" data-act="ph-checkout" aria-label="Panier" title="Panier">' + icon('bag') + (n ? '<span class="dot-badge">' + n + '</span>' : '') + '</button>';
    },
    quick: function () { return S.loading ? '' : '<button type="button" data-act="ph-vitrine">' + icon('store') + 'Voir la vitrine</button>' + (cartCount() ? '<button type="button" data-act="ph-checkout">' + icon('bag') + 'Mon panier · ' + cartCount() + '</button>' : ''); },
    tools: function () { return []; },
    side: function () {
      var mine = S.orders.filter(function (o) { return o.client === C.app.citizen.name; });
      return '<div><h3>Commandes du client</h3>' + (mine.length ? '<div class="stack" style="gap:8px">' + mine.map(function (o) { return '<div class="row row--between small"><span><strong class="tnum">' + o.id + '</strong><br><span class="muted">' + money(total(o)) + '</span></span>' + badge(o) + '</div>'; }).join('') + '</div>' : '<p class="small muted">Aucune commande.</p>') +
        (mine.filter(function (o) { return o.status !== 'livree' && o.status !== 'annulee'; }).length > 1 ? '<p class="alert alert--info small" style="margin-top:8px">' + icon('info') + '2 commandes en cours</p>' : '') + '</div>';
    },
    card: card,
    act: {
      'admin-tab': function (el) { S.tab = el.dataset.tab; C.render(); },
      'admin-filter': function (el) { S.filter = el.dataset.f; C.render(); },
      'zone-add': function () { S.set.zones.push({ name: 'Nouvelle zone', fee: 1000 }); C.render(); },
      'zone-del': function (el) { if (S.set.zones.length > 1) { S.set.zones.splice(+el.dataset.i, 1); C.render(); } else C.toast('Gardez au moins une zone, ou désactivez la livraison'); },
      'save-settings': function () { C.toast('Réglages enregistrés'); },

      advance: function (el) {
        var o = order(el.dataset.id), st = steps(), next = st[st.indexOf(o.status) + 1];
        o.status = next;
        C.say({ from: 'system', text: 'Commande ' + o.id + ' : ' + statusLabel(o).toLowerCase() });
        C.render();
      },
      'open-change': function (el) { S.target = el.dataset.id; S.chg = { i: 0, to: Math.max(0, order(S.target).items[0].qty - 1), why: '' }; C.modal(changeModal); },
      'chg-qty': function (el) { S.chg.to = Math.max(0, S.chg.to + (+el.dataset.d)); C.render(); },
      'send-change': function () {
        var o = order(S.target), it = o.items[S.chg.i];
        var newTotal = total(o) + (S.chg.to - it.qty) * it.price;
        o.pending = true;
        C.say({ from: 'agent', card: 'change', data: { oid: o.id, i: S.chg.i, name: it.name, from: it.qty, to: S.chg.to, why: S.chg.why || 'Ajustement de votre commande.', state: 'pending', newTotal: newTotal } });
        C.modalFn = null; C.render();
      },
      'open-cancel': function (el) { S.target = el.dataset.id; S.reason = ''; S.reasonText = ''; C.modal(cancelModal); },
      'pick-reason': function (el) { S.reason = el.dataset.r; C.render(); },
      'confirm-cancel': function () {
        var o = order(S.target);
        o.status = 'annulee'; o.pending = false;
        o.reason = S.reason === 'Autre' ? (S.reasonText || 'Autre motif') : S.reason;
        C.say({ from: 'system', text: 'Commande ' + o.id + ' annulée' });
        C.modalFn = null; C.render();
      },

      'change-ok': function (el) { answerChange(el.dataset.m, true); },
      'change-no': function (el) { answerChange(el.dataset.m, false); },

      'ph-vitrine': function () { C.layers = []; C.layer(vitrine, { full: true }); },
      'ph-open': function (el) { var p = product(el.dataset.id); S.open = p.id; S.variant = p.variants.map(function (v) { return v.options[0]; }); C.layer(detail); },
      'ph-variant': function (el) { S.variant[+el.dataset.v] = el.dataset.o; C.render(); },
      'quick-add': function (el) {
        var p = product(el.dataset.id);
        addToCart(p, p.variants.map(function (v) { return v.options[0]; }).join(', '));
        C.render();
      },
      'ph-add': function () {
        addToCart(product(S.open), S.variant.join(', '));
        C.backLayer(); C.toast('Ajouté au panier', 'phone');
      },
      'ph-checkout': function () { S.formErr = false; if (C.layers.length && C.layers[C.layers.length - 1].fn === checkout) return; C.layer(checkout); },
      'cart-qty': function (el) {
        var it = S.cart[el.dataset.k]; it.qty += +el.dataset.d;
        if (it.qty <= 0) delete S.cart[el.dataset.k];
        C.render();
      },
      'cart-del': function (el) { delete S.cart[el.dataset.k]; C.render(); },
      'ph-mode': function (el) { S.form.mode = el.dataset.m; C.render(); },
      'ph-send-order': function () {
        if (S.sending) return;
        if (S.form.mode === 'delivery' && !S.form.addr.trim()) { S.formErr = true; C.render(); return; }
        S.sending = true; C.render();
        C.later(900, function () {
          S.sending = false;
          if (S.soldOutOnSend) { product(S.soldOutOnSend).stock = 0; S.soldOutOnSend = null; return; }
          var o = { id: nextId(), client: C.app.citizen.name, items: cartList().map(function (c) { return { pid: c.pid, name: c.name, price: c.price, qty: c.qty, variant: c.variant }; }), mode: S.form.mode, zone: +S.form.zone, addr: S.form.addr, phone: S.form.phone, status: 'recue', when: 'À l\'instant' };
          o.fee = o.mode === 'delivery' ? S.set.zones[o.zone].fee : 0;
          S.orders.unshift(o);
          S.cart = {};
          C.layers = [];
          C.say({ from: 'citizen', card: 'order', cardLabel: 'commande', data: { oid: o.id } });
        });
      }
    },
    input: {
      'admin-q': function (el) {
        S.q = el.value;
        var tmp = document.createElement('div'); tmp.innerHTML = orderList();
        C.$('[data-part=orders]').innerHTML = tmp.querySelector('[data-part=orders]').innerHTML;
      },
      set: function (el) { if (el.type === 'checkbox') return; S.set[el.dataset.k] = el.dataset.k === 'min' ? (+el.value.replace(/\D/g, '') || 0) : el.value; },
      zone: function (el) { var z = S.set.zones[+el.dataset.i]; z[el.dataset.k] = el.dataset.k === 'fee' ? (+el.value.replace(/\D/g, '') || 0) : el.value; },
      'ph-form': function (el) { S.form[el.dataset.k] = el.value; },
      'chg-why': function (el) { S.chg.why = el.value; },
      'reason-text': function (el) { S.reasonText = el.value; }
    },
    change: {
      set: function (el) { if (el.type !== 'checkbox') return; S.set[el.dataset.k] = el.checked; C.render(); },
      'ph-zone': function (el) { S.form.zone = +el.value; C.render(); },
      'chg-item': function (el) { S.chg.i = +el.value; S.chg.to = Math.max(0, order(S.target).items[S.chg.i].qty - 1); C.render(); }
    }
  });

  function addToCart(p, variant) {
    var key = p.id + '|' + variant;
    if (!S.cart[key]) S.cart[key] = { key: key, pid: p.id, name: p.name, price: p.price, qty: 0, variant: variant };
    S.cart[key].qty++;
  }
  function answerChange(mid, yes) {
    var m = C.find(mid), d = m.data, o = order(d.oid);
    d.state = yes ? 'ok' : 'no';
    o.pending = false;
    if (yes) {
      if (d.to === 0) o.items.splice(d.i, 1); else o.items[d.i].qty = d.to;
      C.say({ from: 'system', text: 'Modification acceptée : nouveau total ' + money(total(o)) });
    } else {
      C.say({ from: 'system', text: 'Modification refusée par le client' });
    }
    C.render();
  }
})();
