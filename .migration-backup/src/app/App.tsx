import { lazy, Suspense, useEffect } from 'react';
import { useIdealyStore } from '@/stores/idealyStore';

const LandingPage = lazy(() => import('@/routes/LandingPage').then((module) => ({ default: module.LandingPage })));
const OnboardingPage = lazy(() => import('@/routes/OnboardingPage').then((module) => ({ default: module.OnboardingPage })));
const WorkspacePage = lazy(() => import('@/routes/WorkspacePage').then((module) => ({ default: module.WorkspacePage })));

function App() {
  const stage = useIdealyStore((s) => s.stage);
  const onboarded = useIdealyStore((s) => s.onboarded);
  const refillEnergy = useIdealyStore((s) => s.refillEnergy);

  useEffect(() => {
    refillEnergy();
  }, [refillEnergy]);

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

  return <Suspense fallback={<main className="min-h-screen bg-ink-950" aria-busy="true" />}>{page}</Suspense>;
}

export default App;
