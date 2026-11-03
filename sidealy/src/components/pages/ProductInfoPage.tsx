import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  FileCode2,
  Plug,
  Rocket,
  Sparkles,
} from "lucide-react";
import type React from "react";
import { PageFrame } from "../layout/PageFrame";
import { PageHeader } from "../layout/PageHeader";
import { useState } from "react";
import { useApp } from "../../context/AppContext";

const features = [
  {
    icon: Sparkles,
    title: "Concevoir avec une IA",
    text: "Décrivez une idée, échangez avec l’assistant et faites évoluer la réponse dans le fil.",
  },
  {
    icon: FileCode2,
    title: "Construire des livrables",
    text: "Les fichiers et aperçus générés sont rattachés à la conversation pour garder le contexte.",
  },
  {
    icon: Plug,
    title: "Connecter vos outils",
    text: "Consultez les intégrations disponibles et leur état depuis la page Connecteurs.",
  },
];

const docs = [
  {
    title: "Démarrer une discussion",
    body: "Ouvrez une conversation, décrivez votre objectif et ajoutez des fichiers si le modèle sélectionné sait lire leur format.",
  },
  {
    title: "Retrouver vos échanges",
    body: "Les conversations du compte connecté sont importées dans la bibliothèque. Les brouillons restent enregistrés dans ce navigateur.",
  },
  {
    title: "Utiliser les connecteurs",
    body: "La page Connecteurs affiche les plugins fournis par le backend et leur statut. L’installation peut demander une autorisation explicite.",
  },
  {
    title: "Générer une application",
    body: "Expliquez le produit attendu dans le chat. Quand le backend identifie une mission de construction, son plan et ses fichiers apparaissent dans la conversation.",
  },
];

type ProductPageKind = "welcome" | "about" | "docs" | "support";

export const ProductInfoPage: React.FC<{ page: ProductPageKind }> = ({
  page,
}) => {
  const { setActivePage } = useApp();
  const [copied, setCopied] = useState(false);
  const titles: Record<
    ProductPageKind,
    { eyebrow: string; title: string; subtitle: string }
  > = {
    welcome: {
      eyebrow: "Bienvenue",
      title: "Une idée mérite un vrai espace de travail.",
      subtitle:
        "Concevez, explorez et construisez avec Idealy : une conversation reliée à vos missions, vos fichiers et vos outils.",
    },
    about: {
      eyebrow: "À propos",
      title: "Un workspace pour passer de l’idée au produit.",
      subtitle:
        "Idealy réunit l’assistant, la création de livrables et les intégrations dans un espace de travail continu.",
    },
    docs: {
      eyebrow: "Documentation",
      title: "Les bases pour avancer dans Idealy.",
      subtitle:
        "Un guide pratique des fonctions actuellement reliées à l’application.",
    },
    support: {
      eyebrow: "Assistance",
      title: "Parlons de ce qui vous bloque.",
      subtitle:
        "Retrouvez d’abord les réponses rapides ci-dessous, ou préparez un message avec le contexte de votre problème.",
    },
  };
  const copyDiagnostics = async () => {
    const diagnostics = `Idealy\nURL : ${window.location.origin}\nNavigateur : ${navigator.userAgent}\nDate : ${new Date().toISOString()}`;
    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <PageFrame label={titles[page].eyebrow}>
      <div className="mx-auto max-w-5xl pb-12">
        <PageHeader
          description={titles[page].subtitle}
          eyebrow={titles[page].eyebrow}
          title={titles[page].title}
        />

        {page === "welcome" && (
          <>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-primary px-4 text-sm font-medium text-brand-onPrimary hover:opacity-90 focus-ring"
                onClick={() => setActivePage("chat")}
                type="button"
              >
                <Rocket aria-hidden="true" className="h-4 w-4" />
                Ouvrir le workspace
              </button>
              <button
                className="inline-flex h-11 items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-4 text-sm font-medium text-text-main hover:bg-bg-subtle focus-ring"
                onClick={() => setActivePage("docs")}
                type="button"
              >
                <BookOpen aria-hidden="true" className="h-4 w-4" />
                Voir le guide
              </button>
            </div>
            <div className="mt-12 grid gap-3 md:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <article
                  className="rounded-2xl border border-border-subtle bg-bg-surface p-5"
                  key={title}
                >
                  <Icon
                    aria-hidden="true"
                    className="h-5 w-5 text-brand-primary"
                  />
                  <h2 className="mt-4 text-sm font-semibold text-text-main">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-text-muted">
                    {text}
                  </p>
                </article>
              ))}
            </div>
          </>
        )}

        {page === "about" && (
          <section className="mt-10 grid gap-3 md:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article
                className="rounded-2xl border border-border-subtle bg-bg-surface p-5"
                key={title}
              >
                <Icon
                  aria-hidden="true"
                  className="h-5 w-5 text-brand-primary"
                />
                <h2 className="mt-4 text-sm font-semibold text-text-main">
                  {title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-muted">{text}</p>
              </article>
            ))}
          </section>
        )}

        {page === "docs" && (
          <section
            aria-label="Guides Idealy"
            className="mt-9 divide-y divide-border-subtle rounded-2xl border border-border-subtle bg-bg-surface px-5 sm:px-6"
          >
            {docs.map((item, index) => (
              <article
                className="grid gap-2 py-5 sm:grid-cols-[48px_1fr]"
                key={item.title}
              >
                <span className="text-xs font-medium text-text-muted">
                  0{index + 1}
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-text-main">
                    {item.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
                    {item.body}
                  </p>
                </div>
              </article>
            ))}
          </section>
        )}

        {page === "support" && (
          <div className="mt-9 grid gap-4 md:grid-cols-[1fr_300px]">
            <section className="rounded-2xl border border-border-subtle bg-bg-surface p-5 sm:p-6">
              <div className="flex items-center gap-2">
                <CircleHelp
                  aria-hidden="true"
                  className="h-4 w-4 text-brand-primary"
                />
                <h2 className="text-sm font-semibold text-text-main">
                  Avant de demander de l’aide
                </h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-text-muted">
                <li>• Vérifiez que votre session est encore active.</li>
                <li>
                  • Ouvrez Paramètres pour consulter l’état du backend et du
                  quota.
                </li>
                <li>
                  • Dans Connecteurs, relancez la vérification d’une intégration
                  qui ne répond pas.
                </li>
              </ul>
            </section>
            <aside className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
              <h2 className="text-sm font-semibold text-text-main">
                Joindre le diagnostic
              </h2>
              <p className="mt-2 text-xs leading-5 text-text-muted">
                Copie l’URL, la date et les informations du navigateur. Aucune
                donnée de conversation n’est incluse.
              </p>
              <button
                className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border-subtle text-xs font-medium text-text-main hover:bg-bg-subtle focus-ring"
                onClick={() => void copyDiagnostics()}
                type="button"
              >
                {copied ? "Diagnostic copié" : "Copier le diagnostic"}
              </button>
              <button
                className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-bg-subtle text-xs font-medium text-text-main hover:bg-border-subtle focus-ring"
                onClick={() => setActivePage("settings")}
                type="button"
              >
                Ouvrir les paramètres
                <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </aside>
          </div>
        )}
      </div>
    </PageFrame>
  );
};
