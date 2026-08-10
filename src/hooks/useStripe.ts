import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/supabaseClient';
import { logger } from '@/utils/logger';

export interface Plan {
  id: 'starter' | 'pro' | 'business';
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  currency: string;
  features: string[];
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 0, yearly: 0 },
    currency: '€',
    features: [
      'Agents standards',
      'Base de données locale (Sandbox)',
      '100 Mana / jour',
    ],
  },
  {
    id: 'pro',
    name: 'Builder',
    price: { monthly: 49, yearly: 39 },
    currency: '€',
    popular: true,
    features: [
      'Agents Pro (GPT-4 / Claude 3.5)',
      'Déploiement Vercel 1-clic',
      'Connexion Supabase / Firebase',
      'Mana Illimité',
    ],
  },
  {
    id: 'business',
    name: 'Legend',
    price: { monthly: 129, yearly: 99 },
    currency: '€',
    features: [
      'Collaboration multi-joueurs (Yjs)',
      'Rôles et permissions personnalisés',
      'Modèles IA sur-mesure',
      'Support prioritaire 24/7',
    ],
  },
];

export interface SubscriptionStatus {
  active: boolean;
  planId: string | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
}

export interface UseStripeReturn {
  // États
  loading: boolean;
  error: string | null;
  success: string | null;
  subscription: SubscriptionStatus | null;
  
  // Actions
  createCheckoutSession: (planId: 'pro' | 'business', billingCycle: 'monthly' | 'yearly') => Promise<boolean>;
  createBillingPortal: () => Promise<boolean>;
  checkSubscription: () => Promise<void>;
  cancelSubscription: () => Promise<boolean>;
  clearMessages: () => void;
}

export function useStripe(): UseStripeReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const createCheckoutSession = useCallback(async (
    planId: 'pro' | 'business',
    billingCycle: 'monthly' | 'yearly'
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Service d\'authentification non disponible.');

      const { data, error: invokeError } = await supabase.functions.invoke('create-checkout-session', {
        body: { planId, billingCycle },
      });

      if (invokeError) throw invokeError;
      if (!data?.url) throw new Error('Session de paiement indisponible.');

      logger.info('Checkout session created', { action: 'createCheckoutSession', planId, billingCycle });
      
      // Redirection vers Stripe Checkout
      window.location.href = data.url;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la création de la session de paiement';
      setError(message);
      logger.error('Checkout session failed', err instanceof Error ? err : undefined, {
        action: 'createCheckoutSession',
        planId,
        billingCycle,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const createBillingPortal = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Service d\'authentification non disponible.');

      const { data, error: invokeError } = await supabase.functions.invoke('create-billing-portal', {});

      if (invokeError) throw invokeError;
      if (!data?.url) throw new Error('Portail de facturation indisponible.');

      logger.info('Billing portal session created', { action: 'createBillingPortal' });
      
      // Redirection vers Stripe Customer Portal
      window.location.href = data.url;
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'accès au portail de facturation';
      setError(message);
      logger.error('Billing portal failed', err instanceof Error ? err : undefined, {
        action: 'createBillingPortal',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const checkSubscription = useCallback(async (): Promise<void> => {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) return;

      const { data, error: invokeError } = await supabase.functions.invoke('check-subscription', {});

      if (invokeError) {
        logger.error('Subscription check failed', invokeError, { action: 'checkSubscription' });
        return;
      }

      if (data) {
        setSubscription({
          active: data.active || false,
          planId: data.planId || null,
          currentPeriodEnd: data.currentPeriodEnd || null,
          cancelAtPeriodEnd: data.cancelAtPeriodEnd || false,
        });
      }
    } catch (err) {
      logger.error('Subscription check error', err instanceof Error ? err : undefined, {
        action: 'checkSubscription',
      });
    }
  }, []);

  const cancelSubscription = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Service d\'authentification non disponible.');

      const { data, error: invokeError } = await supabase.functions.invoke('cancel-subscription', {});

      if (invokeError) throw invokeError;

      setSuccess('Votre abonnement sera annulé à la fin de la période en cours.');
      logger.info('Subscription cancelled', { action: 'cancelSubscription' });
      
      // Rafraîchir le statut
      await checkSubscription();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'annulation de l\'abonnement';
      setError(message);
      logger.error('Subscription cancellation failed', err instanceof Error ? err : undefined, {
        action: 'cancelSubscription',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [checkSubscription]);

  return {
    // États
    loading,
    error,
    success,
    subscription,
    
    // Actions
    createCheckoutSession,
    createBillingPortal,
    checkSubscription,
    cancelSubscription,
    clearMessages,
  };
}