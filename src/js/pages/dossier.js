import { api, ApiError, envoyerFichier } from '../api.js';
import { initialiserCoque } from '../coque.js';
import { h, annoncer, dateLongue, dateHeure, taille } from '../ui.js';

const TAILLE_MAX = 20 * 1024 * 1024;
const TYPES = ['application/pdf', 'image/jpeg'];
const $ = (id) => document.getElementById(id);

// Statuts : texte + icône (jamais la couleur seule).
const STATUTS = {
  a_fournir: { libelle: 'À fournir', action: 'Déposer', classe: 'border-bordure bg-surface text-texte', icone: 'M12 5v14M5 12h14' },
  recu: { libelle: 'Reçu', action: 'Voir', classe: 'border-bordure bg-fond text-texte', icone: 'M5 13l4 4L19 7' },
  en_controle: { libelle: 'En contrôle', action: 'Voir', classe: 'border-bordure bg-fond text-texte', icone: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z' },
  a_corriger: { libelle: 'À corriger', action: 'Remplacer', classe: 'border-erreur bg-erreur-fond text-erreur', icone: 'M12 8v5m0 3v.01M12 3l10 18H2L12 3z' },
  valide: { libelle: 'Validé', action: 'Voir', classe: 'border-succes bg-surface text-succes', icone: 'M5 13l4 4L19 7' },
};

const icone = (d) => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'size-4 shrink-0');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
};

let dossier = null;
let cible = null; // document visé par « Déposer » / « Remplacer »

/* ---------- Rendu ---------- */

function rendreFrise() {
  $('frise').replaceChildren(...dossier.etapes.map((nom, i) => {
    const n = i + 1;
    const etat = n < dossier.etape ? 'terminée' : n === dossier.etape ? 'en cours' : 'à venir';
    const fait = n < dossier.etape;
    const courant = n === dossier.etape;
    return h('li', { class: 'flex items-start gap-3 sm:flex-col sm:gap-2', 'aria-current': courant ? 'step' : false },
      h('span', {
        class: `flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-semibold ${
          fait ? 'border-marque bg-marque text-marque-texte' : courant ? 'border-marque bg-surface text-texte ring-2 ring-marque ring-offset-2' : 'border-bordure bg-surface text-discret'}`,
        'aria-hidden': 'true',
      }, fait ? icone('M5 13l4 4L19 7') : String(n)),
      h('span', {},
        h('span', { class: 'block text-sm text-discret' }, `Étape ${n} sur ${dossier.etapes.length}`),
        h('span', { class: courant ? 'block font-semibold' : 'block' }, nom),
        h('span', { class: 'block text-sm text-discret' }, etat)));
  }));
}

function rendreInfos() {
  const d = dossier;
  const lignes = [
    ['Raison sociale', d.societe], ['SIREN', d.siren], ['Adresse', d.adresse],
    ['Dirigeant', d.dirigeant], ['Interlocuteur commercial', d.ic.nom],
  ];
  $('infos').replaceChildren(...lignes.map(([t, v]) =>
    h('div', {}, h('dt', { class: 'text-sm text-discret' }, t), h('dd', { class: 'font-medium' }, v))));
}

function badge(statut) {
  const s = STATUTS[statut];
  return h('span', { class: `inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-sm font-semibold ${s.classe}` }, icone(s.icone), s.libelle);
}

function rendreDocuments() {
  $('documents').replaceChildren(...dossier.documents.map((doc) => {
    const s = STATUTS[doc.statut];
    const verrou = Boolean(dossier.envoye);
    const bouton = (doc.statut === 'a_fournir' || doc.statut === 'a_corriger')
      ? h('button', { type: 'button', class: 'btn btn-secondaire', disabled: verrou, onclick: () => choisirCible(doc) },
        s.action, h('span', { class: 'sr-only' }, ` : ${doc.libelle}`))
      : h('button', { type: 'button', class: 'btn btn-secondaire', onclick: () => voirDocument(doc) },
        s.action, h('span', { class: 'sr-only' }, ` : ${doc.libelle}`));
    return h('tr', { class: 'border-b border-trait align-top' },
      h('th', { scope: 'row', class: 'py-3 pr-3 font-medium' }, doc.libelle,
        // Sous 640 px, le statut passe sous le libellé (la colonne dédiée est masquée).
        h('span', { class: 'mt-2 block font-normal sm:hidden' }, badge(doc.statut)),
        doc.motif && h('p', { class: 'mt-1 text-sm font-normal text-erreur' }, h('span', { class: 'font-semibold' }, 'Motif du rejet : '), doc.motif)),
      h('td', { class: 'hidden px-3 py-3 sm:table-cell' }, badge(doc.statut)),
      h('td', { class: 'py-3 pl-3' }, bouton));
  }));
  const nr = dossier.nonRattachees;
  $('non-rattachees').hidden = nr.length === 0;
  $('liste-non-rattachees').replaceChildren(...nr.map((f) => h('li', {}, `${f.fichier} (${taille(f.taille)})`)));
}

