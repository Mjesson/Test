import { api, ApiError, envoyerFichier } from '../api.js';
import { initialiserCoque } from '../coque.js';
import { h, annoncer, dateHeure, taille } from '../ui.js';
import { erreurChamp, resumeErreurs, icone, ICONES } from '../composants.js';

const $ = (id) => document.getElementById(id);
const TAILLE_MAX = 20 * 1024 * 1024;

let fils = [];
let courant = null; // fil ouvert

/* ---------- Liste des conversations ---------- */

function rendreListe() {
  $('fils').replaceChildren(...fils.map((f) => h('li', {},
    h('button', {
      type: 'button', 'aria-current': courant?.id === f.id ? 'true' : false,
      class: `block w-full min-h-11 px-2 py-3 text-left hover:bg-fond ${courant?.id === f.id ? 'bg-fond' : ''}`,
      onclick: () => ouvrir(f.id),
    },
    h('span', { class: `flex items-center gap-2 ${f.nonLu ? 'font-bold' : 'font-medium'}` },
      f.systeme && icone(ICONES.horloge),
      h('span', { class: 'min-w-0 flex-1 break-words' }, f.sujet),
      f.nonLu && h('span', { class: 'shrink-0 rounded-sm border border-texte px-1.5 text-xs font-semibold' }, 'Non lu')),
    h('span', { class: 'mt-1 block truncate text-sm text-discret' }, f.apercu),
    f.date && h('span', { class: 'block text-xs text-discret' }, dateHeure(f.date))))));
}

async function chargerListe() {
  const r = await api.get('/fils');
  fils = r.fils;
  rendreListe();
}

/* ---------- Fil de messages ---------- */

function message(m) {
  const systeme = m.de === 'systeme';
  const moi = m.de === 'moi';
  return h('li', { class: `rounded-sm border p-3 ${systeme ? 'border-trait bg-fond' : moi ? 'border-bordure bg-surface sm:ml-8' : 'border-bordure bg-surface sm:mr-8'}` },
    h('p', { class: 'flex flex-wrap items-baseline justify-between gap-x-3 text-sm text-discret' },
      h('span', { class: 'font-semibold text-texte' }, systeme ? 'Message automatique' : moi ? 'Vous' : `${m.auteur} (interlocuteur commercial)`),
      h('time', { datetime: m.date }, dateHeure(m.date))),
    m.texte && h('p', { class: 'mt-2 whitespace-pre-wrap break-words' }, m.texte),
    m.pj && h('p', { class: 'mt-2 break-all text-sm' }, 'Pièce jointe : ', h('strong', {}, m.pj.nom), ` (${taille(m.pj.taille)})`));
}

function rendreFil() {
  $('t-fil').textContent = courant.sujet;
  $('fil-corps').hidden = false;
  $('messages').replaceChildren(...courant.messages.map(message));
  $('form-message').hidden = courant.systeme;
  document.title = `${courant.sujet} – Messagerie – Portail EGA`;
}

async function ouvrir(id, { focus = true } = {}) {
  try {
    courant = await api.get(`/fils/${id}`);
  } catch (err) {
    annoncer(err.message);
    return;
  }
  const f = fils.find((x) => x.id === id);
  if (f) f.nonLu = false;
  rendreListe();
  rendreFil();
  if (focus) $('t-fil').focus();
}

/* ---------- Envoi d'un message / d'une pièce jointe ---------- */

$('form-message').addEventListener('submit', async (e) => {
  e.preventDefault();
  const texte = $('texte');
  const fichier = $('piece-jointe').files[0];
  const problemes = [];
  if (!texte.value.trim() && !fichier) {
    const msg = 'écrivez un message ou joignez un document.';
    erreurChamp(texte, msg);
    problemes.push({ texte: `Votre message : ${msg}`, champ: texte });
  } else {
    erreurChamp(texte, null);
  }
  if (fichier && !/\.(pdf|jpe?g)$/i.test(fichier.name)) problemes.push({ texte: `${fichier.name} : format non accepté (PDF ou JPG uniquement).`, champ: $('piece-jointe') });
  else if (fichier && fichier.size > TAILLE_MAX) problemes.push({ texte: `${fichier.name} : fichier trop volumineux (20 Mo maximum).`, champ: $('piece-jointe') });
  resumeErreurs($('msg-erreurs'), problemes);
  if (problemes.length) return;

  const bouton = e.submitter;
  bouton.disabled = true;
  try {
    if (texte.value.trim()) await api.post(`/fils/${courant.id}/messages`, { texte: texte.value });
    if (fichier) await envoyerFichier(`/fils/${courant.id}/pieces-jointes`, fichier);
    texte.value = '';
    $('piece-jointe').value = '';
    await chargerListe();
    await ouvrir(courant.id, { focus: false });
    annoncer('Message envoyé.');
    texte.focus();
  } catch (err) {
    resumeErreurs($('msg-erreurs'), [{ texte: err.message }]);
  } finally {
    bouton.disabled = false;
  }
});

/* ---------- Nouvelle conversation ---------- */

function basculerNouveau(ouvert) {
  $('form-nouveau').hidden = !ouvert;
  $('btn-nouveau').setAttribute('aria-expanded', String(ouvert));
  if (ouvert) $('nouveau-sujet').focus(); else $('btn-nouveau').focus();
}
$('btn-nouveau').addEventListener('click', () => basculerNouveau($('form-nouveau').hidden));
$('nouveau-annuler').addEventListener('click', () => basculerNouveau(false));

$('form-nouveau').addEventListener('submit', async (e) => {
  e.preventDefault();
  const sujet = $('nouveau-sujet');
  const texte = $('nouveau-texte');
  const problemes = [];
  const e1 = sujet.value.trim() ? null : 'indiquez le sujet de la conversation.';
  const e2 = texte.value.trim() ? null : 'écrivez votre message.';
  erreurChamp(sujet, e1);
  erreurChamp(texte, e2);
  if (e1) problemes.push({ texte: `Sujet : ${e1}`, champ: sujet });
  if (e2) problemes.push({ texte: `Message : ${e2}`, champ: texte });
  resumeErreurs($('nouveau-erreurs'), problemes);
  if (problemes.length) return;
  try {
    const { id } = await api.post('/fils', { sujet: sujet.value, texte: texte.value });
    sujet.value = '';
    texte.value = '';
    $('form-nouveau').hidden = true;
    $('btn-nouveau').setAttribute('aria-expanded', 'false');
    await chargerListe();
    await ouvrir(id);
    annoncer('Conversation créée.');
  } catch (err) {
    resumeErreurs($('nouveau-erreurs'), [{ texte: err instanceof ApiError ? err.message : 'Erreur inattendue.' }]);
  }
});

/* ---------- Initialisation ---------- */

async function demarrer() {
  $('erreur').hidden = true;
  try {
    await chargerListe();
  } catch (err) {
    $('etat').hidden = true;
    $('erreur').hidden = false;
    $('erreur').querySelector('p').textContent = err.message;
    $('erreur').focus();
    return;
  }
  $('etat').hidden = true;
  $('vue').hidden = false;
}

$('reessayer').addEventListener('click', demarrer);
await initialiserCoque('prospect');
await demarrer();
