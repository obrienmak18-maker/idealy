import { ProfessionalPage } from "@/components/site/professional-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  description: "Politique de confidentialité d’Idealy : données, IA, connecteurs et déploiements.",
  title: "Politique de confidentialité",
};

export default function PrivacyPage() {
  return (
    <ProfessionalPage
      eyebrow="Confidentialité"
      title="Comment Idealy traite vos données."
      intro="Cette politique décrit les traitements identifiables dans la version actuelle du code d’Idealy. Elle ne remplace pas une validation juridique. Les coordonnées du responsable, les délais exacts de conservation et la procédure de suppression doivent être confirmés avant publication définitive."
      sections={[
        { title: "Données de compte et d’utilisation", body: "Idealy utilise un système d’authentification et une base de données Supabase. Selon les fonctionnalités utilisées, le service traite les informations de compte disponibles, les préférences de langue et de thème, les missions, les messages et les fichiers de travail associés à votre compte. Ces données servent à fournir le workspace, enregistrer votre progression et répondre aux actions que vous demandez." },
        { title: "Prompts, code et contenu généré", body: "Les instructions que vous soumettez, le contexte de mission nécessaire et les fichiers que vous choisissez de traiter peuvent être transmis au fournisseur d’intelligence artificielle sélectionné ou configuré pour exécuter la demande. Les résultats générés peuvent être enregistrés dans votre workspace. Ne soumettez pas de mots de passe, de clés privées ou d’informations confidentielles qui ne sont pas nécessaires." },
        { title: "Fournisseurs d’intelligence artificielle", body: "Le backend contient des adaptateurs pour Anthropic, DeepSeek, Google Gemini, Groq, Moonshot, OpenAI, OpenRouter et Together. Le fournisseur réellement utilisé dépend de la configuration serveur, du mode et du fournisseur sélectionnés. Le code prévoit également des clés gérées côté serveur et un mode BYOK pour certaines configurations. Les conditions et règles de conservation du fournisseur concerné s’appliquent aussi au traitement qu’il effectue." },
        { title: "Hébergement, base de données et sécurité", body: "Le site est déployé sur Vercel. Le code utilise Supabase pour l’authentification, la base de données et les fonctions backend. Les règles d’accès en base limitent l’accès à certaines ressources à leur propriétaire authentifié. Ces contrôles ne constituent pas une garantie absolue de sécurité ; signalez toute vulnérabilité via le contact indiqué en bas de page." },
        { title: "Connexion Vercel et déploiements", body: "Si vous connectez Vercel, Idealy traite les informations de compte retournées par Vercel, l’identifiant de compte externe, les autorisations retournées et les jetons nécessaires à la connexion. Le code chiffre les jetons côté serveur et ne les renvoie pas au navigateur. Lors d’un déploiement explicitement confirmé, Idealy transmet à l’API Vercel les fichiers enregistrés de la mission choisie et reçoit les informations de déploiement, comme son identifiant, son état et son URL. Vercel traite alors ces données selon ses propres conditions." },
        { title: "Paiements", body: "Le code intègre Stripe pour les sessions de paiement, les portails de facturation et les notifications de paiement. Idealy conserve des identifiants de client et d’abonnement ainsi que des informations nécessaires à l’état du forfait. Les paiements sont traités par Stripe ; Idealy ne doit pas être présenté comme stockant les numéros complets de cartes bancaires." },
        { title: "Cookies et protection anti-robot", body: "Le code utilise des cookies techniques pour maintenir la session et mémoriser la langue, notamment NEXT_LOCALE. La préférence de thème et la fermeture de l’avis de cookies sont conservées dans le stockage local du navigateur. Lorsque la protection est activée, Cloudflare Turnstile vérifie certaines demandes d’inscription ou de connexion. Aucun outil de publicité ou de mesure d’audience supplémentaire n’est documenté dans les éléments examinés." },
        { title: "Conservation et suppression", body: "Les données de workspace sont enregistrées pour permettre la continuité des missions. Le code examiné ne permet pas d’établir un délai universel de conservation pour toutes les données ni de confirmer une procédure automatisée de suppression complète. Vous pouvez demander l’accès, la correction ou la suppression de données en écrivant à l’adresse de contact ci-dessous ; l’identité du responsable, les délais de réponse et la procédure de suppression restent à formaliser et confirmer." },
        { title: "Vos choix et vos droits", body: "Vous pouvez choisir de ne pas connecter un fournisseur externe, révoquer une autorisation depuis le fournisseur lorsque cette option existe, éviter de soumettre des données sensibles et contacter Idealy pour demander des informations sur vos données. Les droits applicables et les délais de traitement dépendent de votre situation et de la législation applicable." },
        { title: "Responsable et contact", body: "Pour toute question relative à la confidentialité, écrivez à contact@idealy.app. Le nom légal du responsable, son éventuelle entité juridique, son adresse de contact officielle et les délais de conservation doivent être confirmés par le responsable du projet avant de considérer cette page comme une politique juridiquement finalisée." }
      ]}
    />
  );
}
