import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ouvrir, audit, largeur, connexion, cap } from './lib.mjs';

const { b, p } = await ouvrir();
const dir = mkdtempSync(join(tmpdir(), 'ega-'));
const f = (nom, octets) => { const chemin = join(dir, nom); writeFileSync(chemin, Buffer.alloc(octets)); return chemin; };

await connexion(p, 'demo', 'cam');
await p.waitForSelector('#vue:not([hidden])');
await audit(p, 'dossier'); await largeur(p, 'dossier');
await cap(p, 'apercu-dossier-bureau.png');
console.log('aide:', await p.textContent('#aide-validation'));

await p.click('#btn-valider', { force: true }); // aria-disabled : doit rester sans effet
console.log('dialogue ouverte (attendu false):', await p.evaluate(() => document.getElementById('dlg-confirmation').open));

await p.setInputFiles('#fichiers', f('x.txt', 10));
console.log('refus:', (await p.textContent('#depot-erreurs')).trim());
await p.click('tr:has-text("RIB") button');
await p.setInputFiles('#fichiers', [f('rib.pdf', 2000)]);
await p.waitForSelector('#envois li p:has-text("Rattaché")');
await p.setInputFiles('#fichiers', [f('liasse-2025.pdf', 3000), f('inconnu.pdf', 100)]);
await p.waitForSelector('#non-rattachees:not([hidden])');
await p.click('tr:has-text("Pièce d’identité") button');
await p.setInputFiles('#fichiers', [f('cni-neuve.jpg', 100)]);
await p.waitForSelector('#envois li:has-text("cni-neuve") p:has-text("Rattaché")');
await p.waitForTimeout(800);
console.log('aide:', await p.textContent('#aide-validation'));

await p.click('#btn-valider'); await p.waitForSelector('#dlg-confirmation[open]');
await audit(p, 'dialogue de confirmation');
await p.click('#dlg-conf-ok'); await p.waitForSelector('#bandeau-envoi:not([hidden])');
console.log('étape courante:', await p.$eval('#frise [aria-current=step]', (e) => e.innerText.replace(/\n/g, ' ')));
await audit(p, 'après envoi'); await largeur(p, 'après envoi');
console.log('erreurs console:', p.errs);
await b.close();
