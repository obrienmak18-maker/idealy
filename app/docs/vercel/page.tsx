import { ProfessionalPage } from "@/components/site/professional-page";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation de l’intégration Vercel",
  description: "Fonctionnement, autorisations, déploiement et dépannage de l’intégration Idealy–Vercel.",
  alternates: { canonical: "/docs/vercel" },
};

export default function VercelIntegrationDocsPage() {
  return (
    <ProfessionalPage
      eyebrow="Documentation · Vercel"
      title="Publier un workspace Idealy sur Vercel."
      intro="Cette documentation décrit le flux présent dans le code de l’intégration. Les autorisations exactes disponibles dépendent de la configuration de l’application Vercel et des droits du compte connecté."
      sections={[
        { title: "Fonctionnement", body: "Depuis Idealy, l’utilisateur authentifié démarre la connexion Vercel. Idealy crée un état OAuth à durée limitée et un vérificateur PKCE, puis redirige vers Vercel. Le callback échange le code, vérifie l’identité Vercel et enregistre les jetons chiffrés côté serveur. La fonction de statut vérifie ensuite l’accès au compte." },
        { title: "Déployer un projet", body: "Le backend lit les fichiers enregistrés de la mission appartenant à l’utilisateur connecté. Il exige un nom de projet valide et une confirmation explicite, liée à un instantané des fichiers et à une durée d’expiration. Après confirmation, il téléverse les fichiers vers l’API Vercel puis crée un déploiement en cible Preview par défaut, ou Production si cette cible est expressément demandée. Le backend retourne l’état, l’identifiant et l’URL lorsqu’ils sont fournis par Vercel." },
        { title: "Permissions et limites", body: "Le flux OAuth actuellement présent demande openid, email, profile et offline_access. Ces scopes identifient l’utilisateur et permettent la gestion de session, mais ne prouvent pas à eux seuls que les permissions API nécessaires au téléversement et à la création de déploiements sont accordées. Les appels de déploiement utilisent les API Vercel v2/files et v13/deployments. Les permissions réelles doivent être validées avec le type d’intégration Vercel choisi avant de promettre une publication fonctionnelle pour tous les comptes." },
        { title: "Contenu envoyé à Vercel", body: "Lorsqu’un déploiement est confirmé, les fichiers enregistrés de la mission sélectionnée et le nom du projet sont transmis à Vercel. Ne stockez pas de secrets dans les fichiers du workspace. Les environnements, domaines personnalisés, variables d’environnement et importations de dépôts existants ne sont pas configurés par ce flux de déploiement examiné." },
        { title: "Erreurs courantes", body: "Si la connexion est indisponible, la configuration OAuth serveur peut être absente. Si le compte apparaît déconnecté ou expiré, vérifiez son autorisation Vercel puis reconnectez-le. Une erreur d’autorisation pendant le téléversement ou la création du déploiement peut indiquer que l’accès API accordé ne suffit pas. Si la confirmation est expirée ou ne correspond plus aux fichiers actuels, relancez la prévisualisation et confirmez à nouveau. Après une erreur ambiguë survenue après le déclenchement du déploiement, vérifiez le tableau de bord Vercel avant de relancer pour éviter un doublon." },
        { title: "Webhooks", body: "L’endpoint public de réception est implémenté dans Supabase sous `vercel-webhook` et vérifie l’en-tête `x-vercel-signature` avec le secret d’intégration. Il enregistre les métadonnées minimales et déduplique les livraisons par identifiant d’événement. Il n’est pas encore considéré comme opérationnel de bout en bout : son URL doit être renseignée dans la console d’intégration Vercel et un événement signé réel doit être validé. La publication et le suivi actuels utilisent les réponses de l’API de déploiement." },
        { title: "Aide", body: "Pour signaler un problème, contactez contact@idealy.app. Ne partagez jamais vos jetons d’accès, secrets OAuth, clés API ou cookies de session. Consultez également la page /support pour préparer les informations utiles au diagnostic." }
      ]}
    />
  );
}
