import type React from "react";
import { PageFrame } from "../layout/PageFrame";
import { PageHeader } from "../layout/PageHeader";

type LegalKind = "privacy" | "terms" | "eula";

const legalCopy: Record<
  LegalKind,
  {
    eyebrow: string;
    title: string;
    intro: string;
    sections: Array<{ title: string; body: string }>;
  }
> = {
  privacy: {
    eyebrow: "Confidentialité",
    title: "Comment Idealy traite vos données.",
    intro:
      "Cette politique décrit les traitements identifiables dans la version actuelle du code d’Idealy. Elle ne remplace pas une validation juridique. Les coordonnées du responsable, les délais exacts de conservation et la procédure de suppression doivent être confirmés avant publication définitive.",
    sections: [
      {
        title: "Données de compte et d’utilisation",
        body: "Idealy utilise un système d’authentification et une base de données Supabase. Selon les fonctionnalités utilisées, le service traite les informations de compte disponibles, les préférences de langue et de thème, les missions, les messages et les fichiers de travail associés à votre compte. Ces données servent à fournir le workspace, enregistrer votre progression et répondre aux actions que vous demandez.",
      },
      {
        title: "Prompts, code et contenu généré",
        body: "Les instructions que vous soumettez, le contexte de mission nécessaire et les fichiers que vous choisissez de traiter peuvent être transmis au fournisseur d’intelligence artificielle sélectionné ou configuré pour exécuter la demande. Les résultats générés peuvent être enregistrés dans votre workspace. Ne soumettez pas de mots de passe, de clés privées ou d’informations confidentielles qui ne sont pas nécessaires.",
      },
      {
        title: "Fournisseurs d’intelligence artificielle",
        body: "Le backend contient des adaptateurs pour Anthropic, DeepSeek, Google Gemini, Groq, Moonshot, OpenAI, OpenRouter et Together. Le fournisseur réellement utilisé dépend de la configuration serveur, du mode et du fournisseur sélectionnés. Le code prévoit également des clés gérées côté serveur et un mode BYOK pour certaines configurations. Les conditions et règles de conservation du fournisseur concerné s’appliquent aussi au traitement qu’il effectue.",
      },
      {
        title: "Hébergement, base de données et sécurité",
        body: "Le site est déployé sur Vercel. Le code utilise Supabase pour l’authentification, la base de données et les fonctions backend. Les règles d’accès en base limitent l’accès à certaines ressources à leur propriétaire authentifié. Ces contrôles ne constituent pas une garantie absolue de sécurité ; signalez toute vulnérabilité via le contact indiqué en bas de page.",
      },
      {
        title: "Connexion Vercel et déploiements",
        body: "Si vous connectez Vercel, Idealy traite les informations de compte retournées par Vercel, l’identifiant de compte externe, les autorisations retournées et les jetons nécessaires à la connexion. Le code chiffre les jetons côté serveur et ne les renvoie pas au navigateur. Lors d’un déploiement explicitement confirmé, Idealy transmet à l’API Vercel les fichiers enregistrés de la mission choisie et reçoit les informations de déploiement, comme son identifiant, son état et son URL. Vercel traite alors ces données selon ses propres conditions.",
      },
      {
        title: "Paiements",
        body: "Le code intègre Stripe pour les sessions de paiement, les portails de facturation et les notifications de paiement. Idealy conserve des identifiants de client et d’abonnement ainsi que des informations nécessaires à l’état du forfait. Les paiements sont traités par Stripe ; Idealy ne doit pas être présenté comme stockant les numéros complets de cartes bancaires.",
      },
      {
        title: "Cookies et protection anti-robot",
        body: "Le code utilise des cookies techniques pour maintenir la session et mémoriser la langue, notamment NEXT_LOCALE. La préférence de thème et la fermeture de l’avis de cookies sont conservées dans le stockage local du navigateur. Lorsque la protection est activée, Cloudflare Turnstile vérifie certaines demandes d’inscription ou de connexion. Aucun outil de publicité ou de mesure d’audience supplémentaire n’est documenté dans les éléments examinés.",
      },
      {
        title: "Conservation et suppression",
        body: "Les données de workspace sont enregistrées pour permettre la continuité des missions. Le code examiné ne permet pas d’établir un délai universel de conservation pour toutes les données ni de confirmer une procédure automatisée de suppression complète. Vous pouvez demander l’accès, la correction ou la suppression de données en écrivant à l’adresse de contact ci-dessous ; l’identité du responsable, les délais de réponse et la procédure de suppression restent à formaliser et confirmer.",
      },
      {
        title: "Vos choix et vos droits",
        body: "Vous pouvez choisir de ne pas connecter un fournisseur externe, révoquer une autorisation depuis le fournisseur lorsque cette option existe, éviter de soumettre des données sensibles et contacter Idealy pour demander des informations sur vos données. Les droits applicables et les délais de traitement dépendent de votre situation et de la législation applicable.",
      },
      {
        title: "Responsable et contact",
        body: "Pour toute question relative à la confidentialité, écrivez à contact@idealy.app. Le nom légal du responsable, son éventuelle entité juridique, son adresse de contact officielle et les délais de conservation doivent être confirmés par le responsable du projet avant de considérer cette page comme une politique juridiquement finalisée.",
      },
    ],
  },
  terms: {
    eyebrow: "Conditions d’utilisation",
    title: "Utiliser Idealy de manière sûre et responsable.",
    intro:
      "Ces conditions de produit constituent un socle de transparence ; elles doivent être adaptées et validées juridiquement avant toute mise sur le marché payante.",
    sections: [
      {
        title: "Responsabilité des actions",
        body: "Vous restez responsable du contenu fourni, des services connectés et de toute action de publication confirmée. Idealy doit présenter clairement les opérations externes avant leur exécution.",
      },
      {
        title: "Disponibilité et résultats",
        body: "Les sorties IA peuvent être incomplètes ou incorrectes. Toute génération, configuration ou modification de code doit être relue et testée avant un usage en production.",
      },
      {
        title: "Plans et facturation",
        body: "Les prix, packs et droits d’abonnement ne sont valides que lorsqu’ils proviennent du catalogue serveur et de Stripe. Une carte d’interface ne crée pas à elle seule un droit de paiement ou de consommation.",
      },
    ],
  },
  eula: {
    eyebrow: "EULA · Version préparatoire",
    title: "Conditions de licence utilisateur final.",
    intro:
      "Cette page est un projet de conditions préparé pour examen. Elle ne doit pas être présentée comme un contrat final ni utilisée comme validation juridique avant confirmation par le responsable d’Idealy et, si nécessaire, un professionnel du droit.",
    sections: [
      {
        title: "Licence d’utilisation",
        body: "Sous réserve des conditions définitives qui seront publiées, Idealy est destiné à fournir des outils de création logicielle assistée par IA et une intégration permettant de transmettre des fichiers sélectionnés vers le compte Vercel autorisé par l’utilisateur. Aucun transfert de propriété du service Idealy n’est accordé par le simple accès au service.",
      },
      {
        title: "Utilisation autorisée",
        body: "L’utilisateur reste responsable de son compte, des fichiers soumis, des autorisations accordées aux fournisseurs externes et des déploiements qu’il confirme. Il ne doit pas utiliser le service pour enfreindre la loi, contourner les contrôles d’accès ou transmettre du contenu qu’il n’est pas autorisé à utiliser.",
      },
      {
        title: "Services tiers",
        body: "Les déploiements et les services connectés sont fournis par des tiers, notamment Vercel. Leur disponibilité, leurs règles, leurs limites, leurs tarifs et leurs conditions propres demeurent applicables. L’utilisateur doit examiner le contenu généré et tester son application avant toute utilisation en production.",
      },
      {
        title: "Contenu généré et disponibilité",
        body: "Les sorties de l’IA peuvent être erronées, incomplètes ou incompatibles avec les besoins de l’utilisateur. Idealy ne garantit pas qu’un code généré soit exempt de défauts, qu’un déploiement réussisse ou que le service soit disponible sans interruption. Les limites de responsabilité et les garanties doivent être rédigées et validées juridiquement avant publication définitive.",
      },
      {
        title: "Suspension, résiliation et données",
        body: "Les règles précises de suspension, de résiliation, de restitution ou de suppression des données, ainsi que les effets de la fin de licence, doivent être confirmés par le responsable du service et intégrés à la version définitive.",
      },
      {
        title: "Informations à confirmer avant publication",
        body: "Le responsable doit confirmer l’identité légale de la partie contractante, la juridiction et le droit applicables, le mécanisme de résolution des litiges, les garanties et limites de responsabilité, les règles de résiliation, la date d’entrée en vigueur et la version linguistique faisant foi. Ces informations ne sont volontairement pas inventées ici.",
      },
    ],
  },
};

export const LegalPage: React.FC<{ page: LegalKind }> = ({ page }) => {
  const content = legalCopy[page];
  return (
    <PageFrame label={content.eyebrow}>
      <article className="mx-auto max-w-3xl pb-12">
        <PageHeader eyebrow={content.eyebrow} title={content.title} />
        <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-4 py-3 text-sm leading-6 text-text-muted">
          {content.intro}
        </p>
        <div className="mt-8 divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-bg-surface px-5 sm:px-7">
          {content.sections.map((section, index) => (
            <section className="py-5" key={section.title}>
              <p className="text-[11px] font-medium text-text-muted">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-1.5 text-sm font-semibold text-text-main">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-7 text-text-muted">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </article>
    </PageFrame>
  );
};
