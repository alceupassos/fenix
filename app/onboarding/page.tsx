"use client";

import OnboardingWizard from "@/components/OnboardingWizard";

/**
 * Onboarding wizard — auth gating will be enforced by middleware later.
 * Works unauthenticated for local preview; profile PATCH no-ops on 401.
 */
export default function OnboardingPage() {
  return <OnboardingWizard />;
}
