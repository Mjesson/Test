# Hypothèses retenues (spécification, section 9) à confirmer

Chaque ligne est implémentée avec l'hypothèse par défaut de la spécification. Elle est à valider avec les métiers (IC, ADV), le RSSI et le DPO.

| N° | Sujet | Hypothèse implémentée | Où |
|---|---|---|---|
| 1 | Authentification | **Scénario retenu** (variante intermédiaire) : lien, 3 premières lettres du prénom (3 essais), création d'un mot de passe ; connexions suivantes e-mail + mot de passe. Pas de code MFA. | `mock/server.mjs`, `connexion.js` |
| 2 | Clé de vérification | Prénom (3 premières lettres) : donnée peu secrète, à renforcer côté serveur | : |
| 3 | Validité du lien | Lien `expire` simulé ; durée réelle à paramétrer (7 jours suggérés) | mock |
| 4 | Essais avant blocage | 3 | mock |
| 7 | ETA | Fournie par le système, date unique | `dossier.html` |
| 8 | Motifs de rejet | Libellé fourni par le système, affiché sous le document | `dossier.js` |
| 10 | Pièces jointes de messagerie | Rattachement automatique, mêmes règles que le dépôt | `mock/dossier.mjs` |
| 11 | 4e formulaire KYC | Affiché « disponible prochainement » | `formulaires.js` |
| 12 | Champs préremplis | Modifiables ; le marqueur « ✦ Prérempli » disparaît après modification | `formulaire-pays.js` |
| 13 | Pays autorisés | Liste fournie par l'API ; pays hors liste acceptés avec justification obligatoire | `mock/formulaires.mjs` |
| 14 | Dossier bloqué | **Adaptation** : au moins une pièce à corriger, ou des pièces à fournir sans activité depuis plus de 7 jours (la règle « toute pièce à fournir » de la spec bloquerait presque tous les dossiers) | `mock/portefeuille.mjs` |
| 15 | « Nouveau prospect » | Bouton masqué | : |
| 16 | Relances | Dans la messagerie du portail, notification dans le fil « Notifications » ; l'e-mail n'est pas simulé | : |
| 17 | Formulaire du lot 1 | Questionnaire pays (seul détaillé dans la spec) | : |
| 18 | Formulaire soumis | Lecture seule | `formulaire-pays.js` |
| 20 | Détail côté apporteur | Vue de suivi en lecture (statuts uniquement, sans motifs ni analyse interne) ; dépôt de pièces par l'apporteur non implémenté | `portefeuille-dossier.js` |

## Écarts connus avec la spécification

- **Frise** : 4 étapes côté prospect (Collecte de documents, Réception de l'offre, Signature, Financement) ; 5 étapes côté apporteur (ajout de « Contrôle ADV »).
- **Messagerie de l'apporteur** : non implémentée (l'apporteur n'a que le portefeuille).
- **Sécurité** : le mock simule l'isolation des données (RT-1) et les droits par profil (403) ; les contrôles réels sont à faire côté serveur. Les jetons sont en `sessionStorage` dans ce POC ; en production, préférer un cookie `HttpOnly`.
- **Aperçu de document** (« Voir ») : métadonnées uniquement ; l'aperçu du contenu dépend de l'API de stockage.
- **Aucune modification de mot de passe ni « mot de passe oublié »** dans cette version.
