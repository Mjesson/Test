# Suivi d'écoconception (RGESN)

Démarche : faire simple, charger peu, calculer peu. Mesures vérifiables avec `npm run build && npm run budget`.

## Budget

| Indicateur | Cible | Mesuré (gzip) |
|---|---|---|
| Poids total par page (HTML + CSS + JS) | ≤ 100 Ko | 6 à 14 Ko |
| JavaScript par page | ≤ 15 Ko | 0 à 6 Ko |
| Requêtes externes (CDN, polices, trackers) | 0 | 0 |
| Dépendances d'exécution | 0 | 0 (Vite et Tailwind uniquement au build) |

## Par famille du référentiel

| Famille | Mesures |
|---|---|
| Stratégie | Périmètre limité aux usages du parcours de suivi de dossier ; un POC sans fonctionnalité superflue |
| Spécifications | Pas de média, d'animation ni de lecture automatique ; texte et SVG ; pas de mode « riche » imposé |
| Architecture | Pages statiques par écran, JS par page (pas de SPA lourde), appels API ciblés, aucun *polling* : les statuts sont rafraîchis après action |
| UX / UI | Interface sobre (nuances de gris), polices système, icônes SVG intégrées, listes paginées (10 par page) et filtrées côté client sur un jeu de données unique |
| Contenus | Aucune image décorative ; formats de dépôt limités à PDF et JPG, 20 Mo max, contrôlés avant envoi (pas d'envoi inutile) |
| Frontend | CSS Tailwind purgé et minifié (≈ 4 Ko gzip), modules ES, pas de framework, pas de bibliothèque tierce |
| Backend (hors périmètre) | À traiter : cache HTTP des assets hachés, compression, dimensionnement, durée de conservation des pièces |
| Hébergement (hors périmètre) | À traiter : hébergeur à faible impact, mesure en production |

## Pistes restantes

- Compression des images (JPG) côté navigateur avant envoi (gain réseau pour le prospect).
- En-têtes de cache longue durée sur `/assets/*` (noms hachés par Vite).
- Mesure d'impact réelle (GreenIT Analysis, EcoIndex) sur l'environnement déployé.
- Mode sombre : n'a d'intérêt écologique que sur écrans OLED ; non prioritaire (voir `BACKLOG.md`).
