// Lance les parcours de bout en bout : un mock neuf par parcours, un serveur Vite partagé.
// Prérequis : navigateur Chromium (CHROMIUM_PATH, défaut /opt/pw-browsers/chromium).
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { setTimeout as pause } from 'node:timers/promises';
import { resolve } from 'node:path';

const racine = resolve(import.meta.dirname, '..');
const lancer = (args) => spawn(process.execPath, args, { cwd: racine, stdio: 'ignore' });
const vite = lancer(['node_modules/vite/bin/vite.js', '--port', '5173', '--strictPort']);
await pause(4000);

let echecs = 0;
const filtre = process.argv[2];
for (const fichier of readdirSync(resolve(racine, 'tests/e2e')).filter((f) => f.endsWith('.mjs') && f !== 'lib.mjs' && (!filtre || f.includes(filtre)))) {
  const mock = lancer(['mock/server.mjs']);
  await pause(800);
  console.log(`\n=== ${fichier}`);
  const code = await new Promise((fin) => spawn(process.execPath, [resolve(racine, 'tests/e2e', fichier)], { cwd: racine, stdio: 'inherit' }).on('exit', fin));
  mock.kill();
  await pause(300);
  if (code !== 0) { echecs += 1; console.log(`ÉCHEC : ${fichier}`); }
}
vite.kill();
process.exit(echecs ? 1 : 0);
