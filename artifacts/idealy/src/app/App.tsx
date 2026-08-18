import { lazy, Suspense, useEffect, useState } from 'react';
import { useIdealyStore } from '@/stores/idealyStore';
import { getSupabaseClient } from '@/supabaseClient';
import { AuthModal } from '@/components/AuthModal';
import { TooltipProvider } from '@/components/ui/tooltip';

const LandingPage = lazy(() => import('@/routes/LandingPage').then((module) => ({ default: module.LandingPage })));
const OnboardingPage = lazy(() => import('@/routes/OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const WorkspacePage = lazy(() => import('@/routes/WorkspacePage').then((module) => ({ default: module.WorkspacePage })));
const PricingPage = lazy(() => import('@/routes/PricingPage').then((module) => ({ default: module.PricingPage })));
const IdealyV2Page = lazy(() => import('@/routes/IdealyV2Page').then((module) => ({ default: module.IdealyV2Page })));
const DesignMockupPage = lazy(() => import('@/routes/DesignMockupPage').then((module) => ({ default: module.DesignMockupPage })));

// Simple path-based routing without React Router
const currentPath = window.location.pathname;

function App() {
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const stage = useIdealyStore((s) => s.stage);
  const onboarded = useIdealyStore((s) => s.onboarded);
  const refillEnergy = useIdealyStore((s) => s.refillEnergy);
  const setProfile = useIdealyStore((s) => s.setProfile);
  const setStage = useIdealyStore((s) => s.setStage);

  useEffect(() => {
    refillEnergy();
  }, [refillEnergy]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const applySession = async (user: any | null) => {
      if (!user) return;
      const displayName =
        (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
        user.email?.split('@')[0] ||
        'Utilisateur';

      setProfile({ email: user.email ?? '', displayName, avatarHue: 220 });

      if (user.id) {
        const { data: energyData } = await supabase.from('user_energy').select('*').eq('id', user.id).single();
        if (energyData) {
          useIdealyStore.getState().setEnergy({
            current: energyData.current_energy,
            max: energyData.max_energy,
            lastRefill: energyData.last_refill
          });
        }
      } else {
        refillEnergy();
      }

      const current = useIdealyStore.getState();
      setStage(current.way && current.onboarded ? 'ready' : 'choosing-way');
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') void applySession(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecoveryOpen(true);
      if (event === 'SIGNED_OUT') useIdealyStore.getState().signOut();
    });

    return () => subscription.unsubscribe();
  }, [refillEnergy, setProfile, setStage]);

  let page;

  // Public routes — accessible without auth
  if (currentPath === '/pricing') {
    page = <PricingPage />;
  } else if (currentPath === '/demo') {
    page = <WorkspacePage demoMode />;
  } else if (currentPath === '/v2') {
    page = <IdealyV2Page />;
  } else if (currentPath === '/design-mockup') {
    page = <DesignMockupPage />;
  } else if (!onboarded || stage === 'choosing-way' || stage === 'creating-profile') {
    if (stage === 'choosing-way' || stage === 'creating-profile') {
      page = <OnboardingPage />;
    } else {
      page = <LandingPage />;
    }
  } else {
    page = <WorkspacePage />;
  }

  return (
    <TooltipProvider delayDuration={180}>
      <Suspense fallback={<main className="min-h-screen bg-ink-950" aria-busy="true" />}>{page}</Suspense>
      <AuthModal open={recoveryOpen} onClose={() => setRecoveryOpen(false)} mode="recovery" />
    </TooltipProvider>
  );
}

export default App;
