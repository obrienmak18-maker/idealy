# GitHub OAuth pour les utilisateurs Idealy

## Parcours réel

Chaque utilisateur connecté dans Idealy peut associer **son propre compte GitHub**. Idealy crée un état OAuth aléatoire, ne conserve en base que son empreinte, puis le consomme une seule fois au retour de GitHub. Le jeton reçu est chiffré côté Edge avec AES‑GCM avant stockage dans `integration_credentials`; il n’est jamais transmis au navigateur.

| Composant | Valeur à configurer | Rôle |
|---|---|---|
| GitHub OAuth App | **Homepage URL** : `https://idealy-ai.netlify.app` | Page publique de l’application affichée à l’utilisateur. |
| GitHub OAuth App | **Authorization callback URL** : `https://vhucjkyktdflwocrmzhe.supabase.co/functions/v1/integration-callback` | GitHub renvoie le code d’autorisation à la fonction Edge, pas directement au navigateur. |
| Supabase Edge secrets | `GITHUB_OAUTH_CLIENT_ID` et `GITHUB_OAUTH_CLIENT_SECRET` | Identifient uniquement l’application OAuth Idealy auprès de GitHub. |
| Supabase Edge secrets | `APP_ORIGIN=https://idealy-ai.netlify.app` | Retourne l’utilisateur vers Idealy après succès ou erreur OAuth. |
| Supabase Edge secrets | `INTEGRATION_ENCRYPTION_KEY` | Chiffre les jetons utilisateur avant écriture en base. Elle doit être aléatoire, longue, privée et stable ; sa rotation demande une procédure dédiée. |
| Netlify environment | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AUTH_SECRET` et le fournisseur de session déjà utilisés par le workspace | Permettent au proxy Next de transmettre la session authentifiée à Supabase. Les clés GitHub ne doivent pas être ajoutées au client Netlify. |

## Étapes d’activation

Dans GitHub, ouvrez les paramètres développeur du compte ou de l’organisation qui possède Idealy, puis créez une **OAuth App** nommée `Idealy`. Inscrivez l’URL publique et l’URL de callback ci-dessus. Copiez le Client ID et générez le Client Secret uniquement dans les interfaces sécurisées de secrets Supabase ; ne les envoyez pas par message et ne les versionnez jamais.

Déployez ensuite les fonctions `integration-connect`, `integration-callback`, `integration-status` et `github-export` avec les secrets présents. Sur Idealy, l’utilisateur ouvre **Plugins & connecteurs**, choisit GitHub et accepte les droits demandés. Le statut doit devenir `Connecté` seulement après le retour OAuth, la vérification de son profil GitHub et l’écriture chiffrée du jeton.

> Le flux actuel demande `repo user`, car l’export existant peut créer un dépôt privé et y écrire des fichiers. Cette portée est large : aucune écriture GitHub ne doit partir automatiquement d’un agent. L’export doit être précédé d’une confirmation décrivant le compte, le dépôt, les fichiers et la branche.

GitHub recommande l’usage de scopes minimaux, d’un `state` aléatoire et, lorsque possible, de PKCE. Le `state` à usage unique est déjà présent dans Idealy. Avant d’activer l’expiration des jetons GitHub, ajoutez le stockage chiffré du refresh token et son renouvellement côté Edge ; l’implémentation actuelle ne doit pas annoncer ce support. [1] [2]

## Ajouter un nouveau plugin OAuth

Un nouveau fournisseur est traité comme une intégration distincte : fournisseur déclaré dans le catalogue, URL de callback propre, état à durée courte, scope minimal, stockage chiffré du jeton, statut vérifiable, révocation et tests de lecture avant toute action d’écriture. Le navigateur ne reçoit que le nom, les scopes, l’état et l’identité affichable du compte.

| Niveau | Exemples | Règle de mise en service |
|---|---|---|
| Lecture | Notion, Google Drive, Figma | Lire seulement les ressources autorisées par le compte connecté. |
| Préparation | GitHub, Vercel, Canva | Préparer une action et afficher son récapitulatif complet. |
| Écriture | Publication, partage, création de dépôt | Exiger une confirmation de mission à usage unique avant l’appel fournisseur. |

## Connecteurs MCP

Un serveur MCP ne doit pas être assimilé à un simple bouton de plugin. Pour Idealy, un connecteur MCP utilisateur doit être ajouté par un administrateur après vérification de son URL, son modèle d’authentification, les outils qu’il expose, ses limites de coût et son isolation réseau. Chaque installation doit être liée à `user_integrations` avec `connection_type = 'mcp'`; les secrets restent chiffrés dans `integration_credentials`.

La première version doit accepter une **liste approuvée** de serveurs MCP, sans URL arbitraire fournie par un agent ou un navigateur. Les appels ne sont permis qu’après vérification de propriété de mission, de politique d’outil et, pour toute écriture, d’une confirmation expirante et consommable une seule fois. Cela évite qu’un prompt ou un serveur tiers détourne l’agent vers le réseau interne ou déclenche des actions invisibles.

## Références

[1]: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps "GitHub — Authorizing OAuth apps"
[2]: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps "GitHub — Scopes for OAuth apps"
