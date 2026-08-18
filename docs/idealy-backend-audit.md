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
