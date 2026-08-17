'use client';

/**
 * PricingPage — sober pricing for Idealy.
 * 3 plans, monthly/yearly toggle (ARIA switch), clear "missions/mois" unit,
 * energy consumption table, real FAQ accordion, mailto contact sales.
 */

import { useState } from 'react';
import { Check, Zap, Building2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const ACCENT_GRADIENT = 'linear-gradient(90deg, #8b5cf6, #f97316)';

type BillingPeriod = 'monthly' | 'yearly';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Sparkles,
    description: 'Pour découvrir Idealy et lancer vos premières missions.',
    price: { monthly: 0, yearly: 0 },
    unit: '10 missions/mois',
    cta: { label: 'Commencer gratuitement', href: '/signup' },
    highlighted: false,
    features: [
      '10 missions par mois',
      '1 projet actif',
      'Aperçu en direct',
      'Export du code',
      'Support communautaire',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    description: 'Pour les créateurs qui livrent régulièrement.',
    price: { monthly: 24, yearly: 19 },
    unit: '100 missions/mois',
    cta: { label: 'Passer en Pro', href: '/signup?plan=pro' },
    highlighted: true,
    features: [
      '100 missions par mois',
      'Projets illimités',
      'Déploiement en un clic',
      'Connecteurs GitHub & Figma',
      'Historique complet des missions',
      'Support prioritaire',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    icon: Building2,
    description: 'Pour les équipes qui construisent en production.',
    price: { monthly: 89, yearly: 74 },
    unit: '500 missions/mois',
    cta: {
      label: 'Contacter les ventes',
      href: 'mailto:sales@idealy.app?subject=Idealy%20Business',
    },
    highlighted: false,
    features: [
      '500 missions par mois',
      'Sièges d’équipe (jusqu’à 10)',
      'Environnements de staging',
      'SSO & contrôle d’accès',
      'SLA 99,9 %',
      'Support dédié',
    ],
  },
] as const;

const ENERGY_TABLE = [
  { mission: 'Page ou composant simple', energy: '1 mission' },
  { mission: 'App multi-pages avec navigation', energy: '2–3 missions' },
  { mission: 'App avec base de données et auth', energy: '3–5 missions' },
  { mission: 'Itération sur un projet existant', energy: '1 mission' },
];

const FAQ = [
  {
    question: 'Qu’est-ce qu’une mission exactement ?',
    answer:
      'Une mission est une demande complète adressée à l’équipe d’agents : créer une app, ajouter une fonctionnalité, corriger un bug. Les échanges de clarification au sein d’une même mission ne consomment rien de plus.',
  },
  {
    question: 'Que se passe-t-il si j’épuise mes missions ?',
    answer:
      'Vos projets restent accessibles en lecture, aperçu et export. Vous pouvez attendre le renouvellement mensuel ou passer au plan supérieur à tout moment — le changement est immédiat et calculé au prorata.',
  },
  {
    question: 'Puis-je changer de plan ou annuler à tout moment ?',
    answer:
      'Oui. L’upgrade est immédiat, le downgrade prend effet à la fin de la période en cours. L’annulation se fait en un clic depuis les paramètres, sans engagement.',
  },
  {
    question: 'Le code généré m’appartient-il ?',
    answer:
      'Entièrement. Vous pouvez exporter, héberger et modifier le code de vos projets sans restriction, y compris sur le plan gratuit.',
  },
  {
    question: 'Proposez-vous des tarifs pour les équipes de plus de 10 personnes ?',
    answer:
      'Oui, contactez-nous à sales@idealy.app pour un devis adapté à votre équipe, avec facturation centralisée et conditions sur mesure.',
  },
];

export default function PricingPage() {
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  const yearly = period === 'yearly';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#f4f4f5]">
      <main className="mx-auto max-w-5xl px-4 py-16">
        {/* Heading */}
        <div className="mx-auto max-w-xl text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Un tarif simple, une unité claire
          </h1>
          <p className="mt-3 text-pretty text-sm leading-6 text-[#a1a1aa]">
            Tout est compté en missions. Une mission = une demande complète à
            l&apos;équipe d&apos;agents. Pas de crédits opaques.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <span
            id="billing-label"
            className={`text-sm ${!yearly ? 'text-[#f4f4f5]' : 'text-[#a1a1aa]'}`}
          >
            Mensuel
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={yearly}
            aria-label="Basculer entre facturation mensuelle et annuelle"
            onClick={() => setPeriod(yearly ? 'monthly' : 'yearly')}
            className="relative h-6 w-11 rounded-full border border-[#1f1f2a] bg-[#12121a] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b5cf6]"
          >
            <span
              aria-hidden="true"
              className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-[#f4f4f5] transition-transform motion-reduce:transition-none ${
                yearly ? 'translate-x-[22px]' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span
            className={`text-sm ${yearly ? 'text-[#f4f4f5]' : 'text-[#a1a1aa]'}`}
          >
            Annuel
            <span className="ml-1.5 rounded-full border border-[#1f1f2a] bg-[#12121a] px-2 py-0.5 text-xs text-[#a1a1aa]">
              -20&nbsp;%
            </span>
          </span>
        </div>

        {/* Plans */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => {
            const price = plan.price[period];
            return (
              <div
                key={plan.id}
                className={
                  plan.highlighted
                    ? 'rounded-2xl p-px'
                    : 'rounded-2xl border border-[#1f1f2a]'
                }
                style={
                  plan.highlighted ? { background: ACCENT_GRADIENT } : undefined
                }
              >
                <div className="flex h-full flex-col gap-5 rounded-[calc(1rem-1px)] bg-[#12121a] p-6">
                  <div className="flex items-center gap-2">
                    <plan.icon
                      className="h-4 w-4 text-[#a1a1aa]"
                      aria-hidden="true"
                    />
                    <h2 className="text-sm font-semibold">{plan.name}</h2>
                    {plan.highlighted && (
                      <span className="ml-auto rounded-full border border-[#1f1f2a] px-2 py-0.5 text-xs text-[#a1a1aa]">
                        Populaire
                      </span>
                    )}
                  </div>

                  <p className="text-sm leading-6 text-[#a1a1aa]">
                    {plan.description}
                  </p>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-semibold tracking-tight">
                        {price === 0 ? 'Gratuit' : `${price}\u00A0€`}
                      </span>
                      {price > 0 && (
                        <span className="text-sm text-[#a1a1aa]">/mois</span>
                      )}
                    </div>
                    {yearly && price > 0 && (
                      <p className="mt-1 text-xs text-[#a1a1aa]">
                        Facturé annuellement ({price * 12}&nbsp;€/an)
                      </p>
                    )}
                    <p className="mt-2 text-sm font-medium">{plan.unit}</p>
                  </div>

                  <ul className="flex flex-col gap-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#a1a1aa]"
                          aria-hidden="true"
                        />
                        <span className="text-sm leading-5 text-[#f4f4f5]/90">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-2">
                    {plan.highlighted ? (
                      <Button
                        className="w-full border-0 text-white"
                        style={{ background: ACCENT_GRADIENT }}
                        asChild
                      >
                        {/* TODO: connect to Stripe checkout */}
                        <a href={plan.cta.href}>{plan.cta.label}</a>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full border-[#1f1f2a] bg-transparent text-[#f4f4f5] hover:bg-white/5 hover:text-[#f4f4f5]"
                        asChild
                      >
                        <a href={plan.cta.href}>{plan.cta.label}</a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Energy consumption table */}
        <section className="mt-16" aria-labelledby="energy-heading">
          <h2 id="energy-heading" className="text-lg font-semibold">
            Combien consomme une mission&nbsp;?
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-[#a1a1aa]">
            À titre indicatif, voici ce que consomment les demandes les plus
            courantes. Vous voyez toujours l&apos;estimation avant de lancer.
          </p>
          <div className="mt-5 overflow-hidden rounded-xl border border-[#1f1f2a]">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#1f1f2a] bg-[#12121a]">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Type de demande
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Consommation
                  </th>
                </tr>
              </thead>
              <tbody>
                {ENERGY_TABLE.map((row) => (
                  <tr
                    key={row.mission}
                    className="border-b border-[#1f1f2a] last:border-0"
                  >
                    <td className="px-4 py-3 text-[#f4f4f5]/90">
                      {row.mission}
                    </td>
                    <td className="px-4 py-3 text-[#a1a1aa]">{row.energy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-16" aria-labelledby="faq-heading">
          <h2 id="faq-heading" className="text-lg font-semibold">
            Questions fréquentes
          </h2>
          <Accordion type="single" collapsible className="mt-4">
            {FAQ.map((item, index) => (
              <AccordionItem
                key={item.question}
                value={`faq-${index}`}
                className="border-[#1f1f2a]"
              >
                <AccordionTrigger className="text-sm text-[#f4f4f5] hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-6 text-[#a1a1aa]">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>

      <footer className="border-t border-[#1f1f2a]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-[#a1a1aa] sm:flex-row">
          <p>© 2026 Idealy. Tous droits réservés.</p>
          <div className="flex gap-4">
            <a
              href="/terms"
              className="hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
            >
              Conditions
            </a>
            <a
              href="/privacy"
              className="hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
            >
              Confidentialité
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
