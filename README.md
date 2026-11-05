# ChannelO — maquettes des apps

Maquettes cliquables en HTML, CSS et JavaScript, faites à partir du brief « ChannelO — Apps à concevoir ».
Pas d'installation, pas de serveur, pas d'appel à Internet.

## Ouvrir

Double-cliquez sur `index.html`, puis choisissez une app.

## Les trois interfaces de chaque app

Chaque app a trois interfaces séparées, choisies avec les onglets en haut de la page
(ou directement depuis l'accueil) :

- **Mobile · citoyen** (`proposition-<app>.html#mobile`) : l'application du citoyen, sa discussion avec l'entité ;
- **Agent · dossier** (`#agent`) : la conversation dans la console web, avec le nouvel outil de la zone de réponse (point orange) ;
- **Console · administrateur** (`#admin`) : la page où l'administrateur de l'entité configure l'app.

Les trois partagent la même discussion : ce que l'agent envoie arrive dans l'onglet Mobile, et inversement.
Une pastille orange sur l'onglet signale un nouveau message.
Le citoyen voit toujours le nom de l'entité, jamais celui de l'agent.

En haut :
- **Cas à montrer** : les états vides, les erreurs, le chargement et les cas limites du brief ;
- **Mode sombre / Mode clair**.

Recharger la page remet tout à zéro.

## Apps prêtes (les 10)

| App | Exemple | Cas à montrer |
|---|---|---|
| Catalogue | Montres Azur | produit épuisé, prix modifié après l'envoi, catalogue vide, 300 produits, chargement |
| Commande | Montres Azur | article épuisé pendant la commande, commande annulée, deuxième commande en cours, quantité modifiée avec l'accord du client, aucune commande, chargement |
| Paiement Mobile Money | Montres Azur | solde insuffisant, expiration, double appui sur « Payer », remboursement, compte pas encore connecté, chargement |
| Rendez-vous | Salon Belle Allure | l'agent propose des créneaux, rappel la veille, plus aucun créneau, client absent, rendez-vous déplacé, chargement |
| Livraison et suivi | Montres Azur | livraison en route, client injoignable, adresse introuvable, retour du colis, aucun livreur ni zone, chargement |
| Devis et facture | Garage Bon Moteur | composer un devis, devis expiré, nouvelle version, devis accepté à facturer, acompte partiel, identité à compléter, chargement |
| Réponses rapides et FAQ | Service Eau Claire | la FAQ a déjà répondu, aucune réponse trouvée, mauvaise réponse signalée, réponse automatique désactivée, rien de configuré, chargement |
| Diffusions | Montres Azur | diffusion reçue et réponse du client, client désabonné, limite par semaine atteinte, aucune diffusion ni abonné, chargement |
| Fidélité et coupons | Montres Azur | coupon expiré, coupon déjà utilisé, points insuffisants, rien de configuré, chargement |
| Connecteurs | Montres Azur | connexion expirée, envoi en échec et nouvel essai, aucun connecteur activé, chargement |

## Points à vérifier avant le développement

- **Paiement** : le fournisseur de paiement (FedaPay, KKiaPay…) n'est pas choisi. Ses écrans imposés et ses conditions peuvent changer le parcours.
- **Rendez-vous** : le citoyen voit le prénom de la personne qui le reçoit (coiffeuse, médecin), parce qu'il la choisit. C'est différent de l'agent de la console, qui reste invisible.
- **Livraison** : le brief ne prévoit pas d'écran pour le livreur. Il reste à décider comment il envoie sa photo ou la signature et comment il signale un problème (l'agent le saisit pour lui dans cette maquette).
- **Devis et facture** : vérifier les mentions obligatoires et les règles de facturation au Bénin (notamment la facture normalisée) avant de présenter ces documents comme de vraies factures.
- **FAQ** : la correspondance par mots-clés peut se tromper (« couper mon abonnement » déclenche la réponse sur les coupures d'eau). C'est le cas montré dans « Mauvaise réponse signalée ».
- **Connecteurs** : Google Sheets et le webhook font sortir des données vers un service choisi par l'entité. Les règles du projet interdisent les appels vers des services tiers non listés : il faut décider si ce choix de l'entité est accepté, et comment le lui expliquer.
- **Fidélité** : le moment où les points sont donnés (ici, après la livraison) et ce qui se passe en cas de retour ou de remboursement sont à valider.
- **Diffusions** : le texte de la demande d'accord et la limite par semaine sont à valider.
- Les rappels et les notifications suivent le réglage de confidentialité de l'entité : aperçu du message ou contenu masqué.

## Organisation des fichiers

```
index.html                      Liste des 10 apps
proposition-<app>.html          Une maquette par app
assets/css/maquette.css         Couleurs (clair et sombre), console, téléphone
assets/js/maquette.js           Moteur commun : scène, discussion partagée, fenêtres, thème
assets/js/boutique.js           Données fictives de la boutique (toutes les apps de vente)
assets/js/<app>.js              Vues, cartes et cas de chaque app
assets/fonts/Exo2.ttf           Police Exo 2 (licence SIL Open Font License)
```

## Ajouter une app

1. Copiez `proposition-catalogue.html` en `proposition-<app>.html`, puis remplacez `catalogue.js` par `<app>.js`.
2. Dans `assets/js/<app>.js`, appelez `C.define({...})` avec :
   - `admin()` : la page Réglage ;
   - `tools()` : les outils de la zone de réponse de l'agent ;
   - `side()` : le panneau de droite du dossier ;
   - `card(message, 'desk' | 'phone')` : les cartes de la discussion ;
   - `cases` et `reset(cas)` : les cas à montrer ;
   - `act`, `input`, `change` : les actions des boutons et des champs.
3. Dans `index.html`, passez l'app à « Maquette prête ».

Toutes les données sont fictives : noms, numéros, boutiques.
