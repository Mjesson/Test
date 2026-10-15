// Utilitaires HTTP partagés par les modules du mock.
export const TAILLE_MAX = 20 * 1024 * 1024;
export const TYPES = ['application/pdf', 'image/jpeg'];

export function envoyer(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

export async function corps(req) {
  let brut = '';
  try {
    for await (const morceau of req) brut += morceau;
    return JSON.parse(brut || '{}');
  } catch {
    return {};
  }
}

// Reçoit un fichier brut : on compte les octets, on ne stocke rien.
export async function recevoirFichier(req) {
  let octets = 0;
  let trop = false;
  for await (const morceau of req) {
    octets += morceau.length;
    if (octets > TAILLE_MAX) trop = true;
  }
  return { octets, trop };
}

export const nomFichier = (req) => decodeURIComponent(req.headers['x-nom-fichier'] ?? 'document');
export const typeFichier = (req) => (req.headers['content-type'] ?? '').split(';')[0];
