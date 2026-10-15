// Domaine formulaires : liste + questionnaire pays (seul formulaire détaillé).
import { envoyer, corps } from './outils.mjs';

const PAYS_AUTORISES = ['Allemagne', 'Belgique', 'Espagne', 'Italie', 'Luxembourg', 'Pays-Bas', 'Portugal', 'Royaume-Uni', 'Suisse'];
const PAYS_HORS_LISTE = ['Brésil', 'Chine', 'Inde', 'Russie', 'Turquie'];
const DEVISES = ['EUR', 'USD', 'GBP', 'CHF'];

const pays = {
  statut: 'brouillon',
  donnees: { paysAcheteurs: ['Allemagne', 'Espagne'], partExport: 35, devises: [], nbAcheteurs: 12, commentaire: '', justification: '' },
  // Champs préremplis à partir des pièces (IA), à vérifier par le prospect.
  preremplis: { partExport: 'Part du CA à l’export estimée à partir de votre liasse fiscale.', nbAcheteurs: 'Nombre d’acheteurs à l’étranger estimé à partir de votre liasse fiscale.' },
  soumisLe: null,
};

const horsListe = (d) => d.paysAcheteurs.filter((p) => !PAYS_AUTORISES.includes(p));

function pourcentage(d) {
  const champs = [d.paysAcheteurs.length > 0, Number.isFinite(d.partExport), d.devises.length > 0, Number.isInteger(d.nbAcheteurs)];
  return Math.round((100 * champs.filter(Boolean).length) / champs.length);
}

function nettoyer(d = {}) {
  return {
    paysAcheteurs: [...new Set((d.paysAcheteurs ?? []).filter((p) => [...PAYS_AUTORISES, ...PAYS_HORS_LISTE].includes(p)))],
    partExport: d.partExport === null || d.partExport === '' || d.partExport === undefined ? null : Number(d.partExport),
    devises: (d.devises ?? []).filter((x) => DEVISES.includes(x)),
    nbAcheteurs: d.nbAcheteurs === null || d.nbAcheteurs === '' || d.nbAcheteurs === undefined ? null : Number(d.nbAcheteurs),
    commentaire: String(d.commentaire ?? '').slice(0, 1000),
    justification: String(d.justification ?? '').slice(0, 1000),
  };
}

function erreursSoumission(d) {
  const e = {};
  if (!d.paysAcheteurs.length) e.paysAcheteurs = 'Sélectionnez au moins un pays.';
  if (horsListe(d).length && !d.justification.trim()) e.justification = 'Justifiez la présence de pays hors liste autorisée.';
  if (!Number.isFinite(d.partExport) || d.partExport < 0 || d.partExport > 100) e.partExport = 'Saisissez un pourcentage entre 0 et 100.';
  if (!d.devises.length) e.devises = 'Sélectionnez au moins une devise.';
  if (!Number.isInteger(d.nbAcheteurs) || d.nbAcheteurs < 0) e.nbAcheteurs = 'Saisissez un nombre entier positif ou nul.';
  return e;
}

const vue = () => ({
  ...pays, pourcentage: pourcentage(pays.donnees),
  options: { pays: [...PAYS_AUTORISES, ...PAYS_HORS_LISTE].sort((a, b) => a.localeCompare(b, 'fr')), paysAutorises: PAYS_AUTORISES, devises: DEVISES },
});

export async function gererFormulaires({ req, res, pathname, session }) {
  if (!pathname.startsWith('/api/formulaires')) return false;
  if (session.profil !== 'prospect') { envoyer(res, 403, { message: 'Accès refusé.' }); return true; }

  if (req.method === 'GET' && pathname === '/api/formulaires') {
    envoyer(res, 200, { formulaires: [
      { id: 'fiche-client', titre: 'Fiche client', statut: 'soumis', pourcentage: 100, disponible: false },
      { id: 'pays', titre: 'Questionnaire pays', statut: pays.statut, pourcentage: pourcentage(pays.donnees), disponible: true },
      { id: 'esg', titre: 'Questionnaire ESG', statut: 'a_remplir', pourcentage: 0, disponible: false },
      { id: 'kyc', titre: 'Formulaire KYC (bénéficiaires effectifs)', statut: 'a_remplir', pourcentage: 0, disponible: false, aVenir: true },
    ] });
    return true;
  }
  if (req.method === 'GET' && pathname === '/api/formulaires/pays') { envoyer(res, 200, vue()); return true; }

  if (req.method === 'PUT' && pathname === '/api/formulaires/pays') {
    if (pays.statut === 'soumis') { envoyer(res, 409, { message: 'Le questionnaire a été soumis : il n’est plus modifiable.' }); return true; }
    const { donnees } = await corps(req);
    pays.donnees = nettoyer(donnees);
    pays.statut = pourcentage(pays.donnees) === 0 ? 'a_remplir' : 'brouillon';
    envoyer(res, 200, vue());
    return true;
  }

  if (req.method === 'POST' && pathname === '/api/formulaires/pays/soumission') {
    if (pays.statut === 'soumis') { envoyer(res, 409, { message: 'Le questionnaire a déjà été soumis.' }); return true; }
    const { donnees } = await corps(req);
    const d = nettoyer(donnees);
    const erreurs = erreursSoumission(d);
    if (Object.keys(erreurs).length) { envoyer(res, 422, { message: 'Le questionnaire est incomplet.', erreurs }); return true; }
    pays.donnees = d;
    pays.statut = 'soumis';
    pays.soumisLe = new Date().toISOString();
    envoyer(res, 200, vue());
    return true;
  }
  return false;
}
