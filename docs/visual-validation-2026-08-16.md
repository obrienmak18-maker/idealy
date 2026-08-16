# Validation frontend Idealy — 16 août 2026

## Objet

Cette validation couvre le cahier des charges frontend joint : énergie visible en pourcentage, expérience de mission plus lisible, passage de rang Jonin sans transformer les quatre voies en niveaux tarifaires, aura Pro/Ermite lorsque l’abonnement existant est actif, génération locale de démonstration et preview pizzeria utilisable sans appel externe. Le backend, les Edge Functions, Supabase, Stripe, les crédits serveur, le BYOK et les contrats métier existants n’ont pas été modifiés.

## Changements livrés

| Élément | Implémentation | Limite volontaire |
|---|---|---|
| EnergyGauge | Affiche désormais `ÉNERGIE N%`, avec une barre proportionnelle et une étiquette d’accessibilité indiquant également la valeur brute. | Le calcul et la source d’énergie restent ceux du store existant. |
| TooltipProvider | Ajout d’un provider global dans `App.tsx`, nécessaire aux tooltips du rail d’icônes. | Aucun changement de comportement métier. |
| Mode démo pizzeria | Le mode `/demo` route localement vers `EXECUTION`, transmet sans réseau et produit une chronologie Daniel/Léon/Bill déterministe. | Ce générateur est explicitement une démo locale ; il ne remplace pas la pipeline IA authentifiée. |
| Boot de preview | Le boot WebContainer du mode démo est différé jusqu’à l’installation du schéma Forno finalisé. | Les missions réelles conservent leur activation au lancement d’`EXECUTION`. |
| Fallback Forno | Si WebContainer ne devient pas opérationnel dans le délai de tolérance, une preview HTML locale est rendue dans l’iframe. | Le fallback est réservé au projet local Forno et n’est pas présenté comme un déploiement réel. |
| Modale Jonin | Les missions classées avancées et les utilisateurs sans abonnement actif peuvent continuer en gratuit ou ouvrir le paywall existant. | Aucun nouveau Price ID, aucune modification Stripe et aucune règle backend ajoutée. |
| Aura Pro/Ermite | Lorsque `check-subscription` confirme un abonnement Pro ou Business actif, le header reçoit une aura discrète et le badge `Mode Ermite`. | La confirmation dépend du statut déjà exposé par le hook Stripe existant. |

## Validation visuelle

Le serveur local a été lancé sur `http://127.0.0.1:4173/demo`. La première ouverture a révélé une erreur réelle : `Tooltip must be used within TooltipProvider`. L’ajout du provider global a supprimé l’ErrorBoundary et permis de rendre le workspace normalement.

Le scénario suivant a ensuite été exécuté avec le brief : « Crée-moi une landing page pour une pizzeria, avec un menu, une section contact, et de vraies photos de pizzas. » Le panneau « Dépôt de tâche » apparaît avant la confirmation, avec l’équipe Daniel/Léon, le rang Starter et une estimation de cinq unités d’énergie. Le boot de preview ne se déclenche pas au simple routage ; il est activé après la confirmation de la mission.

Après confirmation, la chronologie affiche la mission utilisateur, la transmission locale de Lia, le plan de Daniel, l’intervention de Léon, la création de `src/main.tsx`, `src/App.tsx` et `src/styles.css`, puis la validation locale de Bill. Les cinq fichiers générés apparaissent dans l’espace Code. L’énergie est décrémentée de cinq unités conformément au comportement local existant.

WebContainer reste bloqué sur « Connexion au WebContainer… » dans le navigateur local, sans erreur JavaScript exploitable et avec `crossOriginIsolated: true`. Le fallback déterministe prend alors le relais après son délai. La capture finale montre effectivement la landing Forno dans l’iframe : logo `FORNO`, liens `Le menu` et `Contact`, titre « La pâte prend son temps. Vous aussi. », bouton « Découvrir le menu », photo de pizza et sections menu/contact. Les liens d’ancrage sont présents dans le DOM de la preview.

## Mesures de build

Le typecheck complet du monorepo a réussi pour `api-server`, `idealy`, `mockup-sandbox` et `scripts`. Le build Vite frontend a transformé 3 028 modules et a réussi. Les avertissements sourcemap de `tooltip.tsx` et `resizable.tsx`, ainsi que l’avertissement `eval` de `lottie-web`, sont des avertissements de build existants et non des erreurs bloquantes.

| Mesure finale | Résultat |
|---|---:|
| Chunk `WorkspacePage` brut | 180 355 octets |
| Chunk `WorkspacePage` gzip | 55 038 octets |
| Objectif | ≤ 200 kB gzip |
| Marge sous l’objectif | environ 145 kB gzip |
| Modules transformés | 3 028 |

L’audit Rollup confirme que le chunk initial ne contient plus les dépendances lourdes du terminal, du diff viewer et de la collaboration. Le chunk reste donc très largement sous la limite de performance demandée.

## Contrôle de sécurité et de périmètre

`git diff --check` ne signale aucune erreur. Le garde-fou sur les fichiers modifiés ne trouve aucune modification sous `artifacts/api-server`, `supabase`, `functions` ou une autre arborescence backend. Aucun secret, token, clé fournisseur, valeur BYOK ou identifiant Stripe n’a été ajouté au frontend ou au rapport.

La modale Jonin ne définit pas de nouveau système tarifaire pour les voies Ninja, Mage, Hunter et Pro. Elle réutilise uniquement le statut d’abonnement et les fonctions de checkout déjà présentes. Les quatre voies restent des orientations d’expérience et d’agents, pas des niveaux commerciaux.

## Références internes

[1]: `artifacts/idealy/src/routes/WorkspacePage.tsx` — orchestration du workspace, routage local et modale Jonin.
[2]: `artifacts/idealy/src/components/workspace/WebContainerPreview.tsx` — boot différé et fallback Forno.
[3]: `artifacts/idealy/src/components/workspace/EnergyGauge.tsx` — affichage de l’énergie en pourcentage.
[4]: `artifacts/idealy/src/app/App.tsx` — provider global des tooltips.
[5]: `/tmp/idealy-final-audit.json` — audit Rollup final.
[6]: `/tmp/idealy-final-build.log` — sortie du build Vite final.
