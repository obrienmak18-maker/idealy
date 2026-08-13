/**
 * PricingPage.tsx — Page publique de pricing d'Idealy.
 * Accessible sur /pricing sans connexion.
 * Utilisée pour convaincre les visiteurs de s'inscrire.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Zap, Crown, Building2, ArrowRight, Sparkles } from 'lucide-react';
import { Logo } from '@/components/Brand';

const PLANS = [
  {
    id: 'free',
    name: 'Genin',
    emoji: '🌱',
    description: 'Parfait pour découvrir la puissance des agents Idealy.',
    price: { monthly: 0, yearly: 0 },
    energy: '50 chakra/jour',
    color: 'from-ink-500/20 to-ink-400/10',
    border: 'border-white/10',
    badge: null,
    cta: 'Commencer gratuitement',
    ctaClass: 'btn-outline',
    features: [
      '50 générations / jour',
      '3 missions simultanées',
      'Aperçu WebContainer live',
      'Export ZIP',
      'Déploiement Vercel',
      'Stack React + Vite',
    ],
  },
  {
    id: 'pro',
    name: 'Chunin',
    emoji: '⚡',
    description: 'Pour les développeurs sérieux qui veulent aller plus vite.',
    price: { monthly: 29, yearly: 249 },
    energy: '500 chakra/jour',
    color: 'from-electric-500/20 to-purple-500/10',
    border: 'border-electric-500/30',
    badge: 'Populaire',
    badgeClass: 'bg-electric-400/20 text-electric-400',
    cta: 'Passer Pro',
    ctaClass: 'btn-primary',
    features: [
      '500 générations / jour',
      'Projets illimités',
      'Agents IA spécialisés',
      'Export GitHub (1-clic)',
      'Déploiement Vercel automatique',
      'Stacks: React, Next.js, Expo',
      'Mode Composer (diff fichier par fichier)',
      'Connecteurs: Firebase, Supabase, Clerk',
      'Support prioritaire',
    ],
  },
  {
    id: 'business',
    name: 'Jonin',
    emoji: '🔥',
    description: 'Pour les équipes et les startups qui construisent vite.',
    price: { monthly: 79, yearly: 699 },
    energy: 'Illimité',
    color: 'from-ember-500/20 to-orange-500/10',
    border: 'border-ember-500/30',
    badge: 'Équipes',
    badgeClass: 'bg-ember-400/20 text-ember-400',
    cta: 'Contacter les ventes',
    ctaClass: 'bg-gradient-to-r from-ember-500 to-orange-500 text-white hover:from-ember-400 hover:to-orange-400',
    features: [
      'Tout du plan Pro',
      'Membres d\'équipe illimités',
      'Projets privés',
      'SSO / SAML',
      'Historique illimité',
      'Accès API Idealy',
      'Account Manager dédié',
      'SLA 99.9%',
    ],
  },
];

export function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-white/5">
        <Logo size={28} />
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-ink-300 hover:text-white transition">Accueil</a>
          <a href="/workspace" className="btn-primary text-sm">
            Commencer <ArrowRight size={14} />
          </a>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-electric-400/10 border border-electric-400/20 px-4 py-1.5 text-sm text-electric-400 mb-6">
            <Sparkles size={14} />
            Pricing transparent, sans surprise
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-white to-ink-300 bg-clip-text text-transparent">
            Choisissez votre rang
          </h1>
          <p className="mt-4 text-lg text-ink-300 max-w-2xl mx-auto">
            Commencez gratuitement. Upgradez quand vous avez besoin de plus de puissance.
            Annulez à tout moment.
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <span className={`text-sm ${!yearly ? 'text-white' : 'text-ink-400'}`}>Mensuel</span>
          <button
            onClick={() => setYearly(v => !v)}
            className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-electric-500' : 'bg-ink-600'}`}
          >
            <motion.span
              className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full"
              animate={{ x: yearly ? 24 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
          <span className={`text-sm ${yearly ? 'text-white' : 'text-ink-400'}`}>
            Annuel
            <span className="ml-2 text-xs bg-green-400/20 text-green-400 px-1.5 py-0.5 rounded">-30%</span>
          </span>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6 pb-24 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1, duration: 0.4 }}
            className={`relative rounded-2xl border bg-gradient-to-b ${plan.color} ${plan.border} p-6 flex flex-col`}
          >
            {plan.badge && (
              <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full ${plan.badgeClass}`}>
                {plan.badge}
              </div>
            )}
            <div className="text-3xl mb-3">{plan.emoji}</div>
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="text-sm text-ink-400 mt-1 mb-4">{plan.description}</p>

            <div className="mb-6">
              {plan.price.monthly === 0 ? (
                <span className="text-3xl font-bold">Gratuit</span>
              ) : (
                <>
                  <span className="text-4xl font-bold">
                    {yearly ? plan.price.yearly : plan.price.monthly}€
                  </span>
                  <span className="text-ink-400 text-sm">/{yearly ? 'an' : 'mois'}</span>
                  {yearly && (
                    <div className="text-xs text-green-400 mt-1">
                      Économisez {plan.price.monthly * 12 - plan.price.yearly}€/an
                    </div>
                  )}
                </>
              )}
              <div className="mt-2 flex items-center gap-1.5 text-xs text-ink-400">
                <Zap size={11} />
                {plan.energy}
              </div>
            </div>

            <a
              href="/#signup"
              className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition mb-6 ${plan.ctaClass}`}
            >
              {plan.cta} <ArrowRight size={14} />
            </a>

            <ul className="space-y-2.5 flex-1">
              {plan.features.map(f => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink-200">
                  <Check size={14} className="text-green-400 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {/* FAQ rapide */}
      <div className="max-w-2xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-2xl font-bold mb-8">Questions fréquentes</h2>
        <div className="space-y-4 text-left">
          {[
            {
              q: "Puis-je annuler à tout moment ?",
              a: "Oui. Vous pouvez annuler votre abonnement à tout moment depuis votre tableau de bord. Vous conservez l'accès jusqu'à la fin de la période de facturation."
            },
            {
              q: "Qu'est-ce que le 'chakra' ?",
              a: "Le chakra est notre système d'énergie gamifié. Chaque génération de code consomme du chakra. Il se recharge automatiquement chaque jour à minuit."
            },
            {
              q: "Les projets générés m'appartiennent-ils ?",
              a: "Absolument. Tout le code généré par Idealy vous appartient à 100%. Vous pouvez l'exporter, le modifier, et le commercialiser librement."
            },
          ].map(item => (
            <div key={item.q} className="rounded-xl border border-white/5 p-4">
              <h3 className="font-semibold mb-2">{item.q}</h3>
              <p className="text-sm text-ink-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-6 text-center text-xs text-ink-500">
        © 2025 Idealy · <a href="/" className="hover:text-white transition">Accueil</a>
      </footer>
    </div>
  );
}
