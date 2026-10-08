# Architecture d’identité live

Date : 23 août 2026.

## Règle de sécurité

La chaîne PostgreSQL transmise dans la conversation n’est pas utilisée. Elle est considérée comme compromise et doit être révoquée ou remplacée avant toute connexion. Aucune valeur de credential n’a été ajoutée au dépôt, à une commande, à un fichier `.env` suivi par Git ou à la configuration publique.

## Correspondance Auth.js–Supabase

Le workspace conserve ses tables `User`, `Chat`, `Message_v2`, `Document` et `Stream` dans son Postgres local. Le backend Idealy conserve ses profils, missions, crédits, intégrations et runs d’agents dans Supabase. Pour éviter une correspondance fragile basée uniquement sur l’email, `User.supabaseUserId` est maintenant une référence UUID nullable et unique.

| Situation | Comportement |
|---|---|
| Supabase non configuré | Auth.js/Postgres local reste utilisable pour le développement structurel ; aucun appel Edge n’est tenté. |
| Supabase configuré | Le mot de passe est validé par Supabase Auth après la vérification locale, puis l’UUID Supabase est lié au compte local. |
| Première inscription avec confirmation email active | Le compte Supabase est créé, le compte local est créé, puis l’interface affiche `pending_confirmation` sans simuler une connexion. |
| Session authentifiée | L’access token et le refresh token Supabase restent dans le JWT serveur Auth.js ; ils ne sont pas ajoutés à la session publique ni au navigateur comme donnée applicative. |
| Collision de mapping | La contrainte unique sur `supabaseUserId` bloque un rattachement ambigu et l’authentification échoue au lieu de mélanger deux identités. |

La migration locale `lib/db/migrations/0001_add_supabase_user_mapping.sql` ajoute la colonne et l’index de manière idempotente. Elle n’a pas été appliquée à la base distante Supabase.

## Runtime requis après rotation

Les variables doivent être installées dans le gestionnaire de secrets de la cible de déploiement, jamais dans le dépôt ni dans la conversation. Le minimum pour le chemin live est `AUTH_SECRET`, `POSTGRES_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `IDEALY_AI_PROVIDER=supabase-function` et, si nécessaire, `IDEALY_AI_FUNCTION_URL`. Les secrets de fournisseur IA, Stripe, Vercel, GitHub et le service role Supabase restent côté Edge ou côté serveur.

## Validation prévue

La validation doit suivre cet ordre : migration Postgres locale, inscription, confirmation email éventuelle, connexion, création d’un chat, persistance des messages, appel `intentOnly`, appel `planOnly`, streaming `process-ai-request`, contrôle des crédits, puis création de mission et de runs d’agents. Aucun bouton Publish, export GitHub, déploiement Vercel ou action Stripe ne doit être considéré fonctionnel avant son test explicite avec confirmation.



## Convergence 2026-10-08

Le chemin Firebase n’accepte plus un simple email comme preuve de propriété d’un compte Postgres local. Un ID token Firebase vérifié est d’abord transformé côté serveur en une vraie session Supabase Auth, puis cette session Supabase est stockée dans le JWT serveur NextAuth. La relation `User.supabaseUserId` reste la clé de rattachement.

Le navigateur n’envoie pas de token Firebase directement à Supabase Realtime pour la présence : il récupère un token Supabase de session via une route NextAuth serveur, puis le client Realtime rejoint un canal **privé** autorisé par RLS.

Les anciens fallbacks d’identité en mémoire ont été supprimés : si la persistance Postgres ou la session Supabase n’est pas disponible, l’opération échoue explicitement.

