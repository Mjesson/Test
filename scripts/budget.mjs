// Mesure le poids transféré (gzip) de chaque page : HTML + CSS + JS qu'elle charge.
// Usage : npm run build && npm run budget   (budget RGESN du projet : 100 Ko / page, JS 15 Ko)
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '..', 'dist');
const BUDGET_PAGE = 100 * 1024;
const BUDGET_JS = 15 * 1024;
const gz = (fichier) => gzipSync(readFileSync(resolve(dist, fichier))).length;
const ressources = (html) => [...html.matchAll(/(?:src|href)="\/(assets\/[^"]+)"/g)].map((m) => m[1]);

let echec = false;
const lignes = [];
for (const page of readdirSync(dist).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(resolve(dist, page), 'utf8');
  // Les modules importés par le point d'entrée sont suivis via les balises modulepreload.
  const fichiers = [...new Set(ressources(html))];
  const js = fichiers.filter((f) => f.endsWith('.js')).reduce((s, f) => s + gz(f), 0);
  const total = gz(page) + fichiers.reduce((s, f) => s + gz(f), 0);
  const ko = (n) => `${(n / 1024).toFixed(1)} Ko`;
  const ok = total <= BUDGET_PAGE && js <= BUDGET_JS;
  if (!ok) echec = true;
  lignes.push(`${ok ? 'OK ' : 'KO '} ${page.padEnd(28)} total ${ko(total).padStart(8)}   JS ${ko(js).padStart(8)}`);
}
console.log(lignes.sort().join('\n'));
console.log(`\nBudget : ${BUDGET_PAGE / 1024} Ko par page, dont ${BUDGET_JS / 1024} Ko de JS (gzip).`);
process.exit(echec ? 1 : 0);
