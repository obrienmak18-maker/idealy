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
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(80),
  lastName: z.string().trim().max(80).optional().default(""),
  primaryGoal: z
    .string()
    .trim()
    .min(1, "L’objectif est requis.")
    .max(400),
  projectType: z.enum(idealyProjectTypes),
  experienceLevel: z.enum(idealyExperienceLevels),
  discoverySource: z.enum(idealyDiscoverySources).optional(),
  way: z.enum(idealyWays),
  preferredLanguage: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,3}(-[a-z]{2})?$/, "Langue invalide.")
    .max(7)
    .default("fr"),
  timezone: z
    .string()
    .trim()
    .min(1, "Fuseau horaire requis.")
    .max(64)
    .regex(/^[A-Za-z0-9_+./-]+$/, "Fuseau horaire invalide.")
    .default("UTC"),
});

export type OnboardingInput = z.infer<typeof onboardingInputSchema>;

export type OnboardingStatus = {
  firstName: string | null;
  onboardingCompleted: boolean;
  profileExists: boolean;
  way: (typeof idealyWays)[number] | null;
};
