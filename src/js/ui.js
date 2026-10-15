// Utilitaires DOM minimaux (pas de framework).
export function h(tag, attrs = {}, ...enfants) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  el.append(...enfants.flat().filter((e) => e != null && e !== false));
  return el;
}

// Annonce vocale via une région live existante (#annonces).
export function annoncer(message) {
  const zone = document.getElementById('annonces');
  if (!zone) return;
  zone.textContent = '';
  // Le décalage force la relecture même si le message est identique.
  setTimeout(() => { zone.textContent = message; }, 50);
}

export const dateLongue = (iso) =>
  new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

export const dateHeure = (iso) =>
  new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso));

export const taille = (octets) =>
  octets >= 1048576 ? `${(octets / 1048576).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round(octets / 1024))} Ko`;
