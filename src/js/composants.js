// Composants DOM partagés entre les pages (statuts, frise, erreurs de formulaire).
import { h } from './ui.js';

const NS = 'http://www.w3.org/2000/svg';
export function icone(d) {
  const svg = document.createElementNS(NS, 'svg');
  const attrs = { viewBox: '0 0 24 24', class: 'size-4 shrink-0', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' };
  for (const [k, v] of Object.entries(attrs)) svg.setAttribute(k, v);
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', d);
  svg.append(path);
  return svg;
}

export const ICONES = {
  plus: 'M12 5v14M5 12h14',
  ok: 'M5 13l4 4L19 7',
  horloge: 'M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z',
  alerte: 'M12 8v5m0 3v.01M12 3l10 18H2L12 3z',
  crayon: 'M4 20h4L19 9l-4-4L4 16v4z',
};

// Statuts de document : texte + icône (jamais la couleur seule).
export const STATUTS = {
  a_fournir: { libelle: 'À fournir', action: 'Déposer', classe: 'border-bordure bg-surface text-texte', icone: ICONES.plus },
  recu: { libelle: 'Reçu', action: 'Voir', classe: 'border-bordure bg-fond text-texte', icone: ICONES.ok },
  en_controle: { libelle: 'En contrôle', action: 'Voir', classe: 'border-bordure bg-fond text-texte', icone: ICONES.horloge },
  a_corriger: { libelle: 'À corriger', action: 'Remplacer', classe: 'border-erreur bg-erreur-fond text-erreur', icone: ICONES.alerte },
  valide: { libelle: 'Validé', action: 'Voir', classe: 'border-succes bg-surface text-succes', icone: ICONES.ok },
};

// Statuts de formulaire.
export const STATUTS_FORMULAIRE = {
  a_remplir: { libelle: 'À remplir', classe: 'border-bordure bg-surface text-texte', icone: ICONES.plus },
  brouillon: { libelle: 'Brouillon', classe: 'border-bordure bg-fond text-texte', icone: ICONES.crayon },
  soumis: { libelle: 'Soumis', classe: 'border-succes bg-surface text-succes', icone: ICONES.ok },
};

export function badge(def) {
  return h('span', { class: `inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-sm font-semibold ${def.classe}` }, icone(def.icone), def.libelle);
}

// Frise d'étapes : liste ordonnée, étape courante marquée par aria-current="step".
export function rendreFrise(ol, etapes, etape) {
  ol.className = `mt-6 grid gap-4 ${{ 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' }[etapes.length]}`;
  ol.replaceChildren(...etapes.map((nom, i) => {
    const n = i + 1;
    const fait = n < etape;
    const courant = n === etape;
    const etat = fait ? 'terminée' : courant ? 'en cours' : 'à venir';
    return h('li', { class: 'flex items-start gap-3 sm:flex-col sm:gap-2', 'aria-current': courant ? 'step' : false },
      h('span', {
        class: `flex size-9 shrink-0 items-center justify-center rounded-full border-2 font-semibold ${
          fait ? 'border-marque bg-marque text-marque-texte' : courant ? 'border-marque bg-surface text-texte ring-2 ring-marque ring-offset-2' : 'border-bordure bg-surface text-discret'}`,
        'aria-hidden': 'true',
      }, fait ? icone(ICONES.ok) : String(n)),
      h('span', {},
        h('span', { class: 'block text-sm text-discret' }, `Étape ${n} sur ${etapes.length}`),
        h('span', { class: courant ? 'block font-semibold' : 'block' }, nom),
        h('span', { class: 'block text-sm text-discret' }, etat)));
  }));
}

// Erreur d'un champ : message lié par aria-describedby (élément #erreur-<id>) + aria-invalid.
export function erreurChamp(champ, message) {
  const p = document.getElementById(`erreur-${champ.id}`);
  if (!message) {
    champ.removeAttribute('aria-invalid');
    if (p) { p.hidden = true; p.textContent = ''; }
    return;
  }
  champ.setAttribute('aria-invalid', 'true');
  if (p) { p.hidden = false; p.textContent = `Erreur : ${message}`; }
}

// Résumé d'erreurs : liste de liens vers les champs, le focus y est placé.
export function resumeErreurs(zone, messages) {
  if (!messages.length) { zone.hidden = true; zone.replaceChildren(); return; }
  zone.hidden = false;
  zone.replaceChildren(h('ul', {}, messages.map(({ texte, champ }) => h('li', {},
    champ
      ? h('a', { href: `#${champ.id}`, class: 'underline', onclick: (e) => { e.preventDefault(); champ.focus(); } }, texte)
      : texte))));
  zone.focus();
}
