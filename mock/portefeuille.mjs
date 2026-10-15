// Domaine apporteur d'affaires : portefeuille et détail (lecture).
import { envoyer } from './outils.mjs';
import { dossier } from './dossier.mjs';

const MOIS_COURANT = '2026-10';
const ETAPES = ['Collecte de documents', 'Contrôle ADV', 'Réception de l’offre', 'Signature', 'Financement'];
const NOM_ETAPE = { Collecte: 0, 'Contrôle ADV': 1, Offre: 2, Signature: 3, Financement: 4 };

// [id, prospect, étape, complétude %, à corriger, à fournir, ETA 1er paiement, IC, jours depuis activité]
const EN_COURS = [
  ['D-0412', 'Société Exemple SAS', 'Collecte', 50, 1, 2, '2026-11-16', 'IC n° 1', 2],
  ['D-0398', 'Boulangerie Lenoir SARL', 'Collecte', 33, 0, 4, '2026-11-30', 'IC n° 2', 9],
  ['D-0405', 'Transports Vidal & Fils', 'Contrôle ADV', 100, 0, 0, '2026-11-20', 'IC n° 1', 1],
  ['D-0390', 'Atelier Moreau SAS', 'Collecte', 66, 0, 1, '2026-12-05', 'IC n° 3', 4],
  ['D-0377', 'Groupe Duval Industries', 'Signature', 100, 0, 0, '2026-11-10', 'IC n° 2', 0],
  ['D-0411', 'Clinique du Parc SA', 'Collecte', 17, 0, 5, '2026-12-12', 'IC n° 3', 1],
  ['D-0384', 'Maison Perrin Traiteur', 'Offre', 100, 0, 0, '2026-11-25', 'IC n° 1', 3],
  ['D-0369', 'Négoce Lefèvre SA', 'Contrôle ADV', 100, 0, 0, '2026-11-18', 'IC n° 2', 2],
  ['D-0402', 'Garnier Logistique SAS', 'Collecte', 50, 2, 0, '2026-12-01', 'IC n° 1', 6],
  ['D-0381', 'Imprimerie Roche SAS', 'Financement', 100, 0, 0, '2026-10-28', 'IC n° 3', 0],
  ['D-0415', 'Studio Lambert Conseil', 'Collecte', 0, 0, 6, '2026-12-20', 'IC n° 2', 0],
  ['D-0373', 'Cabinet Fontaine & Associés', 'Offre', 100, 0, 0, '2026-11-22', 'IC n° 3', 5],
];
const ACTIVES = [
  ['D-0301', 'Sodexim Équipements', '2026-10-06', 'IC n° 1'], ['D-0310', 'Électricité Marchand', '2026-10-14', 'IC n° 2'],
  ['D-0288', 'Verrerie du Sud SARL', '2026-09-22', 'IC n° 3'], ['D-0295', 'Hôtel des Quais SAS', '2026-09-15', 'IC n° 1'],
  ['D-0270', 'Menuiseries Bertrand', '2026-08-30', 'IC n° 2'], ['D-0262', 'Agri-Pro Services', '2026-08-18', 'IC n° 3'],
  ['D-0251', 'Laboratoire Mercier', '2026-07-29', 'IC n° 1'], ['D-0244', 'Cycles Rivière SA', '2026-07-12', 'IC n° 2'],
];

// Hypothèse (à confirmer) : bloqué = une pièce à corriger, ou des pièces à fournir sans activité depuis plus de 7 jours.
const bloque = (corriger, fournir, jours) => corriger > 0 || (fournir > 0 && jours > 7);

const dossiers = [
  ...EN_COURS.map(([id, prospect, etape, completude, aCorriger, aFournir, eta, ic, activite]) => ({
    id, prospect, etape, completude, aCorriger, aFournir, eta, ic, activite, actif: false, bloque: bloque(aCorriger, aFournir, activite),
  })),
  ...ACTIVES.map(([id, prospect, eta, ic]) => ({
    id, prospect, etape: 'Financement', completude: 100, aCorriger: 0, aFournir: 0, eta, ic, activite: 20, actif: true, bloque: false,
  })),
];

function indicateurs() {
  const enCours = dossiers.filter((d) => !d.actif);
  return {
    enCours: enCours.length,
    bloques: enCours.filter((d) => d.bloque).length,
    conformes: enCours.filter((d) => d.completude === 100 && d.aCorriger === 0).length,
    paiementsMois: dossiers.filter((d) => d.eta.startsWith(MOIS_COURANT)).length,
    activees: dossiers.filter((d) => d.actif).length,
  };
}

const LIBELLES = ['Kbis de moins de 3 mois', 'Statuts à jour', 'Pièce d’identité du dirigeant', 'RIB', 'Liasse fiscale N-1', 'Bénéficiaires effectifs'];
function detail(d) {
  let documents;
  if (d.id === 'D-0412') {
    // Dossier réel de démonstration, sans motif détaillé (pas d'analyse interne côté apporteur).
    documents = dossier.documents.map(({ id, libelle, statut }) => ({ id, libelle, statut }));
  } else {
    let corriger = d.aCorriger;
    let fournir = d.aFournir;
    documents = LIBELLES.map((libelle, i) => {
      let statut = i % 2 ? 'en_controle' : 'valide';
      if (corriger > 0) { statut = 'a_corriger'; corriger -= 1; } else if (fournir > 0) { statut = 'a_fournir'; fournir -= 1; }
      return { id: `d${i}`, libelle, statut };
    });
  }
  return { ...d, etapes: ETAPES, etapeIndex: NOM_ETAPE[d.etape] + 1, documents };
}

export async function gererPortefeuille({ req, res, pathname, session }) {
  if (!pathname.startsWith('/api/portefeuille')) return false;
  // Isolation : seul un apporteur voit un portefeuille (RT-1, RG-P4).
  if (session.profil !== 'apporteur') { envoyer(res, 403, { message: 'Accès refusé.' }); return true; }
  let m;
  if (req.method === 'GET' && pathname === '/api/portefeuille') {
    envoyer(res, 200, { indicateurs: indicateurs(), dossiers, etapes: Object.keys(NOM_ETAPE), ics: [...new Set(dossiers.map((d) => d.ic))].sort() });
    return true;
  }
  if (req.method === 'GET' && (m = pathname.match(/^\/api\/portefeuille\/([\w-]+)$/))) {
    const d = dossiers.find((x) => x.id === m[1]);
    if (d) envoyer(res, 200, detail(d)); else envoyer(res, 404, { message: 'Dossier introuvable.' });
    return true;
  }
  return false;
}
