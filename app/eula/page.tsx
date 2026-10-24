import { ProfessionalPage } from "@/components/site/professional-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conditions de licence — Idealy",
  description: "Projet de conditions de licence utilisateur final pour l’intégration Idealy–Vercel.",
  alternates: { canonical: "/eula" },
};

export default function EulaPage() {
  return (
    <ProfessionalPage
      eyebrow="EULA · Version préparatoire"
      title="Conditions de licence utilisateur final."
      intro="Cette page est un projet de conditions préparé pour examen. Elle ne doit pas être présentée comme un contrat final ni utilisée comme validation juridique avant confirmation par le responsable d’Idealy et, si nécessaire, un professionnel du droit."
      sections={[
        { title: "Licence d’utilisation", body: "Sous réserve des conditions définitives qui seront publiées, Idealy est destiné à fournir des outils de création logicielle assistée par IA et une intégration permettant de transmettre des fichiers sélectionnés vers le compte Vercel autorisé par l’utilisateur. Aucun transfert de propriété du service Idealy n’est accordé par le simple accès au service." },
        { title: "Utilisation autorisée", body: "L’utilisateur reste responsable de son compte, des fichiers soumis, des autorisations accordées aux fournisseurs externes et des déploiements qu’il confirme. Il ne doit pas utiliser le service pour enfreindre la loi, contourner les contrôles d’accès ou transmettre du contenu qu’il n’est pas autorisé à utiliser." },
        { title: "Services tiers", body: "Les déploiements et les services connectés sont fournis par des tiers, notamment Vercel. Leur disponibilité, leurs règles, leurs limites, leurs tarifs et leurs conditions propres demeurent applicables. L’utilisateur doit examiner le contenu généré et tester son application avant toute utilisation en production." },
        { title: "Contenu généré et disponibilité", body: "Les sorties de l’IA peuvent être erronées, incomplètes ou incompatibles avec les besoins de l’utilisateur. Idealy ne garantit pas qu’un code généré soit exempt de défauts, qu’un déploiement réussisse ou que le service soit disponible sans interruption. Les limites de responsabilité et les garanties doivent être rédigées et validées juridiquement avant publication définitive." },
        { title: "Suspension, résiliation et données", body: "Les règles précises de suspension, de résiliation, de restitution ou de suppression des données, ainsi que les effets de la fin de licence, doivent être confirmés par le responsable du service et intégrés à la version définitive." },
        { title: "Informations à confirmer avant publication", body: "Le responsable doit confirmer l’identité légale de la partie contractante, la juridiction et le droit applicables, le mécanisme de résolution des litiges, les garanties et limites de responsabilité, les règles de résiliation, la date d’entrée en vigueur et la version linguistique faisant foi. Ces informations ne sont volontairement pas inventées ici." }
      ]}
    />
  );
}
