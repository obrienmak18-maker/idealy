import { lazy, Suspense, useEffect, useState } from 'react';
import { useIdealyStore } from '@/stores/idealyStore';
import { getSupabaseClient } from '@/supabaseClient';
import { AuthModal } from '@/components/AuthModal';

const LandingPage = lazy(() => import('@/routes/LandingPage').then((module) => ({ default: module.LandingPage })));
const OnboardingPage = lazy(() => import('@/routes/OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const WorkspacePage = lazy(() => import('@/routes/WorkspacePage').then((module) => ({ default: module.WorkspacePage })));

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

    const applySession = (user: { email?: string; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) return;
      const displayName =
        (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
        (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
        user.email?.split('@')[0] ||
        'Utilisateur';
      setProfile({ email: user.email ?? '', displayName, avatarHue: 220 });
      refillEnergy();
      const current = useIdealyStore.getState();
      setStage(current.way && current.onboarded ? 'ready' : 'choosing-way');
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') applySession(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') setRecoveryOpen(true);
      if (event === 'SIGNED_OUT') useIdealyStore.getState().signOut();
    });

    return () => subscription.unsubscribe();
  }, [refillEnergy, setProfile, setStage]);

  let page;
  if (!onboarded || stage === 'choosing-way' || stage === 'creating-profile') {
    if (stage === 'choosing-way' || stage === 'creating-profile') {
      page = <OnboardingPage />;
    } else {
      page = <LandingPage />;
    }
  } else {
    page = <WorkspacePage />;
  }

  return <>
    <Suspense fallback={<main className="min-h-screen bg-ink-950" aria-busy="true" />}>{page}</Suspense>
    <AuthModal open={recoveryOpen} onClose={() => setRecoveryOpen(false)} mode="recovery" />
  </>;
}

export default App;
