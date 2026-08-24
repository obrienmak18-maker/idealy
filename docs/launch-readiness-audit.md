# Revue de lancement — sécurité, crédits et paywall

**Périmètre :** branche `feat/idealy-live-backend`, code local et état Supabase consulté le 24 août 2026. Cette revue est une analyse de code et de configuration accessible ; elle ne constitue ni un test d’intrusion ni une garantie de sécurité exhaustive.

## Verdict de lancement

Le workspace, le modèle de données de crédits et les fonctions Stripe existent, mais **la production ne doit pas être présentée comme prête à facturer ni comme protégée par les corrections de cette branche tant que la migration et les fonctions Edge corrigées ne sont pas publiées**. La démonstration publique reste volontairement locale et simulée : elle n’exécute pas une escouade réelle, ne coédite pas le canvas et ne consomme pas de crédits.

| Domaine | État vérifié | Décision de lancement |
|---|---|---|
| Authentification et propriété des chats | Le routeur chat exige une session, contrôle le propriétaire du chat et le proxy Edge obtient le JWT Supabase de la session. | **Contrôle présent.** |
| Débit et solde de crédits | Les RPC de débit sont verrouillés côté SQL, append-only et réservés au `service_role`. Un rythme atomique et un débit des conversations sont ajoutés localement. | **À publier.** |
| Remboursement | L’ancien contrat pouvait accepter plusieurs remboursements partiels avec des clés distinctes pour le même débit. Le correctif relie chaque remboursement au débit d’origine et borne le total. | **Correction critique à publier.** |
| Workspace de mission | La fonction Edge déployée écrivait avec `service_role` sans relire l’appartenance de la mission avant l’écriture de fichiers. | **Correction haute priorité à publier.** |
| Stripe et recharges | La signature Stripe est contrôlée et le ledger apporte l’idempotence. L’ancien webhook utilisait toutefois `metadata.credit_amount` comme montant. | **Catalogue serveur à publier.** |
| Plans, prix et paywall | Les prix et les missions annoncés par la page publique ne correspondaient pas à un catalogue Stripe attesté. L’interface locale cesse de les présenter comme des faits. | **Alignement UI prêt, configuration Stripe non vérifiée.** |
| Énergie et tokens | Le système mesure aujourd’hui des **crédits d’opération**, pas les tokens réellement facturés par chaque fournisseur. La sortie est plafonnée à 8 000 tokens par appel Edge. | **Ne pas commercialiser comme “compteur exact de tokens”.** |

## Résultats détaillés

| Gravité | Constat et preuve | État de remédiation |
|---|---|---|
| Critique | `refund_ai_credit` ne reliait pas un remboursement à son débit d’origine. Un utilisateur pouvait demander 7 puis 4 crédits sur un débit de 10 avec deux clés différentes. | La migration `20260816000000_billing_integrity.sql` ajoute `reference_idempotency_key`, verrouille le solde et interdit un total remboursé supérieur au débit. Un test local Supabase/Stripe a été étendu ; il s’exécutera en CI car Docker n’est pas disponible dans cet environnement. |
| Haute | `workspaceStream` validait le format de `missionId`, puis écrivait fichiers et événements avec `service_role`. La possession de la mission n’était pas contrôlée avant l’écriture. | `process-ai-request` relit maintenant la mission avec `id` et `user_id` issus du JWT, puis refuse l’accès avant toute écriture. |
| Haute | La recharge Stripe était fondée sur `metadata.credit_amount`. Même si le webhook est signé, le montant était une valeur libre de métadonnée plutôt qu’une règle de catalogue explicite. | Le webhook n’accepte désormais qu’un `credit_pack_id` présent dans `STRIPE_CREDIT_PACKS_JSON`; le montant provient de ce catalogue serveur. Aucun pack n’est inventé ni activé. |
| Haute | La fonction `process-ai-request` déployée en production ne possédait pas de verrou atomique de cadence et la voie `workspaceStream` ne possédait pas le contrôle de propriété ci-dessus. | La migration ajoute `acquire_ai_request_slot`; la nouvelle fonction Edge l’appelle avant toute inférence, y compris BYOK. Les fonctions Edge actuelles doivent être redéployées. |
| Moyenne | Les conversations gérées ne consommaient aucun crédit et la route chat pouvait basculer sur un fournisseur Next direct si la variable n’était pas réglée, contournant le ledger Edge. | La production est forcée vers le proxy Edge; une conversation gérée coûte un crédit, une idéation trois et une exécution dix. Ces valeurs sont des unités de produit configurées dans le code, pas une conversion de tokens fournisseurs. |
| Moyenne | La limite de chat était vérifiée avec `>` et acceptait donc une requête de trop. Le limiteur IP Redis reste une seconde barrière fail-open si Redis est absent. | Le test de seuil utilise désormais `>=`; le garde-fou de cadence SQL fournit une barrière serveur indépendante de Redis pour la voie Edge. |
| Moyenne | La page d’accueil annonçait « 10 missions », « 100 missions » et des prix sans preuve de leur correspondance avec les Price IDs Stripe actifs. La page paramètres affichait un solde démo fixe. | Les promesses non vérifiées sont remplacées par un solde lu depuis le backend et des offres explicitement à configurer. |
| Information | L’avis Supabase signale l’absence de policies RLS sur `credit_ledger`, `user_ai_keys` et `user_credits`. Les migrations activent RLS, révoquent les droits `anon`/`authenticated` et n’accordent les RPC qu’au `service_role`. | **Accepté par conception.** Ne pas ajouter de policy permissive : les mutations de facturation doivent rester Edge/service role uniquement. |

