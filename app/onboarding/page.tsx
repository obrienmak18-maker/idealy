import { Suspense } from "react";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { IdealyLoading } from "@/components/branding/idealy-loading";

function OnboardingFallback() {
  return <IdealyLoading label="Préparation de votre profil…" />;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingFallback />}>
      <OnboardingFlow />
    </Suspense>
  );
}
