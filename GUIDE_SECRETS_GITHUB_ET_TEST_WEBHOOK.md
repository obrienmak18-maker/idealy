# Idealy — secrets GitHub et test local du webhook Stripe

Ce guide est adapté au dépôt [obrienmak18-maker/idealy](https://github.com/obrienmak18-maker/idealy) et au projet Supabase **IDEALY** dont la référence est `vhucjkyktdflwocrmzhe`.

> **Important :** `SUPABASE_ACCESS_TOKEN` est un token de gestion Supabase destiné à la CLI et à GitHub Actions. Il ne s’agit ni de la clé `anon`, ni de la clé `publishable`, ni de la clé `service_role`. Ne colle aucun secret dans le dépôt ou dans une conversation.

## 1. Ajouter les secrets GitHub

### Méthode recommandée : interface GitHub

Ouvre le dépôt [obrienmak18-maker/idealy](https://github.com/obrienmak18-maker/idealy), puis va dans **Settings → Secrets and variables → Actions → Secrets → New repository secret**.

Crée exactement les deux secrets suivants :

| Nom exact | Valeur à saisir |
|---|---|
| `SUPABASE_ACCESS_TOKEN` | Un **Personal Access Token Supabase** créé depuis le tableau de bord Supabase, avec un accès suffisant au projet IDEALY. |
| `SUPABASE_PROJECT_ID` | `vhucjkyktdflwocrmzhe` — uniquement la référence du projet, pas l’URL complète. |

Pour le premier secret, crée le token depuis la section des tokens de compte Supabase : [Supabase Account Tokens](https://supabase.com/dashboard/account/tokens). Copie-le immédiatement, car un token personnel ne doit pas être publié dans le code ni dans les logs.

Après avoir enregistré les deux secrets, ouvre **Actions**, sélectionne **Deploy Idealy**, puis lance **Run workflow** sur la branche `main`. Le workflow contient désormais un déclenchement manuel. Tu peux aussi déclencher automatiquement le workflow en poussant un nouveau commit sur `main`.

### Méthode alternative : GitHub CLI

Sur un ordinateur où GitHub CLI est connecté avec un compte disposant des droits d’écriture sur le dépôt, exécute :

```bash
gh secret set SUPABASE_ACCESS_TOKEN --repo obrienmak18-maker/idealy
```

La commande demande le token de façon interactive. Ensuite, définis la référence du projet :

```bash
gh secret set SUPABASE_PROJECT_ID \
  --repo obrienmak18-maker/idealy \
  --body 'vhucjkyktdflwocrmzhe'
```

Pour vérifier uniquement les noms, sans afficher les valeurs :

```bash
gh secret list --repo obrienmak18-maker/idealy
```

Le workflow attend ces noms précis dans `.github/workflows/deploy.yml`. Si l’un des secrets manque, GitHub fournit une chaîne vide et le workflow affiche qu’il ignore le déploiement Supabase ; le build frontend peut néanmoins réussir.

Le résultat attendu après configuration est que l’étape **Deploy Supabase functions** exécute les trois déploiements suivants :

```text
supabase functions deploy ai-proxy
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook --no-verify-jwt
```

## 2. Préparer le test local

Le test local utilise exclusivement le **mode test Stripe**. Il ne nécessite pas de paiement réel et ne modifie pas les événements live. Le dépôt fournit maintenant une commande tout-en-un :

```bash
pnpm test:webhook:local
```

Cette commande démarre Supabase localement, applique les migrations, récupère les clés locales, sert les Edge Functions, génère des événements Stripe signés synthétiques pour création/mise à jour/résiliation, vérifie `profiles` et `subscriptions`, puis supprime l’utilisateur temporaire. Elle nécessite Docker et pnpm ; la CLI Supabase est utilisée si elle est déjà installée, sinon le script la télécharge via pnpm.

Le même test s’exécute automatiquement dans le job **webhook-test** du workflow GitHub à chaque push ou exécution manuelle. Le dernier run validé est `31519193677`.

Il faut installer sur ton ordinateur :

1. [Stripe CLI](https://docs.stripe.com/stripe-cli), puis exécuter `stripe login` ;
2. [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) ;
3. Docker Desktop ou un runtime Docker compatible, car Supabase s’appuie dessus pour servir les fonctions localement.

Dans une copie locale du dépôt, crée le fichier `supabase/functions/.env.local`. Il ne doit jamais être commité :

```dotenv
SUPABASE_URL=https://vhucjkyktdflwocrmzhe.supabase.co
SUPABASE_ANON_KEY=<clé publique Supabase>
SUPABASE_SERVICE_ROLE_KEY=<clé secrète Supabase service_role>
STRIPE_SECRET_KEY=sk_test_<clé Stripe de test>
STRIPE_WEBHOOK_SECRET=whsec_<secret affiché par stripe listen>
STRIPE_PRICE_ID_PRO=<price_id Stripe de test pour Pro>
STRIPE_PRICE_ID_BUSINESS=<price_id Stripe de test pour Business>
APP_ORIGIN=http://localhost:3000
```

La clé `SUPABASE_SERVICE_ROLE_KEY` sert uniquement au processus serveur local, car le webhook doit écrire dans `profiles` et `subscriptions` malgré les politiques RLS. Ne la mets jamais dans le frontend Vite, dans GitHub Pages ou dans un fichier commité.

Les identifiants de produits et de prix doivent être ceux du **mode test** Stripe. Les identifiants live présents dans le projet ne doivent pas être réutilisés pour ce test local.

## 3. Démarrer la fonction Supabase localement

Dans un premier terminal, depuis la racine du dépôt :

```bash
supabase start
supabase functions serve stripe-webhook \
  --env-file supabase/functions/.env.local \
  --no-verify-jwt
```

Le webhook Stripe doit rester public au niveau de la passerelle, car Stripe n’envoie pas de JWT Supabase. La fonction vérifie sa sécurité avec la signature `stripe-signature` et `STRIPE_WEBHOOK_SECRET`.

L’URL locale à utiliser est :

```text
http://127.0.0.1:54321/functions/v1/stripe-webhook
```

## 4. Écouter et transférer les événements Stripe

Dans un deuxième terminal :

```bash
stripe listen \
  --events customer.subscription.created,customer.subscription.updated,customer.subscription.deleted \
  --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```

Stripe CLI affiche une ligne semblable à :

```text
Ready! Your webhook signing secret is whsec_...
```

Copie cette valeur dans `STRIPE_WEBHOOK_SECRET`, puis redémarre `supabase functions serve`. Il ne faut pas utiliser le secret du webhook live Dashboard pour ce transfert local : `stripe listen` fournit son propre secret de signature local.

Laisse ce terminal ouvert. Lorsqu’un événement arrive, tu dois voir une ligne avec l’événement et un code de réponse HTTP réussi. Les erreurs de signature apparaissent généralement comme `No signatures found matching the expected signature` ; dans ce cas, le secret du fichier `.env.local` ne correspond pas à celui affiché par le processus `stripe listen`.

## 5. Faire correspondre un client Stripe de test à un profil Supabase

Le webhook Idealy recherche le client Stripe dans `public.profiles.stripe_customer_id`. Un événement généré automatiquement par Stripe CLI peut utiliser un client fixture qui n’existe pas encore dans ton profil ; il faut donc faire le lien avec un compte de test.

Crée un client dans le mode test Stripe, depuis le Dashboard test ou avec Stripe CLI. Par exemple :

```bash
stripe customers create --email='idealy-webhook-test@example.com'
```

Note l’identifiant `cus_...` retourné. Dans le SQL Editor Supabase, associe-le à l’utilisateur de test choisi :

```sql
update public.profiles
set stripe_customer_id = 'cus_REMPLACE_MOI'
where id = 'UUID_DE_L_UTILISATEUR_DE_TEST';
```

Avant cette mise à jour, tu peux retrouver l’UUID depuis la page **Authentication → Users** de Supabase. Utilise un compte de test et ne partage pas son adresse e-mail ni son UUID publiquement.

## 6. Générer un événement d’abonnement signé manuellement

La commande `pnpm test:webhook:local` est la méthode recommandée, car elle automatise tout le cycle sans Stripe CLI. Si tu veux observer les événements avec Stripe CLI, utilise la procédure manuelle suivante.

Avec `stripe listen` toujours actif, exécute dans un troisième terminal :

```bash
stripe trigger customer.subscription.created \
  --override "subscription:customer=cus_REMPLACE_MOI" \
  --override "subscription:items[0].price=price_TEST_PRO"
```

La syntaxe `--override` permet de remplacer les paramètres de la fixture Stripe. Si ta version de Stripe CLI refuse le chemin avec crochets, lance `stripe trigger customer.subscription.created --edit`, puis remplace dans la fixture le client et le prix par les valeurs de test correspondantes.

Tu peux également tester la mise à jour :

```bash
stripe trigger customer.subscription.updated \
  --override "subscription:customer=cus_REMPLACE_MOI" \
  --override "subscription:items[0].price=price_TEST_PRO"
```

Ces commandes créent des objets de test dans Stripe ; elles ne débitent pas une carte réelle. N’utilise pas `--live`.

## 7. Vérifier la mise à jour dans Supabase

Dans le SQL Editor Supabase, exécute une lecture limitée :

```sql
select
  user_id,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_price_id,
  status,
  plan,
  current_period_end,
  cancel_at_period_end
from public.subscriptions
where stripe_customer_id = 'cus_REMPLACE_MOI'
order by created_at desc
limit 5;
```

Le résultat attendu est une ligne contenant le même `stripe_customer_id`, un `stripe_subscription_id`, le `stripe_price_id` de test, un statut Stripe comme `trialing` ou `active`, et le plan correspondant au prix configuré. Le profil associé doit également refléter le plan :

```sql
select id, stripe_customer_id, plan
from public.profiles
where stripe_customer_id = 'cus_REMPLACE_MOI'
limit 1;
```

Si aucune ligne n’est créée, vérifie en priorité que le client Stripe est bien associé au profil, que `SUPABASE_SERVICE_ROLE_KEY` est correct, et que le processus local a bien été redémarré après la modification de `.env.local`.

## 8. Contrôles de sécurité et de séparation des environnements

Le test local doit utiliser une clé Stripe `sk_test_...`, des prix test et le secret `whsec_...` affiché par `stripe listen`. Le webhook live existant continue de pointer vers Supabase et n’est pas remplacé par le transfert local.

Ne mets jamais `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET` dans `src/`, dans une variable `VITE_*`, dans un commit ou dans un ticket public. Les seules valeurs Supabase prévues pour le navigateur sont l’URL du projet et une clé publishable/anon soumise aux politiques RLS.

## Références officielles

[1]: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets "GitHub — Using secrets in GitHub Actions"
[2]: https://supabase.com/docs/guides/functions/quickstart "Supabase — Getting Started with Edge Functions"
[3]: https://supabase.com/docs/guides/functions/secrets "Supabase — Environment Variables"
[4]: https://docs.stripe.com/cli/listen "Stripe — stripe listen"
[5]: https://docs.stripe.com/stripe-cli/triggers "Stripe — Trigger webhook events with the CLI"
[6]: https://docs.stripe.com/cli/fixtures "Stripe — Fixtures"
