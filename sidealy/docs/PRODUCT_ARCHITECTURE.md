# Idealy — Note de Cadrage Produit & Architecture

> **Projet :** Idealy (Nouvelle application indépendante)  
> **Date :** 31 octobre 2026  
> **Statut :** Spécification de référence — Nouvelle création intégrale

---

## 1. Vision et Positionnement

**Idealy** est un environnement conversationnel et de travail assisté par plusieurs IA conçu pour unifier l'échange direct, l'exploration structurée et la production tangible de livrables (documents, artefacts, code) au sein d'une même surface ergonomique fluide.

### Ce qu'Idealy n'est pas :
- Ce n'est pas un clone générique de chatbot.
- Ce n'est pas une refonte ni une continuation du produit historique Idealy ou du prototype exploratoire précédent.
- Ce n'est pas un empilement artificiel de composants décoratifs sans utilité métier.

### Ce qu'Idealy apporte :
- **Clarté conversationnelle :** Un fil principal centré sur la lisibilité (largeur optimisée 720–780px), un interligne généreux, et une gestion exemplaire du défilement (pas de snap forcé au défilement pendant la lecture, reprise manuelle via « Revenir au dernier message »).
- **Navigation contextuelle durable :** Organisation par **Espaces** de travail intégrant des instructions persistantes, des ressources dédiées et un ensemble de conversations associées.
- **Continuité totale :** Aucun brouillon, aucune sélection et aucune position de lecture n'est perdue lors du passage d'un fil à un autre ou du changement d'espace.
- **Panneau de travail complémentaire (Sidecar) :** Les documents, synthèses et blocs de code étendus s'ouvrent à droite sur grand écran sans dénaturer le fil principal, et basculent en vue plein écran adaptée sur mobile.
- **Honnêteté technique :** Aucune simulation de backend fictif, ni faux compte ou faux streaming prétexté actif. L'adaptateur applicatif expose sans ambiguïté les états réels de chaque service.

---

## 2. Utilisateurs cibles et Cas d'usage

### Personas prioritaires :
1. **Le Créateur / Chef de projet technique :**
   - *Besoin :* Passer rapidement d'un échange exploratoire à la rédaction d'un document structuré ou d'un cahier des charges sans copier-coller permanent.
   - *Parcours clé :* Sélectionne l'Espace projet > lance une conversation en mode « Produire » > extrait le résultat sous forme d'artefact consultable dans le panneau latéral.
2. **Le Développeur / Analyste :**
   - *Besoin :* Discuter de logique d'architecture, manipuler des extraits de code lisibles avec coloration et copie sécurisée, naviguer au clavier avec fluidité via `Ctrl+K`.
   - *Parcours clé :* Utilisation de la palette de commandes > consultation d'extraits avec défilement horizontal local > copie avec feedback accessible.
3. **Le Chercheur / Veilleur d'informations :**
   - *Besoin :* Mode « Explorer » pour comparer différentes approches ou sources, organiser des ressources durables dans son espace.

---

## 3. Architecture de l'Information (IA)

```text
Idealy
├── Barre latérale (Desktop fixe / Mobile tiroir accessible)
│   ├── En-tête : Logo Idealy & Sélecteur d'Espace
│   ├── Action rapide : « Nouvelle conversation » (`Ctrl+Alt+N`)
│   ├── Outil : « Rechercher ou agir » (`Ctrl+K`)
│   ├── Section Espaces & Fils :
│   │   ├── Fils épinglés
│   │   ├── Fils récents (avec indicateur de brouillon actif)
│   │   └── Gestion de l'Espace (Instructions, Ressources)
│   ├── Vues complémentaires :
│   │   ├── Productions (Bibliothèque d'artefacts)
│   │   ├── Activités (Statut des opérations)
│   │   └── Archives
│   └── Pied : Profil utilisateur, Sélecteur de thème & Paramètres
│
├── Surface Principale (Fil de lecture central)
│   ├── En-tête de conversation : Titre, Espace rattaché, Actions (Renommer, Épingler, Exporter, Supprimer)
│   ├── Zone des messages :
│   │   ├── Message utilisateur (rôle, horodatage, contenu)
│   │   └── Réponse assistant (Markdown sémantique, blocs de code avec Copier, tableaux défilants, cartes d'artefacts ouvrables)
│   ├── Indicateur de statut (Génération, Arrêt, Erreur récupérable, Hors-ligne)
│   └── Composeur persistant :
│       ├── Sélecteur d'intention (Discuter, Explorer, Produire)
│       ├── Zone de saisie extensible (Enter pour envoyer, Maj+Enter pour saut de ligne, protection IME)
│       ├── Zone des pièces jointes (affichage du nom et taille, retrait immédiat, honnêteté de traitement)
│       └── Boutons d'action : Joindre (+), Arrêter (en cours de flux), Envoyer
│
└── Panneau Complémentaire / Artefact (Sidecar)
    ├── En-tête : Titre de l'artefact, type (Document, Code, Spécification), Bouton Copier, Télécharger, Fermer
    └── Contenu : Prévisualisation ou rendu source avec focus clavier managé
```

