import { api, ApiError } from '../api.js';
import { initialiserCoque } from '../coque.js';
import { h, annoncer, dateHeure } from '../ui.js';
import { STATUTS_FORMULAIRE, badge, rendreFrise, erreurChamp, resumeErreurs, icone, ICONES } from '../composants.js';

const $ = (id) => document.getElementById(id);
const TITRES = ['Pays des acheteurs', 'Volumes', 'Récapitulatif et validation'];

let formulaire = null; // réponse API (options, préremplis, statut…)
let d = null; // données en cours de saisie
let etape = 1;
let initial = null; // valeurs préremplies d'origine (pour retirer le marqueur après modification)

const lectureSeule = () => formulaire.statut === 'soumis';
const horsListe = () => d.paysAcheteurs.filter((p) => !formulaire.options.paysAutorises.includes(p));
const nombre = (v) => (v === '' || v == null ? null : Number(v));

/* ---------- Lecture / écriture du formulaire ---------- */

function lire() {
  d.partExport = nombre($('partExport').value);
  d.nbAcheteurs = nombre($('nbAcheteurs').value);
  d.devises = [...document.querySelectorAll('input[name="devises"]:checked')].map((i) => i.value);
  d.commentaire = $('commentaire').value;
  d.justification = $('justification').value;
}

function ecrire() {
  $('partExport').value = d.partExport ?? '';
  $('nbAcheteurs').value = d.nbAcheteurs ?? '';
  $('commentaire').value = d.commentaire;
  $('justification').value = d.justification;
  document.querySelectorAll('input[name="devises"]').forEach((i) => { i.checked = d.devises.includes(i.value); });
  rendrePays();
  majPrerempli();
}

function majPrerempli() {
  for (const cle of ['partExport', 'nbAcheteurs']) {
    const note = $(`aide-${cle}`);
    const actif = formulaire.preremplis[cle] && d[cle] === initial[cle];
    note.hidden = !actif;
    if (actif) note.querySelector('[data-texte]').textContent = formulaire.preremplis[cle];
  }
}

/* ---------- Étape 1 : pays ---------- */

function rendreSelect() {
  const restants = formulaire.options.pays.filter((p) => !d.paysAcheteurs.includes(p));
  $('pays-select').replaceChildren(h('option', { value: '' }, 'Sélectionner un pays'), ...restants.map((p) => h('option', { value: p }, p)));
}

function rendrePays() {
  rendreSelect();
  $('pays-vide').hidden = d.paysAcheteurs.length > 0;
  $('pays-liste').replaceChildren(...d.paysAcheteurs.map((p) => {
    const hors = !formulaire.options.paysAutorises.includes(p);
    return h('li', { class: 'inline-flex items-center gap-2 rounded-sm border border-bordure bg-surface py-1 pl-3 pr-1' },
      h('span', {}, p, hors && h('span', { class: 'font-semibold' }, ' (hors liste)')),
      h('button', { type: 'button', class: 'btn btn-secondaire !min-h-9 !px-3 !py-0', onclick: () => retirerPays(p) },
        'Retirer', h('span', { class: 'sr-only' }, ` ${p}`)));
  }));
  const hl = horsListe();
  $('hors-liste').hidden = hl.length === 0;
  $('hors-liste').replaceChildren(...hl.map((p) => h('p', { class: 'alerte-attention mt-2 flex gap-2 font-semibold' },
    icone(ICONES.alerte), `Pays ${p} hors liste autorisée : à justifier.`)));
  $('bloc-justification').hidden = hl.length === 0;
}

function ajouterPays() {
  const select = $('pays-select');
  if (!select.value) {
    erreurChamp(select, 'choisissez un pays dans la liste avant de l’ajouter.');
    select.focus();
    return;
  }
  erreurChamp(select, null);
  const pays = select.value;
  lire();
  d.paysAcheteurs.push(pays);
  rendrePays();
  const hors = !formulaire.options.paysAutorises.includes(pays);
  annoncer(hors ? `${pays} ajouté. Attention : pays hors liste autorisée, une justification est demandée.` : `${pays} ajouté.`);
  $('pays-select').focus();
}

