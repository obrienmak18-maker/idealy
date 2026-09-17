"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  ShoppingBag,
  Users,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/provider";

interface WorkspaceTemplatesProps {
  onSelectTemplate: (prompt: string) => void;
}

export function WorkspaceTemplates({ onSelectTemplate }: WorkspaceTemplatesProps) {
  const { t } = useTranslation();

  const templates = [
    {
      id: "crm",
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20 group-hover:border-blue-500/40",
      title: t("workspace.templates.crm.title", "CRM & Pipeline Commercial"),
      description: t(
        "workspace.templates.crm.desc",
        "Gestion des leads, suivi des opportunités et tableau Kanban interactif."
      ),
      prompt:
        "Je veux construire un CRM complet avec pipeline commercial. Inclus un tableau Kanban avec colonnes (Lead, Contacté, Proposition, Gagné), une fiche détaillée par contact, des filtres de recherche et des statistiques clés.",
    },
    {
      id: "saas",
      icon: BarChart3,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10 border-emerald-500/20 group-hover:border-emerald-500/40",
      title: t("workspace.templates.saas.title", "Dashboard Analytics SaaS"),
      description: t(
        "workspace.templates.saas.desc",
        "Métriques en temps réel, graphiques de conversion et gestion d'équipe."
      ),
      prompt:
        "Construis un dashboard SaaS moderne et réactif. Inclus des KPIs (MRR, Churn, Utilisateurs actifs), un graphique d'évolution sur 30 jours, un tableau des dernières transactions avec filtres et un sélecteur de période.",
    },
    {
      id: "eLearning",
      icon: BookOpen,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20 group-hover:border-amber-500/40",
      title: t("workspace.templates.eLearning.title", "Plateforme e-Learning"),
      description: t(
        "workspace.templates.eLearning.desc",
        "Modules de formation interactifs, quiz et suivi de progression des élèves."
      ),
      prompt:
        "Aide-moi à créer une plateforme e-Learning interactive. Conçois le parcours avec catalogue de cours, vue détaillée du module avec lecteur vidéo et transcription, barre de progression globale et quiz interactif en fin de leçon.",
    },
    {
      id: "marketplace",
      icon: ShoppingBag,
      color: "text-purple-500",
      bg: "bg-purple-500/10 border-purple-500/20 group-hover:border-purple-500/40",
      title: t("workspace.templates.marketplace.title", "Micro-SaaS & Marketplace"),
      description: t(
        "workspace.templates.marketplace.desc",
        "Authentification multi-rôles, paiements récurrents et catalogue de produits."
      ),
      prompt:
        "Je souhaite développer une marketplace moderne. Intègre un catalogue de services avec filtres par catégorie, des fiches prestataires détaillées, un panier avec estimation du prix et un flux de checkout avec simulation de paiement.",
    },
  ];

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-primary" />
          <h3 className="text-[13px] font-semibold tracking-tight text-foreground">
            {t("workspace.templates.title", "Modèles prêts à l'emploi")}
          </h3>
        </div>
        <span className="text-[11px] font-medium text-muted-foreground">
          4 templates
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {templates.map((tpl, i) => {
          const Icon = tpl.icon;
          return (
            <motion.button
              key={tpl.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              onClick={() => onSelectTemplate(tpl.prompt)}
              type="button"
              className="group relative flex flex-col justify-between rounded-xl border border-border/60 bg-card/60 p-3.5 text-left backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex size-8 shrink-0 items-center justify-center rounded-lg border transition-colors ${tpl.bg}`}
                >
                  <Icon className={`size-4 ${tpl.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[13px] text-foreground tracking-tight group-hover:text-primary transition-colors">
                      {tpl.title}
                    </span>
                    <ArrowRight className="size-3 text-muted-foreground opacity-0 transition-all -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0" />
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground line-clamp-2">
                    {tpl.description}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
