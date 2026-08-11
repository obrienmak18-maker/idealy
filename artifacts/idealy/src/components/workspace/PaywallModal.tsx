import React, { useState } from 'react';
import { Sparkles, Zap, Shield, Crown, X } from 'lucide-react';
import { getSupabaseClient } from '@/supabaseClient';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<'pro' | 'business' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: 'pro' | 'business') {
    setLoadingPlan(plan); setError(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase n’est pas configuré.');
      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout-session', {
        body: { plan, billingCycle },
      });
      if (invokeError) throw invokeError;
      if (!data?.url) throw new Error('Checkout session is unavailable.');
      window.location.assign(data.url);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : 'Checkout could not start.');
    } finally { setLoadingPlan(null); }
  }

  // On simule l'utilisation de la clé Stripe passée par l'utilisateur

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl rounded-2xl border border-white/10 bg-surface-container/90 p-8 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-300 hover:bg-white/5 hover:text-ink-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-geist font-bold mb-4 bg-gradient-to-r from-white to-ink-300 bg-clip-text text-transparent">
            Choose Your Rank
          </h2>
          <p className="text-ink-300 text-lg">
            Unlock more chakra, summon advanced agents, and deploy to production.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <span className={`text-sm ${billingCycle === 'monthly' ? 'text-white font-medium' : 'text-ink-300'}`}>
              Mensuel
            </span>
            <button 
              onClick={() => setBillingCycle(b => b === 'monthly' ? 'yearly' : 'monthly')}
              className="relative w-14 h-7 rounded-full bg-surface-bright border border-white/10 transition-colors duration-300 focus:outline-none"
            >
              <div 
                className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-primary transition-transform duration-300 ${
                  billingCycle === 'yearly' ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm ${billingCycle === 'yearly' ? 'text-white font-medium' : 'text-ink-300'}`}>
              Annuel <span className="ml-2 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">2 Mois Gratuits</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* STARTER */}
          <div className="rounded-xl border border-white/5 bg-surface-dim/50 p-6 flex flex-col">
            <h3 className="text-xl font-bold font-geist mb-2 text-ink-100 flex items-center gap-2">
              <Shield className="h-5 w-5 text-ink-300" />
              Starter
            </h3>
            <div className="mb-4">
              <span className="text-3xl font-bold font-geist">Gratuit</span>
            </div>
            <p className="text-sm text-ink-300 mb-6">Missions de Rang D et prototypage basique.</p>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-ink-200">
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-ink-400" /> Agents standards</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-ink-400" /> Base de données locale (Sandbox)</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-ink-400" /> 100 Mana / jour</li>
            </ul>
            <button className="w-full py-2.5 rounded-lg border border-white/10 text-ink-200 hover:bg-white/5 hover:text-white transition-colors">
              Plan Actuel
            </button>
          </div>

          {/* BUILDER (Pro) */}
          <div className="relative rounded-xl border border-primary bg-surface p-6 flex flex-col shadow-[0_0_30px_rgba(76,215,246,0.15)] transform md:-translate-y-4">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
              <Zap className="h-3 w-3" /> MOST POPULAR
            </div>
            <h3 className="text-xl font-bold font-geist mb-2 text-primary flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Builder <span className="text-xs bg-primary/10 px-2 py-0.5 rounded ml-2">Rang S</span>
            </h3>
            <div className="mb-4">
              <span className="text-3xl font-bold font-geist">{billingCycle === 'monthly' ? '29€' : '24€'}</span>
              <span className="text-ink-300 text-sm"> /mois</span>
            </div>
            <p className="text-sm text-ink-300 mb-6">Missions de Rang S, déploiements réels.</p>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-ink-100">
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary glow-sm" /> Agents Pro (GPT-4 / Claude 3.5)</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary glow-sm" /> Déploiement Vercel 1-clic</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary glow-sm" /> Connexion Supabase / Firebase</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-primary glow-sm" /> Mana Illimité</li>
            </ul>
            <button onClick={() => startCheckout('pro')} disabled={loadingPlan !== null} className="w-full py-2.5 rounded-lg bg-primary text-on-primary font-bold shadow-[0_0_15px_rgba(76,215,246,0.4)] hover:bg-primary-fixed-dim transition-all disabled:opacity-60">
              {loadingPlan === 'pro' ? 'Opening secure checkout...' : 'Go Pro — 14-day trial'}
            </button>
          </div>

          {/* LEGEND (Enterprise) */}
          <div className="rounded-xl border border-white/5 bg-surface-dim/50 p-6 flex flex-col">
            <h3 className="text-xl font-bold font-geist mb-2 text-secondary flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Legend <span className="text-xs bg-secondary/10 px-2 py-0.5 rounded ml-2 text-secondary">Rang SSS</span>
            </h3>
            <div className="mb-4">
              <span className="text-3xl font-bold font-geist">{billingCycle === 'monthly' ? '99€' : '79€'}</span>
              <span className="text-ink-300 text-sm"> /mois</span>
            </div>
            <p className="text-sm text-ink-300 mb-6">Pour les guildes et agences d'élite.</p>
            <ul className="space-y-3 mb-8 flex-1 text-sm text-ink-200">
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-secondary" /> Collaboration multi-joueurs (Yjs)</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-secondary" /> Rôles et permissions personnalisés</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-secondary" /> Modèles IA sur-mesure</li>
              <li className="flex items-center gap-2"><div className="h-1.5 w-1.5 rounded-full bg-secondary" /> Support prioritaire 24/7</li>
            </ul>
            <button onClick={() => startCheckout('business')} disabled={loadingPlan !== null} className="w-full py-2.5 rounded-lg border border-white/10 text-ink-100 hover:border-secondary hover:text-secondary transition-colors disabled:opacity-60">
              {loadingPlan === 'business' ? 'Opening secure checkout...' : 'Go Business — 14-day trial'}
            </button>
          </div>

        </div>
        {error && <p role="alert" className="mt-5 text-center text-sm text-red-300">{error}</p>}
      </div>
    </div>
  );
}
