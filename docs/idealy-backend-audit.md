# Audit backend Idealy — état avant intégration

## Conclusion courte

Le backend n’est pas vide : l’authentification Supabase, le proxy IA, le mode BYOK, les crédits, les intégrations GitHub/Figma et Stripe existent déjà. En revanche, plusieurs générations de schéma Stripe coexistent. Le chemin Checkout/Webhook récent utilise `profiles` et `subscriptions`, alors que `check-subscription`, `create-billing-portal`, `cancel-subscription` et le calcul de mode de `process-ai-request` lisent encore `stripe_customers`. Tant que cette divergence n’est pas corrigée, un abonnement peut être créé et reçu par le webhook sans que toutes les fonctions voient le même état.

## État constaté

| Surface | État | Risque principal |
|---|---|---|
| Auth Supabase | Code présent | La connexion de production dépend encore des variables Vite injectées au build |
| Proxy IA | Présent et sécurisé côté Edge Function | Les modes Managed/BYOK reposent sur les crédits et le fournisseur configuré |
| BYOK | Chiffrement AES-GCM prévu | `AI_KEY_ENCRYPTION_SECRET` doit exister côté Edge Functions |
| Crédits | Migrations et RPC présents | Deux générations de débit coexistent dans l’historique des migrations |
| Checkout Stripe | Utilise `profiles.stripe_customer_id` | Doit rester la source unique avec le webhook |
| Webhook Stripe | Signature vérifiée et recharges idempotentes | Doit être aligné avec toutes les fonctions de gestion d’abonnement |
| Portail / annulation / statut | Encore sur `stripe_customers` | Incompatibilité directe avec le Checkout récent |
| Connecteurs GitHub/Figma | OAuth et stockage sécurisé présents | Les secrets OAuth doivent exister dans Supabase pour un test réel |
| CI | Déploie les Edge Functions uniquement sur `main` | Les secrets GitHub Supabase doivent être configurés pour le déploiement |

## Correction prioritaire

La première correction est de normaliser les fonctions Stripe autour de `profiles.stripe_customer_id` et `subscriptions`. La table historique `stripe_customers` ne doit pas être supprimée pendant cette passe : elle reste présente dans les migrations anciennes et pourra être dépréciée après vérification de la base distante.

Le calcul du mode Managed/BYOK doit également lire l’état d’abonnement cohérent avec `profiles`/`subscriptions`, tout en conservant la possibilité BYOK prioritaire. Les crédits ne doivent être débités que pour `IDEATION` et `EXECUTION`, jamais pour une conversation.

## Configuration absente de l’environnement local

Aucune des variables serveur sensibles n’est présente dans le shell de travail : clés Supabase serveur, secret d’encryption BYOK, clés fournisseurs IA, clés Stripe et price IDs. C’est normal pour éviter de copier des secrets dans Git, mais cela empêche un test réel depuis cette machine. La présence des noms dans `.env.example` ne prouve pas leur présence sur le projet Supabase distant.

L’intégration Supabase de la session n’a pas pu être interrogée pendant cet audit à cause d’une coupure de connexion du serveur externe. Le code et les migrations ont donc été audités localement ; aucune migration distante n’a été appliquée à ce stade.

## Périmètre de cette passe

La coque visuelle reste inchangée. Les corrections prévues portent sur la cohérence des fonctions Edge, les tests de contrat et la documentation de déploiement. Aucun secret ne sera ajouté au dépôt et aucune fusion vers `main` ne sera faite sans validation explicite.

## Vérification distante du 18 août 2026

Le projet Supabase distant identifié est `IDEALY`, référence `vhucjkyktdflwocrmzhe`, région `eu-west-3`, état `ACTIVE_HEALTHY`. La base distante possède déjà les tables modernes `profiles`, `subscriptions`, `user_integrations`, `integration_oauth_states`, `integration_credentials`, `user_ai_keys`, `credit_ledger` et `user_credits`, ainsi que les anciennes tables `integrations`, `oauth_states` et `stripe_customers`. Cette coexistence explique pourquoi certaines fonctions legacy pouvaient encore fonctionner tout en contournant le modèle moderne.

