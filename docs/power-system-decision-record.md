# Décision produit requise — Power System

> **Statut : configuration non approuvée.** Ce document fixe les invariants techniques déjà sûrs et isole les décisions commerciales qui ne doivent pas être inventées dans le code ou l’interface. Tant qu’elles ne sont pas validées, Idealy ne doit afficher ni prix, ni pack, ni allocation chiffrée comme une offre active.

## Invariants déjà retenus

| Sujet | Décision technique | Conséquence |
|---|---|---|
| Unité backend | Le backend emploie exclusivement **Power Points**. | Les tables, fonctions, journaux et estimations restent neutres à la voie. |
| Présentation | L’interface traduit les Power Points en **Mana**, **Chakra**, **Nen** ou **Énergie** selon la Voie active. | Changer une voie ne transforme pas un solde ni un plan. |
| Autorité | Supabase est la source de vérité. | Aucun montant, coût ou allocation ne provient du navigateur. |
| Compatibilité | `user_credits` et `credit_ledger` restent la source de facturation actuelle ; `user_energy` demeure un miroir héritage. | Aucune suppression, migration de masse ou double débit avant une migration additive validée. |
| Journal | Toute variation future est append-only, liée à une clé d’idempotence et à une raison contrôlée. | Les retries ne créent jamais une seconde consommation ou recharge. |
| UX d’épuisement | Les données et le workspace restent consultables à zéro point ; seules les actions IA coûteuses sont bloquées. | L’interface doit expliquer le prochain état sans prétendre proposer un achat disponible. |

## Paramètres à décider par le propriétaire produit

| Décision | Valeur actuelle | Réponse nécessaire avant implémentation | Impact technique |
|---|---|---|---|
| Allocation mensuelle Free / Pro / Business | Non définie | Nombre de Power Points attribué à chaque renouvellement. | Wallet, webhook et estimation. |
| Plafond de wallet par plan | Non défini | Solde maximal autorisé après allocation ou achat. | Protection contre accumulation et logique de crédit. |
| Régénération | Non définie | Aucune, quotidienne, mensuelle, ou hybride ; préciser montant, cadence et plans éligibles. | Planificateur serveur et affichage du prochain renouvellement. |
| Coût des actions | Non défini | Coût par type de mission, agent, modèle, export ou action externe. | Estimateur serveur et confirmation liée au digest de mission. |
| Packs / recharge | Non défini | Produits Stripe, Price IDs, quantités, devise et pays de vente. | Checkout seulement après validation Stripe test mode. |
| Recharge personnalisée | Non définie | Bornes min/max, arrondi, devise et source de prix serveur. | Validation de quantité et prévention de prix client. |
| Changement de voie | Non défini | Gratuit/payant/interdit, délai, conservation du solde et historique. | Mutation profil, audit et règles anti-abus. |
| Rétention du ledger | Non définie | Durée de conservation et accès support/utilisateur. | Politique de confidentialité, export et minimisation. |

## Contrat de configuration à activer plus tard

La configuration serveur devra être explicitement renseignée, versionnée et validée. Les champs sont volontairement `null` tant qu’une décision commerciale n’a pas été prise.

```ts
type PowerPolicy = {
  version: string;
  plans: Record<"free" | "pro" | "business", {
    monthlyAllocation: number | null;
    walletCap: number | null;
    regeneration: { amount: number | null; cadence: "none" | "daily" | "monthly" | null };
  }>;
  actionCosts: Record<string, number | null>;
  wayChange: {
    allowed: boolean | null;
    cooldownDays: number | null;
    preservesBalance: boolean | null;
  };
  packs: "not_configured";
};
```

Cette structure n’est pas une configuration exécutable et ne doit pas être sérialisée au client avec des valeurs partielles. Une fois les décisions prises, elle deviendra une politique serveur validée par schéma, suivie d’une migration additive `power_wallets` / `power_transactions`, de tests de concurrence et d’un parcours de confirmation.

## Proposition d’ordre de réalisation

1. Valider les paramètres du tableau, en commençant par les allocations, plafonds, régénération et coûts.
2. Construire l’estimateur server-first qui produit un devis de Power Points lié au digest de mission, sans débiter.
3. Ajouter les wallets et transactions en parallèle de `user_credits` / `credit_ledger`, avec réconciliation contrôlée et idempotence.
4. Faire consommer le nouveau ledger pour une seule action pilote, puis comparer les journaux avant d’étendre les parcours.
5. Ajouter la présentation contextualisée, le paywall et Stripe uniquement après un catalogue de prix validé en mode test.

## Références internes

[P1]: [Matrice de traçabilité du Document maître](master-document-v1-matrix.md)
[P2]: [Migration crédits et recharges Stripe](../supabase/migrations/20260815010000_user_credits_and_stripe_refills.sql)
[P3]: [Registre de préparation sécurité](v1-security-readiness.md)
