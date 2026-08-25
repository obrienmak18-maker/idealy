import { ProfessionalPage } from "@/components/site/professional-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/docs" },
  description:
    "Comprendre les missions, les agents, les connecteurs et les règles de sécurité du workspace Idealy.",
  title: "Documentation",
};

export default function DocumentationPage() {
  return <ProfessionalPage eyebrow="Documentation" title="Comprendre le workspace, les missions et les connecteurs." intro="Cette documentation présente le comportement réel du produit. Elle distingue toujours les fonctionnalités prêtes, celles qui exigent un compte connecté et celles encore en préparation." sections={[{ title: "Démarrer une mission", body: "Décrivez le résultat attendu, puis validez la mission. Les flux gérés passent par le service IA sécurisé, appliquent les contrôles de cadence et consomment le solde d’opération affiché par le serveur." }, { title: "Connecter un compte", body: "Dans Plugins & connecteurs, GitHub peut être associé via OAuth si la configuration serveur est active. Seuls les comptes et dépôts que vous autorisez deviennent accessibles ; les actions d’écriture ne doivent pas être silencieuses." }, { title: "Comprendre les agents", body: "Les personnages et indicateurs de la démo expliquent les rôles. Une exécution multi-agent de production requiert une mission persistante, des étapes tracées, des autorisations par opération et des validations ; elle ne se confond pas avec l’animation de démonstration." }]} />;
}
