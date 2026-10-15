import { ouvrir, audit, largeur, base, cap } from './lib.mjs';
const { b, p } = await ouvrir();
for (const pg of ['accessibilite', 'mentions-legales', 'donnees-personnelles', 'ecoconception']) {
  await p.goto(`${base}/${pg}.html`);
  console.log(pg, '| h1:', await p.textContent('h1'));
  await audit(p, pg); await largeur(p, pg);
}
await p.goto(base + '/'); await p.waitForSelector('#modale[open]'); await audit(p, 'index');
await cap(p, 'apercu-accessibilite.png');
console.log('erreurs console:', p.errs);
await b.close();
