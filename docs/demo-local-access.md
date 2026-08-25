# Démonstration locale Idealy

## But

La route `/demo-flow` permet de présenter l’expérience Idealy sans session utilisateur, paiement, export, publication externe, appel à un modèle IA ou dépendance à Netlify. Elle est destinée aux démonstrations produit, aux répétitions de vidéo et aux retours UX précoces.

## Lancement local

Depuis la racine du dépôt, lancer le serveur sur un port disponible :

```bash
PORT=3100 pnpm dev
```

Ouvrir ensuite [http://127.0.0.1:3100/demo-flow](http://127.0.0.1:3100/demo-flow). Le port `3000` peut déjà être utilisé par un autre service local ; utiliser alors le port dédié configuré ci-dessus.

La vérification locale du 25 août 2026 a confirmé que la route charge directement avec son interface complète, ses portraits, les onglets **Preview**, **Code**, **Données** et **Console**, ainsi que les marqueurs explicites `Mode démonstration`, `aperçu local` et `aucune donnée persistée`. Après l’ajout de `allowedDevOrigins`, le scénario avance correctement : le premier clic fait passer la progression de 0 % à 36 %, ajoute le livrable de cadrage et ouvre la projection de fichiers dans l’onglet Code. Aucune requête IA, écriture Supabase, publication ou action Netlify n’a été déclenchée.

Les onglets **Données** et **Console** ont aussi été vérifiés. La vue Données marque le schéma comme `read-only` et précise qu’aucun enregistrement n’est créé. Le journal affiche les étapes terminées et en attente, puis conclut explicitement qu’aucun agent externe n’est invoqué.

## Parcours conseillé pour une vidéo

| Séquence | Action | Message produit honnête |
|---|---|---|
| 1 | Choisir une voie et adapter l’idée. | Idealy aide à cadrer une mission avant de construire. |
| 2 | Cliquer sur **Démarrer la mission**. | Le scénario local illustre le passage de l’idée au plan. |
| 3 | Avancer les étapes de l’escouade. | Les rôles Architecte, Builder et Reviewer rendent la progression visible. |
| 4 | Ouvrir **Preview**, **Code**, **Données** et **Console**. | Chaque vue explique une facette du workspace ; les données restent locales. |
| 5 | Cliquer sur **Présenter** pour focaliser le canvas, puis **Recommencer**. | Cette démo montre l’expérience cible sans lancer de mission persistante. |

## Limites à annoncer

Les avatars fournis sont conservés visuellement, mais les noms, rôles et formulations exposés par la démo sont des profils originaux Idealy. Les événements affichés sont explicitement locaux et illustratifs. La route ne prouve donc pas le smoke test authentifié, le checkout Stripe, les intégrations OAuth ou la publication d’une application générée.

> Ne jamais présenter cette route comme une exécution backend persistante ni comme une version déjà publiée. Elle démontre l’interface, le parcours et les états qu’un utilisateur peut comprendre avant l’ouverture de la bêta.
