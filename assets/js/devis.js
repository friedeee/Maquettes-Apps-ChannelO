/* ==========================================================
   App 6 — Devis et facture (dépend de Paiement)
   Réglage : identité sur les documents, numérotation, mentions, TVA, liste des documents.
   Dossier : composer un devis (catalogue ou texte libre), transformer en facture, suivre payé / non payé.
   Téléphone : carte devis (Accepter, Refuser, Poser une question), PDF, facture avec « Payer ».
   ========================================================== */
'use strict';

(function () {
  var esc = C.esc, money = C.money, icon = C.icon;
  var S = {};
  var ENTITY = { name: 'Garage Bon Moteur', initials: 'GB', sub: 'Garage · Cotonou · répond dans la journée' };
  var SERVICES = [
    { name: 'Diagnostic électronique', price: 10000 },
    { name: 'Vidange et filtre à huile', price: 25000 },
    { name: 'Plaquettes de frein avant', price: 32000 },
    { name: 'Main-d\'œuvre (à l\'heure)', price: 7500 },
    { name: 'Pneu 195/65 R15', price: 38000 }
  ];
  var QST = { sent: ['En attente', 'warn'], accepted: ['Accepté', 'ok'], refused: ['Refusé', 'bad'], expired: ['Expiré', 'bad'], replaced: ['Remplacé', ''] };
  var IST = { unpaid: ['Non payée', 'warn'], partial: ['Acompte payé', 'info'], paid: ['Payée', 'ok'] };
  var OPS = { mtn: 'MTN MoMo', moov: 'Moov Money' };

  function pad(n) { return ('000' + n).slice(-4); }
  function quote(id) { return S.quotes.filter(function (q) { return q.id === id; })[0]; }
  function invoice(id) { return S.invoices.filter(function (i) { return i.id === id; })[0]; }
  function sum(lines) { return lines.reduce(function (t, l) { return t + l.qty * l.price; }, 0); }
  function totals(doc) {
    var ht = sum(doc.lines), off = Math.round(ht * (doc.discount || 0) / 100), base = ht - off;
    var vat = S.id.vatOn ? Math.round(base * S.id.vatRate / 100) : 0;
    return { ht: ht, off: off, base: base, vat: vat, ttc: base + vat };
  }
  function quoteBadge(q) { return '<span class="badge badge--' + QST[q.status][1] + '">' + QST[q.status][0] + '</span>'; }
  function invBadge(i) { return '<span class="badge badge--' + IST[i.status][1] + '">' + IST[i.status][0] + '</span>'; }
  function left(i) { return i.total - i.paid; }
  function close() { return '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button>'; }
  function idOk() { return S.id.company.trim() && /^\d{13}$/.test(S.id.ifu.replace(/\s/g, '')); }
  function validText(q) { return q.status === 'expired' ? 'Expiré le ' + q.until : 'Valable jusqu\'au ' + q.until; }

  /* ---------- Le document (même rendu partout) ---------- */
  function docHtml(kind, doc) {
    var t = totals(doc), id = S.id;
    var meta = kind === 'quote'
      ? '<strong>Devis ' + doc.no + (doc.version > 1 ? ' · version ' + doc.version : '') + '</strong><br>' + esc(validText(doc))
      : '<strong>Facture ' + doc.no + '</strong><br>Devis ' + doc.quoteNo;
    return '<article class="doc"><header class="doc__head"><div class="row"><span class="avatar avatar--brand">' + esc(ENTITY.initials) + '</span><div><strong>' + esc(id.company || 'Raison sociale') + '</strong><br><span>IFU ' + esc(id.ifu || '—') + '</span><br><span>' + esc(id.address) + '</span></div></div><div class="doc__meta">' + meta + '<br>Émis le ' + doc.date + '</div></header>' +
      '<p class="doc__to">Pour : <strong>' + esc(C.app.citizen.name) + '</strong> · ' + C.app.citizen.phone + '</p>' +
      '<table class="doc__table"><thead><tr><th>Désignation</th><th class="num">Qté</th><th class="num">Prix</th><th class="num">Total</th></tr></thead><tbody>' +
      doc.lines.map(function (l) { return '<tr><td>' + esc(l.name) + '</td><td class="num">' + l.qty + '</td><td class="num">' + money(l.price) + '</td><td class="num">' + money(l.qty * l.price) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="lines doc__sum">' + (t.off ? '<div><span>Sous-total</span><span class="tnum">' + money(t.ht) + '</span></div><div><span>Remise ' + doc.discount + ' %</span><span class="tnum">− ' + money(t.off) + '</span></div>' : '') +
      (id.vatOn ? '<div><span>Total hors taxes</span><span class="tnum">' + money(t.base) + '</span></div><div><span>TVA ' + id.vatRate + ' %</span><span class="tnum">' + money(t.vat) + '</span></div>' : '') +
      '<div class="total"><span>' + (id.vatOn ? 'Total TTC' : 'Total') + '</span><span class="tnum">' + money(t.ttc) + '</span></div>' +
      (kind === 'invoice' && doc.paid ? '<div><span>Déjà payé</span><span class="tnum">' + money(doc.paid) + '</span></div><div class="total"><span>Reste à payer</span><span class="tnum">' + money(left(doc)) + '</span></div>' : '') + '</div>' +
      '<footer class="doc__foot">' + esc(id.notes) + (id.vatOn ? '' : ' TVA non applicable.') + '</footer></article>';
  }
  function docLayer(kind, doc) {
    return function () {
      return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('back') + '</button><h2>' + (kind === 'quote' ? 'Devis ' : 'Facture ') + doc.no + '</h2><button type="button" class="icon-btn" data-act="ph-download" aria-label="Enregistrer le PDF">' + icon('down') + '</button></div><div class="ph-sheet__body">' + docHtml(kind, doc) + '</div>';
    };
  }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var head = '<header class="page-head"><div><h1>Devis et factures</h1><p>' + (S.loading ? 'Chargement…' : S.quotes.length + ' devis · ' + S.invoices.length + ' facture' + (S.invoices.length > 1 ? 's' : '')) + '</p></div></header>' +
      '<div class="subtabs" role="tablist">' + [['docs', 'Documents'], ['identity', 'Identité et mentions']].map(function (t) {
        return '<button type="button" role="tab" data-act="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    if (S.loading) return head + C.skelRows(5);
    return head + (S.tab === 'docs' ? docsView() : identityView());
  }
  function docsView() {
    var rows = S.quotes.map(function (q) { return { kind: 'quote', doc: q, no: q.no + (q.version > 1 ? ' v' + q.version : ''), type: 'Devis', ttc: totals(q).ttc, st: quoteBadge(q), date: q.date }; })
      .concat(S.invoices.map(function (i) { return { kind: 'invoice', doc: i, no: i.no, type: 'Facture', ttc: i.total, st: invBadge(i), date: i.date }; }));
    var banner = idOk() ? '' : '<div class="alert alert--warn" style="margin-bottom:14px">' + icon('alert') + '<span>Complétez la raison sociale et l\'IFU : vos agents ne peuvent pas envoyer de devis avant cela.</span></div>';
    if (!rows.length) return banner + '<div class="card"><div class="empty"><span class="empty__icon">' + icon('receipt') + '</span><strong>Aucun document</strong><p>Les devis et factures envoyés par vos agents apparaîtront ici.</p></div></div>';
    return banner + '<div class="table-wrap"><table class="table"><thead><tr><th>Numéro</th><th>Type</th><th>Client</th><th>Date</th><th class="num">Montant</th><th>État</th><th></th></tr></thead><tbody>' + rows.map(function (r) {
      return '<tr><td class="tnum"><strong>' + r.no + '</strong></td><td>' + r.type + '</td><td>' + esc(r.doc.client || C.app.citizen.name) + '</td><td class="muted">' + r.date + '</td><td class="num">' + money(r.ttc) + '</td><td>' + r.st + '</td><td class="num"><button type="button" class="btn btn--sm" data-act="view-doc" data-k="' + r.kind + '" data-id="' + r.doc.id + '">' + icon('eye') + 'Voir</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function identityView() {
    var id = S.id, ifuErr = id.ifu && !/^\d{13}$/.test(id.ifu.replace(/\s/g, ''));
    var sample = { no: id.quotePrefix + pad(id.quoteNext), version: 1, date: '5 nov. 2026', until: '19 nov. 2026', status: 'sent', discount: 0, lines: [{ name: 'Vidange et filtre à huile', qty: 1, price: 25000 }, { name: 'Main-d\'œuvre (à l\'heure)', qty: 2, price: 7500 }] };
    return '<div class="grid-2" style="align-items:start"><div class="stack">' +
      '<section class="card"><div class="card__head"><h2>Identité sur les documents</h2></div><div class="stack">' +
        '<div class="row"><span class="avatar avatar--brand" style="width:48px;height:48px">' + esc(ENTITY.initials) + '</span><button type="button" class="btn btn--sm" data-act="desk-noop">' + icon('photo') + 'Changer le logo</button></div>' +
        '<label class="field">Raison sociale<input class="input" value="' + esc(id.company) + '" data-on-input="id" data-k="company"></label>' +
        '<label class="field">IFU<input class="input tnum ' + (ifuErr ? 'input--error' : '') + '" value="' + esc(id.ifu) + '" data-on-change="id-ifu" inputmode="numeric" placeholder="13 chiffres">' + (ifuErr ? '<span class="small" style="color:var(--bad)">L\'IFU compte 13 chiffres.</span>' : '') + '</label>' +
        '<label class="field">Adresse<input class="input" value="' + esc(id.address) + '" data-on-input="id" data-k="address"></label>' +
      '</div></section>' +
      '<section class="card"><div class="card__head"><h2>Numérotation</h2></div><div class="grid-2">' +
        '<label class="field">Devis<input class="input tnum" value="' + esc(id.quotePrefix) + '" data-on-input="id" data-k="quotePrefix"><span class="field__hint">Prochain : ' + esc(id.quotePrefix) + pad(id.quoteNext) + '</span></label>' +
        '<label class="field">Factures<input class="input tnum" value="' + esc(id.invPrefix) + '" data-on-input="id" data-k="invPrefix"><span class="field__hint">Prochaine : ' + esc(id.invPrefix) + pad(id.invNext) + '</span></label></div></section>' +
      '<section class="card"><div class="card__head"><h2>TVA</h2><input type="checkbox" class="switch" data-act="vat-on"' + (id.vatOn ? ' checked' : '') + ' aria-label="Appliquer la TVA"></div>' +
        (id.vatOn ? '<label class="field">Taux<span class="input-group"><input class="input tnum" inputmode="numeric" value="' + id.vatRate + '" data-on-change="vat-rate"><span>%</span></span></label>' : '<p class="small muted">Vos documents portent la mention « TVA non applicable ».</p>') + '</section>' +
      '<section class="card"><div class="card__head"><h2>Mentions de bas de page</h2></div><textarea class="textarea" aria-label="Mentions" data-on-change="notes">' + esc(id.notes) + '</textarea></section>' +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn btn--primary" data-act="save-id">' + icon('check') + 'Enregistrer</button></div></div>' +
      '<div><p class="small muted" style="margin-bottom:8px">' + icon('eye') + ' Aperçu</p>' + docHtml('quote', sample) + '</div></div>';
  }

  /* ---------- Dossier : composer un devis ---------- */
  function composeModal() {
    var f = S.form;
    return '<div class="modal__head"><h2>' + (f.replaces ? 'Nouvelle version du devis ' + quote(f.replaces).no : 'Composer un devis') + '</h2>' + close() + '</div><div class="modal__body">' +
      '<div class="quote-lines">' + (f.lines.length ? '<div class="quote-line quote-line--head"><span>Désignation</span><span>Qté</span><span>Prix (FCFA)</span><span class="num">Total</span><span></span></div>' : '') +
      f.lines.map(function (l, i) {
        return '<div class="quote-line"><input class="input" aria-label="Désignation" value="' + esc(l.name) + '" data-on-input="line" data-i="' + i + '" data-k="name"><input class="input tnum" aria-label="Quantité" inputmode="numeric" value="' + l.qty + '" data-on-input="line" data-i="' + i + '" data-k="qty"><input class="input tnum" aria-label="Prix" inputmode="numeric" value="' + l.price + '" data-on-input="line" data-i="' + i + '" data-k="price"><strong class="num tnum" data-line-total="' + i + '">' + money(l.qty * l.price) + '</strong><button type="button" class="icon-btn" data-act="del-line" data-i="' + i + '" aria-label="Retirer la ligne">' + icon('x') + '</button></div>';
      }).join('') + '</div>' +
      '<div class="row row--wrap"><select class="select" style="flex:1;min-width:200px" aria-label="Ajouter depuis le catalogue" data-on-change="add-service"><option value="">Ajouter depuis le catalogue…</option>' + SERVICES.map(function (s, i) { return '<option value="' + i + '">' + esc(s.name) + ' · ' + money(s.price) + '</option>'; }).join('') + '</select><button type="button" class="btn" data-act="add-free">' + icon('plus') + 'Ligne en texte libre</button></div>' +
      '<div class="grid-2"><label class="field">Remise<span class="input-group"><input class="input tnum" inputmode="numeric" value="' + esc(f.discount) + '" data-on-input="form-discount"><span>%</span></span></label>' +
      '<label class="field">Validité<select class="select" data-on-change="form-valid">' + [[7, '7 jours'], [14, '14 jours'], [30, '30 jours']].map(function (o) { return '<option value="' + o[0] + '"' + (+f.valid === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></label></div>' +
      (f.err ? '<div class="alert alert--bad">' + icon('alert') + f.err + '</div>' : '') + '</div>' +
      '<div class="modal__foot"><strong class="tnum" style="margin-right:auto;align-self:center" id="form-total">Total : ' + money(totals(f).ttc) + '</strong><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="send-quote">' + icon('send') + 'Envoyer au client</button></div>';
  }
  function paintTotals() {
    S.form.lines.forEach(function (l, i) { var el = C.$('[data-line-total="' + i + '"]'); if (el) el.textContent = money(l.qty * l.price); });
    var t = C.$('#form-total'); if (t) t.textContent = 'Total : ' + money(totals(S.form).ttc);
  }
  function askPayModal() {
    var i = invoice(S.askId), f = S.ask;
    return '<div class="modal__head"><h2>Demander un paiement</h2>' + close() + '</div><div class="modal__body"><p class="small muted">Facture ' + i.no + ' · reste à payer ' + money(left(i)) + '</p>' +
      '<label class="pick ' + (f.kind === 'all' ? 'is-on' : '') + '"><input type="radio" name="ask" data-act="ask-kind" data-k="all"' + (f.kind === 'all' ? ' checked' : '') + '><span class="pick__main"><strong>Tout le reste</strong></span><strong class="tnum">' + money(left(i)) + '</strong></label>' +
      '<label class="pick ' + (f.kind === 'part' ? 'is-on' : '') + '"><input type="radio" name="ask" data-act="ask-kind" data-k="part"' + (f.kind === 'part' ? ' checked' : '') + '><span class="pick__main"><strong>Un acompte</strong><span>Le client paie une partie maintenant</span></span></label>' +
      (f.kind === 'part' ? '<label class="field">Montant de l\'acompte<span class="input-group"><input class="input tnum ' + (f.err ? 'input--error' : '') + '" inputmode="numeric" value="' + esc(f.amount) + '" data-on-input="ask-amount"><span>FCFA</span></span>' + (f.err ? '<span class="small" style="color:var(--bad)">' + f.err + '</span>' : '') + '</label>' : '') + '</div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="send-ask">' + icon('send') + 'Envoyer la demande</button></div>';
  }

  /* ---------- Cartes ---------- */
  function card(m, side) {
    if (m.card === 'quote') return side === 'desk' ? deskQuote(quote(m.data.id)) : phoneQuote(quote(m.data.id));
    if (m.card === 'invoice') return side === 'desk' ? deskInvoice(invoice(m.data.id)) : phoneInvoice(invoice(m.data.id));
    return '';
  }
  function miniLines(doc) {
    return '<div class="lines">' + doc.lines.map(function (l) { return '<div><span>' + l.qty + ' × ' + esc(l.name) + '</span><span class="tnum">' + money(l.qty * l.price) + '</span></div>'; }).join('') +
      (doc.discount ? '<div class="muted"><span>Remise ' + doc.discount + ' %</span><span class="tnum">− ' + money(totals(doc).off) + '</span></div>' : '') +
      '<div class="total"><span>Total</span><span class="tnum">' + money(totals(doc).ttc) + '</span></div></div>';
  }
  function deskQuote(q) {
    var foot = '<button type="button" class="btn btn--sm" data-act="view-doc" data-k="quote" data-id="' + q.id + '">' + icon('eye') + 'Voir le PDF</button>';
    if (q.status === 'accepted' && !q.invoiced) foot = '<button type="button" class="btn btn--primary btn--sm" data-act="to-invoice" data-id="' + q.id + '">' + icon('receipt') + 'Transformer en facture</button>' + foot;
    if (q.status === 'sent') foot += '<button type="button" class="btn btn--sm" data-act="new-version" data-id="' + q.id + '">' + icon('edit') + 'Modifier</button>';
    if (q.status === 'refused') foot += '<button type="button" class="btn btn--sm" data-act="new-version" data-id="' + q.id + '">' + icon('edit') + 'Proposer une nouvelle version</button>';
    if (q.status === 'expired') foot = '<button type="button" class="btn btn--primary btn--sm" data-act="new-version" data-id="' + q.id + '">' + icon('refresh') + 'Renvoyer avec une nouvelle date</button>' + foot;
    return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('receipt') + 'Devis ' + q.no + (q.version > 1 ? ' · v' + q.version : '') + '</span>' + quoteBadge(q) + '</div><div class="dcard__body">' + miniLines(q) +
      '<span class="small muted">' + esc(q.status === 'replaced' ? 'Remplacé par une nouvelle version' : validText(q)) + '</span>' +
      (q.refuseWhy ? '<div class="alert alert--bad small">' + icon('x') + 'Refusé par le client</div>' : '') + '</div>' + (q.status === 'replaced' ? '' : '<div class="dcard__foot">' + foot + '</div>') + '</div>';
  }
  function phoneQuote(q) {
    var foot = '';
    if (q.status === 'sent') foot = '<div class="pcard__foot" style="flex-wrap:wrap"><button type="button" class="btn" data-act="ph-refuse" data-id="' + q.id + '">Refuser</button><button type="button" class="btn btn--primary" data-act="ph-accept" data-id="' + q.id + '">' + icon('check') + 'Accepter</button><button type="button" class="btn btn--ghost" style="flex-basis:100%" data-act="ph-question" data-id="' + q.id + '">Poser une question</button></div>';
    else if (q.status === 'expired') foot = '<div class="pcard__foot"><button type="button" class="btn" data-act="ph-renew" data-id="' + q.id + '"' + (q.asked ? ' disabled' : '') + '>' + (q.asked ? 'Demande envoyée' : 'Demander un nouveau devis') + '</button></div>';
    return '<div class="pcard" style="width:280px"><div class="pcard__title">' + icon('receipt') + 'Devis ' + q.no + (q.version > 1 ? ' · v' + q.version : '') + '<span style="margin-left:auto">' + quoteBadge(q) + '</span></div>' +
      (q.version > 1 && q.status === 'sent' ? '<div class="pcard__note">Ce devis remplace la version précédente.</div>' : '') +
      (q.status === 'replaced' ? '<div class="pcard__note">Cette version n\'est plus valable. Voyez la nouvelle plus bas.</div>' : '') +
      '<div class="pcard__list">' + miniLines(q) + '<span class="small muted">' + esc(q.status === 'replaced' ? '' : validText(q)) + '</span><button type="button" class="btn btn--sm" data-act="ph-pdf" data-k="quote" data-id="' + q.id + '">' + icon('eye') + 'Voir le PDF</button></div>' + foot + '</div>';
  }
  function progress(i) {
    return '<div class="paybar" role="img" aria-label="' + money(i.paid) + ' payés sur ' + money(i.total) + '"><span style="width:' + Math.round(i.paid * 100 / i.total) + '%"></span></div><div class="row row--between small"><span>Payé : <strong class="tnum">' + money(i.paid) + '</strong></span><span>Reste : <strong class="tnum">' + money(left(i)) + '</strong></span></div>';
  }
  function deskInvoice(i) {
    var foot = '<button type="button" class="btn btn--sm" data-act="view-doc" data-k="invoice" data-id="' + i.id + '">' + icon('eye') + 'Voir le PDF</button>';
    if (i.status !== 'paid') foot = '<button type="button" class="btn btn--primary btn--sm" data-act="open-ask" data-id="' + i.id + '">' + icon('wallet') + 'Demander un paiement</button>' + foot;
    return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('receipt') + 'Facture ' + i.no + '</span>' + invBadge(i) + '</div><div class="dcard__body">' + miniLines(i) + (i.paid ? progress(i) : '') +
      (i.ask ? '<span class="small muted">Demande envoyée : ' + money(i.ask) + '</span>' : '') + '</div><div class="dcard__foot">' + foot + '</div></div>';
  }
  function phoneInvoice(i) {
    var due = i.ask || left(i);
    return '<div class="pcard" style="width:280px"><div class="pcard__title">' + icon('receipt') + 'Facture ' + i.no + '<span style="margin-left:auto">' + invBadge(i) + '</span></div><div class="pcard__list">' + miniLines(i) + (i.paid ? progress(i) : '') +
      '<button type="button" class="btn btn--sm" data-act="ph-pdf" data-k="invoice" data-id="' + i.id + '">' + icon('eye') + 'Voir le PDF</button></div>' +
      (i.status !== 'paid' ? '<div class="pcard__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-pay" data-id="' + i.id + '">Payer ' + money(due) + '</button></div>' : '') + '</div>';
  }

  /* ---------- Téléphone : payer (parcours de l'app Paiement) ---------- */
  function paySheet() {
    var i = invoice(S.payId), f = S.pay, due = i.ask || left(i);
    if (f.stage === 'wait') return '<div class="ph-sheet__body"><div class="wait"><span class="wait__ring">' + icon('phone') + '</span><h3>Validez sur votre téléphone</h3><p class="muted">' + OPS[f.op] + ' va vous demander votre code secret pour payer <strong>' + money(due) + '</strong>.</p></div></div>';
    return '<div class="ph-sheet__head"><h2>Payer ' + money(due) + '</h2><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('x') + '</button></div><div class="ph-sheet__body"><span class="muted small">Facture ' + i.no + ' · ' + esc(ENTITY.name) + '</span>' +
      Object.keys(OPS).map(function (k) { return '<button type="button" class="ph-option ' + (f.op === k ? 'is-on' : '') + '" data-act="ph-op" data-op="' + k + '">' + icon('wallet') + '<span><strong>' + OPS[k] + '</strong></span>' + (f.op === k ? '<span class="ph-option__end" style="color:var(--brand)">' + icon('check') + '</span>' : '') + '</button>'; }).join('') +
      '<label class="field">Numéro ' + OPS[f.op] + '<input class="input tnum" inputmode="tel" value="' + C.app.citizen.phone + '"></label></div><div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="ph-pay-go">Payer ' + money(due) + '</button></div>';
  }
  function refuseSheet() {
    return '<div class="ph-sheet__head"><h2>Refuser ce devis ?</h2><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('x') + '</button></div><div class="ph-sheet__body"><p class="muted">Le garage sera prévenu. Vous pouvez aussi poser une question avant de décider.</p></div><div class="ph-sheet__foot"><button type="button" class="btn btn--danger-solid ph-btn" data-act="ph-refuse-ok">Refuser le devis</button><button type="button" class="btn ph-btn" data-act="close-layer">Revenir</button></div>';
  }

  /* ---------- Création des documents ---------- */
  function newQuote(lines, discount, valid, version) {
    var until = new Date(2026, 10, 5 + (+valid || 14));
    var no = version > 1 ? null : S.id.quotePrefix + pad(S.id.quoteNext++);
    var q = { id: 'q' + C.uid(), no: no, version: version || 1, lines: lines, discount: +discount || 0, date: '5 nov. 2026', until: until.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }), status: 'sent' };
    S.quotes.unshift(q);
    return q;
  }
  function makeInvoice(q) {
    var i = { id: 'i' + C.uid(), no: S.id.invPrefix + pad(S.id.invNext++), quoteNo: q.no, lines: q.lines, discount: q.discount, total: totals(q).ttc, paid: 0, status: 'unpaid', date: '5 nov. 2026' };
    S.invoices.unshift(i); q.invoiced = true;
    return i;
  }
  var L1 = function () { return [{ name: 'Diagnostic électronique', qty: 1, price: 10000 }, { name: 'Plaquettes de frein avant', qty: 1, price: 32000 }, { name: 'Main-d\'œuvre (à l\'heure)', qty: 2, price: 7500 }]; };

  C.define({
    id: 'devis', title: 'Devis et facture', icon: 'receipt', priority: 2,
    entity: ENTITY,
    queue: [{ n: 'Serge A.', p: 'Le devis pour les pneus ?', t: '08:40' }, { n: 'Prisca G.', p: 'Merci pour la facture', t: 'Hier' }],
    cases: [
      { key: 'normal', label: 'Parcours normal (devis reçu)' },
      { key: 'compose', label: 'Composer un devis' },
      { key: 'expire', label: 'Devis expiré' },
      { key: 'version', label: 'Devis modifié après envoi (nouvelle version)' },
      { key: 'accepte', label: 'Devis accepté, à facturer' },
      { key: 'acompte', label: 'Acompte partiel' },
      { key: 'vide', label: 'Aucun document, identité à compléter' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      var vide = k === 'vide';
      S = {
        tab: vide ? 'identity' : 'docs', loading: k === 'chargement', quotes: [], invoices: [],
        id: { company: vide ? '' : 'Garage Bon Moteur SARL', ifu: vide ? '' : '3202600000000', address: 'Cotonou, quartier Zogbo', quotePrefix: 'DEV-2026-', quoteNext: 42, invPrefix: 'FAC-2026-', invNext: 18, vatOn: false, vatRate: 18, notes: 'Pièces garanties 6 mois. Paiement par MTN MoMo ou Moov Money.' }
      };
      C.say({ from: 'citizen', text: 'Bonjour, mes freins grincent. Combien pour les réparer ?' });
      if (k === 'compose' || vide) { C.say({ from: 'agent', text: 'Bonjour, je vous prépare un devis.' }); return; }
      C.say({ from: 'agent', text: 'Bonjour, voici notre devis pour la réparation.' });
      var q = newQuote(L1(), 0, 14);
      if (k === 'expire') { q.status = 'expired'; q.until = '3 nov. 2026'; q.date = '20 oct. 2026'; }
      C.say({ from: 'agent', card: 'quote', data: { id: q.id } });
      if (k === 'version') {
        C.say({ from: 'citizen', text: 'Vous pouvez enlever le diagnostic ? Il a déjà été fait.' });
        q.status = 'replaced';
        var v2 = newQuote(L1().slice(1), 0, 14, 2); v2.no = q.no;
        C.say({ from: 'agent', card: 'quote', data: { id: v2.id } });
      }
      if (k === 'accepte' || k === 'acompte') {
        q.status = 'accepted';
        C.say({ from: 'system', text: 'Devis ' + q.no + ' accepté' });
      }
      if (k === 'acompte') {
        var i = makeInvoice(q);
        i.paid = 20000; i.status = 'partial';
        C.say({ from: 'agent', card: 'invoice', data: { id: i.id } });
        C.say({ from: 'system', text: 'Acompte de ' + money(20000) + ' reçu' });
      }
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    tools: function () { return [{ act: 'open-compose', icon: 'receipt', label: 'Composer un devis', isNew: true }]; },
    side: function () {
      return '<div><h3>Devis et factures</h3>' + (S.quotes.length || S.invoices.length ? '<div class="stack" style="gap:8px">' +
        S.invoices.map(function (i) { return '<div class="row row--between small"><span><strong class="tnum">' + i.no + '</strong><br><span class="muted tnum">' + money(i.total) + '</span></span>' + invBadge(i) + '</div>'; }).join('') +
        S.quotes.map(function (q) { return '<div class="row row--between small"><span><strong class="tnum">' + q.no + (q.version > 1 ? ' v' + q.version : '') + '</strong><br><span class="muted tnum">' + money(totals(q).ttc) + '</span></span>' + quoteBadge(q) + '</div>'; }).join('') + '</div>' : '<p class="small muted">Aucun document.</p>') + '</div>';
    },
    card: card,
    act: {
      tab: function (el) { S.tab = el.dataset.tab; C.render(); },
      'vat-on': function (el) { S.id.vatOn = el.checked; C.render(); },
      'save-id': function () {
        if (!idOk()) { C.toast('Complétez la raison sociale et un IFU de 13 chiffres'); return; }
        C.toast('Réglages enregistrés');
      },
      'view-doc': function (el) {
        var kind = el.dataset.k, doc = kind === 'quote' ? quote(el.dataset.id) : invoice(el.dataset.id);
        C.modalLarge = true;
        C.modal(function () { return '<div class="modal__head"><h2>' + (kind === 'quote' ? 'Devis ' : 'Facture ') + doc.no + '</h2>' + close() + '</div><div class="modal__body">' + docHtml(kind, doc) + '</div>'; });
      },

      'open-compose': function () {
        if (!idOk()) { C.toast('Un administrateur doit d\'abord compléter la raison sociale et l\'IFU'); return; }
        S.form = { lines: [], discount: '', valid: 14 }; C.modalLarge = true; C.modal(composeModal);
      },
      'new-version': function (el) {
        var q = quote(el.dataset.id);
        S.form = { replaces: q.id, lines: q.lines.map(function (l) { return Object.assign({}, l); }), discount: q.discount || '', valid: 14 };
        C.modalLarge = true; C.modal(composeModal);
      },
      'add-free': function () { S.form.lines.push({ name: '', qty: 1, price: 0 }); S.form.err = null; C.render(); },
      'del-line': function (el) { S.form.lines.splice(+el.dataset.i, 1); C.render(); },
      'send-quote': function () {
        var f = S.form, lines = f.lines.filter(function (l) { return l.name.trim(); });
        if (!lines.length || !sum(lines)) { f.err = 'Ajoutez au moins une ligne avec un prix.'; C.render(); return; }
        var q;
        if (f.replaces) {
          var old = quote(f.replaces);
          old.status = 'replaced';
          q = newQuote(lines, f.discount, f.valid, old.version + 1); q.no = old.no;
        } else q = newQuote(lines, f.discount, f.valid);
        C.modalFn = null;
        C.say({ from: 'agent', card: 'quote', data: { id: q.id } });
        C.render();
      },
      'to-invoice': function (el) {
        var i = makeInvoice(quote(el.dataset.id));
        C.say({ from: 'agent', card: 'invoice', data: { id: i.id } });
        C.render();
      },
      'open-ask': function (el) { S.askId = el.dataset.id; S.ask = { kind: 'all', amount: '' }; C.modalLarge = false; C.modal(askPayModal); },
      'ask-kind': function (el) { S.ask.kind = el.dataset.k; C.render(); },
      'send-ask': function () {
        var i = invoice(S.askId), f = S.ask;
        if (f.kind === 'part') {
          var n = +String(f.amount).replace(/\D/g, '');
          if (!(n >= 100) || n >= left(i)) { f.err = 'Entre 100 FCFA et le reste à payer.'; C.render(); return; }
          i.ask = n;
        } else i.ask = 0;
        C.modalFn = null; C.render(); C.toast('Demande envoyée au client');
      },

      'ph-pdf': function (el) { var k = el.dataset.k; C.layer(docLayer(k, k === 'quote' ? quote(el.dataset.id) : invoice(el.dataset.id)), { full: true }); },
      'ph-download': function () { C.toast('PDF enregistré sur le téléphone', 'phone'); },
      'ph-accept': function (el) { var q = quote(el.dataset.id); q.status = 'accepted'; C.say({ from: 'system', text: 'Devis ' + q.no + ' accepté' }); C.render(); },
      'ph-refuse': function (el) { S.target = el.dataset.id; C.layer(refuseSheet); },
      'ph-refuse-ok': function () { var q = quote(S.target); q.status = 'refused'; q.refuseWhy = true; C.layers = []; C.say({ from: 'system', text: 'Devis ' + q.no + ' refusé' }); C.render(); },
      'ph-question': function (el) { var input = C.$('#ph-text'); input.value = 'Question sur le devis ' + quote(el.dataset.id).no + ' : '; input.focus(); },
      'ph-renew': function (el) { var q = quote(el.dataset.id); q.asked = true; C.say({ from: 'citizen', text: 'Mon devis ' + q.no + ' a expiré, pouvez-vous m\'en refaire un ?' }); C.render(); },
      'ph-pay': function (el) { S.payId = el.dataset.id; S.pay = { op: 'mtn', stage: 'form' }; C.layer(paySheet); },
      'ph-op': function (el) { S.pay.op = el.dataset.op; C.render(); },
      'ph-pay-go': function () {
        S.pay.stage = 'wait'; C.render();
        C.later(1600, function () {
          var i = invoice(S.payId), due = i.ask || left(i);
          i.paid += due; i.ask = 0; i.status = left(i) ? 'partial' : 'paid';
          C.layers = [];
          C.say({ from: 'system', text: (left(i) ? 'Acompte de ' : 'Paiement de ') + money(due) + ' reçu · facture ' + i.no });
        });
      }
    },
    input: {
      id: function (el) { S.id[el.dataset.k] = el.value; },
      line: function (el) {
        var l = S.form.lines[+el.dataset.i], k = el.dataset.k;
        l[k] = k === 'name' ? el.value : +el.value.replace(/\D/g, '') || 0;
        paintTotals();
      },
      'form-discount': function (el) { S.form.discount = Math.min(100, +el.value.replace(/\D/g, '') || 0); paintTotals(); },
      'ask-amount': function (el) { S.ask.amount = el.value; }
    },
    change: {
      'id-ifu': function (el) { S.id.ifu = el.value; C.render(); },
      'vat-rate': function (el) { S.id.vatRate = +el.value.replace(/\D/g, '') || 0; C.render(); },
      notes: function (el) { S.id.notes = el.value; C.render(); },
      'add-service': function (el) {
        if (el.value === '') return;
        var s = SERVICES[+el.value];
        S.form.lines.push({ name: s.name, qty: 1, price: s.price }); S.form.err = null;
        C.render();
      },
      'form-valid': function (el) { S.form.valid = +el.value; }
    }
  });
})();
