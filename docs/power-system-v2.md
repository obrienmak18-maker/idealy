# Power System V2

## Modèle

Le Power est la ressource serveur officielle utilisée pour les opérations IA de mission. Supabase est l’autorité pour les wallets, transactions, allocations, consommations, Voies, plans et historique. Le navigateur ne modifie jamais directement `power_wallets` ou `power_transactions`.

Le backend utilise une unité commune de calcul, **Power Points**. L’interface traduit cette unité selon la Voie de l’utilisateur : Mage → points de Mana, Ninja → points de Chakra, Hunter → points de Nen, Professional → points d’Énergie. L’affichage est toujours contextualisé et ne présente pas Mana comme ressource universelle.

## Plans et allocations

Les plans commerciaux et les Voies sont deux dimensions indépendantes. La politique versionnée `power-v1` conserve les allocations existantes : Free 100, Pro 1 000 et Business 3 000, avec un cap égal à l’allocation. Les coûts actifs sont 10 points pour `mission_simple` et 50 points pour `mission_squad`. Les packs Power sont désactivés. Aucun prix commercial n’est défini ou ajouté par cette implémentation.

## Wallet et ledger

Chaque utilisateur dispose d’un seul wallet Power dans `power_wallets`. Le ledger `power_transactions` est append-only au niveau applicatif et conserve le solde avant/après, le montant, l’action, la mission, la Voie, la politique, la raison, l’idempotency key et les métadonnées. Une contrainte empêche les soldes négatifs et vérifie l’équation `balance_after = balance_before + amount_points`.

## Consommation

Les RPC `consume_power_points` et `grant_monthly_power` restent les frontières de mutation. La consommation détermine son coût à partir de `power_action_policies`, verrouille le wallet dans la transaction SQL, vérifie le solde et écrit le ledger. La clé d’idempotence est unique ; une répétition reconnue ne recrée pas une transaction.

Une mission squad est débitée une seule fois par `orchestrate-mission` avec le coût `mission_squad`, avant les appels Architecte → Builder → Reviewer. Une mission simple est débitée par `process-ai-request` lorsque la requête porte une mission, une intention `EXECUTION` et ne correspond pas au streaming workspace d’un squad. Les appels d’agents d’un squad ne déclenchent donc pas trois débits simples.

## Régénération

La cadence approuvée est mensuelle. `grant_monthly_power` s’appuie sur une clé d’idempotence fournie par le serveur et refuse une seconde allocation pour le cycle mensuel courant. Le renouvellement restaure le solde à l’allocation du plan dans la limite du cap ; il ne s’ajoute pas au solde existant au-delà de ce cap.

## Changement de Voie

`change_my_power_way` est une RPC authentifiée. Elle vérifie l’identité de session, le délai de 30 jours et l’idempotence, modifie la Voie puis conserve le solde existant sans bonus gratuit. Une conversion de solde entre ressources n’est pas définie ; aucune conversion artificielle n’est appliquée.

## Lecture et UI

La RPC authentifiée `get_my_power_status` expose le solde, le cap, le plan, la Voie, le libellé de ressource, la version de politique, le coût demandé et `can_execute`. La route Next `/api/idealy/power` transmet uniquement cette lecture au client avec une session Supabase existante et `Cache-Control: no-store`.

Le composant `PowerStatusBadge` affiche les états `normal`, `insufficient` et `depleted`. Le seuil produit « faible » n’est pas défini ; aucun chiffre arbitraire n’est utilisé pour créer cet état. Le composant est intégré à la sidebar et à la barre supérieure du workspace en respectant le design existant.

## Crédits legacy

Les crédits historiques, notamment `user_credits`, `creditsBalance`, `STRIPE_CREDIT_PACKS_JSON` et `grant_user_credits`, restent une couche séparée pour compatibilité. Le Power V2 ne dépend pas de ces mécanismes pour déterminer ses coûts ou effectuer ses débits. Aucun pricing Stripe ni pack Power n’est créé dans cet incrément.

## Limites et décisions non définies

La politique commerciale détaillée, les packs futurs, une éventuelle conversion entre ressources lors d’un changement de Voie et le seuil produit de Power faible restent **À DÉFINIR**. Aucun scheduler externe n’est ajouté : la régénération est préparée via RPC idempotente et doit être déclenchée par une infrastructure autorisée lorsqu’elle sera configurée.
