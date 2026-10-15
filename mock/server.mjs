// API simulée (POC) — aucune dépendance. Les contrôles réels seront côté serveur.
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { envoyer, corps } from './outils.mjs';
import { dossier, gererProspect } from './dossier.mjs';
import { gererFormulaires } from './formulaires.mjs';
import { gererPortefeuille } from './portefeuille.mjs';

const PORT = 3001;
const MAX_ESSAIS = 3;

const base = { ic: 'Julien Martin', expire: false, essais: MAX_ESSAIS, motDePasse: null, profil: 'prospect' };
const prospect = { ...base, prenom: 'Camille', email: 'camille.durand@exemple.fr', nom: 'Camille Durand', societe: dossier.societe };
// Invitations de démonstration : /?token=demo (prospect) | courtier (apporteur) | expire | bloque
const invitations = {
  demo: { ...prospect },
  courtier: { ...base, prenom: 'Sophie', email: 'sophie.bernard@courtage.example', nom: 'Sophie Bernard', societe: 'Cabinet Bernard Courtage', profil: 'apporteur' },
  expire: { ...prospect, expire: true },
  bloque: { ...prospect, essais: 0 },
};
const sessions = new Map();

const normaliser = (s) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
const etat = (inv) => (inv.expire ? 'expire' : inv.essais <= 0 ? 'bloque' : 'ok');
const ouvrirSession = (inv) => {
  const jeton = randomUUID();
  sessions.set(jeton, { email: inv.email, profil: inv.profil, nom: inv.nom, societe: inv.societe });
  return { jeton, profil: inv.profil };
};

async function traiter(req, res) {
  const { pathname } = new URL(req.url, 'http://x');
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 200)); // latence simulée

  let m;
  if (req.method === 'GET' && (m = pathname.match(/^\/api\/invitations\/([\w-]+)$/))) {
    const inv = invitations[m[1]];
    if (!inv) return envoyer(res, 404, { code: 'inconnu', message: 'Ce lien est invalide.' });
    return envoyer(res, 200, {
      etat: etat(inv), societe: inv.societe, ic: inv.ic, essaisRestants: inv.essais, motDePasseDefini: Boolean(inv.motDePasse),
    });
  }

  if (req.method === 'POST' && (m = pathname.match(/^\/api\/invitations\/([\w-]+)\/verification$/))) {
    const inv = invitations[m[1]];
    if (!inv) return envoyer(res, 404, { code: 'inconnu', message: 'Ce lien est invalide.' });
    if (etat(inv) !== 'ok') return envoyer(res, 403, { code: etat(inv), message: 'Accès impossible avec ce lien.' });
    const { lettres = '' } = await corps(req);
    if (normaliser(lettres.trim()) === normaliser(inv.prenom).slice(0, 3)) {
      inv.essais = MAX_ESSAIS;
      return envoyer(res, 200, { ok: true });
    }
    inv.essais -= 1;
    return envoyer(res, 422, {
      code: inv.essais > 0 ? 'incorrect' : 'bloque', essaisRestants: inv.essais, message: 'Les lettres saisies ne correspondent pas.',
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
    return envoyer(res, 200, ouvrirSession(inv));
  }

  if (req.method === 'POST' && pathname === '/api/connexion') {
    const { email = '', motDePasse = '' } = await corps(req);
    const inv = Object.values(invitations).find((i) => i.email === email.trim().toLowerCase() && i.motDePasse);
    if (!inv || inv.motDePasse !== motDePasse) {
      // Message identique quel que soit le motif (RG-B3).
      return envoyer(res, 401, { code: 'identifiants', message: 'Identifiant ou mot de passe incorrect.' });
    }
    return envoyer(res, 200, ouvrirSession(inv));
  }

  const jeton = (req.headers.authorization ?? '').replace('Bearer ', '');
  const session = sessions.get(jeton);
  if (pathname.startsWith('/api/') && !session) {
    return envoyer(res, 401, { code: 'session', message: 'Votre session a expiré.' });
  }

  if (req.method === 'GET' && pathname === '/api/moi') {
    return envoyer(res, 200, { email: session.email, profil: session.profil, nom: session.nom, societe: session.societe });
  }

  const ctx = { req, res, pathname, session };
  if (await gererProspect(ctx) || await gererFormulaires(ctx) || await gererPortefeuille(ctx)) return;
  envoyer(res, 404, { message: 'Ressource inconnue.' });
}

const serveur = createServer((req, res) => {
  traiter(req, res).catch(() => res.destroy());
});

serveur.listen(PORT, () => console.log(`Mock API sur http://localhost:${PORT}`));
