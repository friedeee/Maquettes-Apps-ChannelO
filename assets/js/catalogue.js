/* ==========================================================
   App 1 — Catalogue
   Réglage : liste des produits + fiche produit (panneau à droite).
   Dossier : « Envoyer un produit » (1 fiche ou une sélection de 2 à 4).
   Téléphone : carte produit, sélection, vitrine complète, fiche détaillée.
   ========================================================== */
'use strict';

(function () {
  var B = window.BOUTIQUE, esc = C.esc, money = C.money, icon = C.icon;
  var S = {};
  var PAGE = 25;

  function product(id) { return S.products.filter(function (p) { return p.id === id; })[0]; }
  function visible(p) { return !p.hidden; }
  function match(p, q, cat) {
    return (!cat || p.cat === cat) && (!q || (p.name + ' ' + p.cat).toLowerCase().indexOf(q.toLowerCase()) !== -1);
  }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var head = '<header class="page-head"><div><h1>Catalogue</h1><p>' + (S.loading ? 'Chargement…' : S.products.length + ' produit' + (S.products.length > 1 ? 's' : '')) + '</p></div>' +
      '<div class="page-head__actions"><button type="button" class="btn btn--primary" data-act="new-product">' + icon('plus') + 'Ajouter un produit</button></div></header>';
    if (S.loading) return head + C.skelRows(6);
    if (!S.products.length) {
      return head + '<div class="card"><div class="empty"><span class="empty__icon">' + icon('box') + '</span><strong>Aucun produit pour l\'instant</strong><p>Ajoutez votre premier produit : il apparaîtra dans la vitrine de vos clients.</p><button type="button" class="btn btn--primary" data-act="new-product">' + icon('plus') + 'Ajouter un produit</button></div></div>';
    }
    var counts = {};
    S.products.forEach(function (p) { counts[p.cat] = (counts[p.cat] || 0) + 1; });
    var chips = '<button type="button" class="chip" data-act="admin-cat" data-cat="" aria-pressed="' + !S.cat + '">Toutes · ' + S.products.length + '</button>' +
      B.categories.map(function (c) { return '<button type="button" class="chip" data-act="admin-cat" data-cat="' + c + '" aria-pressed="' + (S.cat === c) + '">' + c + ' · ' + (counts[c] || 0) + '</button>'; }).join('');
    return head +
      '<div class="row row--wrap" style="margin-bottom:14px"><div class="search" style="flex:1;min-width:220px">' + icon('search') + '<input class="input" placeholder="Rechercher un produit" value="' + esc(S.q) + '" data-on-input="admin-q" aria-label="Rechercher un produit"></div>' +
      '<select class="select" style="width:190px" data-on-change="admin-state" aria-label="État"><option value="">Tous les états</option><option value="ok"' + (S.state === 'ok' ? ' selected' : '') + '>Disponibles</option><option value="out"' + (S.state === 'out' ? ' selected' : '') + '>Épuisés</option><option value="hidden"' + (S.state === 'hidden' ? ' selected' : '') + '>Masqués</option></select></div>' +
      '<div class="chips" style="margin-bottom:14px">' + chips + '</div>' +
      '<div data-part="list">' + list() + '</div>';
  }

  function filtered() {
    return S.products.filter(function (p) {
      if (!match(p, S.q, S.cat)) return false;
      if (S.state === 'ok') return !p.hidden && p.stock > 0;
      if (S.state === 'out') return p.stock === 0;
      if (S.state === 'hidden') return p.hidden;
      return true;
    });
  }

  function list() {
    var rows = filtered();
    if (!rows.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('search') + '</span><strong>Aucun produit ne correspond</strong><button type="button" class="btn" data-act="admin-clear">Effacer la recherche</button></div></div>';
    var shown = rows.slice(0, S.shown);
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Produit</th><th>Catégorie</th><th class="num">Prix</th><th>État</th><th>Visible</th><th></th></tr></thead><tbody>' +
      shown.map(function (p) {
        return '<tr class="' + (p.hidden ? 'is-dim' : '') + '"><td><div class="row"><span class="thumb">' + B.art(p.art) + '</span><div><strong>' + esc(p.name) + '</strong><div class="small muted">' + (p.variants.length ? p.variants.map(function (v) { return v.label + ' : ' + v.options.length + ' choix'; }).join(' · ') : 'Sans variante') + '</div></div></div></td>' +
          '<td>' + p.cat + '</td><td class="num">' + money(p.price) + '</td><td>' + B.stockBadge(p) + '</td>' +
          '<td><input type="checkbox" class="switch" data-act="toggle-hidden" data-id="' + p.id + '"' + (p.hidden ? '' : ' checked') + ' aria-label="Visible dans la vitrine"></td>' +
          '<td><button type="button" class="btn btn--sm" data-act="edit-product" data-id="' + p.id + '">' + icon('edit') + 'Modifier</button></td></tr>';
      }).join('') +
      '</tbody></table>' +
      '<div class="table-foot"><span>' + shown.length + ' sur ' + rows.length + '</span>' + (rows.length > shown.length ? '<button type="button" class="btn btn--sm" data-act="admin-more">Afficher ' + Math.min(PAGE, rows.length - shown.length) + ' de plus</button>' : '') + '</div></div>';
  }

  /* Fiche produit (panneau à droite) */
  function editor() {
    var d = S.draft, err = S.draftErr || {};
    var photos = '';
    for (var i = 0; i < 5; i++) {
      photos += i < d.photos
        ? '<div class="has-img">' + B.art(d.art) + (i === 0 ? '<span class="cover">Principale</span>' : '') + '<button type="button" class="icon-btn" style="position:absolute;top:2px;right:2px;width:24px;height:24px;background:#0008;color:#fff" data-act="photo-del" aria-label="Retirer la photo">' + icon('x') + '</button></div>'
        : (i === d.photos ? '<button type="button" data-act="photo-add" aria-label="Ajouter une photo">' + icon('photo') + '</button>' : '<div></div>');
    }
    var variants = d.variants.map(function (v, i) {
      return '<div class="row" style="align-items:flex-start"><input class="input" style="width:150px" value="' + esc(v.label) + '" data-on-input="variant" data-i="' + i + '" data-k="label" aria-label="Nom de la variante"><input class="input" value="' + esc(v.options.join(', ')) + '" data-on-input="variant" data-i="' + i + '" data-k="options" aria-label="Choix, séparés par des virgules"><button type="button" class="icon-btn" data-act="variant-del" data-i="' + i + '" aria-label="Retirer">' + icon('trash') + '</button></div>';
    }).join('');
    return '<div class="modal__head"><h2>' + (d.id ? 'Modifier le produit' : 'Nouveau produit') + '</h2><button type="button" class="icon-btn" data-act="close-drawer" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body">' +
        '<div class="field">Photos <span class="field__hint">Jusqu\'à 5. La première est affichée dans la discussion.</span><div class="photos">' + photos + '</div></div>' +
        '<label class="field">Nom<input class="input ' + (err.name ? 'input--error' : '') + '" value="' + esc(d.name) + '" data-on-input="draft" data-k="name" maxlength="80">' + (err.name ? '<span class="small" style="color:var(--bad)">' + err.name + '</span>' : '') + '</label>' +
        '<div class="grid-2"><label class="field">Prix<span class="input-group"><input class="input tnum ' + (err.price ? 'input--error' : '') + '" inputmode="numeric" value="' + (d.price || '') + '" data-on-input="draft" data-k="price"><span>FCFA</span></span>' + (err.price ? '<span class="small" style="color:var(--bad)">' + err.price + '</span>' : '') + '</label>' +
        '<label class="field">Catégorie<select class="select" data-on-change="draft" data-k="cat">' + B.categories.map(function (c) { return '<option' + (c === d.cat ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label></div>' +
        '<label class="field">Description<textarea class="textarea" data-on-input="draft" data-k="desc" maxlength="400">' + esc(d.desc) + '</textarea></label>' +
        '<div class="field">Variantes <span class="field__hint">Ex. Couleur : Noir, Argent</span>' + variants + '<button type="button" class="btn btn--sm" style="justify-self:start" data-act="variant-add">' + icon('plus') + 'Ajouter une variante</button></div>' +
        '<div class="field">Stock' +
          '<label class="pick ' + (d.track ? 'is-on' : '') + '"><input type="radio" name="track" data-act="track" data-v="1"' + (d.track ? ' checked' : '') + '><span class="pick__main"><strong>Suivre la quantité</strong><span>Épuisé automatiquement à 0</span></span>' + (d.track ? '<input class="input tnum" style="width:90px" inputmode="numeric" value="' + d.stock + '" data-on-input="draft" data-k="stock" aria-label="Quantité">' : '') + '</label>' +
          '<label class="pick ' + (!d.track ? 'is-on' : '') + '"><input type="radio" name="track" data-act="track" data-v="0"' + (!d.track ? ' checked' : '') + '><span class="pick__main"><strong>Disponible ou épuisé</strong><span>Vous changez l\'état à la main</span></span>' + (!d.track ? '<select class="select" style="width:130px" data-on-change="draft" data-k="avail"><option value="1"' + (d.stock > 0 ? ' selected' : '') + '>Disponible</option><option value="0"' + (d.stock === 0 ? ' selected' : '') + '>Épuisé</option></select>' : '') + '</label>' +
        '</div>' +
        '<label class="row row--between card" style="padding:12px 14px"><span><strong>Masquer dans la vitrine</strong><br><span class="small muted">Le produit reste enregistré, vos clients ne le voient plus.</span></span><input type="checkbox" class="switch" data-on-change="draft" data-k="hidden"' + (d.hidden ? ' checked' : '') + '></label>' +
      '</div>' +
      '<div class="modal__foot">' + (d.id ? '<button type="button" class="btn btn--danger" style="margin-right:auto" data-act="delete-product">' + icon('trash') + 'Supprimer</button>' : '') +
      '<button type="button" class="btn" data-act="close-drawer">Annuler</button><button type="button" class="btn btn--primary" data-act="save-product">' + icon('check') + 'Enregistrer</button></div>';
  }

  /* ---------- Dossier (agent) : fenêtre « Envoyer un produit » ---------- */
  function sendModal() {
    var items = S.products.filter(visible).filter(function (p) { return match(p, S.mq); });
    var body;
    if (!S.products.filter(visible).length) {
      body = '<div class="empty"><span class="empty__icon">' + icon('box') + '</span><strong>Le catalogue est vide</strong><p>Un administrateur peut ajouter des produits dans Catalogue.</p></div>';
    } else if (!items.length) {
      body = '<div class="empty"><strong>Aucun produit ne correspond</strong></div>';
    } else {
      body = items.slice(0, 30).map(function (p) {
        var on = S.pick.indexOf(p.id) !== -1, off = p.stock === 0;
        return '<label class="pick ' + (on ? 'is-on' : '') + (off ? ' is-off' : '') + '"><input type="checkbox" data-act="pick" data-id="' + p.id + '"' + (on ? ' checked' : '') + (off ? ' disabled' : '') + '><span class="thumb">' + B.art(p.art) + '</span><span class="pick__main"><strong>' + esc(p.name) + '</strong><span>' + p.cat + ' · ' + money(p.price) + '</span></span>' + B.stockBadge(p) + '</label>';
      }).join('') + (items.length > 30 ? '<p class="small muted" style="text-align:center">' + (items.length - 30) + ' autres produits : précisez la recherche.</p>' : '');
    }
    var n = S.pick.length;
    return '<div class="modal__head"><h2>Envoyer un produit</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body"><div class="search">' + icon('search') + '<input class="input" placeholder="Rechercher dans le catalogue" value="' + esc(S.mq) + '" data-on-input="modal-q" aria-label="Rechercher"></div>' +
      '<div data-part="picks" style="display:grid;gap:4px">' + body + '</div></div>' +
      '<div class="modal__foot"><span class="muted" style="margin-right:auto;align-self:center" data-part="pick-count">' + pickLabel(n) + '</span><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="send-products" data-part="pick-send"' + (n ? '' : ' disabled') + '>' + icon('send') + (n > 1 ? 'Envoyer la sélection' : 'Envoyer la fiche') + '</button></div>';
  }
  function pickLabel(n) { return n ? n + ' sélectionné' + (n > 1 ? 's' : '') + ' · 4 au maximum' : 'Choisissez 1 produit, ou 2 à 4 pour une sélection'; }

  /* ---------- Cartes de la discussion ---------- */
  function priceNote(item) {
    var p = product(item.pid);
    return p && p.price !== item.price ? { now: p.price, before: item.price } : null;
  }
  function card(m, side) {
    if (m.card === 'product') return side === 'phone' ? phoneProduct(m.data) : deskProduct([m.data], 'Fiche produit');
    if (m.card === 'products') return side === 'phone' ? phoneSelection(m.data.items) : deskProduct(m.data.items, 'Sélection de ' + m.data.items.length + ' produits');
    return '';
  }
  function deskProduct(items, title) {
    return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('box') + title + '</span><span class="small muted">Envoyé</span></div><div class="dcard__body">' +
      items.map(function (it) {
        var p = product(it.pid) || { name: 'Produit supprimé', price: it.price, art: {}, stock: 0 }, n = priceNote(it);
        return '<div class="row"><span class="thumb">' + B.art(p.art) + '</span><div style="flex:1;min-width:0"><strong>' + esc(p.name) + '</strong><div class="small">' + (n ? '<span class="strike">' + money(n.before) + '</span> ' + money(n.now) : money(p.price)) + '</div></div>' + B.stockBadge(p) + '</div>' +
          (n ? '<div class="alert alert--warn small">' + icon('info') + 'Le prix a changé depuis l\'envoi. Le client voit le nouveau prix.</div>' : '');
      }).join('') + '</div></div>';
  }
  function phoneProduct(it) {
    var p = product(it.pid);
    if (!p) return '<div class="pcard"><div class="pcard__body"><strong>Ce produit n\'est plus proposé</strong></div></div>';
    var n = priceNote(it), out = p.stock === 0;
    return '<div class="pcard"><div class="pcard__img">' + B.art(p.art) + (out ? '<span class="pcard__flag badge badge--bad">Épuisé</span>' : '') + '</div>' +
      (n ? '<div class="pcard__note">Nouveau prix depuis l\'envoi</div>' : '') +
      '<div class="pcard__body"><strong>' + esc(p.name) + '</strong><span class="pcard__price">' + money(p.price) + (n ? ' <span class="strike small">' + money(n.before) + '</span>' : '') + '</span></div>' +
      '<div class="pcard__foot"><button type="button" class="btn btn--primary" data-act="ph-open" data-id="' + p.id + '">' + (out ? 'Voir' : 'Voir') + '</button></div></div>';
  }
  function phoneSelection(items) {
    return '<div class="pcard"><div class="pcard__title">' + icon('store') + items.length + ' produits pour vous</div><div class="mini-grid">' +
      items.map(function (it) {
        var p = product(it.pid); if (!p) return '';
        var n = priceNote(it);
        return '<button type="button" class="mini" data-act="ph-open" data-id="' + p.id + '">' + B.art(p.art) + '<div><strong>' + esc(p.name) + '</strong>' + (p.stock === 0 ? '<span class="badge badge--bad">Épuisé</span>' : '<span class="pcard__price small">' + money(p.price) + '</span>') + (n ? '<span class="strike small"> ' + money(n.before) + '</span>' : '') + '</div></button>';
      }).join('') + '</div><div class="pcard__foot"><button type="button" class="btn" data-act="ph-vitrine">Voir toute la vitrine</button></div></div>';
  }

  /* ---------- Téléphone : vitrine et fiche détaillée ---------- */
  function vitrine() {
    var all = S.products.filter(visible);
    var items = all.filter(function (p) { return match(p, S.vq, S.vcat); });
    var grid;
    if (S.loading) {
      grid = '<div class="ph-grid">' + [1, 2, 3, 4].map(function () { return '<div class="ph-tile"><span class="skel" style="display:block;aspect-ratio:1;border-radius:0"></span><div><span class="skel" style="height:10px;width:80%"></span></div></div>'; }).join('') + '</div>';
    } else if (!all.length) {
      grid = '<div class="empty"><span class="empty__icon">' + icon('store') + '</span><strong>Aucun produit pour le moment</strong><p>Écrivez à la boutique pour savoir ce qui est disponible.</p><button type="button" class="btn btn--primary" data-act="close-layer">Écrire à la boutique</button></div>';
    } else if (!items.length) {
      grid = '<div class="empty"><strong>Aucun résultat</strong><p>Essayez un autre mot.</p></div>';
    } else {
      grid = '<div class="ph-grid">' + items.slice(0, S.vshown).map(function (p) {
        var out = p.stock === 0;
        return '<button type="button" class="ph-tile ' + (out ? 'is-off' : '') + '" data-act="ph-open" data-id="' + p.id + '">' + B.art(p.art) + (out ? '<span class="badge badge--bad">Épuisé</span>' : '') + '<div><strong>' + esc(p.name) + '</strong><span class="pcard__price small">' + money(p.price) + '</span></div></button>';
      }).join('') + '</div>' + (items.length > S.vshown ? '<button type="button" class="btn btn--block" data-act="ph-more">Afficher plus (' + (items.length - S.vshown) + ')</button>' : '');
    }
    return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="close-layer" aria-label="Retour">' + icon('back') + '</button><h2>Vitrine</h2><span class="small" style="opacity:.8">' + all.length + ' produits</span></div>' +
      '<div class="ph-sheet__body" style="padding-top:12px">' +
        (all.length ? '<div class="search">' + icon('search') + '<input class="input" style="border-radius:99px" placeholder="Rechercher" value="' + esc(S.vq) + '" data-on-input="vitrine-q" aria-label="Rechercher dans la vitrine"></div>' +
        '<div class="chips"><button type="button" class="chip" data-act="vitrine-cat" data-cat="" aria-pressed="' + !S.vcat + '">Tout</button>' + B.categories.map(function (c) { return '<button type="button" class="chip" data-act="vitrine-cat" data-cat="' + c + '" aria-pressed="' + (S.vcat === c) + '">' + c + '</button>'; }).join('') + '</div>' : '') +
        '<div data-part="vgrid" style="display:grid;gap:12px">' + grid + '</div>' +
      '</div>';
  }

  function detail() {
    var p = product(S.open);
    if (!p) return '';
    var out = p.stock === 0;
    var dots = '';
    for (var i = 0; i < p.photos; i++) dots += '<span style="width:7px;height:7px;border-radius:50%;background:' + (i === S.photo ? 'var(--brand)' : 'var(--line)') + '"></span>';
    var variants = p.variants.map(function (v, vi) {
      return '<div style="display:grid;gap:6px"><strong class="small">' + esc(v.label) + '</strong><div class="chips">' + v.options.map(function (o) {
        return '<button type="button" class="chip" data-act="ph-variant" data-v="' + vi + '" data-o="' + esc(o) + '" aria-pressed="' + (S.variant[vi] === o) + '">' + esc(o) + '</button>';
      }).join('') + '</div></div>';
    }).join('');
    return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="back-layer" aria-label="Retour">' + icon('back') + '</button><h2>' + esc(p.name) + '</h2></div>' +
      '<div class="ph-sheet__body">' +
        '<div style="border-radius:16px;overflow:hidden" data-act="ph-photo">' + B.art(p.art) + '</div>' +
        (p.photos > 1 ? '<div class="row" style="justify-content:center;gap:6px">' + dots + '</div>' : '') +
        '<div class="row row--between"><span class="pcard__price" style="font-size:20px">' + money(p.price) + '</span>' + B.stockBadge(p) + '</div>' +
        '<p class="muted">' + esc(p.desc) + '</p>' + variants +
      '</div>' +
      '<div class="ph-sheet__foot">' + (out
        ? '<button type="button" class="btn btn--primary ph-btn" disabled>Épuisé</button>'
        : '<button type="button" class="btn btn--primary ph-btn" data-act="ph-order">' + icon('bag') + 'Commander</button>') +
        '<button type="button" class="btn ph-btn" data-act="ph-ask">Poser une question</button></div>';
  }

  /* ---------- Cas à montrer ---------- */
  function seedChat(pids, priceAtSend) {
    C.say({ from: 'citizen', text: 'Bonsoir, vous avez des montres pour homme ?' });
    C.say({ from: 'agent', text: 'Bonsoir ! Oui, voici quelques modèles.' });
    if (pids.length === 1) C.say({ from: 'agent', card: 'product', data: { pid: pids[0], price: priceAtSend || product(pids[0]).price } });
    else if (pids.length) C.say({ from: 'agent', card: 'products', data: { items: pids.map(function (id) { return { pid: id, price: product(id).price }; }) } });
  }

  C.define({
    id: 'catalogue', title: 'Catalogue', icon: 'box', priority: 1,
    entity: B.entity,
    cases: [
      { key: 'normal', label: 'Parcours normal' },
      { key: 'epuise', label: 'Produit épuisé', view: 'agent' },
      { key: 'prix', label: 'Prix modifié après l\'envoi', view: 'agent' },
      { key: 'vide', label: 'Catalogue vide', view: 'admin' },
      { key: 'beaucoup', label: '300 produits', view: 'admin' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      S = { products: k === 'vide' ? [] : k === 'beaucoup' ? B.many() : B.seed(), q: '', cat: '', state: '', shown: PAGE, vq: '', vcat: '', vshown: 20, pick: [], mq: '', loading: k === 'chargement', variant: [] };
      if (k === 'normal' || k === 'chargement' || k === 'beaucoup') seedChat(['p1', 'p9', 'p3']);
      if (k === 'epuise') seedChat(['p4']);
      if (k === 'prix') { seedChat(['p2']); product('p2').price = 39000; }
      if (k === 'vide') C.say({ from: 'citizen', text: 'Bonsoir, vous avez des montres pour homme ?' });
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    phoneHead: function () { return '<button type="button" class="icon-btn" data-act="ph-vitrine" aria-label="Vitrine" title="Vitrine">' + icon('store') + '</button>'; },
    quick: function () { return S.loading ? '' : '<button type="button" data-act="ph-vitrine">' + icon('store') + 'Voir la vitrine</button>'; },
    tools: function () { return [{ act: 'open-send', icon: 'box', label: 'Envoyer un produit', isNew: true }]; },
    side: function () {
      var sent = [];
      C.msgs.forEach(function (m) {
        if (m.card === 'product' && sent.indexOf(m.data.pid) === -1) sent.push(m.data.pid);
        if (m.card === 'products') m.data.items.forEach(function (it) { if (sent.indexOf(it.pid) === -1) sent.push(it.pid); });
      });
      return '<div><h3>Produits envoyés</h3>' + (sent.length ? '<div class="stack" style="gap:8px">' + sent.map(function (id) { var p = product(id); return p ? '<div class="row small"><span class="thumb" style="width:32px;height:32px">' + B.art(p.art) + '</span><span style="flex:1">' + esc(p.name) + '</span></div>' : ''; }).join('') + '</div>' : '<p class="small muted">Aucun pour l\'instant.</p>') + '</div>';
    },
    card: card,
    act: {
      'new-product': function () {
        S.draft = { id: null, name: '', price: '', cat: S.cat || B.categories[0], desc: '', variants: [], track: true, stock: 1, hidden: false, photos: 0, art: { shape: 'round', dial: '#F4F6FA', strap: '#9AA3B2', bg: '#E8EEF8' } };
        S.draftErr = null; C.drawer(editor);
      },
      'edit-product': function (el) {
        var p = product(el.dataset.id);
        S.draft = JSON.parse(JSON.stringify(p)); S.draft.track = true; S.draftErr = null;
        C.drawer(editor);
      },
      'photo-add': function () { if (S.draft.photos < 5) S.draft.photos++; C.render(); },
      'photo-del': function () { S.draft.photos--; C.render(); },
      'variant-add': function () { S.draft.variants.push({ label: '', options: [] }); C.render(); },
      'variant-del': function (el) { S.draft.variants.splice(+el.dataset.i, 1); C.render(); },
      track: function (el) { S.draft.track = el.dataset.v === '1'; C.render(); },
      'save-product': function () {
        var d = S.draft, err = {};
        if (!String(d.name).trim()) err.name = 'Donnez un nom au produit.';
        if (!(+d.price > 0)) err.price = 'Indiquez un prix en FCFA.';
        if (err.name || err.price) { S.draftErr = err; C.render(); return; }
        d.price = +d.price; d.stock = +d.stock || 0;
        d.variants = d.variants.filter(function (v) { return v.label && v.options.length; });
        if (!d.photos) d.photos = 1;
        if (d.id) {
          var i = S.products.indexOf(product(d.id));
          S.products[i] = d;
        } else {
          d.id = 'n' + C.uid();
          S.products.unshift(d);
        }
        C.drawerFn = null; C.render(); C.toast('Produit enregistré');
      },
      'delete-product': function () {
        C.modal(function () {
          return '<div class="modal__head"><h2>Supprimer ce produit ?</h2></div><div class="modal__body"><p>« ' + esc(S.draft.name) + ' » disparaît de la vitrine. Les cartes déjà envoyées indiqueront qu\'il n\'est plus proposé.</p><p class="small muted">Pour le retirer seulement un temps, masquez-le plutôt.</p></div>' +
            '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--danger-solid" data-act="confirm-delete">Supprimer</button></div>';
        });
      },
      'confirm-delete': function () {
        S.products = S.products.filter(function (p) { return p.id !== S.draft.id; });
        C.modalFn = null; C.drawerFn = null; C.render(); C.toast('Produit supprimé');
      },
      'toggle-hidden': function (el) {
        var p = product(el.dataset.id); p.hidden = !el.checked; C.render();
        C.toast(p.hidden ? 'Masqué dans la vitrine' : 'Visible dans la vitrine');
      },
      'admin-cat': function (el) { S.cat = el.dataset.cat; S.shown = PAGE; C.render(); },
      'admin-more': function () { S.shown += PAGE; C.render(); },
      'admin-clear': function () { S.q = ''; S.cat = ''; S.state = ''; C.render(); },

      'open-send': function () { S.pick = []; S.mq = ''; C.modal(sendModal); },
      pick: function (el) {
        var id = el.dataset.id, i = S.pick.indexOf(id);
        if (i !== -1) S.pick.splice(i, 1);
        else if (S.pick.length >= 4) { el.checked = false; C.toast('4 produits au maximum dans une sélection'); return; }
        else S.pick.push(id);
        C.render();
      },
      'send-products': function () {
        var items = S.pick.map(function (id) { return { pid: id, price: product(id).price }; });
        if (items.length === 1) C.say({ from: 'agent', card: 'product', data: items[0] });
        else C.say({ from: 'agent', card: 'products', data: { items: items } });
        C.modalFn = null; C.render();
      },

      'ph-vitrine': function () { S.vq = ''; S.vcat = ''; S.vshown = 20; C.layers = []; C.layer(vitrine, { full: true }); },
      'vitrine-cat': function (el) { S.vcat = el.dataset.cat; C.render(); },
      'ph-more': function () { S.vshown += 20; C.render(); },
      'ph-open': function (el) {
        var p = product(el.dataset.id);
        S.open = p.id; S.photo = 0;
        S.variant = p.variants.map(function (v) { return v.options[0]; });
        C.layer(detail);
      },
      'ph-photo': function () { var p = product(S.open); S.photo = (S.photo + 1) % p.photos; C.render(); },
      'ph-variant': function (el) { S.variant[+el.dataset.v] = el.dataset.o; C.render(); },
      'ph-order': function () {
        var p = product(S.open), v = S.variant.filter(Boolean).join(', ');
        C.say({ from: 'citizen', text: 'Je souhaite commander : ' + p.name + (v ? ' (' + v + ')' : '') + ' à ' + money(p.price) + '.' });
        C.closeLayers();
        C.toast('Demande envoyée à la boutique', 'phone');
      },
      'ph-ask': function () {
        var p = product(S.open);
        C.closeLayers();
        var input = C.$('#ph-text'); input.value = 'Question sur « ' + p.name + ' » : '; input.focus();
      }
    },
    input: {
      'admin-q': function (el) { S.q = el.value; S.shown = PAGE; C.$('[data-part=list]').innerHTML = list(); },
      'modal-q': function (el) {
        S.mq = el.value;
        var tmp = document.createElement('div'); tmp.innerHTML = sendModal();
        C.$('[data-part=picks]').innerHTML = tmp.querySelector('[data-part=picks]').innerHTML;
      },
      'vitrine-q': function (el) {
        S.vq = el.value;
        var tmp = document.createElement('div'); tmp.innerHTML = vitrine();
        C.$('[data-part=vgrid]').innerHTML = tmp.querySelector('[data-part=vgrid]').innerHTML;
      },
      draft: function (el) { S.draft[el.dataset.k] = el.value; },
      variant: function (el) {
        var v = S.draft.variants[+el.dataset.i];
        if (el.dataset.k === 'label') v.label = el.value;
        else v.options = el.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      }
    },
    change: {
      'admin-state': function (el) { S.state = el.value; S.shown = PAGE; C.render(); },
      draft: function (el) {
        var k = el.dataset.k;
        if (k === 'hidden') S.draft.hidden = el.checked;
        else if (k === 'avail') S.draft.stock = el.value === '1' ? Math.max(1, S.draft.stock) : 0;
        else S.draft[k] = el.value;
      }
    }
  });
})();
