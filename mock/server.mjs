// API simulée (POC) — aucune dépendance. Les contrôles réels seront côté serveur.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = 3001;
const MAX_ESSAIS = 3;

// Invitations de démonstration : /?token=demo | expire | bloque
const invitations = {
  demo: { prenom: 'Camille', email: 'camille.durand@exemple.fr', societe: 'Société Exemple SAS', ic: 'Julien Martin', expire: false, essais: MAX_ESSAIS, motDePasse: null },
  expire: { prenom: 'Camille', email: 'camille.durand@exemple.fr', societe: 'Société Exemple SAS', ic: 'Julien Martin', expire: true, essais: MAX_ESSAIS, motDePasse: null },
  bloque: { prenom: 'Camille', email: 'camille.durand@exemple.fr', societe: 'Société Exemple SAS', ic: 'Julien Martin', expire: false, essais: 0, motDePasse: null },
};
const sessions = new Map();

const normaliser = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

function envoyer(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function corps(req) {
  let brut = '';
  try {
    for await (const morceau of req) brut += morceau;
    return JSON.parse(brut || '{}');
  } catch {
    return {};
  }
}

function etat(inv) {
  if (inv.expire) return 'expire';
  if (inv.essais <= 0) return 'bloque';
  return 'ok';
}

async function traiter(req, res) {
  const { pathname } = new URL(req.url, 'http://x');
  const attente = 250 + Math.random() * 250; // latence simulée
  await new Promise((r) => setTimeout(r, attente));

  let m;
  if (req.method === 'GET' && (m = pathname.match(/^\/api\/invitations\/([\w-]+)$/))) {
    const inv = invitations[m[1]];
    if (!inv) return envoyer(res, 404, { code: 'inconnu', message: 'Ce lien est invalide.' });
    return envoyer(res, 200, {
      etat: etat(inv), societe: inv.societe, ic: inv.ic, essaisRestants: inv.essais,
      motDePasseDefini: Boolean(inv.motDePasse),
    });
  }

  if (req.method === 'POST' && (m = pathname.match(/^\/api\/invitations\/([\w-]+)\/verification$/))) {
    const inv = invitations[m[1]];
    if (!inv) return envoyer(res, 404, { code: 'inconnu', message: 'Ce lien est invalide.' });
    if (etat(inv) !== 'ok') return envoyer(res, 403, { code: etat(inv), message: 'Accès impossible avec ce lien.' });
    const { lettres = '' } = await corps(req);
    if (normaliser(lettres.trim()) === normaliser(inv.prenom).slice(0, 3)) {
      inv.essais = MAX_ESSAIS;
      return envoyer(res, 200, { ok: true, prenom: inv.prenom });
    }
    inv.essais -= 1;
    return envoyer(res, 422, {
      code: inv.essais > 0 ? 'incorrect' : 'bloque',
      essaisRestants: inv.essais,
      message: 'Les lettres saisies ne correspondent pas.',
    });
  }

  if (req.method === 'POST' && (m = pathname.match(/^\/api\/invitations\/([\w-]+)\/mot-de-passe$/))) {
    const inv = invitations[m[1]];
    if (!inv) return envoyer(res, 404, { code: 'inconnu', message: 'Ce lien est invalide.' });
    const { lettres = '', motDePasse = '' } = await corps(req);
    if (etat(inv) !== 'ok' || normaliser(lettres) !== normaliser(inv.prenom).slice(0, 3)) {
      return envoyer(res, 403, { code: 'refuse', message: 'Accès refusé.' });
    }
    if (motDePasse.length < 12) return envoyer(res, 422, { code: 'faible', message: 'Le mot de passe est trop court.' });
    inv.motDePasse = motDePasse;
    const jeton = randomUUID();
    sessions.set(jeton, { email: inv.email, profil: 'prospect' });
    return envoyer(res, 200, { jeton, profil: 'prospect' });
  }

  if (req.method === 'POST' && pathname === '/api/connexion') {
    const { email = '', motDePasse = '' } = await corps(req);
    const inv = Object.values(invitations).find((i) => i.email === email.trim().toLowerCase() && i.motDePasse);
    if (!inv || inv.motDePasse !== motDePasse) {
      // Message identique quel que soit le motif (RG-B3).
      return envoyer(res, 401, { code: 'identifiants', message: 'Identifiant ou mot de passe incorrect.' });
    }
    const jeton = randomUUID();
    sessions.set(jeton, { email: inv.email, profil: 'prospect' });
    return envoyer(res, 200, { jeton, profil: 'prospect' });
  }

  const jeton = (req.headers.authorization ?? '').replace('Bearer ', '');
  if (pathname.startsWith('/api/') && !sessions.has(jeton)) {
    return envoyer(res, 401, { code: 'session', message: 'Votre session a expiré.' });
  }

  if (req.method === 'GET' && pathname === '/api/moi') {
    const s = sessions.get(jeton);
    return envoyer(res, 200, { email: s.email, profil: s.profil });
  }

  envoyer(res, 404, { message: 'Ressource inconnue.' });
}

const serveur = createServer((req, res) => {
  traiter(req, res).catch(() => res.destroy());
});

serveur.listen(PORT, () => console.log(`Mock API sur http://localhost:${PORT}`));