---

## 4. Inventaire des Références & Niveau de Preuve

Conformément à la règle de rigueur méthodologique, les technologies des plateformes sont qualifiées selon les 4 statuts :
- **Fait documenté :** Source primaire officielle vérifiable.
- **Observé :** Analyse d'une extraction publique ou du comportement du navigateur.
- **Déduction plausible :** Hypothèse technique vraisemblable sans confirmation formelle.
- **Inconnu / Non public :** Détail propriétaire non publié.

| Référence | Licence / Accès | Ce qui est Fait documenté | Ce qui est Déduction ou Inconnu |
|---|---|---|---|
| **ChatGPT (OpenAI)** | Propriétaire | React + TypeScript documentés dans les offres d'emploi officielles ; raccourcis et companion window documentés. | Architecture interne complète du flux de réponse, bibliothèque CSS exacte, gestion interne des tokens : **Non publiques**. |
| **Claude (Anthropic)** | Propriétaire | Parcours clavier documenté (`Tab`, `F6`, `Échap` pour les Artefacts) ; navigation entre fil et panneau d'artefact. | Moteur interne des composants et pile technique de rendu : **Non publiques**. |
| **Gemini (Google)** | Propriétaire | Espace Canvas et ses flux de transformation documentés officiellement ; intégration Workspace. | Détails complets de l'implémentation client : **Non publiques**. |
| **DeepSeek** | Propriétaire / Modèles Open Weights | Paramètre `stream` et champs `reasoning_content` documentés pour l'API. | Interface web complète propriétaire ; le dépôt « DeepSeek Honest / Awareness » mentionné verbalement n'a pas été retrouvé et son adresse reste **inconnue**. |
| **Chatbot UI** | MIT (Open Source) | Dépôt public GitHub (Next.js/React, Tailwind) d'interface de chat personnalisable. | Réutilisable comme inspiration de patterns sans dépendance directe. |
| **Bolt.new (StackBlitz)** | Propriétaire / Démo MIT | Environnement de développement et aperçu dans le navigateur via WebContainers. | Stack lourde complexe non adaptée par défaut à Idealy ; seule la séparation fil / aperçu est retenue. |

---

## 5. Contrats d'Interaction & Règles d'Ergonomie

1. **Anti-Double-Envoi & Composition IME :**
   - La soumission du message est bloquée pendant la frappe de caractères accentués ou de compositions IME (`e.nativeEvent.isComposing`).
   - L'envoi est verrouillé dès la première validation et ne se déverrouille que lorsque le cycle passe à l'état `completed`, `aborted` ou `error`.
2. **Pas d'autofocus intrusif sur mobile :**
   - Sur écran tactile / mobile (< 768px), le champ de saisie ne capture pas automatiquement le focus au chargement afin de ne pas forcer l'ouverture inattendue du clavier virtuel.
3. **Persistance des brouillons :**
   - Chaque conversation et le formulaire de démarrage possèdent un stockage de brouillon distinct en mémoire locale. Changer de conversation ou d'espace préserve immédiatement le texte saisi.
4. **Contrôle du défilement lors du streaming :**
   - Si l'utilisateur remonte le fil manuellement, l'ancrage automatique vers le bas est interrompu immédiatement. Un bouton accessible « Revenir au dernier message » s'affiche pour rétablir l'ancrage à la demande.
5. **Gestion du focus et de l'accessibilité :**
   - Les dialogues et la palette de commandes capturent le focus dans leur conteneur (focus trap).
   - La touche `Échap` referme tout dialogue, tiroir ou menu ouvert et restitue le focus à l'élément déclencheur initial.
   - Les contrastes respectent les ratios WCAG AA (≥ 4.5:1 sur texte courant).
