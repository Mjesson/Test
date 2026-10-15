# Backlog

## Design
- [ ] Mode sombre (`prefers-color-scheme`) : les jetons sont des variables CSS dans `src/css/main.css` ; redéfinir la palette en respectant le RGAA.
- [ ] Logo EGA définitif (wordmark provisoire).

## Fonctionnel
- [ ] Formulaires Fiche client, ESG et KYC (contenu à fournir par les métiers).
- [ ] Messagerie côté apporteur.
- [ ] Dépôt de pièces par l'apporteur dans le détail d'un dossier.
- [ ] « Mot de passe oublié » et changement de mot de passe.
- [ ] Aperçu du contenu d'un document (dépend de l'API de stockage).
- [ ] Bouton « Nouveau prospect » (décision métier à prendre, voir `docs/hypotheses.md`).
- [ ] Expiration de session et déconnexion automatique (RT-2).

## Conformité
- [ ] Audit RGAA complet et tests lecteurs d'écran (voir `docs/accessibilite.md`).
- [ ] Textes juridiques définitifs (mentions légales, données personnelles, déclaration d'accessibilité).
- [ ] Mesure d'impact en production (RGESN).

## Technique
- [ ] Brancher les vraies API (`VITE_API_URL`) et remplacer le jeton `sessionStorage` par un cookie `HttpOnly`.
- [ ] Intégration continue : `npm run build`, `npm run budget`, `npm run test:e2e`.
