# Vérification de production — fondations de profil

> **Portée.** Ce relevé documente une application de migration et des contrôles de schéma effectués le 28 août 2026 sur le projet Supabase IDEALY. Il ne remplace ni un audit indépendant, ni un test de session utilisateur, ni une validation de paiement ou de publication.

## Résultat

Après l’échec initial lié à l’absence de colonne historique `profiles.way`, la migration versionnée a été rendue additive, validée en CI, puis appliquée. Une seconde migration a supprimé les politiques d’écriture résiduelles afin que la sécurité ne dépende pas seulement d’une révocation de privilèges.

| Élément | Preuve constatée | État |
|---|---|---|
| `product_profile_foundations` | Historique Supabase : version `20260828005157`. Les champs de Voie et d’onboarding sont présents dans `public.profiles`. | Appliqué et vérifié |
| `profiles_direct_access_hardening` | Historique Supabase : version `20260828010428`. | Appliqué et vérifié |
| Politique RLS de profils | Une seule politique `SELECT` limite la lecture à `auth.uid() = id`. | Appliqué et vérifié |
| Droits de table | `anon`: aucune lecture ; `authenticated`: lecture seulement ; aucune mutation directe. | Appliqué et vérifié |
| RPC d’onboarding | `authenticated` peut exécuter `complete_my_onboarding`; `anon` ne le peut pas. La fonction contrôle l’identité, les valeurs et le `search_path`. | Appliqué et vérifié |
| Contrat de régression | Exécution GitHub Actions `33131442139` verte pour build, contrat local Supabase/RLS et webhook Stripe. | Vérifié |

## Décision de sécurité

La RPC `complete_my_onboarding` utilise volontairement `SECURITY DEFINER`, car les utilisateurs authentifiés doivent modifier un sous-ensemble strictement contrôlé de leur propre profil alors que les écritures directes de la table sont révoquées. Le linter Supabase signale donc un avertissement attendu sur son exécution par `authenticated`. Cette exception est acceptable uniquement tant que son contrôle `auth.uid()`, son `search_path` fixé, ses validations et son périmètre de colonnes restent inchangés.

## Hors périmètre

Cette opération n’active ni tarif, ni allocation Power, ni pack, ni OAuth, ni paiement, ni mise en production Netlify. Elle ne crée pas non plus l’onboarding visuel à six étapes. Les prochaines évolutions doivent utiliser la RPC existante plutôt qu’une écriture navigateur directe de `profiles`.

## Références internes

[P1]: [Migration de fondations de profil](../supabase/migrations/20260828000000_product_profile_foundations.sql)
[P2]: [Migration de durcissement des profils](../supabase/migrations/20260828010000_profiles_direct_access_hardening.sql)
[P3]: [Contrat SQL de profil](../supabase/tests/product-profile-foundations.sql)
[P4]: [Registre de préparation sécurité](v1-security-readiness.md)
