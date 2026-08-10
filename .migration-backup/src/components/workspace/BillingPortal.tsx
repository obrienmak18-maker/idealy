import { useEffect } from 'react';
import { X, CreditCard, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useStripe } from '@/hooks/useStripe';

interface BillingPortalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BillingPortal({ isOpen, onClose }: BillingPortalProps) {
  const {
    loading,
    error,
    success,
    subscription,
    createBillingPortal,
    checkSubscription,
    cancelSubscription,
    clearMessages,
  } = useStripe();

  useEffect(() => {
    if (isOpen) {
      checkSubscription();
      clearMessages();
    }
  }, [isOpen, checkSubscription, clearMessages]);

  if (!isOpen) return null;

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleManageSubscription = async () => {
    await createBillingPortal();
  };

  const handleCancelSubscription = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir annuler votre abonnement ? Il restera actif jusqu\'à la fin de la période en cours.')) {
      await cancelSubscription();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-surface-container/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-ink-300 hover:bg-white/5 hover:text-ink-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-geist font-bold mb-2 text-white">
            Gestion de l'Abonnement
          </h2>
          <p className="text-ink-300">
            Gérez votre plan et vos informations de facturation.
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-400/30 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-400/30 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
            <p className="text-sm text-green-200">{success}</p>
          </div>
        )}

        {/* Subscription Status */}
        {subscription && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className="rounded-xl border border-white/5 bg-surface-dim/50 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Plan Actuel
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-primary">
                      {subscription.planId === 'pro' ? 'Builder' : 
                       subscription.planId === 'business' ? 'Legend' : 'Starter'}
                    </span>
                    {subscription.active && (
                      <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                        Actif
                      </span>
                    )}
                  </div>
                </div>
                <CreditCard className="h-8 w-8 text-ink-400" />
              </div>

              {/* Subscription Details */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-300">Statut</span>
                  <span className="text-white font-medium">
                    {subscription.cancelAtPeriodEnd ? 'Annule à la fin de période' : 'Actif'}
                  </span>
                </div>
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink-300">Renouvellement</span>
                    <span className="text-white font-medium">
                      {formatDate(subscription.currentPeriodEnd)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleManageSubscription}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary-fixed-dim transition-all disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                Gérer le paiement
              </button>

              {subscription.active && !subscription.cancelAtPeriodEnd && (
                <button
                  onClick={handleCancelSubscription}
                  disabled={loading}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-400/30 text-red-300 hover:bg-red-500/10 transition-all disabled:opacity-60"
                >
                  <Calendar className="h-4 w-4" />
                  Annuler l'abonnement
                </button>
              )}
            </div>

            {/* Info */}
            <div className="p-4 rounded-lg bg-electric-500/10 border border-electric-400/20">
              <p className="text-xs text-electric-200">
                <strong>Note :</strong> La gestion des paiements est sécurisée par Stripe. 
                Vos informations de carte bancaire ne sont jamais stockées sur nos serveurs.
              </p>
            </div>
          </div>
        )}

        {/* No Subscription */}
        {!subscription && !loading && (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-ink-500 mx-auto mb-4" />
            <p className="text-ink-300 mb-6">
              Vous n'avez pas d'abonnement actif.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-medium hover:bg-primary-fixed-dim transition-all"
            >
              Voir les tarifs
            </button>
          </div>
        )}
      </div>
    </div>
  );
}