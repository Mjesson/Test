// Domaine prospect : dossier, documents, messagerie.
import { envoyer, corps, recevoirFichier, nomFichier, typeFichier, TYPES, TAILLE_MAX } from './outils.mjs';

const ETAPES = ['Collecte de documents', 'Réception de l’offre', 'Signature', 'Financement'];

export const dossier = {
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

export function vueDossier() {
  const maintenant = Date.now();
  for (const d of dossier.documents) {
    // Simulation : un document « reçu » passe en contrôle après quelques secondes.
    if (d.statut === 'recu' && d.recuA && maintenant - d.recuA > 5000) d.statut = 'en_controle';
  }
  const ok = dossier.documents.filter((d) => !['a_fournir', 'a_corriger'].includes(d.statut)).length;
  return { ...dossier, etapes: ETAPES, completude: Math.round((100 * ok) / dossier.documents.length), manquants: dossier.documents.length - ok };
}

/* ---------- Messagerie ---------- */
let seq = 100;
const il = (jours, h = 10) => new Date(Date.UTC(2026, 9, 15 - jours, h, 12)).toISOString();
const fils = [
  { id: 'identite', sujet: 'Pièce d’identité à corriger', nonLu: true, messages: [
    { id: 1, de: 'ic', auteur: 'Julien Martin', date: il(2, 14), texte: 'Bonjour, la pièce d’identité du dirigeant est expirée. Pourriez-vous nous transmettre une pièce en cours de validité ? Merci.' },
  ] },
  { id: 'questions', sujet: 'Questions générales', nonLu: false, messages: [
    { id: 2, de: 'moi', auteur: 'Camille Durand', date: il(4, 8), texte: 'Bonjour, quels sont les délais habituels pour la signature ?' },
    { id: 3, de: 'ic', auteur: 'Julien Martin', date: il(4, 10), texte: 'Bonjour Camille, comptez en général 3 à 5 jours ouvrés après la réception de l’offre.' },
  ] },
  { id: 'notifications', sujet: 'Notifications', systeme: true, nonLu: true, messages: [
    { id: 4, de: 'systeme', date: il(3, 9), texte: 'Document validé : Kbis de moins de 3 mois.' },
    { id: 5, de: 'systeme', date: il(2, 14), texte: 'Document à corriger : Pièce d’identité du dirigeant (document expiré).' },
    { id: 6, de: 'systeme', date: il(1, 16), texte: 'Document reçu : Bénéficiaires effectifs, rattaché au dossier et en contrôle.' },
  ] },
];
const fil = (id) => fils.find((f) => f.id === id);
const notifier = (texte) => {
  const n = fil('notifications');
  n.messages.push({ id: ++seq, de: 'systeme', date: new Date().toISOString(), texte });
  n.nonLu = true;
};
const resume = (f) => {
  const dernier = f.messages.at(-1);
  return { id: f.id, sujet: f.sujet, nonLu: f.nonLu, systeme: Boolean(f.systeme), apercu: dernier?.texte.slice(0, 90) ?? '', date: dernier?.date ?? null };
};

function rattacher(nom, octets, cibleId) {
  const doc = dossier.documents.find((d) => d.id === cibleId)
    ?? dossier.documents.find((d) => MOTS_CLES[d.id].test(nom) && d.statut !== 'valide');
  if (!doc) {
    dossier.nonRattachees.push({ fichier: nom, taille: octets, depose: new Date().toISOString() });
    notifier(`Pièce reçue sans rattachement : ${nom}. Votre interlocuteur commercial a été alerté.`);
    return { rattache: false, fichier: nom };
  }
  Object.assign(doc, { statut: 'recu', recuA: Date.now(), fichier: nom, taille: octets, depose: new Date().toISOString(), motif: undefined });
  notifier(`Document reçu : ${doc.libelle}, rattaché au dossier et en contrôle.`);
  return { rattache: true, fichier: nom, documentId: doc.id, libelle: doc.libelle };
}

async function televerser(req, res, cibleId) {
  const nom = nomFichier(req);
  const { octets, trop } = await recevoirFichier(req);
  if (dossier.envoye) return { erreur: [409, 'Le dossier a été envoyé : le dépôt est fermé.'] };
  if (!TYPES.includes(typeFichier(req))) return { erreur: [415, `${nom} : format non accepté (PDF ou JPG uniquement).`] };
  if (trop) return { erreur: [413, `${nom} : fichier trop volumineux (${TAILLE_MAX / 1048576} Mo maximum).`] };
  return { nom, octets, resultat: rattacher(nom, octets, cibleId) };
}

export async function gererProspect({ req, res, pathname, session }) {
  let m;
  if (!pathname.startsWith('/api/dossier') && !pathname.startsWith('/api/documents') && !pathname.startsWith('/api/fils')) return false;
  if (session.profil !== 'prospect') { envoyer(res, 403, { message: 'Accès refusé.' }); return true; }

  if (req.method === 'GET' && pathname === '/api/dossier') { envoyer(res, 200, vueDossier()); return true; }

  if (req.method === 'GET' && (m = pathname.match(/^\/api\/documents\/(\w+)$/))) {
    const doc = dossier.documents.find((d) => d.id === m[1]);
    if (doc) envoyer(res, 200, doc); else envoyer(res, 404, { message: 'Document inconnu.' });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/documents') {
    const r = await televerser(req, res, req.headers['x-document-id']);
    if (r.erreur) envoyer(res, r.erreur[0], { message: r.erreur[1] }); else envoyer(res, 201, r.resultat);
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/dossier/validation') {
    const v = vueDossier();
    if (dossier.envoye) envoyer(res, 409, { message: 'Le dossier a déjà été envoyé.' });
    else if (v.manquants > 0) envoyer(res, 422, { message: `Il reste ${v.manquants} document(s) à fournir ou à corriger.` });
    else {
      dossier.envoye = new Date().toISOString();
      dossier.etape = 2;
      notifier('Dossier envoyé pour contrôle.');
      envoyer(res, 200, vueDossier());
    }
    return true;
  }

  if (req.method === 'GET' && pathname === '/api/fils') {
    const liste = fils.map(resume).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
    envoyer(res, 200, { fils: liste, nonLus: fils.filter((f) => f.nonLu).length });
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/fils') {
    const { sujet = '', texte = '' } = await corps(req);
    if (!sujet.trim() || !texte.trim()) { envoyer(res, 422, { message: 'Le sujet et le message sont obligatoires.' }); return true; }
    const f = { id: `f${++seq}`, sujet: sujet.trim().slice(0, 120), nonLu: false, messages: [
      { id: ++seq, de: 'moi', auteur: dossier.dirigeant, date: new Date().toISOString(), texte: texte.trim() }] };
    fils.push(f);
    envoyer(res, 201, { id: f.id });
    return true;
  }

  if ((m = pathname.match(/^\/api\/fils\/(\w+)$/)) && req.method === 'GET') {
    const f = fil(m[1]);
    if (!f) { envoyer(res, 404, { message: 'Conversation inconnue.' }); return true; }
    f.nonLu = false;
    envoyer(res, 200, { id: f.id, sujet: f.sujet, systeme: Boolean(f.systeme), messages: f.messages });
    return true;
  }

  if ((m = pathname.match(/^\/api\/fils\/(\w+)\/messages$/)) && req.method === 'POST') {
    const f = fil(m[1]);
    const { texte = '' } = await corps(req);
    if (!f) envoyer(res, 404, { message: 'Conversation inconnue.' });
    else if (f.systeme) envoyer(res, 403, { message: 'Vous ne pouvez pas répondre aux notifications.' });
    else if (!texte.trim()) envoyer(res, 422, { message: 'Le message est vide.' });
    else {
      const msg = { id: ++seq, de: 'moi', auteur: dossier.dirigeant, date: new Date().toISOString(), texte: texte.trim() };
      f.messages.push(msg);
      envoyer(res, 201, msg);
    }
    return true;
  }

  if ((m = pathname.match(/^\/api\/fils\/(\w+)\/pieces-jointes$/)) && req.method === 'POST') {
    const f = fil(m[1]);
    const r = await televerser(req, res, undefined);
    if (!f || f.systeme) envoyer(res, 404, { message: 'Conversation inconnue.' });
    else if (r.erreur) envoyer(res, r.erreur[0], { message: r.erreur[1] });
    else {
      const date = new Date().toISOString();
      f.messages.push({ id: ++seq, de: 'moi', auteur: dossier.dirigeant, date, texte: '', pj: { nom: r.nom, taille: r.octets } });
      f.messages.push({ id: ++seq, de: 'systeme', date, texte: r.resultat.rattache
        ? `Document reçu : « ${r.resultat.libelle} » rattaché au dossier, en contrôle.`
        : 'Pièce reçue mais non rattachée à un document attendu : votre interlocuteur commercial a été alerté.' });
      envoyer(res, 201, r.resultat);
    }
    return true;
  }
  return false;
}
