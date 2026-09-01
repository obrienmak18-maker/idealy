import { z } from "zod";
import { idealyWays } from "./product-contract";

export const idealyProjectTypes = [
  "web",
  "mobile",
  "saas",
  "startup",
  "site",
  "prototype",
  "internal_tool",
  "other",
] as const;

export const idealyExperienceLevels = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "non_coder",
] as const;

export const idealyDiscoverySources = [
  "tiktok",
  "youtube",
  "google",
  "github",
  "friend",
  "school",
  "community",
  "other",
] as const;

export const onboardingInputSchema = z.object({
  discoverySource: z.enum(idealyDiscoverySources).optional(),
  experienceLevel: z.enum(idealyExperienceLevels),
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  preferredLanguage: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,3}(-[a-z]{2})?$/, "Langue invalide.")
    .max(7)
    .default("fr"),
  primaryGoal: z.string().trim().min(1, "L’objectif est requis.").max(400),
  projectType: z.enum(idealyProjectTypes),
  timezone: z
    .string()
    .trim()
    .min(1, "Fuseau horaire requis.")
    .max(64)
    .regex(/^[A-Za-z0-9_+./-]+$/, "Fuseau horaire invalide.")
    .default("UTC"),
  way: z.enum(idealyWays),
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

export type OnboardingStatus = {
  experienceLevel: string | null;
  firstName: string | null;
  onboardingCompleted: boolean;
  primaryGoal: string | null;
  profileExists: boolean;
  projectType: string | null;
  way: (typeof idealyWays)[number] | null;
};