function rendreValidation() {
  const manquants = dossier.manquants;
  const bouton = $('btn-valider');
  const envoye = Boolean(dossier.envoye);
  bouton.hidden = envoye;
  bouton.setAttribute('aria-disabled', String(manquants > 0));
  $('aide-validation').textContent = envoye
    ? `Dossier envoyé le ${dateLongue(dossier.envoye)}. Il est en cours de contrôle.`
    : manquants > 0
      ? `Le bouton sera disponible quand tous les documents auront été déposés et corrigés. Il en reste ${manquants} à fournir ou à corriger.`
      : 'Tous les documents sont déposés. Vous pouvez valider l’envoi de votre dossier.';
  $('depot-ferme').hidden = !envoye;
  $('zone-depot').hidden = envoye;
}

function rendre() {
  $('numero').textContent = dossier.numero;
  $('societe').textContent = dossier.societe;
  $('eta').textContent = `estimée vers le ${dateLongue(dossier.eta)}`;
  $('completude').value = dossier.completude;
  $('completude-txt').textContent = `${dossier.completude} %`;
  $('lien-ic').textContent = `Écrire à mon interlocuteur commercial (${dossier.ic.nom})`;
  rendreFrise(); rendreInfos(); rendreDocuments(); rendreValidation();
}

async function charger({ focus = false } = {}) {
  $('etat-erreur').hidden = true;
  try {
    dossier = await api.get('/dossier');
  } catch (err) {
    $('etat-chargement').hidden = true;
    $('etat-erreur').hidden = false;
    $('etat-erreur').querySelector('p').textContent = err.message;
    $('etat-erreur').focus();
    return;
  }
  $('etat-chargement').hidden = true;
  $('vue').hidden = false;
  rendre();
  if (focus) $('numero').closest('h1').scrollIntoView();
}

/* ---------- Dépôt ---------- */

function choisirCible(doc) {
  cible = doc;
  $('cible').hidden = false;
  $('cible-nom').textContent = doc.libelle;
  $('fichiers').click();
  $('fichiers').focus();
}
function viderCible() { cible = null; $('cible').hidden = true; }
$('cible-annuler').addEventListener('click', () => { viderCible(); $('fichiers').focus(); });

function erreursDepot(messages) {
  const z = $('depot-erreurs');
  z.hidden = messages.length === 0;
  z.replaceChildren(...(messages.length ? [h('ul', {}, messages.map((m) => h('li', {}, m)))] : []));
}

async function traiter(fichiers) {
  const refus = [];
  const acceptes = [];
  for (const f of fichiers) {
    const typeOk = TYPES.includes(f.type) || /\.(pdf|jpe?g)$/i.test(f.name);
    if (!typeOk) refus.push(`${f.name} : format non accepté (PDF ou JPG uniquement).`);
    else if (f.size > TAILLE_MAX) refus.push(`${f.name} : fichier trop volumineux (20 Mo maximum).`);
    else acceptes.push(f);
  }
  erreursDepot(refus);
  const documentId = acceptes.length === 1 ? cible?.id : undefined;
  viderCible();
  for (const f of acceptes) await envoyer(f, documentId);
  if (acceptes.length) await charger();
}

