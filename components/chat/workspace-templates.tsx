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
        language.startsWith("en") ? "Build a CRM web app with a sales Kanban pipeline, contact profiles, search and filters, follow-up reminders and a dashboard of deals and revenue." : language.startsWith("es") ? "Crea una aplicación CRM con un tablero Kanban comercial, perfiles de contactos, búsqueda y filtros, recordatorios y un panel de oportunidades e ingresos." : "Crée une application CRM avec pipeline commercial Kanban, fiches contacts, recherche et filtres, rappels de suivi et tableau de bord des opportunités et revenus.",
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
        language.startsWith("en") ? "Build a SaaS analytics dashboard with revenue, churn and active-user KPIs, a 30-day chart, recent transactions, filters and a date-range selector." : language.startsWith("es") ? "Crea un panel de analítica SaaS con ingresos, cancelaciones y usuarios activos, gráfico de 30 días, transacciones recientes, filtros y selector de fechas." : "Crée un tableau de bord analytique SaaS avec revenus, résiliation et utilisateurs actifs, graphique sur 30 jours, transactions récentes, filtres et sélection de période.",
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
        language.startsWith("en") ? "Build a school management web app with student records, attendance, tuition payments, class results, parent access and a dashboard for school administrators. Start with a polished responsive frontend and realistic sample data." : language.startsWith("es") ? "Crea una aplicación web de gestión escolar con fichas de alumnos, asistencia, pagos, resultados, acceso para padres y un panel para la dirección. Empieza con una interfaz adaptable y datos de ejemplo realistas." : "Crée une application web de gestion scolaire avec dossiers des élèves, présences, paiements, résultats, accès des parents et tableau de bord de la direction. Commence par une interface responsive soignée et des données d’exemple réalistes.",
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
        language.startsWith("en") ? "Build a modern marketplace with searchable listings, category filters, seller profiles, favorites, a shopping cart, order summary and a simulated checkout. Make it feel like a real product, not a document." : language.startsWith("es") ? "Crea un marketplace moderno con catálogo filtrable, perfiles de vendedores, favoritos, carrito, resumen del pedido y pago simulado. Debe parecer un producto real, no un documento." : "Crée une marketplace moderne avec catalogue filtrable, profils vendeurs, favoris, panier, récapitulatif de commande et paiement simulé. Le résultat doit ressembler à un vrai produit, pas à un document.",
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
