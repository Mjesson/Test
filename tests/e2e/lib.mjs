import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
export const axe = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
export const base = 'http://localhost:5173';
export async function ouvrir() {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium' });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 }, locale: 'fr-FR' });
  p.errs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => m.type() === 'error' && p.errs.push(m.text()));
  return { b, p };
}
export async function audit(p, nom) {
  await p.evaluate(axe);
  const r = await p.evaluate(() => axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] }));
  console.log(nom, 'axe:', JSON.stringify(r.violations.map((v) => [v.id, v.nodes.length, v.nodes[0].html.slice(0, 140)])));
  if (r.violations.length) process.exitCode = 1; // une violation fait échouer le parcours
}
export async function largeur(p, nom) {
  await p.setViewportSize({ width: 320, height: 800 });
  const w = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
  console.log(nom, '@320 scrollWidth/innerWidth:', w);
  if (w[0] > w[1]) process.exitCode = 1; // défilement horizontal = échec du reflow
  await audit(p, nom + ' @320');
  await p.setViewportSize({ width: 1280, height: 900 });
}
const EMAILS = { demo: 'camille.durand@exemple.fr', courtier: 'sophie.bernard@courtage.example' };
export async function connexion(p, token, lettres) {
  await p.goto(base + `/?token=${token}`);
  await p.waitForSelector('#lettres, #email');
  if (await p.$('#email')) {
    await p.fill('#email', EMAILS[token]); await p.fill('#mdp', 'motdepasse-solide'); await p.click('button[type=submit]');
  } else {
    await p.fill('#lettres', lettres); await p.click('button[type=submit]');
    await p.waitForSelector('#mdp'); await p.fill('#mdp', 'motdepasse-solide'); await p.fill('#mdp2', 'motdepasse-solide'); await p.click('button[type=submit]');
  }
  await p.waitForURL((u) => !u.search.includes('token') && u.pathname !== '/');
  await p.waitForLoadState('networkidle');
}

// Captures d'écran facultatives : SCREENSHOTS=1 npm run test:e2e (écrites dans docs/).
export async function cap(p, nom) {
  if (process.env.SCREENSHOTS) await p.screenshot({ path: new URL(`../../docs/${nom}`, import.meta.url).pathname, fullPage: true });
}
