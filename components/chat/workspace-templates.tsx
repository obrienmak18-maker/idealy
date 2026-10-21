"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
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
  const { t, language } = useTranslation();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
        <span className="text-[10px] font-medium text-muted-foreground">
          {language.startsWith("en") ? "4 app starters" : language.startsWith("es") ? "4 ideas de app" : "4 idées d’apps"}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {templates.map((tpl, i) => {
          const Icon = tpl.icon;
          const expanded = expandedId === tpl.id;
          return (
            <motion.div key={tpl.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.035, duration: 0.22 }} className="group rounded-xl border border-border/50 bg-card/35 transition-colors hover:border-border/80 hover:bg-card/55">
              <button type="button" aria-expanded={expanded} onClick={() => setExpandedId(expanded ? null : tpl.id)} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg border ${tpl.bg}`}><Icon className={`size-3.5 ${tpl.color}`} /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-foreground">{tpl.title}</span><span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{tpl.description}</span></span>
                <ArrowRight className={`size-3 shrink-0 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-90 text-primary" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {expanded ? <motion.div key="details" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden"><div className="border-t border-border/40 px-3 pb-3 pt-2.5"><p className="text-[11px] leading-relaxed text-muted-foreground">{tpl.description}</p><button type="button" onClick={() => onSelectTemplate(tpl.prompt)} className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-foreground px-2.5 text-[11px] font-medium text-background transition hover:opacity-85">{language.startsWith("en") ? "Use this idea" : language.startsWith("es") ? "Usar esta idea" : "Utiliser cette idée"}<ArrowRight className="size-3" /></button></div></motion.div> : null}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
