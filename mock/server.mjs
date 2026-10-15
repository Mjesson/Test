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

const TAILLE_MAX = 20 * 1024 * 1024;
const TYPES = ['application/pdf', 'image/jpeg'];
const ETAPES = ['Collecte de documents', 'Réception de l’offre', 'Signature', 'Financement'];

// Dossier unique de démonstration (l'isolation par utilisateur sera côté serveur réel).
const dossier = {
  numero: '2026-0412',
  societe: 'Société Exemple SAS', siren: '552 081 317', adresse: '12 rue de la République, 69002 Lyon',
  dirigeant: 'Camille Durand', ic: { nom: 'Julien Martin', email: 'julien.martin@ega.example' },
  eta: '2026-11-16', etape: 1, envoye: null,
  documents: [
    { id: 'kbis', libelle: 'Kbis de moins de 3 mois', statut: 'valide', fichier: 'kbis-exemple.pdf', taille: 184320, depose: '2026-10-12T09:14:00Z' },
    { id: 'statuts', libelle: 'Statuts à jour', statut: 'en_controle', fichier: 'statuts.pdf', taille: 412000, depose: '2026-10-13T14:02:00Z' },
    { id: 'identite', libelle: 'Pièce d’identité du dirigeant', statut: 'a_corriger', motif: 'Document expiré : la date de validité est dépassée. Merci de fournir une pièce en cours de validité.', fichier: 'cni.jpg', taille: 902000, depose: '2026-10-13T14:05:00Z' },
    { id: 'rib', libelle: 'RIB', statut: 'a_fournir' },
    { id: 'liasse', libelle: 'Liasse fiscale N-1', statut: 'a_fournir' },
    { id: 'beneficiaires', libelle: 'Bénéficiaires effectifs', statut: 'recu', fichier: 'be.pdf', taille: 98000, depose: '2026-10-14T16:40:00Z' },
  ],
  nonRattachees: [],
};
const MOTS_CLES = { kbis: /kbis/i, statuts: /statut/i, identite: /identit|cni|passeport/i, rib: /\brib\b|iban/i, liasse: /liasse|fiscal/i, beneficiaires: /benef|\bbe\b/i };

function vueDossier() {
  const maintenant = Date.now();
  for (const d of dossier.documents) {
    // Simulation : un document « reçu » passe en contrôle après quelques secondes.
    if (d.statut === 'recu' && d.recuA && maintenant - d.recuA > 5000) d.statut = 'en_controle';
  }
  const ok = dossier.documents.filter((d) => !['a_fournir', 'a_corriger'].includes(d.statut)).length;
  return {
    ...dossier,
    etapes: ETAPES,
    completude: Math.round((100 * ok) / dossier.documents.length),
    manquants: dossier.documents.length - ok,
  };
}

async function recevoirFichier(req) {
  let octets = 0;
  let trop = false;
  for await (const morceau of req) {
    octets += morceau.length;
    if (octets > TAILLE_MAX) trop = true; // on vide le flux sans le stocker
  }
  return { octets, trop };
}

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
    return envoyer(res, 200, { email: s.email, profil: s.profil, nom: dossier.dirigeant, societe: dossier.societe });
  }

  if (req.method === 'GET' && pathname === '/api/dossier') return envoyer(res, 200, vueDossier());

  if (req.method === 'GET' && (m = pathname.match(/^\/api\/documents\/(\w+)$/))) {
    const doc = dossier.documents.find((d) => d.id === m[1]);
    return doc ? envoyer(res, 200, doc) : envoyer(res, 404, { message: 'Document inconnu.' });
  }

  if (req.method === 'POST' && pathname === '/api/documents') {
    if (dossier.envoye) {
      await recevoirFichier(req);
      return envoyer(res, 409, { code: 'envoye', message: 'Le dossier a été envoyé : le dépôt est fermé.' });
    }
    const type = (req.headers['content-type'] ?? '').split(';')[0];
    const nom = decodeURIComponent(req.headers['x-nom-fichier'] ?? 'document');
    const cibleId = req.headers['x-document-id'];
    const { octets, trop } = await recevoirFichier(req);
    if (!TYPES.includes(type)) return envoyer(res, 415, { message: `${nom} : format non accepté (PDF ou JPG uniquement).` });
    if (trop) return envoyer(res, 413, { message: `${nom} : fichier trop volumineux (20 Mo maximum).` });
    // Rattachement « IA » simulé : document ciblé, sinon reconnaissance par le nom.
    const doc = dossier.documents.find((d) => d.id === cibleId)
      ?? dossier.documents.find((d) => MOTS_CLES[d.id].test(nom) && d.statut !== 'valide');
    if (!doc) {
      dossier.nonRattachees.push({ fichier: nom, taille: octets, depose: new Date().toISOString() });
      return envoyer(res, 201, { rattache: false, fichier: nom });
    }
    Object.assign(doc, { statut: 'recu', recuA: Date.now(), fichier: nom, taille: octets, depose: new Date().toISOString(), motif: undefined });
    return envoyer(res, 201, { rattache: true, fichier: nom, documentId: doc.id, libelle: doc.libelle });
  }

  if (req.method === 'POST' && pathname === '/api/dossier/validation') {
    const v = vueDossier();
    if (dossier.envoye) return envoyer(res, 409, { message: 'Le dossier a déjà été envoyé.' });
    if (v.manquants > 0) return envoyer(res, 422, { message: `Il reste ${v.manquants} document(s) à fournir ou à corriger.` });
    dossier.envoye = new Date().toISOString();
    dossier.etape = 2;
    return envoyer(res, 200, vueDossier());
  }

  envoyer(res, 404, { message: 'Ressource inconnue.' });
}

const serveur = createServer((req, res) => {
  traiter(req, res).catch(() => res.destroy());
});

serveur.listen(PORT, () => console.log(`Mock API sur http://localhost:${PORT}`));
