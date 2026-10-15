// Client API unique. Base configurable pour brancher les vraies API.
const BASE = import.meta.env.VITE_API_URL ?? '/api';
const CLE_SESSION = 'session';

export const session = {
  get: () => sessionStorage.getItem(CLE_SESSION),
  set: (jeton) => sessionStorage.setItem(CLE_SESSION, jeton),
  clear: () => sessionStorage.removeItem(CLE_SESSION),
};

export class ApiError extends Error {
  constructor(status, data) {
    super(data?.message ?? `Erreur ${status}`);
    this.status = status;
    this.data = data ?? {};
  }
}

async function appel(methode, chemin, corps) {
  const entetes = { Accept: 'application/json' };
  if (corps !== undefined) entetes['Content-Type'] = 'application/json';
  const jeton = session.get();
  if (jeton) entetes.Authorization = `Bearer ${jeton}`;
  let reponse;
  try {
    reponse = await fetch(BASE + chemin, {
      method: methode,
      headers: entetes,
      body: corps === undefined ? undefined : JSON.stringify(corps),
    });
  } catch {
    throw new ApiError(0, { message: 'Le service est injoignable. Vérifiez votre connexion et réessayez.' });
  }
  const data = await reponse.json().catch(() => ({}));
  if (!reponse.ok) throw new ApiError(reponse.status, data);
  return data;
}

export const api = {
  get: (c) => appel('GET', c),
  post: (c, corps) => appel('POST', c, corps ?? {}),
};

// Envoi de fichier avec progression (fetch n'expose pas la progression d'envoi).
export function envoyerFichier(chemin, fichier, { documentId, onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BASE + chemin);
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.setRequestHeader('Content-Type', fichier.type || 'application/octet-stream');
    xhr.setRequestHeader('X-Nom-Fichier', encodeURIComponent(fichier.name));
    if (documentId) xhr.setRequestHeader('X-Document-Id', documentId);
    const jeton = session.get();
    if (jeton) xhr.setRequestHeader('Authorization', `Bearer ${jeton}`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((100 * e.loaded) / e.total));
    xhr.onerror = () => reject(new ApiError(0, { message: 'Le service est injoignable. Réessayez.' }));
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* corps vide */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new ApiError(xhr.status, data));
    };
    xhr.send(fichier);
  });
}
