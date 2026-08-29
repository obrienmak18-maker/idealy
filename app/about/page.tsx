import { ProfessionalPage } from "@/components/site/professional-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  description:
    "Découvrez Idealy, un workspace assisté par IA qui transforme une intention en mission, plan et projet visible.",
  title: "À propos d’Idealy",
};

export default function AboutPage() {
  return <ProfessionalPage eyebrow="À propos" title="Idealy transforme une intention en produit livrable." intro="Idealy est un workspace de conception guidée : une conversation clarifie l’objectif, le canvas rend le résultat visible et les contrôles serveur protègent les données, les actions et le Power." sections={[{ title: "Notre approche", body: "Nous privilégions des étapes explicites : comprendre, planifier, construire, vérifier puis demander une confirmation avant toute action externe ou publication." }, { title: "Ce qui est réel aujourd’hui", body: "Le workspace, les missions, le stockage de fichiers, le contrôle Power, la facturation et le connecteur GitHub sont des capacités distinctes. Une capacité affichée comme à configurer ne doit pas être interprétée comme une connexion active." }, { title: "Notre principe", body: "Les secrets ne quittent jamais le serveur. Les intégrations externes sont limitées au compte choisi par l’utilisateur et les écritures à risque restent soumises à une confirmation." }]} />;
}
