// Garde d'accès + éléments communs de l'espace connecté (en-tête).
import { api, session } from './api.js';

const ACCUEIL = { prospect: '/dossier.html', apporteur: '/portefeuille.html' };

// `profil` : profil autorisé sur la page. Un autre profil est redirigé vers son accueil (RT-1).
export async function initialiserCoque(profil) {
  let moi;
  try {
    moi = await api.get('/moi');
  } catch {
    session.clear();
    location.replace('/');
    return new Promise(() => {}); // on n'affiche rien pendant la redirection
  }
  if (moi.profil !== profil) {
    location.replace(ACCUEIL[moi.profil]);
    return new Promise(() => {});
  }
  document.querySelector('[data-utilisateur]').textContent = `${moi.nom} · ${moi.societe}`;
  document.querySelectorAll('[data-profil]').forEach((el) => { el.hidden = el.dataset.profil !== moi.profil; });
  document.querySelector('[data-deconnexion]').addEventListener('click', () => {
    session.clear();
    location.assign('/');
  });
  return moi;
}