## Vérifications de production effectuées

La production Supabase `vhucjkyktdflwocrmzhe` est active. L’inventaire a confirmé les fonctions `process-ai-request`, `stripe-webhook`, `check-subscription` et les fonctions de billing. La version actuellement déployée de `process-ai-request` est la version 15 et ne contient pas encore le contrôle de mission ni `acquire_ai_request_slot`.

La liste des migrations de production ne contient pas la migration locale de durcissement. Les RPC `consume_ai_credit`, `grant_user_credits` et `refund_ai_credit` existent, mais `acquire_ai_request_slot` n’existe pas encore. Cette différence est normale avant publication et doit être traitée comme un **blocage de lancement**.

## Publication requise avant toute promesse commerciale

1. Appliquer la migration `20260816000000_billing_integrity.sql` via une migration Supabase versionnée.
2. Redéployer `process-ai-request`, `stripe-webhook` et `check-subscription` avec leurs dépendances relatives.
3. Définir `STRIPE_CREDIT_PACKS_JSON` uniquement lorsque les packs et leurs Price IDs ont été validés dans Stripe. Sans cette variable, aucune recharge de crédit n’est créditée.
4. Vérifier les quatre Price IDs d’abonnement et l’endpoint Stripe webhook en environnement de test, puis avec un paiement de test autorisé. Aucun achat ni remboursement réel n’a été exécuté dans cette revue.
5. Attendre les jobs CI : migration/RLS, contrat webhook et build Next. Le test Stripe local n’a pas été lancé ici car Docker n’est pas disponible dans l’environnement d’audit.

## Limites produit encore à traiter

Le statut `Pro` est dérivé d’un abonnement Stripe vérifié, mais aucune allocation Pro distincte, remise à zéro périodique ou tarification finale n’est définie par le code local. Ces valeurs doivent être placées dans un catalogue serveur versionné avant d’être montrées au client. En particulier, « 100 crédits gratuits » est un solde de découverte actuellement initialisé, **pas** une promesse vérifiée de 100 crédits quotidiens ou mensuels.

La démo Professionnel a été enrichie de Maya Brooks, Jordan Reed, Ethan Cole et Avery Morgan autour de Daniel, avec cinq niveaux : triage, confinement, remédiation, validation et passage de relais. Ces personnages sont originaux, les pastilles sans portrait affichent leurs initiales et le parcours d’incident est explicitement simulé.

## Références internes

- `supabase/migrations/20260816000000_billing_integrity.sql`
- `supabase/functions/process-ai-request/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/functions/stripe-webhook/stripe-webhook.ts`
- `app/(chat)/api/chat/route.ts`
- `app/(chat)/settings/page.tsx`
- `app/welcome/page.tsx`
- `lib/idealy/demo-program.ts`
