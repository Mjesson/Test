# Portail d'onboarding client EGA : POC front

Interface web de suivi de dossier : un prospect dépose ses documents, remplit ses formulaires, échange avec son interlocuteur commercial et valide l'envoi ; un apporteur d'affaires (courtier) suit son portefeuille. Front uniquement : les API sont simulées par un mock.

Conçu pour le **RGAA 4** (accessibilité) et le **RGESN** (écoconception), avec **Tailwind CSS v4**, sans framework JavaScript (HTML sémantique + JS vanilla en modules ES, Vite comme simple outil de build).

## Démarrage

```bash
npm install
npm run mock   # API simulée sur http://localhost:3001
npm run dev    # interface sur http://localhost:5173 (proxy /api vers le mock)
```

Liens de démonstration (page de connexion) :

| Lien | Profil | Saisie demandée |
|---|---|---|
| `/?token=demo` | Prospect (Camille Durand) | `cam`, puis création du mot de passe (12 caractères min.) |
| `/?token=courtier` | Apporteur (Sophie Bernard) | `sop`, puis création du mot de passe |
| `/?token=expire` | Lien expiré | : |
| `/?token=bloque` | Accès bloqué | : |

Une fois le mot de passe créé, la connexion se fait avec l'e-mail (`camille.durand@exemple.fr`, `sophie.bernard@courtage.example`) et ce mot de passe, tant que le mock tourne (l'état est en mémoire).

## Écrans

| Page | Profil | Contenu |
|---|---|---|
| `index.html` | tous | Connexion en modale (lettres du prénom, mot de passe) |
| `dossier.html` | prospect | Frise en 4 étapes, documents, dépôt, validation d'envoi |
| `formulaires.html`, `formulaire-pays.html` | prospect | Liste des formulaires, questionnaire pays en 3 étapes |
| `messagerie.html` | prospect | Conversations, notifications, pièces jointes |
| `portefeuille.html`, `portefeuille-dossier.html` | apporteur | Indicateurs, onglets, filtres, détail en lecture |
| `accessibilite`, `mentions-legales`, `donnees-personnelles`, `ecoconception` | tous | Pages légales (modèles à compléter) |

## Scripts

| Commande | Rôle |
|---|---|
| `npm run build` | Build de production dans `dist/` |
| `npm run budget` | Poids gzip de chaque page vs budget (100 Ko, dont 15 Ko de JS) |
| `npm run test:e2e` | Parcours de bout en bout (Playwright + axe-core WCAG 2.2 AA, reflow 320 px) ; `SCREENSHOTS=1` régénère les captures de `docs/` ; `CHROMIUM_PATH` pour le navigateur |

## Organisation

```
*.html                 une page par écran (gabarits partagés : partials/)
src/css/main.css       Tailwind v4 : jetons (variables CSS) et composants
src/js/api.js          client API unique (VITE_API_URL pour brancher les vraies API)
src/js/composants.js   statuts, frise, erreurs de formulaire (partagés)
src/js/pages/*.js      un module par page
mock/                  API simulée (aucune dépendance)
tests/                 parcours e2e
docs/                  conformité, hypothèses, captures
```

Les gabarits `partials/` sont assemblés au build par un petit plugin Vite (`vite.config.js`) : le HTML livré est statique.

## Documentation

- [`docs/accessibilite.md`](docs/accessibilite.md) : suivi RGAA
- [`docs/ecoconception.md`](docs/ecoconception.md) : suivi RGESN et budget
- [`docs/hypotheses.md`](docs/hypotheses.md) : hypothèses de la spécification à confirmer
- [`BACKLOG.md`](BACKLOG.md) : reste à faire (mode sombre, etc.)