function retirerPays(pays) {
  lire();
  d.paysAcheteurs = d.paysAcheteurs.filter((p) => p !== pays);
  rendrePays();
  annoncer(`${pays} retiré.`);
  $('pays-select').focus();
}

/* ---------- Validation par étape ---------- */

function valider(n) {
  lire();
  const problemes = [];
  const verif = (champ, message, texte) => {
    if (message) problemes.push({ texte, champ });
    if (champ.tagName) erreurChamp(champ, message);
  };
  if (n === 1) {
    const sel = $('pays-select');
    const e1 = d.paysAcheteurs.length ? null : 'ajoutez au moins un pays.';
    erreurChamp(sel, e1);
    if (e1) problemes.push({ texte: `Pays des acheteurs : ${e1}`, champ: sel });
    const e2 = horsListe().length && !d.justification.trim() ? 'justifiez la présence de pays hors liste autorisée.' : null;
    verif($('justification'), e2, `Justification : ${e2}`);
  }
  if (n === 2) {
    const pe = $('partExport');
    const e1 = !Number.isFinite(d.partExport) || d.partExport < 0 || d.partExport > 100 ? 'saisissez un pourcentage entre 0 et 100.' : null;
    verif(pe, e1, `Part du chiffre d’affaires à l’export : ${e1}`);
    const eDev = d.devises.length ? null : 'sélectionnez au moins une devise.';
    $('erreur-devises').hidden = !eDev;
    $('erreur-devises').textContent = eDev ? `Erreur : ${eDev}` : '';
    if (eDev) problemes.push({ texte: `Devises de facturation : ${eDev}`, champ: document.querySelector('input[name="devises"]') });
    const nb = $('nbAcheteurs');
    const e3 = !Number.isInteger(d.nbAcheteurs) || d.nbAcheteurs < 0 ? 'saisissez un nombre entier positif ou nul.' : null;
    verif(nb, e3, `Nombre d’acheteurs à l’étranger : ${e3}`);
  }
  resumeErreurs($('erreurs'), problemes);
  return problemes.length === 0;
}

/* ---------- Récapitulatif ---------- */

function rendreRecap() {
  const hl = horsListe();
  const lignes = [
    [1, 'Pays des acheteurs', d.paysAcheteurs.map((p) => (hl.includes(p) ? `${p} (hors liste)` : p)).join(', ') || 'Non renseigné'],
    ...(hl.length ? [[1, 'Justification', d.justification || 'Non renseignée']] : []),
    [2, 'Part du CA à l’export', d.partExport == null ? 'Non renseignée' : `${d.partExport} %`],
    [2, 'Devises de facturation', d.devises.join(', ') || 'Non renseignées'],
    [2, 'Nombre d’acheteurs à l’étranger', d.nbAcheteurs ?? 'Non renseigné'],
    [2, 'Commentaire', d.commentaire || '—'],
  ];
  $('recap').replaceChildren(...lignes.map(([n, t, v]) => h('div', { class: 'grid gap-2 py-3 sm:grid-cols-[1fr_2fr_auto] sm:items-start' },
    h('dt', { class: 'font-semibold' }, t),
    h('dd', { class: 'break-words' }, String(v)),
    !lectureSeule() && h('dd', {}, h('button', { type: 'button', class: 'btn btn-secondaire !min-h-9 !py-0', onclick: () => aller(n) },
      'Modifier', h('span', { class: 'sr-only' }, ` : ${t}`))))));
}

/* ---------- Navigation entre étapes ---------- */

function aller(n, { focus = true } = {}) {
  etape = n;
  document.querySelectorAll('[data-etape]').forEach((s) => { s.hidden = Number(s.dataset.etape) !== n; });
  rendreFrise($('etapes'), TITRES, n);
  $('etapes').className = 'mt-6 grid gap-3 border-t border-trait pt-4 sm:grid-cols-3';
  if (n === 3) rendreRecap();
  $('btn-precedent').hidden = n === 1 || lectureSeule();
  $('btn-suivant').textContent = n === 3 ? 'Soumettre le questionnaire' : 'Suivant';
  $('btn-suivant').hidden = lectureSeule();
  $('btn-brouillon').hidden = lectureSeule();
  document.title = `Questionnaire pays – étape ${n} sur 3 – Portail EGA`;
  resumeErreurs($('erreurs'), []);
  if (focus) $(`h-${n}`).focus();
}

