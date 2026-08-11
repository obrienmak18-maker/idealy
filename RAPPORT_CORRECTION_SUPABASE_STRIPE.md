# Rapport de correction — Idealy / Supabase / Stripe

**Date de vérification :** 11 août 2026  
**Dépôt :** [obrienmak18-maker/idealy](https://github.com/obrienmak18-maker/idealy)  
**Projet Supabase :** IDEALY, région `eu-west-3`

## Diagnostic initial

L’erreur affichée dans le formulaire d’inscription ne venait pas d’une panne de Supabase. Elle venait du frontend actif situé sous `artifacts/idealy` : le client Supabase retournait `null` lorsque les variables Vite n’étaient pas injectées et qu’aucune clé n’était encore saisie dans l’interface.

Deux défauts aggravaient le problème. Le store Zustand actif excluait complètement `connectors` de sa persistance et remplaçait les connecteurs par `{}` lors de la restauration. De plus, l’écouteur `onAuthStateChange` était installé une seule fois au chargement ; après une saisie des clés dans Paramètres, il fallait donc recharger la page.

## Correctifs appliqués

| Zone | Correction |
|---|---|
| Client Supabase actif | Ajout de la configuration publique du projet IDEALY comme valeur de secours, tout en conservant la priorité aux variables d’environnement et aux valeurs saisies dans Paramètres. La clé utilisée est une clé publique de navigateur, jamais une clé de service. |
| Store Zustand | Persistance limitée à `supabaseUrl` et `supabaseAnonKey`, qui sont des paramètres publics du frontend. Les secrets serveur, notamment la clé Stripe, ne sont pas persistés. |
| Initialisation de session | Réinstallation de l’écouteur Supabase lorsque les paramètres de connexion changent. |
| Paywall Stripe | Alignement avec les produits réellement actifs dans Stripe : Pro à 19 €/mois et Business à 79 €/mois. L’interface n’affiche plus un faux sélecteur annuel tant qu’aucun prix annuel n’existe. |
| Edge Functions versionnées | Mise en cohérence du checkout et du webhook avec les tables réelles `profiles` et `subscriptions`, les identifiants Stripe actifs et l’usage du rôle service côté serveur. |
| CI GitHub | Remplacement de `npm ci`/`npm run lint` incompatibles avec ce workspace pnpm. Le workflow utilise maintenant pnpm, lance le bon build Idealy et ignore proprement le déploiement Supabase si les secrets GitHub ne sont pas configurés. |

## Vérifications effectuées

| Vérification | Résultat |
|---|---|
| Typecheck frontend | Réussi |
| Build Vite de production | Réussi |
| Test HTTP local du frontend | Réussi |
| Bundle de production | Contient l’URL publique Supabase IDEALY ; le client peut donc s’initialiser sans saisie préalable des clés et le chemin d’erreur n’est plus atteint avec la configuration par défaut |
| Endpoint public Auth Supabase | HTTP 200 ; authentification e-mail active et confirmation automatique active |
| Projet Supabase | Actif et sain |
| Webhook Stripe live | Endpoint actif vers `https://vhucjkyktdflwocrmzhe.supabase.co/functions/v1/stripe-webhook` |
| Événements webhook | `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted` et `checkout.session.completed` configurés |
| Workflow GitHub final | Réussi pour le build et le job de déploiement ; le déploiement Supabase est volontairement ignoré car les secrets GitHub correspondants sont absents |

## Publication

Les corrections ont été poussées sur `main` dans les commits suivants :

- `2db078e` — configuration Supabase et écoute d’authentification ;
- `78c6779` — alignement du paywall sur les prix Stripe actifs ;
- `dfa5ee1` — synchronisation des Edge Functions et du workflow CI ;
- `7561d8d` — absence de secrets Supabase rendue non bloquante pour le workflow.

## Action restante

Le code corrigé est publié dans GitHub et le build passe. Si le site visible n’est pas automatiquement redéployé par l’hébergeur connecté au dépôt, il faudra simplement déclencher ou attendre le déploiement frontend de la branche `main`.

Le workflow GitHub est prêt à déployer les Edge Functions dès que `SUPABASE_ACCESS_TOKEN` et `SUPABASE_PROJECT_ID` seront ajoutés dans les secrets du dépôt. Cette étape n’est pas nécessaire pour le diagnostic immédiat : les fonctions live et le webhook Stripe sont déjà présents et actifs sur le projet Supabase IDEALY.

La seule validation non exécutée automatiquement est un achat réel en mode live Stripe, car elle créerait une transaction. Le checkout, les prix actifs, l’endpoint webhook et le traitement serveur ont été vérifiés sans créer de paiement.

## Références

[1]: https://github.com/obrienmak18-maker/idealy "Dépôt GitHub Idealy"
[2]: https://supabase.com/docs/guides/auth "Documentation Supabase Auth"
[3]: https://supabase.com/docs/guides/functions "Documentation Supabase Edge Functions"
[4]: https://docs.stripe.com/webhooks "Documentation Stripe Webhooks"
[5]: https://docs.stripe.com/billing/subscriptions/overview "Documentation Stripe Subscriptions"
