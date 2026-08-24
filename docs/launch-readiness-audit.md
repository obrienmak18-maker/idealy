# Revue de lancement — sécurité, crédits et paywall

**Périmètre :** branche `feat/idealy-live-backend`, code local et état Supabase consulté le 24 août 2026. Cette revue est une analyse de code et de configuration accessible ; elle ne constitue ni un test d’intrusion ni une garantie de sécurité exhaustive.

## Verdict de lancement

Le workspace, le modèle de données de crédits et les fonctions Stripe existent, mais **la production ne doit pas être présentée comme prête à facturer ni comme protégée par les corrections de cette branche tant que la migration et les fonctions Edge corrigées ne sont pas publiées**. La démonstration publique reste volontairement locale et simulée : elle n’exécute pas une escouade réelle, ne coédite pas le canvas et ne consomme pas de crédits.

| Domaine | État vérifié | Décision de lancement |
|---|---|---|
| Authentification et propriété des chats | Le routeur chat exige une session, contrôle le propriétaire du chat et le proxy Edge obtient le JWT Supabase de la session. | **Contrôle présent.** |
| Débit et solde de crédits | Les RPC de débit sont verrouillés côté SQL, append-only et réservés au `service_role`. La cadence atomique et le débit des conversations sont publiés. | **Protection serveur active.** |
| Remboursement | L’ancien contrat pouvait accepter plusieurs remboursements partiels avec des clés distinctes pour le même débit. Le correctif relie chaque remboursement au débit d’origine et borne le total. | **Correction critique active.** |
| Workspace de mission | La fonction Edge déployée écrivait avec `service_role` sans relire l’appartenance de la mission avant l’écriture de fichiers. | **Correction haute priorité active.** |
| Stripe et recharges | La signature Stripe est contrôlée et le ledger apporte l’idempotence. L’ancien webhook utilisait toutefois `metadata.credit_amount` comme montant. | **Catalogue serveur actif, configuration de packs non vérifiée.** |
| Plans, prix et paywall | Les prix et les missions annoncés par la page publique ne correspondaient pas à un catalogue Stripe attesté. L’interface locale cesse de les présenter comme des faits. | **Alignement UI prêt, configuration Stripe non vérifiée.** |
| Énergie et tokens | Le système mesure aujourd’hui des **crédits d’opération**, pas les tokens réellement facturés par chaque fournisseur. La sortie est plafonnée à 8 000 tokens par appel Edge. | **Ne pas commercialiser comme “compteur exact de tokens”.** |

## Résultats détaillés

| Gravité | Constat et preuve | État de remédiation |
|---|---|---|
| Critique | `refund_ai_credit` ne reliait pas un remboursement à son débit d’origine. Un utilisateur pouvait demander 7 puis 4 crédits sur un débit de 10 avec deux clés différentes. | La migration `20260816000000_billing_integrity.sql` ajoute `reference_idempotency_key`, verrouille le solde et interdit un total remboursé supérieur au débit. Elle est appliquée en production. |
| Haute | `workspaceStream` validait le format de `missionId`, puis écrivait fichiers et événements avec `service_role`. La possession de la mission n’était pas contrôlée avant l’écriture. | `process-ai-request` relit maintenant la mission avec `id` et `user_id` issus du JWT, puis refuse l’accès avant toute écriture. La version Edge 16 est active. |
| Haute | La recharge Stripe était fondée sur `metadata.credit_amount`. Même si le webhook est signé, le montant était une valeur libre de métadonnée plutôt qu’une règle de catalogue explicite. | Le webhook version 29 n’accepte désormais qu’un `credit_pack_id` présent dans `STRIPE_CREDIT_PACKS_JSON`; le montant provient de ce catalogue serveur. Aucun pack n’est inventé ni présenté comme actif. |
| Haute | La fonction `process-ai-request` déployée en production ne possédait pas de verrou atomique de cadence et la voie `workspaceStream` ne possédait pas le contrôle de propriété ci-dessus. | `acquire_ai_request_slot` est appliquée en production et appelée avant toute inférence, y compris BYOK. `anon` et `authenticated` n’ont pas le droit d’exécuter cette RPC ; seul `service_role` l’a. |
| Moyenne | Les conversations gérées ne consommaient aucun crédit et la route chat pouvait basculer sur un fournisseur Next direct si la variable n’était pas réglée, contournant le ledger Edge. | La production est forcée vers le proxy Edge; une conversation gérée coûte un crédit, une idéation trois et une exécution dix. Ces valeurs sont des unités de produit configurées dans le code, pas une conversion de tokens fournisseurs. |
| Moyenne | La limite de chat était vérifiée avec `>` et acceptait donc une requête de trop. Le limiteur IP Redis reste une seconde barrière fail-open si Redis est absent. | Le test de seuil utilise désormais `>=`; le garde-fou de cadence SQL fournit une barrière serveur indépendante de Redis pour la voie Edge. |
| Moyenne | La page d’accueil annonçait « 10 missions », « 100 missions » et des prix sans preuve de leur correspondance avec les Price IDs Stripe actifs. La page paramètres affichait un solde démo fixe. | Les promesses non vérifiées sont remplacées par un solde lu depuis le backend et des offres explicitement à configurer. |
| Information | L’avis Supabase signale l’absence de policies RLS sur `credit_ledger`, `user_ai_keys` et `user_credits`. Les migrations activent RLS, révoquent les droits `anon`/`authenticated` et n’accordent les RPC qu’au `service_role`. | **Accepté par conception.** Ne pas ajouter de policy permissive : les mutations de facturation doivent rester Edge/service role uniquement. |

## Vérifications de production effectuées

La production Supabase `vhucjkyktdflwocrmzhe` est active. Les fonctions `process-ai-request` version 16, `stripe-webhook` version 29 et `check-subscription` version 11 ont été déployées. La migration de durcissement et son correctif de première requête ont été appliqués.

Une requête de lecture seule a confirmé que `acquire_ai_request_slot` et `refund_ai_credit` existent, que `anon` et `authenticated` ne peuvent pas les exécuter et que `service_role` seul le peut. Le pipeline GitHub Actions `32787811153` est vert : build Next, contrat Stripe local et migration/RLS locale ont réussi.

## Publication requise avant toute promesse commerciale

1. Définir `STRIPE_CREDIT_PACKS_JSON` uniquement lorsque les packs et leurs Price IDs ont été validés dans Stripe. Sans cette variable, aucune recharge de crédit n’est créditée.
2. Vérifier les quatre Price IDs d’abonnement et l’endpoint Stripe webhook en environnement de test, puis avec un paiement de test autorisé. Aucun achat ni remboursement réel n’a été exécuté dans cette revue.
3. Vérifier par un parcours authentifié que le solde, le portail Stripe et les messages d’erreur sont cohérents une fois le frontend Netlify redéployé.

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
