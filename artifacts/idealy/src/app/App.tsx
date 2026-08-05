import { lazy, Suspense, useEffect } from 'react';
import { useIdealyStore } from '@/stores/idealyStore';
import { getSupabaseClient } from '@/supabaseClient';

const LandingPage = lazy(() =>
  import('@/routes/LandingPage').then((m) => ({ default: m.LandingPage })),
);
const OnboardingPage = lazy(() =>
  import('@/routes/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const WorkspacePage = lazy(() =>
  import('@/routes/WorkspacePage').then((m) => ({ default: m.WorkspacePage })),
);

function App() {
  const stage = useIdealyStore((s) => s.stage);
  const onboarded = useIdealyStore((s) => s.onboarded);
  const refillEnergy = useIdealyStore((s) => s.refillEnergy);
  const setProfile = useIdealyStore((s) => s.setProfile);
  const setStage = useIdealyStore((s) => s.setStage);
  const way = useIdealyStore((s) => s.way);

  useEffect(() => {
    refillEnergy();
  }, [refillEnergy]);

  // Restore Supabase session on load (handles OAuth redirects + persisted sessions)
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    // Parse any active session (including OAuth callback in URL hash)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const user = session.user;
        setProfile({
          email: user.email ?? '',
          displayName:
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email?.split('@')[0] ??
            'Utilisateur',
          avatarHue: 220,
        });
        refillEnergy();
        const { way: currentWay, onboarded: currentOnboarded } = useIdealyStore.getState();
        if (currentWay && currentOnboarded) {
          setStage('ready');
        } else if (useIdealyStore.getState().stage === 'guest') {
          setStage('choosing-way');
        }
      }
    });

    // Listen for future auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = session.user;
        setProfile({
          email: user.email ?? '',
          displayName:
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            user.email?.split('@')[0] ??
            'Utilisateur',
          avatarHue: 220,
        });
        refillEnergy();
        const { way: currentWay, onboarded: currentOnboarded } = useIdealyStore.getState();
        setStage(currentWay && currentOnboarded ? 'ready' : 'choosing-way');
      }

      if (event === 'SIGNED_OUT') {
        useIdealyStore.setState({
          stage: 'guest',
          profile: null,
        });
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount — supabase client built lazily from store

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

  return (
    <Suspense fallback={<main className="min-h-screen bg-ink-950" aria-busy="true" />}>
      {page}
    </Suspense>
  );
}

export default App;
