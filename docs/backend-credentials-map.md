# Credentials backend Idealy

Cette fiche indique uniquement où créer ou récupérer les credentials officiels. Aucun secret ne doit être copié dans Git, dans un ticket ou dans une conversation.

## Priorité de raccordement

| Besoin | Credential recommandé | Où le créer/récupérer | Usage dans Idealy |
|---|---|---|---|
| Modèles IA via Gateway | `AI_GATEWAY_API_KEY` | [Vercel AI Gateway API Keys](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai-gateway%2Fapi-keys&title=AI+Gateway+API+Keys) | Backend uniquement pour le streaming, le tool calling et le routage de modèles |
| Base Postgres | `POSTGRES_URL` ou équivalent | [Supabase Connect](https://supabase.com/dashboard/project/_?showConnect=true) ou le fournisseur Postgres retenu | Migrations et requêtes serveur pour utilisateurs, chats, documents et versions |
| Supabase côté serveur, si nécessaire | clé secrète Supabase | [Supabase Settings > API Keys](https://supabase.com/dashboard/project/_/settings/api-keys/) | Edge Functions ou serveur sécurisé uniquement ; jamais dans le navigateur |
| Supabase côté client, si nécessaire | clé publishable Supabase | [Supabase Settings > API Keys](https://supabase.com/dashboard/project/_/settings/api-keys/) | Client public avec RLS activé ; à éviter tant que le pont d’identité Auth.js ↔ Supabase n’est pas décidé |
| Authentification Auth.js | `AUTH_SECRET` | Généré et stocké dans l’environnement serveur du déploiement | Signature des sessions Auth.js |
| Paiements futurs | Stripe secret + webhook signing secret | [Stripe Developers > API keys](https://dashboard.stripe.com/apikeys) et [Webhooks](https://dashboard.stripe.com/webhooks) | Backend uniquement pour abonnements, crédits et webhooks |
| Stockage de fichiers futur | credentials du stockage déjà prévu dans l’environnement du déploiement | [Vercel Storage](https://vercel.com/storage) ou S3 compatible | Uploads et pièces jointes ; conserver les bytes hors PostgreSQL |

## Règles de sécurité

La clé AI Gateway doit être créée avec un nom explicite et, si possible, une limite de budget. Vercel indique qu’une clé nouvellement créée doit être copiée immédiatement car sa valeur complète n’est plus récupérable ensuite. Si une clé fuit, elle doit être révoquée immédiatement et remplacée.

Supabase distingue les clés publishable, utilisables dans un composant public sous RLS, et les clés secret, réservées au serveur et capables de contourner RLS. Les clés secret Supabase ne doivent jamais être utilisées dans le navigateur, même sur localhost, ni être envoyées dans le chat.

Pour la base, le choix dépend de l’environnement. Une connexion directe convient à un backend persistant ; un pooler transactionnel convient aux fonctions serverless ou edge. Le mot de passe de la chaîne Postgres ne doit jamais être inclus dans une URL publique ni commité.

## Ordre conseillé pour Idealy

La première étape réelle sera de stabiliser le modèle d’identité : conserver Auth.js/Postgres comme source des utilisateurs et décider explicitement si Supabase sert uniquement aux fonctions Edge et aux crédits, ou devient aussi le fournisseur d’authentification. Ensuite, ajouter le credential Gateway côté serveur, tester un appel modèle avec budget limité, puis connecter les tables Postgres et les uploads. Stripe viendra après la stabilité du chat et des crédits.

## Références officielles

[1]: https://vercel.com/docs/ai-gateway/authentication-and-byok/api-keys — Vercel AI Gateway, API Keys.
[2]: https://vercel.com/docs/ai-gateway/getting-started — Vercel AI Gateway, Getting Started.
[3]: https://supabase.com/docs/guides/getting-started/api-keys — Supabase, Understanding API keys.
[4]: https://supabase.com/docs/guides/database/connecting-to-postgres — Supabase, Connect to your database.
[5]: https://dashboard.stripe.com/apikeys — Stripe Developers, API keys.
[6]: https://dashboard.stripe.com/webhooks — Stripe Developers, Webhooks.
