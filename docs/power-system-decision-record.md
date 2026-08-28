# Politique produit approuvée — Power System V1

> **Statut : approuvée le 28 août 2026.** Cette politique est la source de vérité du Power System V1. Les seuls paramètres exécutables sont ceux explicitement indiqués ci-dessous ; toute modification impose d’arrêter l’incrément concerné et d’obtenir une nouvelle validation.

## Invariants déjà retenus

| Sujet | Décision technique | Conséquence |
|---|---|---|
| Unité backend | Le backend emploie exclusivement **Power Points**. | Les tables, fonctions, journaux et estimations restent neutres à la voie. |
| Présentation | L’interface traduit les Power Points en **Mana**, **Chakra**, **Nen** ou **Énergie** selon la Voie active. | Changer une voie ne transforme pas un solde ni un plan. |
| Autorité | Supabase est la source de vérité. | Aucun montant, coût ou allocation ne provient du navigateur. |
| Compatibilité | `user_credits` et `credit_ledger` restent la source de facturation actuelle ; `user_energy` demeure un miroir héritage. | Aucune suppression, migration de masse ou double débit avant une migration additive validée. |
| Journal | Toute variation future est append-only, liée à une clé d’idempotence et à une raison contrôlée. | Les retries ne créent jamais une seconde consommation ou recharge. |
| UX d’épuisement | Les données et le workspace restent consultables à zéro point ; seules les actions IA coûteuses sont bloquées. | L’interface doit expliquer le prochain état sans prétendre proposer un achat disponible. |

## Paramètres approuvés pour V1

| Décision | Valeur approuvée | Limite V1 | Impact technique |
|---|---|---|---|
| Allocation mensuelle Free / Pro / Business | **100 / 1 000 / 3 000** Power Points. | Attribution seulement au renouvellement mensuel du cycle. | Wallet, estimation et allocation mensuelle. |
| Plafond de wallet par plan | Égal à l’allocation du plan : **100 / 1 000 / 3 000**. | Les points non utilisés ne dépassent pas ce plafond. | Protection contre accumulation. |
| Régénération | **Mensuelle uniquement**, à l’allocation du plan. | Ni régénération quotidienne, ni mécanisme supplémentaire. | Allocation transactionnelle et affichage de cycle. |
| Coût des actions | Mission IA simple : **10** ; escouade multi-agents : **50**. | Tous les autres coûts restent « À DÉFINIR ». | Estimateur et consommation contrôlée. |
| Packs / recharge | **Non activés.** | Aucun produit Stripe de recharge, prix ou débit réel. | Aucune intégration checkout de Power. |
| Recharge personnalisée | **Non activée.** | Aucune valeur ou fourchette inventée. | Hors périmètre. |
| Changement de voie | Autorisé toutes les **30 jours**, sans attribution ; solde conservé. | L’opération doit être journalisée et contrôlée serveur. | RPC et transaction d’audit. |
| Rétention du ledger | Non définie. | La rétention reste un chantier confidentialité distinct. | Pas de purge automatique V1. |

## Contrat de configuration V1

La configuration serveur est versionnée dans `lib/idealy/power-policy.ts`. Elle reste internalisée côté serveur pour les opérations de consommation et ne doit pas être remplacée par des valeurs de navigateur.

```ts
const policy = {
  version: "power-v1",
  plans: {
    free: { monthlyAllocation: 100, walletCap: 100 },
    pro: { monthlyAllocation: 1_000, walletCap: 1_000 },
    business: { monthlyAllocation: 3_000, walletCap: 3_000 },
  },
  actionCosts: { mission_simple: 10, mission_squad: 50 },
  wayChange: {
    cooldownDays: 30,
    grantsPower: false,
    preservesBalance: true,
  };
  regenerationCadence: "monthly",
  packsEnabled: false,
};
```

Cette configuration ne doit pas être sérialisée au client avec des valeurs partielles. La prochaine étape est une migration additive `power_wallets` / `power_transactions`, suivie de tests de concurrence et d’un parcours de confirmation. Aucun pack, prix ou débit Stripe ne fait partie de cette version.

## Proposition d’ordre de réalisation

1. Ajouter les wallets et transactions en parallèle de `user_credits` / `credit_ledger`, avec réconciliation contrôlée et idempotence.
2. Construire l’estimateur server-first qui produit un devis de Power Points lié au digest de mission, sans débiter.
3. Faire consommer le nouveau ledger pour une seule action pilote, puis comparer les journaux avant d’étendre les parcours.
4. Ajouter la présentation contextualisée et l’état à zéro, sans paywall ni Stripe de recharge.
5. Traiter tout futur prix, pack ou checkout dans une nouvelle décision produit puis en Stripe test mode.

## Références internes

[P1]: [Matrice de traçabilité du Document maître](master-document-v1-matrix.md)
[P2]: [Migration crédits et recharges Stripe](../supabase/migrations/20260815010000_user_credits_and_stripe_refills.sql)
[P3]: [Registre de préparation sécurité](v1-security-readiness.md)