function envoyer(fichier, documentId) {
  const progression = h('progress', { max: '100', value: '0', class: 'block h-2 w-full', 'aria-label': `Envoi de ${fichier.name}` });
  const etat = h('p', { class: 'text-sm text-discret' }, 'Envoi en cours…');
  const retry = h('button', { type: 'button', class: 'btn btn-secondaire mt-2', hidden: true }, 'Réessayer', h('span', { class: 'sr-only' }, ` l’envoi de ${fichier.name}`));
  const item = h('li', { class: 'rounded-sm border border-trait p-3' },
    h('p', { class: 'break-all font-medium' }, fichier.name, h('span', { class: 'font-normal text-discret' }, ` (${taille(fichier.size)})`)),
    progression, etat, retry);
  $('envois').prepend(item);

  const tenter = async () => {
    retry.hidden = true;
    etat.textContent = 'Envoi en cours…';
    etat.className = 'text-sm text-discret';
    progression.hidden = false;
    try {
      const r = await envoyerFichier('/documents', fichier, { documentId, onProgress: (p) => { progression.value = p; } });
      progression.value = 100;
      etat.textContent = r.rattache
        ? `Envoi terminé. Rattaché à « ${r.libelle} », statut : reçu.`
        : 'Envoi terminé. Non rattaché à un document attendu : votre interlocuteur a été alerté.';
      annoncer(`${fichier.name} : ${etat.textContent}`);
    } catch (err) {
      progression.hidden = true;
      etat.textContent = `Échec : ${err.message}`;
      etat.className = 'text-sm font-semibold text-erreur';
      retry.hidden = err.status === 413 || err.status === 415 || err.status === 409;
      annoncer(`${fichier.name} : ${etat.textContent}`);
    }
  };
  retry.addEventListener('click', tenter);
  return tenter();
}

$('fichiers').addEventListener('change', (e) => {
  const liste = [...e.target.files];
  e.target.value = '';
  if (liste.length) traiter(liste);
});

// Glisser-déposer : amélioration progressive (le champ fichier reste la voie principale).
const zone = $('zone-depot');
['dragenter', 'dragover'].forEach((t) => zone.addEventListener(t, (e) => { e.preventDefault(); zone.classList.add('bg-fond'); }));
['dragleave', 'drop'].forEach((t) => zone.addEventListener(t, () => zone.classList.remove('bg-fond')));
zone.addEventListener('drop', (e) => { e.preventDefault(); if (e.dataTransfer.files.length) traiter([...e.dataTransfer.files]); });
// Évite l'ouverture du fichier par le navigateur s'il est lâché hors de la zone.
['dragover', 'drop'].forEach((t) => window.addEventListener(t, (e) => e.preventDefault()));

/* ---------- Consultation d'un document ---------- */

function voirDocument(doc) {
  $('dlg-doc-titre').textContent = doc.libelle;
  const lignes = [['Statut', STATUTS[doc.statut].libelle], ['Fichier', doc.fichier ?? '—'],
    ['Taille', doc.taille ? taille(doc.taille) : '—'], ['Déposé le', doc.depose ? dateHeure(doc.depose) : '—']];
  $('dlg-doc-infos').replaceChildren(...lignes.map(([t, v]) =>
    h('div', {}, h('dt', { class: 'text-sm text-discret' }, t), h('dd', { class: 'break-all font-medium' }, v))));
  $('dlg-document').showModal();
}

/* ---------- Validation ---------- */

$('btn-valider').addEventListener('click', () => {
  if ($('btn-valider').getAttribute('aria-disabled') === 'true') {
    annoncer($('aide-validation').textContent);
    $('aide-validation').classList.add('font-semibold', 'text-texte');
    return;
  }
  $('dlg-conf-erreur').hidden = true;
  $('dlg-confirmation').showModal();
});

$('form-confirmation').addEventListener('submit', async (e) => {
  if (e.submitter?.value !== 'confirmer') return;
  e.preventDefault();
  const ok = $('dlg-conf-ok');
  ok.disabled = true;
  try {
    dossier = await api.post('/dossier/validation');
    $('dlg-confirmation').close();
    rendre();
    const b = $('bandeau-envoi');
    b.hidden = false;
    b.textContent = 'Votre dossier a bien été envoyé. Son contrôle est en cours ; vous serez averti de toute demande de correction.';
    b.focus();
  } catch (err) {
    const z = $('dlg-conf-erreur');
    z.hidden = false;
    z.textContent = err instanceof ApiError ? err.message : 'Une erreur est survenue.';
  } finally {
    ok.disabled = false;
  }
});

$('btn-quitter').addEventListener('click', () => document.querySelector('[data-deconnexion]').click());
$('reessayer').addEventListener('click', () => charger());

await initialiserCoque();
await charger();
