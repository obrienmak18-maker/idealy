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

## Session workspace complète

Le workspace réel peut aussi être inspecté localement avec `DEMO_MODE=true NEXT_PUBLIC_DEMO_MODE=true PORT=3101 pnpm dev`. Cette session conserve le vrai shell : sidebar, composer, conversation, top bar de build, **Run squad**, appareils, Preview/Code/Database/Console, ouverture de preview, partage, publication et redimensionnement. Une saisie injecte uniquement en mémoire un plan, des messages, une mission et des événements de fichiers. Le canvas reçoit un HTML local par l’événement `data-preview`, sans requête Supabase, IA, Stripe, GitHub, Vercel ou Netlify.

La vérification du workspace complet a confirmé qu’après l’envoi d’une intention, le split view réel s’ouvre avec le message assistant à gauche et l’aperçu **Atelier Nord** à droite. L’iframe reçoit une landing locale lisible avec titre, actions et trois cartes. Cette preuve valide le canvas du vrai shell ; elle ne constitue pas une mission persistée ni un build d’application externe.

Les onglets du canvas ont ensuite été contrôlés dans le même workspace : **Code** affiche le fichier local validé `src/app/page.tsx` dans le vrai éditeur et **Données** affiche le schéma de mission en lecture seule avec le badge `Demo mode`. Les valeurs de tables restent volontairement inconnues plutôt que de simuler un enregistrement Supabase.

Le bouton **Run squad** a été déclenché dans cette session : il affiche d’abord `Building`, puis revient à `Run squad` après la progression locale Lyra → Mason → Nova. En mode démo, ce chemin court-circuite explicitement la requête vers l’orchestrateur Supabase et inscrit seulement un journal en mémoire.

Le menu **More actions** et sa commande **Show Console** ont aussi été vérifiés. La console du vrai canvas affiche les entrées locales de plan et de preview, avec le statut `completed`. Cette interaction n’ouvre aucune connexion réseau externe et garde les informations d’exécution volontairement identifiées comme locales.

Le sélecteur d’appareil a été vérifié dans la vue **Preview** : le format mobile applique le cadre étroit du vrai canvas et conserve l’aperçu Atelier Nord lisible, y compris les actions et les trois cartes. Les formats bureau et tablette réutilisent le même comportement de viewport fourni par le composant Artifact.

Le lien temporaire exposé a enfin été vérifié après autorisation de son origine de développement. Le bouton **Ouvrir la démonstration complète** déclenche bien depuis cette URL le vrai shell, l’intention locale, la réponse, le split view et l’aperçu Atelier Nord. Il est donc possible de présenter tout le parcours sans compte et sans Netlify ; la session reste en mémoire et disparaît au rechargement.

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
