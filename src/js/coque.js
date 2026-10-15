// Garde d'accès + éléments communs de l'espace connecté (en-tête).
import { api, session } from './api.js';

export async function initialiserCoque() {
  let moi;
  try {
    moi = await api.get('/moi');
  } catch {
    session.clear();
    location.replace('/');
    return new Promise(() => {}); // on n'affiche rien pendant la redirection
  }
  document.querySelector('[data-utilisateur]').textContent = `${moi.nom} · ${moi.societe}`;
  document.querySelector('[data-deconnexion]').addEventListener('click', () => {
    session.clear();
    location.assign('/');
  });
  return moi;
}
