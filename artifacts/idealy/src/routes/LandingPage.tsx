import { useState } from 'react';
import LandingHero from '@/components/redesign/LandingHero';
import { AuthModal } from '@/components/AuthModal';

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');

  function openAuth(mode: 'signin' | 'signup') {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  return (
    <>
      <LandingHero onSignIn={() => openAuth('signin')} onSignUp={() => openAuth('signup')} />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        mode={authMode}
      />
    </>
  );
}

export default LandingPage;
