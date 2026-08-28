import { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

function OnboardingFallback() {
  return <main className="min-h-dvh bg-background" aria-busy="true" />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingFlow />
    </Suspense>
  );
}
