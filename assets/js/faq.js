/* ==========================================================
   App 7 — Réponses rapides et FAQ automatique
   Réglage : bibliothèque de réponses rapides, FAQ (question, réponse, mots-clés), réponse automatique.
   Dossier : « / » dans la réponse pour insérer une réponse rapide ; repère quand la FAQ a déjà répondu.
   Téléphone : boutons de questions fréquentes, réponse automatique marquée, « Ma question n'est pas résolue ».
   ========================================================== */
'use strict';

(function () {
  var esc = C.esc, icon = C.icon;
  var S = {};
  var ENTITY = { name: 'Service Eau Claire', initials: 'EC', sub: 'Distribution d\'eau · Cotonou' };
  var slash = { open: false, list: [], at: 0 };

  function faq(id) { return S.faqs.filter(function (f) { return f.id === id; })[0]; }
  function norm(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function close(act) { return '<button type="button" class="icon-btn" data-act="' + (act || 'close-modal') + '" aria-label="Fermer">' + icon('x') + '</button>'; }

  /* La question du citoyen contient-elle un mot-clé ? */
  function match(text) {
    var t = norm(text);
    return S.faqs.filter(function (f) { return f.keywords.some(function (k) { return t.indexOf(norm(k)) !== -1; }); })[0];
  }
  function answer(text) {
    if (C.msgs.some(function (m) { return m.from === 'agent'; })) return;   // un agent a pris la main
    var f = S.auto && !S.handed ? match(text) : null;
    if (f) {
      f.hits++;
      C.say({ from: 'auto', card: 'faq', data: { fid: f.id, q: text } });
      return;
    }
    if (S.handed) return;
    S.handed = true;
    C.say({ from: 'system', text: 'Votre message est transmis. Un agent de ' + esc(ENTITY.name) + ' va vous répondre.', only: 'phone' });
    C.say({ from: 'system', text: S.auto ? 'Aucune réponse trouvée dans la FAQ : à vous de répondre' : 'Réponse automatique désactivée : à vous de répondre', only: 'desk' });
    S.unknown = S.auto ? text : null;
  }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var flagged = S.faqs.reduce(function (n, f) { return n + f.flags.length; }, 0);
    var head = '<header class="page-head"><div><h1>Réponses rapides et FAQ</h1><p>' + (S.loading ? 'Chargement…' : S.replies.length + ' réponses rapides · ' + S.faqs.length + ' questions') + '</p></div>' +
      (S.loading ? '' : '<div class="page-head__actions"><button type="button" class="btn btn--primary" data-act="' + (S.tab === 'replies' ? 'new-reply' : 'new-faq') + '">' + icon('plus') + (S.tab === 'replies' ? 'Ajouter une réponse rapide' : 'Ajouter une question') + '</button></div>') + '</header>' +
      '<div class="subtabs" role="tablist"><button type="button" role="tab" data-act="tab" data-tab="replies" aria-selected="' + (S.tab === 'replies') + '">Réponses rapides</button><button type="button" role="tab" data-act="tab" data-tab="faq" aria-selected="' + (S.tab === 'faq') + '">FAQ automatique' + (flagged ? ' <span class="badge badge--warn">' + flagged + '</span>' : '') + '</button></div>';
    if (S.loading) return head + C.skelRows(5);
    return head + (S.tab === 'replies' ? repliesView() : faqView());
  }
  function repliesView() {
    if (!S.replies.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('bolt') + '</span><strong>Aucune réponse rapide</strong><p>Enregistrez les phrases que vos agents écrivent tous les jours.</p></div></div>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Titre</th><th>Raccourci</th><th>Texte</th><th></th></tr></thead><tbody>' + S.replies.map(function (r) {
      return '<tr><td><strong>' + esc(r.title) + '</strong></td><td class="tnum"><span class="badge badge--plain">/' + esc(r.key) + '</span></td><td class="muted" style="white-space:normal">' + esc(r.text) + '</td><td class="num" style="white-space:nowrap"><button type="button" class="icon-btn" data-act="edit-reply" data-id="' + r.id + '" aria-label="Modifier ' + esc(r.title) + '">' + icon('edit') + '</button><button type="button" class="icon-btn" data-act="del-reply" data-id="' + r.id + '" aria-label="Supprimer ' + esc(r.title) + '">' + icon('trash') + '</button></td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function faqView() {
    var bar = '<section class="card" style="margin-bottom:14px"><div class="row row--between"><div><strong>Réponse automatique</strong><div class="small muted">' + (S.auto ? 'Quand une question correspond, le client reçoit la réponse tout de suite.' : 'Désactivée : tous les messages vont directement aux agents.') + '</div></div><input type="checkbox" class="switch" data-act="auto-on"' + (S.auto ? ' checked' : '') + ' aria-label="Réponse automatique"></div></section>';
    if (!S.faqs.length) return bar + '<div class="card"><div class="empty"><span class="empty__icon">' + icon('chat') + '</span><strong>Aucune question fréquente</strong><p>Ajoutez les questions que vos clients posent le plus souvent.</p></div></div>';
    return bar + '<div class="stack">' + S.faqs.map(function (f) {
      return '<section class="card"><div class="card__head" style="margin-bottom:6px"><h2>' + esc(f.q) + '</h2><div class="row" style="gap:2px"><button type="button" class="icon-btn" data-act="edit-faq" data-id="' + f.id + '" aria-label="Modifier">' + icon('edit') + '</button><button type="button" class="icon-btn" data-act="del-faq" data-id="' + f.id + '" aria-label="Supprimer">' + icon('trash') + '</button></div></div>' +
        '<p class="muted">' + esc(f.a) + '</p>' +
        '<div class="row row--between row--wrap" style="margin-top:10px"><div class="chips">' + f.keywords.map(function (k) { return '<span class="chip">' + esc(k) + '</span>'; }).join('') + '</div><span class="small muted tnum">' + f.hits + ' réponses envoyées</span></div>' +
        '<label class="row small" style="margin-top:10px;gap:8px"><input type="checkbox" class="switch" data-act="faq-start" data-id="' + f.id + '"' + (f.start ? ' checked' : '') + ' aria-label="Afficher en bouton"><span>Bouton au début de la discussion</span></label>' +
        f.flags.map(function (x) { return '<div class="alert alert--warn small" style="margin-top:10px">' + icon('alert') + '<span><strong>Mauvaise réponse signalée</strong><br>Le client demandait : « ' + esc(x) + ' ». Retirez un mot-clé ou corrigez la réponse.</span></div>'; }).join('') +
        (f.flags.length ? '<div style="margin-top:8px"><button type="button" class="btn btn--sm" data-act="clear-flags" data-id="' + f.id + '">' + icon('check') + 'Marquer comme traité</button></div>' : '') +
        '</section>';
    }).join('') + '</div>';
  }
  function replyDrawer() {
    var f = S.rform;
    return '<div class="drawer__head row row--between" style="padding:16px"><h2 style="font-size:17px">' + (f.id ? 'Modifier la réponse rapide' : 'Nouvelle réponse rapide') + '</h2>' + close('close-drawer') + '</div><div class="stack" style="padding:0 16px 16px">' +
      '<label class="field">Titre<input class="input" value="' + esc(f.title) + '" data-on-input="rform" data-k="title" placeholder="Ex. Horaires des agences"></label>' +
      '<label class="field">Raccourci<span class="input-group"><span>/</span><input class="input" value="' + esc(f.key) + '" data-on-input="rform" data-k="key" placeholder="horaires"></span></label>' +
      '<label class="field">Texte<textarea class="textarea" data-on-input="rform" data-k="text">' + esc(f.text) + '</textarea></label>' +
      (f.err ? '<div class="alert alert--bad">' + icon('alert') + f.err + '</div>' : '') +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="close-drawer">Annuler</button><button type="button" class="btn btn--primary" data-act="save-reply">' + icon('check') + 'Enregistrer</button></div></div>';
  }
  function faqDrawer() {
    var f = S.fform;
    return '<div class="drawer__head row row--between" style="padding:16px"><h2 style="font-size:17px">' + (f.id ? 'Modifier la question' : 'Nouvelle question') + '</h2>' + close('close-drawer') + '</div><div class="stack" style="padding:0 16px 16px">' +
      '<label class="field">Question<input class="input" value="' + esc(f.q) + '" data-on-input="fform" data-k="q" placeholder="Ex. Comment payer ma facture ?"></label>' +
      '<label class="field">Réponse<textarea class="textarea" data-on-input="fform" data-k="a">' + esc(f.a) + '</textarea></label>' +
      '<label class="field">Mots-clés<input class="input" value="' + esc(f.kw) + '" data-on-input="fform" data-k="kw" placeholder="facture, payer, montant"><span class="field__hint">Séparés par des virgules. La réponse part si le message du client contient l\'un d\'eux.</span></label>' +
      (f.err ? '<div class="alert alert--bad">' + icon('alert') + f.err + '</div>' : '') +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-act="close-drawer">Annuler</button><button type="button" class="btn btn--primary" data-act="save-faq">' + icon('check') + 'Enregistrer</button></div></div>';
  }

  /* ---------- Dossier : « / » dans la zone de réponse ---------- */
  function paintSlash() {
    var host = C.$('.composer'); if (!host) return;
    var box = C.$('.slash');
    if (!slash.open) { if (box) box.remove(); return; }
    if (!box) { box = document.createElement('div'); box.className = 'slash'; box.setAttribute('role', 'listbox'); box.setAttribute('aria-label', 'Réponses rapides'); host.appendChild(box); }
    box.innerHTML = slash.list.length ? slash.list.map(function (r, i) {
      return '<button type="button" role="option" class="slash__item ' + (i === slash.at ? 'is-on' : '') + '" aria-selected="' + (i === slash.at) + '" data-act="slash-pick" data-i="' + i + '"><strong>' + esc(r.title) + '</strong><span class="badge badge--plain">/' + esc(r.key) + '</span><span class="slash__text">' + esc(r.text) + '</span></button>';
    }).join('') : '<p class="small muted" style="padding:10px 12px">Aucune réponse rapide trouvée.</p>';
  }
  function slashFilter(value) {
    var q = norm(value.slice(1));
    slash.list = S.replies.filter(function (r) { return norm(r.title + ' ' + r.key + ' ' + r.text).indexOf(q) !== -1; });
    slash.at = 0; slash.open = true;
    paintSlash();
  }
  function slashClose() { slash.open = false; paintSlash(); }
  function slashInsert(r) {
    var input = C.$('#desk-text');
    input.value = r.text; slashClose(); input.focus();
  }
  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'desk-text') return;
    if (e.target.value.charAt(0) === '/') slashFilter(e.target.value); else slashClose();
  });
  // En phase de capture : quand la liste est ouverte, Entrée insère au lieu d'envoyer
  document.addEventListener('keydown', function (e) {
    if (!slash.open || !e.target || e.target.id !== 'desk-text') return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var n = slash.list.length; if (n) { slash.at = (slash.at + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; paintSlash(); }
    } else if (e.key === 'Enter') {
      e.preventDefault(); e.stopPropagation();
      if (slash.list[slash.at]) slashInsert(slash.list[slash.at]);
    } else if (e.key === 'Escape') { e.stopPropagation(); slashClose(); }
  }, true);

  /* ---------- Cartes ---------- */
  function card(m, side) {
    var f = faq(m.data.fid) || { q: 'Question supprimée', a: m.data.a || '' };
    var answerText = m.data.a || f.a;
    if (side === 'desk') {
      return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('bolt') + 'La FAQ a répondu</span>' + (m.data.flagged ? '<span class="badge badge--warn">Non résolue</span>' : '<span class="badge badge--info">Automatique</span>') + '</div><div class="dcard__body"><span class="small muted">Question reconnue : ' + esc(f.q) + '</span><span>' + esc(answerText) + '</span>' + (m.data.flagged ? '<div class="alert alert--warn small">' + icon('alert') + 'Le client dit que sa question n\'est pas résolue. À vous de répondre.</div>' : '') + '</div></div>';
    }
    return '<div class="pcard" style="width:270px"><div class="pcard__list"><span class="pmsg__auto">' + icon('bolt') + 'Réponse automatique</span><span>' + esc(answerText) + '</span></div>' +
      '<div class="pcard__foot">' + (m.data.flagged ? '<span class="small muted">Un agent va vous répondre.</span>' : '<button type="button" class="btn ph-btn" data-act="ph-flag" data-m="' + m.id + '">Ma question n\'est pas résolue</button>') + '</div></div>';
  }

  /* ---------- Cas ---------- */
  function seedReplies() {
    return [
      { id: 'r1', title: 'Bonjour', key: 'bonjour', text: 'Bonjour, merci de contacter le Service Eau Claire. Comment pouvons-nous vous aider ?' },
      { id: 'r2', title: 'Horaires des agences', key: 'horaires', text: 'Nos agences vous reçoivent du lundi au vendredi, de 8 h à 17 h.' },
      { id: 'r3', title: 'Demander le numéro de compteur', key: 'compteur', text: 'Pouvez-vous nous donner votre numéro de compteur ? Il est écrit sur votre facture.' },
      { id: 'r4', title: 'Intervention programmée', key: 'intervention', text: 'Une équipe passera chez vous dans les 48 heures. Nous vous préviendrons la veille.' },
      { id: 'r5', title: 'Fin de la conversation', key: 'merci', text: 'Merci de votre message. N\'hésitez pas à nous écrire si besoin.' }
    ];
  }
  function seedFaqs() {
    return [
      { id: 'f1', q: 'Comment payer ma facture ?', a: 'Vous pouvez payer dans nos agences ou par Mobile Money en indiquant votre numéro de compteur.', keywords: ['facture', 'payer', 'paiement'], hits: 128, start: true, flags: [] },
      { id: 'f2', q: 'Que faire en cas de coupure d\'eau ?', a: 'Vérifiez d\'abord votre robinet d\'arrêt. Si l\'eau ne revient pas, donnez-nous votre quartier : les coupures en cours sont signalées ici.', keywords: ['coupure', 'couper', 'pas d\'eau'], hits: 94, start: true, flags: [] },
      { id: 'f3', q: 'Quels sont vos horaires ?', a: 'Nos agences vous reçoivent du lundi au vendredi, de 8 h à 17 h.', keywords: ['horaire', 'ouvert', 'heure'], hits: 61, start: true, flags: [] }
    ];
  }

  C.define({
    id: 'faq', title: 'Réponses rapides et FAQ', icon: 'bolt', priority: 2,
    entity: ENTITY,
    queue: [{ n: 'Prisca G.', p: 'Mon compteur fuit depuis hier', t: '09:02' }, { n: 'Koffi M.', p: 'Merci, c\'est réglé', t: 'Hier' }],
    cases: [
      { key: 'normal', label: 'Parcours normal (FAQ active)' },
      { key: 'repondu', label: 'La FAQ a déjà répondu' },
      { key: 'aucune', label: 'Aucune réponse trouvée' },
      { key: 'mauvaise', label: 'Mauvaise réponse signalée' },
      { key: 'desactive', label: 'Réponse automatique désactivée' },
      { key: 'vide', label: 'Aucune réponse rapide, aucune question' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      slash.open = false;
      var vide = k === 'vide';
      S = { tab: 'replies', loading: k === 'chargement', auto: k !== 'desactive' && !vide, handed: false, replies: vide ? [] : seedReplies(), faqs: vide ? [] : seedFaqs() };
      if (k === 'repondu') { C.say({ from: 'citizen', text: 'Bonjour, comment je peux payer ma facture ?' }); answer('Bonjour, comment je peux payer ma facture ?'); }
      if (k === 'aucune') { C.say({ from: 'citizen', text: 'Je voudrais changer le nom sur mon compteur.' }); answer('Je voudrais changer le nom sur mon compteur.'); }
      if (k === 'mauvaise') { S.tab = 'faq'; C.say({ from: 'citizen', text: 'Je veux couper mon abonnement, je déménage.' }); answer('Je veux couper mon abonnement, je déménage.'); }
      if (k === 'desactive') { C.say({ from: 'citizen', text: 'Bonjour, quels sont vos horaires ?' }); answer('Bonjour, quels sont vos horaires ?'); }
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    quick: function () {
      if (S.loading || S.handed || C.msgs.some(function (m) { return m.from === 'citizen'; })) return '';
      return S.faqs.filter(function (f) { return f.start; }).map(function (f) { return '<button type="button" data-act="ph-faq" data-id="' + f.id + '">' + esc(f.q) + '</button>'; }).join('');
    },
    onCitizenText: function (t) { answer(t); },
    tools: function () { return [{ act: 'open-slash', icon: 'bolt', label: 'Réponses rapides (tapez /)', isNew: true }]; },
    side: function () {
      var autos = C.msgs.filter(function (m) { return m.card === 'faq'; }).length;
      return '<div><h3>Réponse automatique</h3><dl class="facts"><div><dt>État</dt><dd>' + (S.auto ? 'Activée' : 'Désactivée') + '</dd></div><div><dt>Réponses envoyées</dt><dd class="tnum">' + autos + '</dd></div></dl>' +
        (S.unknown ? '<div style="margin-top:10px"><p class="small muted">Question sans réponse :</p><p class="small">« ' + esc(S.unknown) + ' »</p><button type="button" class="btn btn--sm" style="margin-top:8px" data-act="suggest-faq">' + icon('plus') + 'Proposer pour la FAQ</button></div>' : '') +
        '<p class="small muted" style="margin-top:10px">Tapez <strong>/</strong> dans la réponse pour insérer une réponse rapide.</p></div>';
    },
    card: card,
    act: {
      tab: function (el) { S.tab = el.dataset.tab; C.render(); },
      'auto-on': function (el) { S.auto = el.checked; C.render(); C.toast(S.auto ? 'Réponse automatique activée' : 'Réponse automatique désactivée'); },
      'faq-start': function (el) { faq(el.dataset.id).start = el.checked; C.render(); },
      'clear-flags': function (el) { faq(el.dataset.id).flags = []; C.render(); },
      'new-reply': function () { S.rform = { title: '', key: '', text: '' }; C.drawer(replyDrawer); },
      'edit-reply': function (el) { S.rform = Object.assign({}, S.replies.filter(function (r) { return r.id === el.dataset.id; })[0]); C.drawer(replyDrawer); },
      'del-reply': function (el) { S.replies = S.replies.filter(function (r) { return r.id !== el.dataset.id; }); C.render(); C.toast('Réponse rapide supprimée'); },
      'save-reply': function () {
        var f = S.rform, key = f.key.trim().replace(/^\//, '').toLowerCase();
        if (!f.title.trim() || !key || !f.text.trim()) { f.err = 'Remplissez le titre, le raccourci et le texte.'; C.render(); return; }
        if (S.replies.some(function (r) { return r.key === key && r.id !== f.id; })) { f.err = 'Ce raccourci existe déjà.'; C.render(); return; }
        var data = { title: f.title.trim(), key: key, text: f.text.trim() };
        if (f.id) Object.assign(S.replies.filter(function (r) { return r.id === f.id; })[0], data); else S.replies.push(Object.assign({ id: 'r' + C.uid() }, data));
        C.drawerFn = null; C.render(); C.toast('Réponse rapide enregistrée');
      },
      'new-faq': function () { S.fform = { q: '', a: '', kw: '' }; C.drawer(faqDrawer); },
      'edit-faq': function (el) { var f = faq(el.dataset.id); S.fform = { id: f.id, q: f.q, a: f.a, kw: f.keywords.join(', ') }; C.drawer(faqDrawer); },
      'del-faq': function (el) { S.faqs = S.faqs.filter(function (f) { return f.id !== el.dataset.id; }); C.render(); C.toast('Question supprimée'); },
      'save-faq': function () {
        var f = S.fform, kw = f.kw.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
        if (!f.q.trim() || !f.a.trim() || !kw.length) { f.err = 'Remplissez la question, la réponse et au moins un mot-clé.'; C.render(); return; }
        var data = { q: f.q.trim(), a: f.a.trim(), keywords: kw };
        if (f.id) Object.assign(faq(f.id), data); else S.faqs.push(Object.assign({ id: 'f' + C.uid(), hits: 0, start: false, flags: [] }, data));
        C.drawerFn = null; C.render(); C.toast('Question enregistrée');
      },
      'suggest-faq': function () { S.suggested = S.unknown; S.unknown = null; C.render(); C.toast('Question transmise à l\'administrateur'); },

      'open-slash': function () { var i = C.$('#desk-text'); i.value = '/'; i.focus(); slashFilter('/'); },
      'slash-pick': function (el) { slashInsert(slash.list[+el.dataset.i]); },

      'ph-faq': function (el) {
        var f = faq(el.dataset.id);
        C.say({ from: 'citizen', text: f.q });
        if (S.auto) { f.hits++; C.say({ from: 'auto', card: 'faq', data: { fid: f.id, q: f.q } }); } else answer(f.q);
        C.render();
      },
      'ph-flag': function (el) {
        var m = C.find(el.dataset.m), f = faq(m.data.fid);
        m.data.flagged = true; S.handed = true;
        if (f && m.data.q) f.flags.push(m.data.q);
        C.say({ from: 'system', text: 'Le client signale que la réponse automatique ne convient pas', only: 'desk' });
        C.unread.agent++;
        C.render();
        C.toast('Un agent va vous répondre', 'phone');
      }
    },
    input: {
      rform: function (el) { S.rform[el.dataset.k] = el.value; },
      fform: function (el) { S.fform[el.dataset.k] = el.value; }
    }
  });
})();
