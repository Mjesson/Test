import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const racine = import.meta.dirname;

// Application multi-pages : une entrée HTML par écran.
const pages = [
  'index', 'dossier', 'formulaires', 'formulaire-pays', 'messagerie', 'portefeuille', 'portefeuille-dossier',
  'accessibilite', 'mentions-legales', 'donnees-personnelles', 'ecoconception',
];

// Inclusion de gabarits HTML au build : <!--@include header.html current=dossier -->
// Le HTML livré reste statique (aucun JS pour assembler la page).
function inclusions(html, courant) {
  return html.replace(/<!--@include (\S+?)(?: current=(\w+))? -->/g, (_, fichier, cur = courant) => {
    const partiel = readFileSync(resolve(racine, 'partials', fichier), 'utf8')
      .replace(/\{\{cur:(\w+)\}\}/g, (__, page) => (page === cur ? 'aria-current="page"' : ''));
    return inclusions(partiel, cur);
  });
}

const gabarits = () => ({
  name: 'inclusions-html',
  transformIndexHtml: { order: 'pre', handler: (html) => inclusions(html) },
});

export default defineConfig({
  plugins: [gabarits(), tailwindcss()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p, resolve(racine, `${p}.html`)])),
    },
  },
  server: {
    proxy: { '/api': 'http://localhost:3001' },
  },
});
