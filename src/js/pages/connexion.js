import { api, ApiError, session } from '../api.js';

const modale = document.getElementById('modale');
const titre = document.getElementById('modale-titre');
const corps = document.getElementById('modale-corps');
const statut = document.getElementById('modale-statut');
const jetonLien = new URLSearchParams(location.search).get('token');
const SUITE = '/dossier.html';

// La modale est obligatoire pour accéder à l'espace : Échap ne la ferme pas.
modale.addEventListener('cancel', (e) => e.preventDefault());

function afficher(idGabarit, titreEtape) {
  corps.replaceChildren(document.getElementById(idGabarit).content.cloneNode(true));
  titre.textContent = titreEtape;
  document.title = `${titreEtape} – Portail Axiora`;
  titre.focus();
  const afficherMdp = corps.querySelector('[data-afficher]');
  afficherMdp?.addEventListener('change', () => {
    corps.querySelectorAll('input[autocomplete$="password"]').forEach((i) => {
      i.type = afficherMdp.checked ? 'text' : 'password';
    });
  });
  return corps;
}

function erreurChamp(champ, message) {
  const p = document.getElementById(`erreur-${champ.id}`);
  if (!message) {
    champ.removeAttribute('aria-invalid');
    p.hidden = true;
    p.textContent = '';
    return;
  }
  champ.setAttribute('aria-invalid', 'true');
  p.hidden = false;
  p.textContent = `Erreur : ${message}`;
}

function resumeErreurs(messages) {
  const zone = corps.querySelector('[data-erreurs]');
  if (!messages.length) {
    zone.hidden = true;
    zone.replaceChildren();
    return;
  }
  zone.hidden = false;
  const ul = document.createElement('ul');
  messages.forEach(({ texte, champ }) => {
    const li = document.createElement('li');
    if (champ) {
      const a = document.createElement('a');
      a.href = `#${champ.id}`;
      a.className = 'underline';
      a.textContent = texte;
      a.addEventListener('click', (e) => { e.preventDefault(); champ.focus(); });
      li.append(a);
    } else {
      li.textContent = texte;
    }
    ul.append(li);
  });
  zone.replaceChildren(ul);
  zone.focus();
}

function enAttente(bouton, actif) {
  bouton.disabled = actif;
  bouton.dataset.libelle ??= bouton.textContent;
  bouton.textContent = actif ? 'Veuillez patienter…' : bouton.dataset.libelle;
  statut.textContent = actif ? 'Traitement en cours' : '';
}

function majEssais(restants) {
  const el = document.getElementById('essais');
  el.textContent = restants === 3
    ? `Vous disposez de ${restants} essais.`
    : `Il vous reste ${restants} essai${restants > 1 ? 's' : ''}.`;
}

function etapeIndisponible(etat, ic) {
  const c = afficher('t-indisponible', etat === 'expire' ? 'Lien expiré' : 'Accès bloqué');
  c.querySelector('[data-message]').textContent = etat === 'expire'
    ? 'Ce lien d’accès n’est plus valide.'
    : 'Le nombre d’essais autorisés a été dépassé : votre accès est bloqué par sécurité.';
  if (ic) c.querySelector('[data-ic]').textContent = ` (${ic})`;
}

function etapeVerification(ic) {
  const c = afficher('t-verification', 'Vérifions que c’est bien vous');
  const form = c.querySelector('form');
  const champ = form.lettres;
  majEssais(3);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const bouton = form.querySelector('button');
    const lettres = champ.value.trim();
    if (lettres.length !== 3) {
      const msg = 'saisissez exactement 3 lettres.';
      erreurChamp(champ, msg);
      resumeErreurs([{ texte: `3 premières lettres du prénom : ${msg}`, champ }]);
      return;
    }
    erreurChamp(champ, null);
    resumeErreurs([]);
    enAttente(bouton, true);
    try {
      await api.post(`/invitations/${jetonLien}/verification`, { lettres });
      etapeMotDePasse(lettres);
    } catch (err) {
      enAttente(bouton, false);
      if (!(err instanceof ApiError)) throw err;
      if (err.data.code === 'bloque' || err.status === 403) return etapeIndisponible('bloque', ic);
      if (err.data.code === 'incorrect') {
        const msg = 'ces lettres ne correspondent pas.';
        erreurChamp(champ, msg);
        majEssais(err.data.essaisRestants);
        resumeErreurs([{ texte: `3 premières lettres du prénom : ${msg}`, champ }]);
        champ.select();
        return;
      }
      resumeErreurs([{ texte: err.message }]);
    }
  });
}

function etapeMotDePasse(lettres) {
  const c = afficher('t-motdepasse', 'Créez votre mot de passe');
  const form = c.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { mdp, mdp2 } = form;
    const problemes = [];
    const e1 = mdp.value.length < 12 ? 'le mot de passe doit contenir au moins 12 caractères.' : null;
    const e2 = mdp2.value !== mdp.value ? 'la confirmation est différente du mot de passe.' : null;
    erreurChamp(mdp, e1);
    erreurChamp(mdp2, e2);
    if (e1) problemes.push({ texte: `Mot de passe : ${e1}`, champ: mdp });
    if (e2) problemes.push({ texte: `Confirmation : ${e2}`, champ: mdp2 });
    resumeErreurs(problemes);
    if (problemes.length) return;
    const bouton = form.querySelector('button');
    enAttente(bouton, true);
    try {
      const { jeton } = await api.post(`/invitations/${jetonLien}/mot-de-passe`, { lettres, motDePasse: mdp.value });
      session.set(jeton);
      location.assign(SUITE);
    } catch (err) {
      enAttente(bouton, false);
      resumeErreurs([{ texte: err.message }]);
    }
  });
}

function etapeConnexion() {
  const c = afficher('t-connexion', 'Connexion à votre espace');
  const form = c.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const { email, mdp } = form;
    const problemes = [];
    const e1 = !email.value.trim() ? 'saisissez votre adresse e-mail.' : null;
    const e2 = !mdp.value ? 'saisissez votre mot de passe.' : null;
    erreurChamp(email, e1);
    erreurChamp(mdp, e2);
    if (e1) problemes.push({ texte: `Adresse e-mail : ${e1}`, champ: email });
    if (e2) problemes.push({ texte: `Mot de passe : ${e2}`, champ: mdp });
    resumeErreurs(problemes);
    if (problemes.length) return;
    const bouton = form.querySelector('button');
    enAttente(bouton, true);
    try {
      const { jeton } = await api.post('/connexion', { email: email.value, motDePasse: mdp.value });
      session.set(jeton);
      location.assign(SUITE);
    } catch (err) {
      enAttente(bouton, false);
      resumeErreurs([{ texte: err.message }]);
    }
  });
}

async function demarrer() {
  if (session.get()) {
    try { await api.get('/moi'); location.replace(SUITE); return; } catch { session.clear(); }
  }
  modale.showModal();
  if (!jetonLien) return etapeConnexion();
  afficher('t-chargement', 'Vérification du lien');
  try {
    const inv = await api.get(`/invitations/${jetonLien}`);
    if (inv.etat !== 'ok') return etapeIndisponible(inv.etat, inv.ic);
    if (inv.motDePasseDefini) return etapeConnexion();
    etapeVerification(inv.ic);
  } catch (err) {
    afficher('t-indisponible', 'Lien invalide').querySelector('[data-message]').textContent =
      err.status === 404 ? 'Ce lien n’est pas reconnu.' : err.message;
  }
}

demarrer();
