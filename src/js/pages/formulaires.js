import { api } from '../api.js';
import { initialiserCoque } from '../coque.js';
import { h } from '../ui.js';
import { STATUTS_FORMULAIRE, badge } from '../composants.js';

const $ = (id) => document.getElementById(id);

function carte(f) {
  const titreId = `f-${f.id}`;
  const action = f.disponible
    ? h('a', { class: 'btn btn-secondaire', href: `/formulaire-${f.id}.html` },
      f.statut === 'soumis' ? 'Consulter' : f.statut === 'brouillon' ? 'Reprendre' : 'Commencer',
      h('span', { class: 'sr-only' }, ` : ${f.titre}`))
    : h('p', { class: 'text-sm text-discret' }, f.aVenir ? 'Ce formulaire sera disponible prochainement.' : 'Détail non disponible dans cette version de démonstration.');
  return h('li', { class: 'carte flex flex-col gap-3', 'aria-labelledby': titreId },
    h('h2', { id: titreId, class: 'text-lg' }, f.titre),
    h('div', { class: 'flex flex-wrap items-center gap-3' }, badge(STATUTS_FORMULAIRE[f.statut]),
      h('span', { class: 'text-sm text-discret' }, `${f.pourcentage} % complété`)),
    h('progress', { max: '100', value: String(f.pourcentage), class: 'block h-2 w-full', 'aria-label': `Remplissage : ${f.titre}` }),
    h('div', { class: 'mt-auto' }, action));
}

async function charger() {
  $('erreur').hidden = true;
  try {
    const { formulaires } = await api.get('/formulaires');
    $('etat').hidden = true;
    $('liste').replaceChildren(...formulaires.map(carte));
  } catch (err) {
    $('etat').hidden = true;
    $('erreur').hidden = false;
    $('erreur').querySelector('p').textContent = err.message;
    $('erreur').focus();
  }
}

$('reessayer').addEventListener('click', charger);
await initialiserCoque('prospect');
await charger();