Les migrations distantes sont nommées `create_inia_schema`, `idealy_identity_billing`, `harden_legacy_functions`, `add_agent_platform_foundation`, `secure_oauth_integration_credentials`, `document_service_only_credentials_access`, `configure_private_project_assets_bucket`, `add_covering_foreign_key_indexes` et `harden_security_definer_functions`. Elles ne portent pas les mêmes noms que les migrations locales récentes ; aucune migration distante n’a été appliquée automatiquement pendant cette passe.

Les fonctions publiées après correction sont `process-ai-request` version 4, `stripe-webhook` version 20, `integration-connect` version 20, `integration-callback` version 20, `create-billing-portal` version 2, `check-subscription` version 2, `cancel-subscription` version 2, `integration-status` version 2, `vercel-deploy` version 2, `vercel-status` version 2 et `ai-proxy` version 2. Le webhook conserve `verify_jwt=false` parce qu’il vérifie la signature Stripe ; les autres fonctions concernées exigent un JWT.

Le linter sécurité Supabase signale trois informations, non des erreurs critiques : RLS est activé sans policy sur `credit_ledger`, `user_ai_keys` et `user_credits`. Ce choix est volontaire pour empêcher l’accès direct des rôles client ; ces tables sont utilisées via des fonctions SECURITY DEFINER ou le service role. La vérification des RPC distantes `consume_ai_credit`, `grant_user_credits` et `refund_ai_credit` a été lancée ; son résultat doit être conservé avec la sortie MCP correspondante.

La fonction `stripe-webhook` a nécessité un payload de déploiement déclarant explicitement `deno.json` comme import map, car Supabase conservait une référence historique vers cet import map. Le déploiement final a réussi après cette correction.

La requête distante sur `information_schema.routines` a confirmé la présence des trois RPC : `consume_ai_credit`, `grant_user_credits` et `refund_ai_credit`. Le contrat de crédits requis par le proxy IA et le webhook existe donc bien sur le projet IDEALY distant.

## Avis sécurité après publication OAuth

Le linter sécurité Supabase ne rapporte aucune alerte critique. Il conserve trois avis de niveau `INFO` `rls_enabled_no_policy` sur `public.credit_ledger`, `public.user_ai_keys` et `public.user_credits`. Ces tables sont volontairement sans policies pour empêcher toute lecture ou écriture directe par `anon` et `authenticated`; les accès passent par le service role et les RPC contrôlées. La documentation Supabase associée est https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy. Aucune policy permissive n'a été ajoutée pour faire disparaître artificiellement ces avis.

## Fonctions Edge publiées — état final

| Fonction | Version | verify_jwt | import_map | Registre |
|---|---|---|---|---|
| process-ai-request | 4 | true | false | profiles/subscriptions |
| stripe-webhook | 20 | false | deno.json | profiles/subscriptions |
| integration-connect | 20 | true | deno.json | integration_oauth_states |
| integration-callback | 21 | false | deno.json | user_integrations + integration_credentials |
| integration-status | 3 | true | — | user_integrations |
| github-export | 2 | true | deno.json | user_integrations + integration_credentials |
| check-subscription | 2 | true | — | profiles/subscriptions |
| create-billing-portal | 2 | true | — | profiles/subscriptions |
| cancel-subscription | 2 | true | — | profiles/subscriptions |
| vercel-deploy | 2 | true | — | auth.users |
| vercel-status | 2 | true | — | auth.users |
| ai-proxy | 2 | true | — | 410 → process-ai-request |

L’inventaire Supabase final confirme les fonctions modernes actives : `integration-connect` v20 (`verify_jwt=true`), `integration-callback` v21 (`verify_jwt=false`), `integration-status` v3, `github-export` v2, `process-ai-request` v4, `stripe-webhook` v20 (`verify_jwt=false`), `create-billing-portal` v2, `check-subscription` v2, `cancel-subscription` v2, `vercel-deploy` v2, `vercel-status` v2 et `ai-proxy` v2. Les anciennes fonctions `create-checkout-session` v19 et `create-portal-session` v18 sont encore actives dans Supabase, mais le frontend actuel appelle `create-billing-portal`; elles restent à déprécier séparément après confirmation de compatibilité pour éviter une suppression intempestive.
