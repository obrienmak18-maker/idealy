# Procédure contrôlée de remplacement de `main`

> **Statut : procédure préparée, non exécutée.** Aucune étape ci-dessous n’autorise à fusionner, réécrire ou pousser `main` sans une autorisation explicite et actuelle du propriétaire du dépôt.

La branche candidate est `feat/idealy-live-backend`. Au moment de la préparation, son dernier commit poussé est `60892a4`; la référence historique de `main` examinée pendant l’audit est `10b0994`. La publication Netlify est un upload API : son libellé `main` n’est pas une modification de la branche Git `main`.

## Préconditions de décision

| Contrôle | Preuve attendue | Décision en cas d’échec |
|---|---|---|
| Revue de code | Diff ciblé `main...feat/idealy-live-backend`, sans import de frontend historique ni table non migrée. | Corriger sur la branche live ; ne pas ouvrir de remplacement. |
| CI de la candidate | Build, typage, contrats Supabase/RLS, escouade, streaming et Stripe tous verts. | Bloquer le remplacement. |
| Supabase | Migrations `mission_files`, `billing_integrity`, `user_integrations_schema`, `mission_agent_orchestration` et `workspace_file_content_events` visibles. | Appliquer et vérifier les migrations, puis seulement poursuivre. |
| Edge Functions | `process-ai-request`, `orchestrate-mission`, `github-export` et `mission-action-confirmation` actives avec JWT. | Déployer dans l’ordre documenté et revérifier les versions. |
| OAuth GitHub | Callback, secrets Edge, chiffrement, connexion et révocation testés avec un compte utilisateur de test. | Laisser GitHub comme non vérifié dans le catalogue. |
| Paiements | Webhook Stripe signé et test local CI vert ; aucun pack tarifaire inventé. | Bloquer toute annonce commerciale correspondante. |

## Ordre de bascule, après autorisation explicite

1. Créer un tag de sauvegarde de `main` et noter les SHA de `main` et de la candidate. Ne jamais réécrire l’historique ni forcer un push.
2. Ouvrir une pull request de `feat/idealy-live-backend` vers `main`. La review doit confirmer que Supabase reste l’unique autorité métier et que `lib/db` est limité à l’historique d’interface non critique.
3. Vérifier la CI de la pull request et les contrôles RLS. Toute divergence de migration ou test rouge annule la bascule.
4. Faire un smoke test authentifié avec un compte non privilégié : planification, validation explicite, lancement de l’escouade, réception de fichiers, replay VFS, préflight et état final de mission.
5. Vérifier un flux OAuth GitHub de test, sans export. Pour tester l’export, créer une confirmation one-shot et écrire uniquement dans un dépôt privé de test ; contrôler ensuite l’expiration et la non-réutilisation du jeton de confirmation.
6. Fusionner la pull request seulement après validation humaine des étapes précédentes. Ne jamais déduire l’autorisation de la seule réussite de CI.
7. Publier le build de `main` et contrôler son état `ready`, son permalink, son alias et le scan de secrets. Le libellé Netlify ne remplace pas la vérification de la référence Git.
8. Surveiller les journaux Edge, crédits et erreurs d’intégration pendant la fenêtre de lancement. En cas de défaut, revenir par une pull request ou restaurer le tag, puis évaluer séparément les migrations déjà appliquées.

## Éléments qui restent volontairement hors bascule

La validation WebContainer complète et l’auto-correction de fichiers ne sont pas disponibles dans l’environnement Edge/Netlify actuel. Les connecteurs autres que GitHub, les MCP utilisateur et la vérification OAuth GitHub de bout en bout restent non certifiés tant qu’un compte de test et les configurations officielles ne les ont pas validés. Ils ne doivent donc pas être annoncés comme actifs par la bascule.

## Références

[1]: https://github.com/obrienmak18-maker/idealy/actions/runs/32801183005 "CI Idealy Live Quality — commit 60892a4"
[2]: https://supabase.com/docs/guides/database/database-linter?lint=0008 "Supabase — RLS enabled, no policy"
