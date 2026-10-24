import { ProfessionalPage } from "@/components/site/professional-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Support Idealy",
  description: "Obtenir de l’aide pour Idealy, les connecteurs et les déploiements Vercel.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <ProfessionalPage
      eyebrow="Support"
      title="Nous aider à comprendre le problème."
      intro="Pour demander de l’aide sur Idealy, ses connecteurs ou un déploiement, contactez l’adresse publiée dans le projet. Aucun formulaire de support fictif n’est utilisé sur cette page."
      sections={[
        { title: "Contacter le support", body: "Écrivez à contact@idealy.app. Décrivez le problème, l’heure approximative, la page concernée et les étapes qui permettent de le reproduire. Cette adresse apparaît déjà dans le pied de page du site ; son fonctionnement réel doit être confirmé par le responsable." },
        { title: "Problème de connexion Vercel", body: "Indiquez si le problème survient avant la redirection vers Vercel, après l’autorisation ou au retour vers Idealy. Vous pouvez joindre le code d’erreur visible dans l’interface. Ne transmettez jamais de jeton OAuth, de clé API, de secret ou de cookie de session." },
        { title: "Échec de déploiement", body: "Précisez le nom du projet, la cible Preview ou Production, l’état affiché et le message d’erreur. Si Vercel fournit une URL de déploiement ou un identifiant de déploiement, vous pouvez les partager si vous êtes autorisé à le faire. Vérifiez d’abord que le contenu partagé ne contient aucun secret." },
        { title: "Sécurité et confidentialité", body: "Pour signaler un problème de sécurité ou demander des informations concernant vos données, écrivez à la même adresse avec un objet explicite. N’envoyez pas d’informations confidentielles dans un message public. Les délais de réponse et le niveau de service restent à confirmer par le responsable d’Idealy." }
      ]}
    />
  );
}
