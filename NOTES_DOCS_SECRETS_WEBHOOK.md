# Notes de documentation — secrets GitHub et webhook Stripe

## GitHub Actions

La documentation GitHub indique qu’un secret de dépôt se crée depuis le dépôt : **Settings → Secrets and variables → Actions → Secrets → New repository secret**, puis saisir le nom et la valeur et cliquer sur **Add secret**. Un secret absent est évalué comme une chaîne vide dans le workflow. Les secrets sont référencés par le contexte `${{ secrets.NOM }}` et il est préférable de les transmettre via une variable d’environnement plutôt que de les placer directement dans une commande.

Source : https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets

## Stripe CLI

`stripe listen --forward-to <url>` reçoit les événements Stripe et les transfère vers une URL locale. La commande affiche un secret de signature `whsec_...` à utiliser uniquement pour le test local. Le secret d’écoute reste le même entre les redémarrages de `stripe listen`. L’option `--events` permet de filtrer les événements, et `stripe trigger` peut générer des événements de test sans paiement réel.

Source : https://docs.stripe.com/cli/listen

## Application à Idealy

Le workflow `.github/workflows/deploy.yml` attend exactement les secrets `SUPABASE_ACCESS_TOKEN` et `SUPABASE_PROJECT_ID`, puis les expose aux commandes `supabase functions deploy`. Le projet Supabase IDEALY utilise la référence `vhucjkyktdflwocrmzhe`.

Le webhook live Stripe est configuré vers : `https://vhucjkyktdflwocrmzhe.supabase.co/functions/v1/stripe-webhook`.
