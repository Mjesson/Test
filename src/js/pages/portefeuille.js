import { api } from '../api.js';
import { initialiserCoque } from '../coque.js';
import { h, annoncer } from '../ui.js';
import { icone, ICONES } from '../composants.js';

const $ = (id) => document.getElementById(id);
const PAR_PAGE = 10;
const dateCourte = (iso) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(iso));

let data = null;
let onglet = 'cours';
let page = 1;

/* ---------- Chiffres clés ---------- */

function rendreChiffres() {
  const i = data.indicateurs;
  const tuiles = [['Dossiers en cours', i.enCours], ['Dossiers bloqués', i.bloques], ['Conformité validée', i.conformes], ['1ers paiements ce mois', i.paiementsMois]];
  $('chiffres').replaceChildren(...tuiles.map(([t, v]) => h('div', { class: 'carte' },
    h('dt', { class: 'text-sm text-discret' }, t), h('dd', { class: 'mt-1 text-3xl font-semibold' }, String(v)))));
  $('onglet-cours').textContent = `En cours (${i.enCours})`;
  $('onglet-actives').textContent = `Activés (${i.activees})`;
}

/* ---------- Onglets (motif ARIA tabs, clavier compris) ---------- */

function majOnglets() {
  document.querySelectorAll('[role="tab"]').forEach((t) => {
    const actif = t.dataset.onglet === onglet;
    t.setAttribute('aria-selected', String(actif));
    t.tabIndex = actif ? 0 : -1;
    if (actif) t.setAttribute('aria-current', 'page'); else t.removeAttribute('aria-current');
  });
  $('panneau').setAttribute('aria-labelledby', `onglet-${onglet}`);
}

function choisirOnglet(cle, { focus = false } = {}) {
  onglet = cle;
  page = 1;
  majOnglets();
  if (focus) $(`onglet-${cle}`).focus();
  rendreTableau();
}

$('onglets').addEventListener('click', (e) => { const t = e.target.closest('[role="tab"]'); if (t) choisirOnglet(t.dataset.onglet); });
$('onglets').addEventListener('keydown', (e) => {
  const ordre = ['cours', 'actives'];
  const i = ordre.indexOf(onglet);
  const cible = { ArrowRight: ordre[(i + 1) % 2], ArrowLeft: ordre[(i + 1) % 2], Home: ordre[0], End: ordre[1] }[e.key];
  if (cible) { e.preventDefault(); choisirOnglet(cible, { focus: true }); }
});

/* ---------- Filtres et tableau ---------- */

function filtrer() {
  const q = $('recherche').value.trim().toLowerCase();
  const statut = $('f-statut').value;
  const ic = $('f-ic').value;
  const etape = $('f-etape').value;
  return data.dossiers
    .filter((d) => d.actif === (onglet === 'actives'))
    .filter((d) => !q || d.prospect.toLowerCase().includes(q) || d.id.toLowerCase().includes(q))
    .filter((d) => !statut || (statut === 'bloque') === d.bloque)
    .filter((d) => !ic || d.ic === ic)
    .filter((d) => !etape || d.etape === etape)
    // Dossiers bloqués en tête (RG-P1), puis date de 1er paiement la plus proche.
    .sort((a, b) => Number(b.bloque) - Number(a.bloque) || a.eta.localeCompare(b.eta));
}

const piecesTexte = (d) => {
  const t = [d.aCorriger && `${d.aCorriger} à corriger`, d.aFournir && `${d.aFournir} à fournir`].filter(Boolean);
  return t.length ? t.join(', ') : null;
};
const activiteTexte = (j) => (j === 0 ? 'Aujourd’hui' : `Il y a ${j} j`);

function ligne(d) {
  const pieces = piecesTexte(d);
  return h('tr', { class: `border-b border-trait align-top ${d.bloque ? 'bg-surface' : ''}` },
    h('th', { scope: 'row', class: 'py-3 pr-3 font-medium' },
      h('a', { class: 'underline', href: `/portefeuille-dossier.html?id=${encodeURIComponent(d.id)}` }, d.prospect),
      h('span', { class: 'block text-sm font-normal text-discret' }, d.id),
      d.bloque && h('span', { class: 'mt-1 inline-flex items-center gap-1.5 rounded-sm border border-erreur bg-erreur-fond px-2 py-0.5 text-sm font-semibold text-erreur' },
        icone(ICONES.alerte), 'Bloqué')),
    h('td', { class: 'px-3 py-3' }, d.etape),
    h('td', { class: 'px-3 py-3' }, `${d.completude} %`),
    h('td', { class: 'px-3 py-3' }, pieces ?? h('span', {}, '—', h('span', { class: 'sr-only' }, 'Aucune'))),
    h('td', { class: 'px-3 py-3' }, h('time', { datetime: d.eta }, dateCourte(d.eta))),
    h('td', { class: 'px-3 py-3' }, d.ic),
    h('td', { class: 'py-3 pl-3' }, activiteTexte(d.activite)));
}

function rendreTableau({ annonce = true } = {}) {
  const liste = filtrer();
  const pages = Math.max(1, Math.ceil(liste.length / PAR_PAGE));
  page = Math.min(page, pages);
  const visibles = liste.slice((page - 1) * PAR_PAGE, page * PAR_PAGE);
  $('lignes').replaceChildren(...(visibles.length ? visibles.map(ligne)
    : [h('tr', {}, h('td', { colspan: '7', class: 'py-6 text-center text-discret' }, 'Aucun dossier ne correspond à ces critères.'))]));
  const total = data.dossiers.filter((d) => d.actif === (onglet === 'actives')).length;
  $('compte').textContent = `${liste.length} dossier${liste.length > 1 ? 's' : ''} affiché${liste.length > 1 ? 's' : ''} sur ${total}.`;
  $('pagination').hidden = pages === 1;
  $('page-info').textContent = `Page ${page} sur ${pages}`;
  $('page-prec').disabled = page === 1;
  $('page-suiv').disabled = page === pages;
  if (!annonce) $('compte').removeAttribute('role');
}

['recherche', 'f-statut', 'f-ic', 'f-etape'].forEach((id) => $(id).addEventListener('input', () => { page = 1; rendreTableau(); }));
$('filtres').addEventListener('submit', (e) => e.preventDefault());
$('raz').addEventListener('click', () => { $('filtres').reset(); page = 1; rendreTableau(); $('recherche').focus(); });
$('page-prec').addEventListener('click', () => { page -= 1; rendreTableau(); annoncer(`Page ${page}`); });
$('page-suiv').addEventListener('click', () => { page += 1; rendreTableau(); annoncer(`Page ${page}`); });

/* ---------- Initialisation ---------- */

async function charger() {
  $('erreur').hidden = true;
  try {
    data = await api.get('/portefeuille');
  } catch (err) {
    $('etat').hidden = true;
    $('erreur').hidden = false;
    $('erreur').querySelector('p').textContent = err.message;
    $('erreur').focus();
    return;
  }
  $('etat').hidden = true;
  $('vue').hidden = false;
  $('f-ic').replaceChildren(h('option', { value: '' }, 'Tous'), ...data.ics.map((v) => h('option', { value: v }, v)));
  $('f-etape').replaceChildren(h('option', { value: '' }, 'Toutes'), ...data.etapes.map((v) => h('option', { value: v }, v)));
  rendreChiffres();
  majOnglets();
  rendreTableau();
}

$('reessayer').addEventListener('click', charger);
await initialiserCoque('apporteur');
await charger();
