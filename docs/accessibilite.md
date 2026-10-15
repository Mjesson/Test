# Suivi d'accessibilité (RGAA 4.1)

**État : non audité.** Les contrôles automatisés (axe-core, WCAG 2.2 A/AA + bonnes pratiques) passent sur tous les écrans (`npm run test:e2e`). Un audit RGAA complet par un auditeur reste nécessaire avant toute déclaration de conformité. Légende : ✅ traité et testé automatiquement ou par parcours · 🟡 traité par conception, à vérifier manuellement · ⬜ à auditer.

## Par thème

| Thème | État | Ce qui est fait | À vérifier / reste à faire |
|---|---|---|---|
| 1. Images | ✅ | Aucune image porteuse d'information ; icônes SVG décoratives (`aria-hidden`), logo texte | : |
| 2. Cadres | ✅ | Aucun cadre (`iframe`) | : |
| 3. Couleurs | 🟡 | Jetons ≥ 4,5:1 (texte) et ≥ 3:1 (composants) ; statuts = texte + icône ; liens soulignés | Mesure des contrastes sur tous les états (survol, désactivé) |
| 4. Multimédia | ✅ | Aucun média | : |
| 5. Tableaux | ✅ | `caption`, `th scope`, tableaux de données uniquement ; défilement horizontal du tableau du portefeuille dans une région nommée et focalisable | Vérification lecteur d'écran |
| 6. Liens | ✅ | Intitulés explicites ; boutons d'action avec nom complet (« Déposer : Kbis… ») contenant le libellé visible | : |
| 7. Scripts | 🟡 | Statuts dynamiques annoncés (`role="status"`, `alert`), gestion du focus à chaque changement d'étape/fil, modales natives avec piège de focus | Tests NVDA / VoiceOver |
| 8. Éléments obligatoires | ✅ | `lang="fr"`, titre de page unique et pertinent (mis à jour par étape), hiérarchie des titres | : |
| 9. Structuration | ✅ | Landmarks (`header`, `nav`, `main`, `footer`), listes, `ol` pour les étapes (`aria-current="step"`) | : |
| 10. Présentation | 🟡 | Texte en `rem`, reflow jusqu'à 320 px sans défilement horizontal de page (testé), focus visible 3 px, `prefers-reduced-motion` | Zoom texte 200 % sur tous les écrans |
| 11. Formulaires | ✅ | Étiquettes explicites, aides liées (`aria-describedby`), erreurs textuelles liées au champ + résumé d'erreurs avec focus et liens, `autocomplete`, champs groupés (`fieldset`/`legend`), contrôle de saisie annoncé | : |
| 12. Navigation | ✅ | Lien d'évitement, navigation principale cohérente, pas de piège clavier, pagination libellée | Plan du site / moteur de recherche (non requis à ce stade) |
| 13. Consultation | ✅ | Pas de limite de temps, pas de nouvelle fenêtre, pas de contenu clignotant | Délai d'expiration de session à définir (RT-2) |

## Choix de conception

- **Éléments natifs d'abord** : `dialog`, `progress`, `input type="file"`, `select`, `fieldset`. Le glisser-déposer n'est qu'une amélioration ; le champ fichier reste la voie principale.
- **Bouton de validation** : `aria-disabled` plutôt que `disabled` tant que le dossier est incomplet, avec une explication textuelle liée (`aria-describedby`), pour que le bouton reste découvrable au clavier.
- **Connexion** : modale non fermable par Échap (accès obligatoire), erreurs en résumé d'alerte avec liens vers les champs, essais restants en texte.
- **Onglets du portefeuille** : motif ARIA *tabs* avec flèches, Début, Fin (tabindex itinérant).

## Reste à faire avant déclaration de conformité

1. Audit RGAA complet (106 critères) et rapport.
2. Tests avec lecteurs d'écran, commande vocale, zoom 200–400 %.
3. Mode sombre (voir `BACKLOG.md`) : à concevoir avec vérification des contrastes.
4. Mettre à jour la page « Déclaration d'accessibilité » (état de conformité, contact, voies de recours).
