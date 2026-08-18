# Handoff — maquette autonome Idealy

## Ouvrir la maquette

Depuis `artifacts/idealy`, lancer le serveur frontend puis ouvrir :

```text
/design-mockup
```

La page est autonome. Elle ne requiert ni session Supabase, ni Stripe, ni connecteur OAuth, ni clé IA. Les actions sont locales et simulées afin de juger l’expérience visuelle avant de toucher au backend.

## Fichiers à lire

| Fichier | Rôle |
|---|---|
| `artifacts/idealy/src/routes/DesignMockupPage.tsx` | Toute la maquette autonome : accueil, onboarding, workspace, timeline, preview, code, data et terminal |
| `artifacts/idealy/src/app/App.tsx` | Route `/design-mockup` |
| `docs/idealy-design-agent-context.md` | Contexte produit et contraintes à comprendre avant toute passe de design |
| `docs/idealy-design-mockup-validation.md` | Parcours déjà vérifié localement |

## Règle de travail pour l’agent design

Comprendre d’abord le produit et conserver la structure générale : sidebar visible au démarrage, top bar seulement après mission, conversation éditoriale plutôt que bulles WhatsApp, preview comme centre de gravité, code et data en vues secondaires, terminal dans un tiroir. Toute proposition esthétique doit être présentée séparément avant modification du backend ou de la logique produit.
