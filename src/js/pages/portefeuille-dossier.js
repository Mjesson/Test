import { api } from '../api.js';
import { initialiserCoque } from '../coque.js';
import { h, dateLongue } from '../ui.js';
import { STATUTS, badge, rendreFrise, icone, ICONES } from '../composants.js';

const $ = (id) => document.getElementById(id);

async function charger() {
  const id = new URLSearchParams(location.search).get('id');
  let d;
  try {
    d = await api.get(`/portefeuille/${encodeURIComponent(id ?? '')}`);
  } catch (err) {
    $('etat').hidden = true;
    $('erreur').hidden = false;
    $('erreur').querySelector('p').textContent = err.status === 404 ? 'Ce dossier est introuvable dans votre portefeuille.' : err.message;
    $('erreur').focus();
    return;
  }
  document.title = `Suivi du dossier ${d.id} – Portail EGA`;
  $('etat').hidden = true;
  $('vue').hidden = false;
  $('id').textContent = d.id;
  $('prospect').textContent = d.prospect;
  $('eta').textContent = `vers le ${dateLongue(d.eta)}`;
  $('completude').value = d.completude;
  $('completude-txt').textContent = `${d.completude} %`;
  $('ic').textContent = d.ic;
  if (d.bloque) {
    $('bloque').hidden = false;
    $('bloque').replaceChildren(icone(ICONES.alerte), 'Dossier bloqué : au moins une pièce est à corriger ou à fournir.');
  }
  rendreFrise($('frise'), d.etapes, d.etapeIndex);
  $('documents').replaceChildren(...d.documents.map((doc) => h('tr', { class: 'border-b border-trait' },
    h('th', { scope: 'row', class: 'py-3 pr-3 font-medium' }, doc.libelle),
    h('td', { class: 'py-3 pl-3' }, badge(STATUTS[doc.statut])))));
}

await initialiserCoque('apporteur');
await charger();
