import { useEffect, type RefObject } from 'react';

export function useLandingGsap(scope: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let cancelled = false;
    let dispose: () => void = () => undefined;

    void import('gsap').then(({ gsap }) => {
      if (cancelled || !scope.current) return;

      const context = gsap.context(() => {
        gsap.fromTo('[data-gsap="hero-kicker"]', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
        gsap.fromTo('[data-gsap="hero-title"]', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.08, ease: 'power3.out' });
        gsap.fromTo('[data-gsap="hero-prompt"]', { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.65, delay: 0.18, ease: 'power3.out' });
        gsap.to('[data-gsap="ambient"]', { y: -16, duration: 5.5, ease: 'sine.inOut', repeat: -1, yoyo: true, stagger: 0.65 });
      }, scope.current);

      dispose = () => context.revert();
    }).catch(() => undefined);

    return () => {
      cancelled = true;
      dispose();
    };
  }, [scope]);
}