/* ---------- Enregistrement ---------- */

function majEntete() {
  $('statut-badge').replaceChildren(badge(STATUTS_FORMULAIRE[formulaire.statut]));
  $('pct').textContent = formulaire.pourcentage;
  $('barre').value = formulaire.pourcentage;
}

async function enregistrer({ message = true } = {}) {
  lire();
  formulaire = { ...formulaire, ...(await api.put('/formulaires/pays', { donnees: d })) };
  if (message) {
    const heure = new Intl.DateTimeFormat('fr-FR', { timeStyle: 'short' }).format(new Date());
    const m = $('msg-brouillon');
    m.hidden = false;
    m.textContent = `Brouillon enregistré à ${heure} : ${formulaire.pourcentage} % complété.`;
    annoncer(m.textContent);
  }
  majEntete();
}

async function soumettre() {
  lire();
  try {
    formulaire = { ...formulaire, ...(await api.post('/formulaires/pays/soumission', { donnees: d })) };
  } catch (err) {
    if (err instanceof ApiError && err.data.erreurs) {
      const cles = Object.keys(err.data.erreurs);
      aller(cles.some((c) => ['paysAcheteurs', 'justification'].includes(c)) ? 1 : 2);
      valider(etape);
    } else {
      resumeErreurs($('erreurs'), [{ texte: err.message }]);
    }
    return;
  }
  majEntete();
  passerEnLectureSeule(true);
}

function passerEnLectureSeule(vientDeSoumettre) {
  $('bandeau-soumis').hidden = false;
  $('bandeau-soumis').textContent = vientDeSoumettre
    ? 'Votre questionnaire a bien été soumis. Votre interlocuteur commercial a été notifié.'
    : `Questionnaire soumis le ${dateHeure(formulaire.soumisLe)}. Il n’est plus modifiable.`;
  $('intro-recap').textContent = 'Voici les réponses transmises.';
  $('h-3').textContent = 'Récapitulatif des réponses';
  aller(3, { focus: false });
  $('bandeau-soumis').focus();
}

/* ---------- Initialisation ---------- */

function brancher() {
  $('pays-ajouter').addEventListener('click', ajouterPays);
  $('justification').addEventListener('input', () => erreurChamp($('justification'), null));
  ['partExport', 'nbAcheteurs'].forEach((c) => $(c).addEventListener('input', () => { lire(); majPrerempli(); }));
  $('btn-precedent').addEventListener('click', () => { lire(); aller(etape - 1); });
  $('btn-brouillon').addEventListener('click', async () => {
    try { await enregistrer(); } catch (err) { resumeErreurs($('erreurs'), [{ texte: err.message }]); }
  });
  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (lectureSeule()) return;
    if (etape < 3) {
      if (!valider(etape)) return;
      try { await enregistrer({ message: false }); } catch (err) { resumeErreurs($('erreurs'), [{ texte: err.message }]); return; }
      aller(etape + 1);
    } else {
      await soumettre();
    }
  });
  $('devises').replaceChildren(...formulaire.options.devises.map((v) => h('div', { class: 'flex items-center gap-2' },
    h('input', { type: 'checkbox', id: `devise-${v}`, name: 'devises', value: v, class: 'size-6 accent-[var(--c-marque)]' }),
    h('label', { for: `devise-${v}` }, v))));
}

async function charger() {
  $('erreur').hidden = true;
  try {
    formulaire = await api.get('/formulaires/pays');
  } catch (err) {
    $('etat').hidden = true;
    $('erreur').hidden = false;
    $('erreur').querySelector('p').textContent = err.message;
    $('erreur').focus();
    return;
  }
  d = structuredClone(formulaire.donnees);
  initial = structuredClone(formulaire.donnees);
  $('etat').hidden = true;
  $('vue').hidden = false;
  brancher();
  ecrire();
  majEntete();
  if (lectureSeule()) passerEnLectureSeule(false);
  else aller(1, { focus: false });
}

$('reessayer').addEventListener('click', charger);
await initialiserCoque('prospect');
await charger();
