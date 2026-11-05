/* ==========================================================
   App 4 — Rendez-vous (dépend des Horaires d'ouverture, déjà dans la console)
   Réglage : agenda jour / semaine, prestations, personnes réservables, règles et rappels.
   Dossier : proposer des créneaux, voir le rendez-vous, le déplacer, l'annuler, noter une absence.
   Téléphone : prestation → heure → confirmation (4 appuis) ; rappel la veille « Je confirme » / « Je ne peux pas venir ».
   ========================================================== */
'use strict';

(function () {
  var esc = C.esc, money = C.money, icon = C.icon;
  var S = {};
  var NOW = { day: 0, min: 10 * 60 + 24 };           // lundi 2 novembre 2026, 10:24
  var OPEN = 8 * 60, CLOSE = 19 * 60;                  // horaires d'ouverture (réglés dans « Horaires »)
  var HOURS_TEXT = 'Lundi au samedi, 8 h – 19 h · fermé le dimanche';

  function date(i) { return new Date(2026, 10, 2 + i); }
  function dayShort(i) { return date(i).toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', ''); }
  function dayLong(i) {
    if (i === 0) return 'aujourd\'hui';
    if (i === 1) return 'demain';
    if (i === -1) return 'hier';
    return date(i).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function hm(m) { return Math.floor(m / 60) + ':' + ('0' + m % 60).slice(-2); }
  function closed(i) { return date(i).getDay() === 0; }
  function presta(id) { return S.prestas.filter(function (p) { return p.id === id; })[0]; }
  function person(id) { return S.people.filter(function (p) { return p.id === id; })[0]; }
  function appt(id) { return S.appts.filter(function (a) { return a.id === id; })[0]; }
  function durText(d) { return d >= 60 ? Math.floor(d / 60) + ' h' + (d % 60 ? ' ' + d % 60 : '') : d + ' min'; }
  function priceText(p) { return p.price ? money(p.price) : 'Prix sur place'; }
  function when(a) { return cap(dayLong(a.day)) + ' à ' + hm(a.start); }

  /* Créneaux libres d'une personne (ou de n'importe qui) pour une prestation, un jour donné */
  function slots(day, prestaId, personId) {
    if (closed(day) || S.full && day < 7) return [];
    var pr = presta(prestaId), out = [];
    var people = personId ? [person(personId)] : S.people.filter(function (p) { return p.active && p.prestas.indexOf(prestaId) !== -1; });
    for (var m = OPEN; m + pr.dur <= CLOSE; m += 30) {
      if (day === NOW.day && m < NOW.min + S.rules.notice * 60) continue;
      var free = people.filter(function (p) {
        return !S.appts.some(function (a) { return a.person === p.id && a.day === day && a.status !== 'cancelled' && m < a.start + presta(a.presta).dur && a.start < m + pr.dur; });
      });
      if (free.length) out.push({ start: m, person: free[0].id });
    }
    return out;
  }
  function firstOpenDay(prestaId, personId, from) {
    for (var d = from || 0; d < 14; d++) if (slots(d, prestaId, personId).length) return d;
    return -1;
  }

  /* ---------- Réglage (administrateur) ---------- */
  function admin() {
    var head = '<header class="page-head"><div><h1>Rendez-vous</h1><p>' + (S.loading ? 'Chargement…' : S.appts.filter(function (a) { return a.day >= 0 && a.day < 7 && a.status !== 'cancelled'; }).length + ' rendez-vous cette semaine') + '</p></div>' +
      (S.tab === 'prestas' ? '<div class="page-head__actions"><button type="button" class="btn btn--primary" data-act="new-presta">' + icon('plus') + 'Ajouter une prestation</button></div>' : '') + '</header>' +
      '<div class="subtabs" role="tablist">' + [['agenda', 'Agenda'], ['prestas', 'Prestations'], ['people', 'Personnes'], ['rules', 'Règles et rappels']].map(function (t) {
        return '<button type="button" role="tab" data-act="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>';
    if (S.loading) return head + C.skelRows(5);
    return head + ({ agenda: agenda, prestas: prestaTable, people: peopleCards, rules: rules })[S.tab]();
  }

  function agenda() {
    var bar = '<div class="row row--between row--wrap" style="margin-bottom:12px"><div class="vtabs"><button type="button" data-act="cal" data-v="week" aria-selected="' + (S.cal === 'week') + '">Semaine</button><button type="button" data-act="cal" data-v="day" aria-selected="' + (S.cal === 'day') + '">Jour</button></div>' +
      '<strong>' + (S.cal === 'week' ? 'Semaine du 2 au 8 novembre 2026' : cap(date(S.calDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }))) + '</strong>' +
      (S.cal === 'day' ? '<div class="row"><button type="button" class="icon-btn" data-act="cal-day" data-d="-1" aria-label="Jour précédent">' + icon('back') + '</button><button type="button" class="icon-btn" data-act="cal-day" data-d="1" aria-label="Jour suivant">' + icon('chevron') + '</button></div>' : '<span></span>') + '</div>';
    var cols = S.cal === 'week' ? [0, 1, 2, 3, 4, 5, 6].map(function (d) { return { key: d, label: dayShort(d) + ' ' + date(d).getDate(), day: d, closed: closed(d) }; })
      : S.people.filter(function (p) { return p.active; }).map(function (p) { return { key: p.id, label: p.name, day: S.calDay, person: p.id, closed: closed(S.calDay) }; });
    var html = '<div class="calendar" style="--cols:' + cols.length + '"><div class="cal-h"></div>' + cols.map(function (c) { return '<div class="cal-h' + (c.day === NOW.day && S.cal === 'week' ? '" style="color:var(--brand)' : '') + '">' + c.label + '</div>'; }).join('');
    for (var h = OPEN; h < CLOSE; h += 60) {
      html += '<div class="cal-t">' + hm(h) + '</div>';
      cols.forEach(function (c) {
        if (c.closed) { html += '<div class="cal-closed"></div>'; return; }
        var inCell = S.appts.filter(function (a) { return a.day === c.day && a.start >= h && a.start < h + 60 && a.status !== 'cancelled' && (!c.person || a.person === c.person); });
        html += '<div>' + inCell.map(function (a) {
          var pr = presta(a.presta), cls = a.status === 'noshow' ? 'appt--bad' : a.status === 'pending' ? 'appt--warn' : '';
          return '<button type="button" class="appt ' + cls + '" data-act="appt-open" data-id="' + a.id + '" aria-label="' + esc(hm(a.start) + ' ' + pr.name + ', ' + a.client + ', ' + ST[a.status][0]) + '">' + hm(a.start) + ' ' + esc(pr.name) + '<small>' + esc(a.client) + (S.cal === 'week' ? ' · ' + person(a.person).name : '') + (a.status === 'noshow' ? ' · absent' : '') + '</small></button>';
        }).join('') + '</div>';
      });
    }
    var legend = '<div class="cal-legend"><span><i class="appt"></i>Confirmé</span><span><i class="appt appt--warn"></i>À confirmer : le client n\'a pas encore répondu au rappel</span><span><i class="appt appt--bad"></i>Absent</span><span><i class="cal-closed"></i>Fermé</span></div>';
    return bar + html + '</div>' + legend + '<p class="small muted" style="margin-top:8px">' + icon('clock') + ' Créneaux basés sur vos horaires d\'ouverture : ' + HOURS_TEXT + '. Cliquez sur un rendez-vous pour voir le détail.</p>';
  }

  function prestaTable() {
    if (!S.prestas.length) return '<div class="card"><div class="empty"><span class="empty__icon">' + icon('calendar') + '</span><strong>Aucune prestation</strong><p>Ajoutez ce que vos clients peuvent réserver.</p></div></div>';
    return '<div class="table-wrap"><table class="table"><thead><tr><th>Prestation</th><th>Durée</th><th class="num">Prix</th><th>Avec</th><th>Réservable</th></tr></thead><tbody>' +
      S.prestas.map(function (p) {
        return '<tr class="' + (p.active ? '' : 'is-dim') + '"><td><strong>' + esc(p.name) + '</strong></td><td>' + durText(p.dur) + '</td><td class="num">' + (p.price ? money(p.price) : '<span class="muted">Facultatif</span>') + '</td><td>' + S.people.filter(function (x) { return x.prestas.indexOf(p.id) !== -1; }).map(function (x) { return x.name; }).join(', ') + '</td><td><input type="checkbox" class="switch" data-act="presta-active" data-id="' + p.id + '"' + (p.active ? ' checked' : '') + ' aria-label="Réservable"></td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function prestaModal() {
    var d = S.pdraft;
    return '<div class="modal__head"><h2>Nouvelle prestation</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body"><label class="field">Nom<input class="input ' + (d.err ? 'input--error' : '') + '" value="' + esc(d.name) + '" data-on-input="pdraft" data-k="name" placeholder="Ex. Tresses enfant">' + (d.err ? '<span class="small" style="color:var(--bad)">' + d.err + '</span>' : '') + '</label>' +
      '<div class="grid-2"><label class="field">Durée<select class="select" data-on-change="pdraft" data-k="dur">' + [15, 30, 45, 60, 90, 120, 180].map(function (m) { return '<option value="' + m + '"' + (+d.dur === m ? ' selected' : '') + '>' + durText(m) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field">Prix (facultatif)<span class="input-group"><input class="input tnum" inputmode="numeric" value="' + esc(d.price) + '" data-on-input="pdraft" data-k="price"><span>FCFA</span></span></label></div>' +
      '<div class="field">Qui peut la faire ?' + S.people.map(function (p) { var on = d.people.indexOf(p.id) !== -1; return '<label class="pick ' + (on ? 'is-on' : '') + '"><input type="checkbox" data-act="pdraft-person" data-id="' + p.id + '"' + (on ? ' checked' : '') + '><span class="pick__main"><strong>' + p.name + '</strong><span>' + p.role + '</span></span></label>'; }).join('') + '</div></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="save-presta">' + icon('check') + 'Enregistrer</button></div>';
  }

  function peopleCards() {
    return '<div class="grid-2">' + S.people.map(function (p) {
      return '<section class="card"><div class="card__head"><div class="row"><span class="avatar">' + (p.room ? icon('pin') : esc(p.name.slice(0, 2).toUpperCase())) + '</span><div><strong>' + esc(p.name) + '</strong><div class="small muted">' + esc(p.role) + '</div></div></div><input type="checkbox" class="switch" data-act="person-active" data-id="' + p.id + '"' + (p.active ? ' checked' : '') + ' aria-label="Réservable"></div>' +
        '<div class="chips">' + p.prestas.map(function (id) { return '<span class="chip">' + esc(presta(id).name) + '</span>'; }).join('') + '</div>' +
        (p.prestas.length ? '' : '<p class="small muted">Aucune prestation : rien ne peut être réservé avec ' + (p.room ? 'cette salle' : 'cette personne') + '.</p>') +
        (p.active ? '' : '<p class="small muted" style="margin-top:8px">' + (p.room ? 'Indisponible' : 'Absent ou absente') + ' : ses créneaux ne sont plus proposés.</p>') + '</section>';
    }).join('') + '<button type="button" class="card card--add" data-act="new-person"><span class="empty" style="padding:18px"><span class="empty__icon">' + icon('plus') + '</span><strong>Ajouter une personne ou une salle</strong><span class="small">Coiffeuse, médecin, salle de réunion…</span></span></button></div>';
  }

  function personModal() {
    var d = S.ndraft, room = d.kind === 'room';
    return '<div class="modal__head"><h2>Ajouter une personne ou une salle</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body"><div class="field">Type<div class="vtabs"><button type="button" data-act="ndraft-kind" data-v="person" aria-selected="' + !room + '">' + icon('user') + 'Personne</button><button type="button" data-act="ndraft-kind" data-v="room" aria-selected="' + room + '">' + icon('pin') + 'Salle</button></div></div>' +
      '<div class="grid-2"><label class="field">' + (room ? 'Nom de la salle' : 'Prénom') + '<input class="input ' + (d.err ? 'input--error' : '') + '" value="' + esc(d.name) + '" data-on-input="ndraft" data-k="name" placeholder="' + (room ? 'Ex. Cabine 2' : 'Ex. Grâce') + '">' + (d.err ? '<span class="small" style="color:var(--bad)">' + d.err + '</span>' : '') + '</label>' +
      '<label class="field">' + (room ? 'Description (facultatif)' : 'Métier (facultatif)') + '<input class="input" value="' + esc(d.role) + '" data-on-input="ndraft" data-k="role" placeholder="' + (room ? 'Ex. Salle de soins' : 'Ex. Coiffeuse') + '"></label></div>' +
      (room ? '' : '<p class="small muted">Le client voit ce prénom quand il choisit avec qui réserver.</p>') +
      '<div class="field">Prestations possibles' + (S.prestas.length ? S.prestas.map(function (p) { var on = d.prestas.indexOf(p.id) !== -1; return '<label class="pick ' + (on ? 'is-on' : '') + '"><input type="checkbox" data-act="ndraft-presta" data-id="' + p.id + '"' + (on ? ' checked' : '') + '><span class="pick__main"><strong>' + esc(p.name) + '</strong><span>' + durText(p.dur) + ' · ' + priceText(p) + '</span></span></label>'; }).join('') : '<p class="small muted">Ajoutez d\'abord des prestations.</p>') + '</div></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="save-person">' + icon('check') + 'Ajouter</button></div>';
  }

  function rules() {
    var r = S.rules;
    function sel(k, opts) { return '<select class="select" data-on-change="rule" data-k="' + k + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (String(r[k]) === String(o[0]) ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select>'; }
    return '<div class="grid-2" style="align-items:start"><div class="stack">' +
      '<section class="card"><div class="card__head"><h2>Créneaux</h2></div><p>' + icon('clock') + ' ' + HOURS_TEXT + '</p><p class="small muted" style="margin:6px 0 10px">Les créneaux suivent vos horaires d\'ouverture.</p><button type="button" class="btn btn--sm" data-act="desk-noop">Modifier les horaires</button></section>' +
      '<section class="card"><div class="card__head"><h2>Délais</h2></div><div class="stack">' +
        '<label class="field">Réserver au plus tard' + sel('notice', [[1, '1 heure avant'], [2, '2 heures avant'], [4, '4 heures avant'], [24, 'La veille']]) + '</label>' +
        '<label class="field">Annulation gratuite jusqu\'à' + sel('cancel', [[2, '2 heures avant'], [12, '12 heures avant'], [24, '24 heures avant']]) + '</label>' +
        '<label class="field">Réservation possible jusqu\'à' + sel('ahead', [[7, '1 semaine à l\'avance'], [14, '2 semaines à l\'avance'], [30, '1 mois à l\'avance']]) + '</label></div></section>' +
      '</div><div class="stack">' +
      '<section class="card"><div class="card__head"><h2>Rappel automatique</h2><input type="checkbox" class="switch" data-on-change="rule" data-k="remind"' + (r.remind ? ' checked' : '') + ' aria-label="Envoyer un rappel"></div>' +
        (r.remind ? '<label class="field">Envoyé la veille à' + sel('remindAt', [['17:00', '17 h'], ['18:00', '18 h'], ['19:00', '19 h']]) + '</label><p class="small muted" style="margin-top:10px">Le client répond « Je confirme » ou « Je ne peux pas venir ». Le créneau libéré redevient réservable.</p>' : '<p class="small muted">Aucun rappel envoyé.</p>') + '</section>' +
      '<div class="row" style="justify-content:flex-end"><button type="button" class="btn btn--primary" data-act="save-rules">' + icon('check') + 'Enregistrer</button></div>' +
      '</div></div>';
  }

  /* ---------- Dossier : proposer des créneaux, déplacer, annuler ---------- */
  function proposeModal() {
    var f = S.prop, list = slots(f.day, f.presta, f.person);
    var days = '';
    for (var d = 0; d < 7; d++) {
      var n = slots(d, f.presta, f.person).length;
      days += '<button type="button" class="chip" data-act="prop-day" data-d="' + d + '" aria-pressed="' + (f.day === d) + '"' + (n ? '' : ' disabled style="opacity:.45"') + '>' + cap(dayShort(d)) + ' ' + date(d).getDate() + (n ? '' : ' · complet') + '</button>';
    }
    return '<div class="modal__head"><h2>' + (f.move ? 'Déplacer le rendez-vous' : 'Proposer des créneaux') + '</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body"><div class="grid-2"><label class="field">Prestation<select class="select" data-on-change="prop" data-k="presta"' + (f.move ? ' disabled' : '') + '>' + S.prestas.filter(function (p) { return p.active; }).map(function (p) { return '<option value="' + p.id + '"' + (p.id === f.presta ? ' selected' : '') + '>' + esc(p.name) + ' · ' + durText(p.dur) + '</option>'; }).join('') + '</select></label>' +
      '<label class="field">Avec<select class="select" data-on-change="prop" data-k="person"><option value="">Peu importe</option>' + S.people.filter(function (p) { return p.active && p.prestas.indexOf(f.presta) !== -1; }).map(function (p) { return '<option value="' + p.id + '"' + (p.id === f.person ? ' selected' : '') + '>' + p.name + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="chips">' + days + '</div>' +
      (list.length ? '<div class="field">' + (f.move ? 'Nouveau créneau' : 'Choisissez jusqu\'à 3 créneaux') + '<div class="ph-slots" style="grid-template-columns:repeat(6,1fr)">' + list.map(function (s) {
        var on = f.picked.some(function (x) { return x.day === f.day && x.start === s.start; });
        return '<button type="button" class="ph-slot ' + (on ? 'is-on' : '') + '" data-act="prop-slot" data-s="' + s.start + '" data-p="' + s.person + '">' + hm(s.start) + '</button>';
      }).join('') + '</div></div>' : '<div class="alert alert--warn">' + icon('calendar') + 'Plus aucun créneau libre ce jour-là.</div>') +
      (f.move ? '<label class="field">Message au client<input class="input" value="' + esc(f.why) + '" data-on-input="prop-why"></label>' : '') + '</div>' +
      '<div class="modal__foot"><span class="muted" style="margin-right:auto;align-self:center">' + f.picked.map(function (x) { return cap(dayShort(x.day)) + ' ' + hm(x.start); }).join(', ') + '</span><button type="button" class="btn" data-act="close-modal">Annuler</button><button type="button" class="btn btn--primary" data-act="' + (f.move ? 'send-move' : 'send-slots') + '"' + (f.picked.length ? '' : ' disabled') + '>' + icon('send') + (f.move ? 'Déplacer et prévenir' : 'Envoyer au client') + '</button></div>';
  }
  function cancelModal() {
    return '<div class="modal__head"><h2>Annuler le rendez-vous ?</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer">' + icon('x') + '</button></div>' +
      '<div class="modal__body"><p>Le client est prévenu dans la discussion et le créneau redevient libre.</p><label class="field">Motif, envoyé au client<input class="input" value="' + esc(S.cancelWhy) + '" data-on-input="cancel-why"></label></div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Garder</button><button type="button" class="btn btn--danger-solid" data-act="confirm-cancel">Annuler le rendez-vous</button></div>';
  }

  function apptModal() {
    var a = appt(S.openId), c = a.client === C.app.citizen.name;
    var note = a.status === 'pending' ? (a.relaunchedAt ? 'Relancé à ' + a.relaunchedAt + ' · toujours sans réponse.' : 'Rappel envoyé la veille à ' + S.rules.remindAt.replace(':00', ' h') + ' · pas encore de réponse.')
      : a.status === 'confirmed' ? (a.manual ? 'Confirmé par le salon (client joint par téléphone).' : 'Le client a confirmé.')
      : a.status === 'noshow' ? 'Le client n\'est pas venu.' : a.status === 'done' ? 'Le client est venu.' : '';
    return '<div class="modal__head"><h2>' + esc(a.client) + '</h2>' + badge(a) + '<button type="button" class="icon-btn" data-act="close-modal" aria-label="Fermer" style="margin-left:auto">' + icon('x') + '</button></div>' +
      '<div class="modal__body">' + apptLines(a) + (note ? '<div class="alert alert--' + (a.status === 'pending' ? 'warn' : 'info') + '" style="margin-top:12px">' + icon(a.status === 'pending' ? 'bell' : 'info') + note + '</div>' : '') +
      (a.status === 'pending' ? '<p class="small muted" style="margin-top:10px">« Relancer » renvoie le rappel dans la discussion du client' + (c ? '' : ' (' + esc(a.client) + ')') + '. Il peut répondre « Je confirme » ou « Je ne peux pas venir ».</p>' : '') + '</div>' +
      '<div class="modal__foot"><button type="button" class="btn" data-act="close-modal">Fermer</button>' +
      (a.status === 'pending' ? '<button type="button" class="btn" data-act="appt-manual">' + icon('check') + 'Marquer confirmé</button><button type="button" class="btn btn--primary" data-act="appt-relaunch"' + (a.relaunchedAt ? ' disabled' : '') + '>' + icon('bell') + (a.relaunchedAt ? 'Relancé' : 'Relancer le client') + '</button>' : '') + '</div>';
  }

  /* ---------- Cartes ---------- */
  var ST = { confirmed: ['Confirmé', 'ok'], pending: ['À confirmer', 'warn'], cancelled: ['Annulé', 'bad'], noshow: ['Absent', 'bad'], done: ['Venu', 'ok'] };
  function badge(a) { return '<span class="badge badge--' + ST[a.status][1] + '">' + ST[a.status][0] + '</span>'; }
  function apptLines(a) {
    var pr = presta(a.presta);
    return '<div class="lines"><div><span class="muted">Quand</span><strong>' + when(a) + '</strong></div><div><span class="muted">Prestation</span><span>' + esc(pr.name) + ' · ' + durText(pr.dur) + '</span></div><div><span class="muted">Avec</span><span>' + person(a.person).name + '</span></div><div><span class="muted">Prix</span><span>' + priceText(pr) + '</span></div></div>';
  }
  function card(m, side) {
    var d = m.data;
    if (m.card === 'slots') {
      var pr = presta(d.presta);
      if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('calendar') + 'Créneaux proposés</span>' + (d.chosen ? '<span class="badge badge--ok">Choisi</span>' : '<span class="badge badge--warn">En attente</span>') + '</div><div class="dcard__body"><span>' + esc(pr.name) + '</span><div class="chips">' + d.list.map(function (s) { return '<span class="chip" aria-pressed="' + (d.chosen === s) + '">' + cap(dayShort(s.day)) + ' ' + date(s.day).getDate() + ' · ' + hm(s.start) + '</span>'; }).join('') + '</div></div></div>';
      return '<div class="pcard" style="width:280px"><div class="pcard__title">' + icon('calendar') + 'Choisissez un créneau</div><div class="pcard__list"><span><strong>' + esc(pr.name) + '</strong> · ' + durText(pr.dur) + '</span>' +
        d.list.map(function (s, i) { return '<button type="button" class="ph-option ' + (d.chosen === s ? 'is-on' : '') + '" data-act="ph-pick-slot" data-m="' + m.id + '" data-i="' + i + '"' + (d.chosen ? ' disabled' : '') + '><span><strong>' + cap(dayLong(s.day)) + '</strong><small>avec ' + person(s.person).name + '</small></span><span class="ph-option__end tnum">' + hm(s.start) + '</span></button>'; }).join('') +
        '</div>' + (d.chosen ? '' : '<div class="pcard__foot"><button type="button" class="btn" data-act="ph-book">Voir d\'autres horaires</button></div>') + '</div>';
    }
    var a = appt(d.aid);
    if (m.card === 'appt') {
      if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('calendar') + 'Rendez-vous</span>' + badge(a) + '</div><div class="dcard__body">' + apptLines(a) + '</div></div>';
      var foot = a.status === 'noshow' ? '<div class="alert alert--bad small">' + icon('x') + 'Rendez-vous manqué</div></div><div class="pcard__foot"><button type="button" class="btn btn--primary" data-act="ph-book">Reprendre rendez-vous</button>'
        : a.status === 'cancelled' ? '<div class="alert alert--bad small">' + icon('x') + 'Annulé' + (a.why ? ' : ' + esc(a.why) : '') + '</div></div><div class="pcard__foot"><button type="button" class="btn btn--primary" data-act="ph-book">Reprendre rendez-vous</button>'
        : '</div><div class="pcard__foot">' + badge(a);
      return '<div class="pcard" style="width:280px"><div class="pcard__title">' + icon('calendar') + 'Votre rendez-vous</div><div class="pcard__list">' + apptLines(a) + foot + '</div></div>';
    }
    if (m.card === 'reminder') {
      if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('bell') + 'Rappel automatique</span>' + (d.answer ? '<span class="badge badge--' + (d.answer === 'yes' ? 'ok' : 'bad') + '">' + (d.answer === 'yes' ? 'Confirmé' : 'Ne vient pas') + '</span>' : '<span class="badge">Sans réponse</span>') + '</div><div class="dcard__body"><span>' + when(a) + ' · ' + esc(presta(a.presta).name) + '</span></div></div>';
      return '<div class="pcard" style="width:280px"><div class="pcard__title">' + icon('bell') + 'Rappel : c\'est demain</div><div class="pcard__list"><strong>' + when(a) + '</strong><span>' + esc(presta(a.presta).name) + ' avec ' + person(a.person).name + '</span></div>' +
        (d.answer ? '<div class="pcard__foot"><span class="badge badge--' + (d.answer === 'yes' ? 'ok' : 'bad') + '">' + (d.answer === 'yes' ? 'Vous avez confirmé' : 'Vous avez annulé') + '</span></div>'
          : '<div class="pcard__foot"><button type="button" class="btn" data-act="ph-remind" data-m="' + m.id + '" data-a="no">Je ne peux pas venir</button><button type="button" class="btn btn--primary" data-act="ph-remind" data-m="' + m.id + '" data-a="yes">Je confirme</button></div>') + '</div>';
    }
    if (m.card === 'moved') {
      var old = cap(dayLong(d.oldDay)) + ' à ' + hm(d.oldStart);
      if (side === 'desk') return '<div class="dcard"><div class="dcard__head"><span class="row">' + icon('calendar') + 'Rendez-vous déplacé</span>' + (d.answer ? '<span class="badge badge--ok">Vu par le client</span>' : '<span class="badge badge--warn">En attente</span>') + '</div><div class="dcard__body"><span class="strike">' + old + '</span><strong>' + when(a) + '</strong><span class="muted small">' + esc(d.why) + '</span></div></div>';
      return '<div class="pcard" style="width:280px"><div class="pcard__title">' + icon('calendar') + 'Rendez-vous déplacé</div><div class="pcard__list"><span class="muted">' + esc(d.why) + '</span><span class="strike">' + old + '</span><strong style="font-size:16px">' + when(a) + '</strong><span>' + esc(presta(a.presta).name) + ' avec ' + person(a.person).name + '</span></div>' +
        (d.answer ? '<div class="pcard__foot"><span class="badge badge--ok">C\'est noté</span></div>' : '<div class="pcard__foot"><button type="button" class="btn" data-act="ph-book">Autre créneau</button><button type="button" class="btn btn--primary" data-act="ph-moved-ok" data-m="' + m.id + '">C\'est noté</button></div>') + '</div>';
    }
    return '';
  }

  /* ---------- Téléphone : prise de rendez-vous ---------- */
  function booking() {
    var b = S.book;
    if (b.step === 1) {
      return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="close-layer" aria-label="Fermer">' + icon('x') + '</button><h2>Prendre rendez-vous</h2></div>' +
        '<div class="ph-sheet__body" style="padding-top:12px"><strong>Quelle prestation ?</strong>' + S.prestas.filter(function (p) { return p.active; }).map(function (p) {
          return '<button type="button" class="ph-option" data-act="bk-presta" data-id="' + p.id + '"><span><strong>' + esc(p.name) + '</strong><small>' + durText(p.dur) + '</small></span><span class="ph-option__end">' + priceText(p) + '</span></button>';
        }).join('') + '</div>';
    }
    var pr = presta(b.presta);
    if (b.step === 2) {
      var people = S.people.filter(function (p) { return p.active && p.prestas.indexOf(pr.id) !== -1; });
      var days = '', any = false;
      for (var d = b.week * 7; d < b.week * 7 + 7; d++) {
        var n = slots(d, pr.id, b.person).length; if (n) any = true;
        days += '<button type="button" class="ph-day-btn ' + (b.day === d ? 'is-on' : '') + '" data-act="bk-day" data-d="' + d + '"' + (n ? '' : ' disabled') + '><span>' + cap(dayShort(d)) + '</span><strong>' + date(d).getDate() + '</strong><span>' + (closed(d) ? 'fermé' : n ? n + ' libres' : 'complet') + '</span></button>';
      }
      var list = b.day >= 0 ? slots(b.day, pr.id, b.person) : [];
      return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="bk-back" aria-label="Retour">' + icon('back') + '</button><h2>' + esc(pr.name) + '</h2></div>' +
        '<div class="ph-sheet__body" style="padding-top:12px">' +
          '<div class="chips"><button type="button" class="chip" data-act="bk-person" data-id="" aria-pressed="' + !b.person + '">Peu importe</button>' + people.map(function (p) { return '<button type="button" class="chip" data-act="bk-person" data-id="' + p.id + '" aria-pressed="' + (b.person === p.id) + '">' + p.name + '</button>'; }).join('') + '</div>' +
          '<div class="ph-days">' + days + '</div>' +
          (!any ? '<div class="empty" style="padding:18px 8px"><span class="empty__icon">' + icon('calendar') + '</span><strong>Plus aucun créneau ' + (b.week ? 'cette semaine-là' : 'cette semaine') + '</strong><button type="button" class="btn btn--primary" data-act="bk-week" data-w="' + (b.week + 1) + '">Voir la semaine suivante</button><button type="button" class="btn btn--ghost" data-act="bk-ask">Demander à être rappelé</button></div>'
            : list.length ? '<strong>' + cap(dayLong(b.day)) + '</strong><div class="ph-slots">' + list.map(function (s) { return '<button type="button" class="ph-slot" data-act="bk-slot" data-s="' + s.start + '" data-p="' + s.person + '">' + hm(s.start) + '</button>'; }).join('') + '</div>' : '') +
          (b.week ? '<button type="button" class="btn btn--ghost btn--sm" data-act="bk-week" data-w="0">' + icon('back') + 'Semaine précédente</button>' : '') +
        '</div>';
    }
    return '<div class="ph-sheet__head"><button type="button" class="icon-btn" data-act="bk-back" aria-label="Retour">' + icon('back') + '</button><h2>Confirmer</h2></div>' +
      '<div class="ph-sheet__body" style="padding-top:12px"><div class="pcard" style="width:100%"><div class="pcard__list">' + apptLines({ day: b.day, start: b.start, presta: pr.id, person: b.slotPerson }) + '</div></div>' +
      '<p class="small muted">Annulation gratuite jusqu\'à ' + S.rules.cancel + ' h avant. ' + (S.rules.remind ? 'Un rappel vous sera envoyé la veille.' : '') + '</p></div>' +
      '<div class="ph-sheet__foot"><button type="button" class="btn btn--primary ph-btn" data-act="bk-confirm"' + (b.busy ? ' aria-disabled="true"' : '') + '>' + (b.busy ? '<span class="spinner"></span>Réservation…' : icon('check') + 'Confirmer le rendez-vous') + '</button></div>';
  }

  /* ---------- Cas ---------- */
  function baseAppts() {
    return [
      { id: 'a1', day: 0, start: 9 * 60, presta: 't1', person: 'r', client: 'Nadia A.', status: 'done' },
      { id: 'a2', day: 0, start: 14 * 60, presta: 't3', person: 'i', client: 'Rodrigue H.', status: 'confirmed' },
      { id: 'a3', day: 1, start: 8 * 60 + 30, presta: 't2', person: 'f', client: 'Serge A.', status: 'confirmed' },
      { id: 'a4', day: 1, start: 13 * 60, presta: 't1', person: 'r', client: 'Aïcha K.', status: 'pending' },
      { id: 'a5', day: 2, start: 10 * 60, presta: 't4', person: 'i', client: 'Client · 01 66 •• •• 19', status: 'confirmed' },
      { id: 'a6', day: 3, start: 16 * 60, presta: 't1', person: 'r', client: 'Prisca G.', status: 'confirmed' },
      { id: 'a7', day: 4, start: 11 * 60, presta: 't5', person: 'r', client: 'Edwige Z.', status: 'confirmed' },
      { id: 'a8', day: 5, start: 9 * 60, presta: 't2', person: 'f', client: 'Koffi M.', status: 'confirmed' }
    ];
  }
  function mine() { return S.appts.filter(function (a) { return a.client === C.app.citizen.name && a.status !== 'cancelled'; }).sort(function (x, y) { return y.day - x.day; })[0]; }

  C.define({
    id: 'rendez-vous', title: 'Rendez-vous', icon: 'calendar', priority: 1,
    entity: { name: 'Salon Belle Allure', initials: 'BA', sub: 'Coiffure et beauté · Cotonou · ouvert jusqu\'à 19 h' },
    citizen: { name: 'Mireille D.', phone: '01 97 00 00 47', initials: 'MD', since: 'juin 2026' },
    queue: [{ n: 'Prisca G.', p: 'Je peux venir plus tôt jeudi ?', t: '10:02' }, { n: 'Koffi M.', p: 'Merci, à samedi', t: 'Hier' }],
    cases: [
      { key: 'normal', label: 'Parcours normal (le client réserve)' },
      { key: 'proposer', label: 'L\'agent propose des créneaux', view: 'agent' },
      { key: 'rappel', label: 'Rappel la veille', view: 'agent' },
      { key: 'complet', label: 'Plus aucun créneau cette semaine' },
      { key: 'absent', label: 'Client absent', view: 'agent' },
      { key: 'deplace', label: 'Rendez-vous déplacé par le salon', view: 'agent' },
      { key: 'chargement', label: 'Chargement' }
    ],
    reset: function (k) {
      S = {
        tab: 'agenda', cal: 'week', calDay: 0, loading: k === 'chargement', full: k === 'complet',
        prestas: [
          { id: 't1', name: 'Tresses simples', dur: 120, price: 8000, active: true },
          { id: 't2', name: 'Coupe homme', dur: 30, price: 2000, active: true },
          { id: 't3', name: 'Manucure', dur: 45, price: 5000, active: true },
          { id: 't4', name: 'Soin du visage', dur: 60, price: 10000, active: true },
          { id: 't5', name: 'Brushing', dur: 45, price: 0, active: true }
        ],
        people: [
          { id: 'r', name: 'Rachelle', role: 'Coiffeuse', prestas: ['t1', 't5'], active: true },
          { id: 'i', name: 'Inès', role: 'Esthéticienne', prestas: ['t3', 't4'], active: true },
          { id: 'f', name: 'Fabrice', role: 'Barbier', prestas: ['t2'], active: true }
        ],
        rules: { notice: 2, cancel: 12, ahead: 14, remind: true, remindAt: '18:00' },
        appts: baseAppts()
      };
      C.say({ from: 'citizen', text: 'Bonjour, je voudrais faire des tresses cette semaine.' });
      if (k === 'normal' || k === 'complet' || k === 'chargement') {
        C.say({ from: 'agent', text: 'Bonjour ! Réservez directement votre créneau avec « Prendre rendez-vous ».' });
      }
      if (k === 'proposer') {
        C.say({ from: 'agent', card: 'slots', data: { presta: 't1', list: [{ day: 1, start: 15 * 60 + 30, person: 'r' }, { day: 2, start: 9 * 60, person: 'r' }, { day: 3, start: 10 * 60, person: 'r' }] } });
      }
      if (k === 'rappel' || k === 'absent' || k === 'deplace') {
        var a = { id: 'm1', day: k === 'absent' ? -1 : 1, start: 10 * 60, presta: 't1', person: 'r', client: C.app.citizen.name, status: k === 'absent' ? 'noshow' : 'confirmed' };
        if (k === 'absent') a.status = 'confirmed';
        S.appts.push(a);
        C.say({ from: 'citizen', card: 'appt', cardLabel: 'réservation', data: { aid: a.id } });
        if (k === 'rappel') C.say({ from: 'auto', card: 'reminder', data: { aid: a.id } });
        if (k === 'deplace') {
          C.say({ from: 'agent', card: 'moved', data: { aid: a.id, oldDay: 1, oldStart: 10 * 60, why: 'Rachelle est malade demain. Nous vous proposons ce nouveau créneau.' } });
          a.day = 2; a.start = 15 * 60;
        }
      }
    },
    admin: admin,
    phoneLoading: function () { return S.loading; },
    deskLoading: function () { return S.loading; },
    phoneHead: function () { return '<button type="button" class="icon-btn" data-act="ph-book" aria-label="Prendre rendez-vous" title="Prendre rendez-vous">' + icon('calendar') + '</button>'; },
    quick: function () { return S.loading ? '' : '<button type="button" data-act="ph-book">' + icon('calendar') + 'Prendre rendez-vous</button>'; },
    tools: function () { return [{ act: 'open-propose', icon: 'calendar', label: 'Proposer des créneaux', isNew: true }]; },
    side: function () {
      var a = mine();
      if (!a) return '<div><h3>Rendez-vous</h3><p class="small muted">Aucun rendez-vous à venir.</p></div>';
      var past = a.day < NOW.day || (a.day === NOW.day && a.start < NOW.min);
      return '<div><h3>Rendez-vous</h3><div class="card" style="padding:12px"><div class="row row--between" style="margin-bottom:8px"><strong>' + cap(dayLong(a.day)) + ' · ' + hm(a.start) + '</strong>' + badge(a) + '</div><div class="small muted" style="margin-bottom:10px">' + esc(presta(a.presta).name) + ' avec ' + person(a.person).name + '</div>' +
        (a.status === 'confirmed' || a.status === 'pending' ? '<div class="row row--wrap" style="gap:6px">' + (past ? '<button type="button" class="btn btn--sm" data-act="mark-done">' + icon('check') + 'Venu</button><button type="button" class="btn btn--sm btn--danger" data-act="mark-noshow">Absent</button>' : '<button type="button" class="btn btn--sm" data-act="open-move">' + icon('calendar') + 'Déplacer</button><button type="button" class="btn btn--sm btn--danger" data-act="open-cancel">Annuler</button>') + '</div>' : '') +
        '</div></div>';
    },
    card: card,
    act: {
      tab: function (el) { S.tab = el.dataset.tab; C.render(); },
      cal: function (el) { S.cal = el.dataset.v; C.render(); },
      'cal-day': function (el) { S.calDay = Math.max(0, Math.min(6, S.calDay + (+el.dataset.d))); C.render(); },
      'presta-active': function (el) { presta(el.dataset.id).active = el.checked; C.render(); },
      'person-active': function (el) { person(el.dataset.id).active = el.checked; C.render(); },
      'new-presta': function () { S.pdraft = { name: '', dur: 60, price: '', people: [] }; C.modal(prestaModal); },
      'pdraft-person': function (el) { var l = S.pdraft.people, i = l.indexOf(el.dataset.id); if (i === -1) l.push(el.dataset.id); else l.splice(i, 1); C.render(); },
      'save-presta': function () {
        var d = S.pdraft;
        if (!d.name.trim()) { d.err = 'Donnez un nom à la prestation.'; C.render(); return; }
        var id = 't' + C.uid();
        S.prestas.push({ id: id, name: d.name, dur: +d.dur, price: +String(d.price).replace(/\D/g, '') || 0, active: true });
        d.people.forEach(function (pid) { person(pid).prestas.push(id); });
        C.modalFn = null; C.render(); C.toast('Prestation ajoutée');
      },
      'new-person': function () { S.ndraft = { kind: 'person', name: '', role: '', prestas: [] }; C.modal(personModal); },
      'ndraft-kind': function (el) { S.ndraft.kind = el.dataset.v; C.render(); },
      'ndraft-presta': function (el) { var l = S.ndraft.prestas, i = l.indexOf(el.dataset.id); if (i === -1) l.push(el.dataset.id); else l.splice(i, 1); C.render(); },
      'save-person': function () {
        var d = S.ndraft, room = d.kind === 'room', name = d.name.trim();
        if (!name) { d.err = room ? 'Donnez un nom à la salle.' : 'Indiquez le prénom.'; C.render(); return; }
        if (S.people.some(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })) { d.err = 'Ce nom existe déjà.'; C.render(); return; }
        S.people.push({ id: 'n' + C.uid(), name: name, role: d.role.trim() || (room ? 'Salle' : 'Personne réservable'), prestas: d.prestas.slice(), active: true, room: room });
        C.modalFn = null; C.render(); C.toast((room ? 'Salle' : 'Personne') + ' ajoutée');
      },
      'save-rules': function () { C.toast('Règles enregistrées'); },

      'open-propose': function () {
        S.prop = { presta: 't1', person: '', day: Math.max(0, firstOpenDay('t1', '')), picked: [] };
        C.modal(proposeModal);
      },
      'prop-day': function (el) { S.prop.day = +el.dataset.d; C.render(); },
      'prop-slot': function (el) {
        var f = S.prop, s = { day: f.day, start: +el.dataset.s, person: el.dataset.p };
        var i = -1; f.picked.forEach(function (x, j) { if (x.day === s.day && x.start === s.start) i = j; });
        if (f.move) f.picked = [s];
        else if (i !== -1) f.picked.splice(i, 1);
        else if (f.picked.length < 3) f.picked.push(s);
        else { C.toast('3 créneaux au maximum'); return; }
        C.render();
      },
      'send-slots': function () {
        C.say({ from: 'agent', card: 'slots', data: { presta: S.prop.presta, list: S.prop.picked.slice() } });
        C.modalFn = null; C.render();
      },
      'open-move': function () {
        var a = mine();
        S.prop = { move: true, presta: a.presta, person: a.person, day: Math.max(0, firstOpenDay(a.presta, a.person, Math.max(0, a.day))), picked: [], why: 'Nous devons décaler votre rendez-vous, désolés pour le dérangement.' };
        C.modal(proposeModal);
      },
      'send-move': function () {
        var a = mine(), s = S.prop.picked[0];
        var data = { aid: a.id, oldDay: a.day, oldStart: a.start, why: S.prop.why };
        a.day = s.day; a.start = s.start; a.person = s.person;
        C.say({ from: 'agent', card: 'moved', data: data });
        C.modalFn = null; C.render();
      },
      'appt-open': function (el) { S.openId = el.dataset.id; C.modal(apptModal); },
      'appt-relaunch': function () {
        var a = appt(S.openId); a.relaunchedAt = C.time();
        if (a.client === C.app.citizen.name) C.say({ from: 'auto', card: 'reminder', data: { aid: a.id } });
        C.render(); C.toast('Rappel renvoyé à ' + a.client);
      },
      'appt-manual': function () {
        var a = appt(S.openId); a.status = 'confirmed'; a.manual = true;
        C.modalFn = null; C.render(); C.toast('Rendez-vous de ' + a.client + ' marqué confirmé');
      },
      'open-cancel': function () { S.cancelWhy = 'Le salon est fermé exceptionnellement.'; C.modal(cancelModal); },
      'confirm-cancel': function () {
        var a = mine(); a.status = 'cancelled'; a.why = S.cancelWhy;
        C.say({ from: 'agent', text: 'Votre rendez-vous de ' + when(a).toLowerCase() + ' est annulé. ' + S.cancelWhy });
        C.modalFn = null; C.render();
      },
      'mark-noshow': function () {
        var a = mine(); a.status = 'noshow';
        C.say({ from: 'system', text: 'Rendez-vous d\'hier noté « absent »' });
        C.say({ from: 'agent', text: 'Votre rendez-vous d\'hier a été manqué. Vous pouvez en reprendre un quand vous le souhaitez.' });
        C.render();
      },
      'mark-done': function () { mine().status = 'done'; C.render(); C.toast('Rendez-vous noté « venu »'); },

      'ph-book': function () { S.book = { step: 1, person: '', week: 0, day: -1 }; C.layers = []; C.layer(booking, { full: true }); },
      'bk-presta': function (el) { var b = S.book; b.presta = el.dataset.id; b.step = 2; b.week = 0; b.day = firstOpenDay(b.presta, b.person, 0); if (b.day > 6) b.day = -1; C.render(); },
      'bk-person': function (el) { var b = S.book; b.person = el.dataset.id; b.day = firstOpenDay(b.presta, b.person, b.week * 7); if (b.day > b.week * 7 + 6) b.day = -1; C.render(); },
      'bk-day': function (el) { S.book.day = +el.dataset.d; C.render(); },
      'bk-week': function (el) { var b = S.book; b.week = +el.dataset.w; b.day = firstOpenDay(b.presta, b.person, b.week * 7); if (b.day > b.week * 7 + 6) b.day = -1; C.render(); },
      'bk-ask': function () { C.closeLayers(); C.say({ from: 'citizen', text: 'Plus de créneau pour ' + presta(S.book.presta).name + ' cette semaine. Pouvez-vous me rappeler si une place se libère ?' }); C.render(); },
      'bk-slot': function (el) { var b = S.book; b.start = +el.dataset.s; b.slotPerson = el.dataset.p; b.step = 3; C.render(); },
      'bk-back': function () { var b = S.book; b.step--; C.render(); },
      'bk-confirm': function () {
        var b = S.book;
        if (b.busy) return;
        b.busy = true; C.render();
        C.later(800, function () {
          var a = { id: 'm' + C.uid(), day: b.day, start: b.start, presta: b.presta, person: b.slotPerson, client: C.app.citizen.name, status: 'confirmed' };
          S.appts.push(a);
          C.layers = [];
          C.say({ from: 'citizen', card: 'appt', cardLabel: 'réservation', data: { aid: a.id } });
        });
      },
      'ph-pick-slot': function (el) {
        var m = C.find(el.dataset.m), s = m.data.list[+el.dataset.i];
        m.data.chosen = s;
        var a = { id: 'm' + C.uid(), day: s.day, start: s.start, presta: m.data.presta, person: s.person, client: C.app.citizen.name, status: 'confirmed' };
        S.appts.push(a);
        C.say({ from: 'citizen', card: 'appt', cardLabel: 'réservation', data: { aid: a.id } });
        C.render();
      },
      'ph-remind': function (el) {
        var m = C.find(el.dataset.m), a = appt(m.data.aid);
        m.data.answer = el.dataset.a;
        if (el.dataset.a === 'no') { a.status = 'cancelled'; a.why = 'Annulé par vous'; C.say({ from: 'system', text: 'Rendez-vous annulé : le créneau est de nouveau libre' }); }
        else C.say({ from: 'system', text: 'Rendez-vous confirmé pour ' + when(a).toLowerCase() });
        C.render();
      },
      'ph-moved-ok': function (el) { C.find(el.dataset.m).data.answer = 'ok'; C.render(); }
    },
    input: {
      pdraft: function (el) { S.pdraft[el.dataset.k] = el.value; },
      ndraft: function (el) {
        S.ndraft[el.dataset.k] = el.value;
        if (el.dataset.k === 'name' && S.ndraft.err) { S.ndraft.err = ''; el.classList.remove('input--error'); if (el.nextElementSibling) el.nextElementSibling.remove(); }
      },
      'prop-why': function (el) { S.prop.why = el.value; },
      'cancel-why': function (el) { S.cancelWhy = el.value; }
    },
    change: {
      pdraft: function (el) { S.pdraft[el.dataset.k] = el.value; },
      prop: function (el) { var f = S.prop; f[el.dataset.k] = el.value; if (el.dataset.k === 'presta') f.person = ''; f.picked = []; f.day = Math.max(0, firstOpenDay(f.presta, f.person)); C.render(); },
      rule: function (el) { S.rules[el.dataset.k] = el.type === 'checkbox' ? el.checked : (isNaN(+el.value) ? el.value : +el.value); C.render(); }
    }
  });
})();
