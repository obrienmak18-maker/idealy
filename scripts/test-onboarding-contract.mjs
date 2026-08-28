import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [contract, adapter, route, page, layout, packageJson, workflow] = await Promise.all([
  read("lib/idealy/onboarding-contract.ts"),
  read("lib/idealy/backend-adapter.ts"),
  read("app/api/idealy/profile/onboarding/route.ts"),
  read("components/onboarding/onboarding-flow.tsx"),
  read("app/(chat)/layout.tsx"),
  read("package.json"),
  read(".github/workflows/idealy-live-quality.yml"),
]);

assert(contract.includes("onboardingInputSchema"), "Onboarding must have a shared Zod schema.");
assert(contract.includes("idealyWays"), "Onboarding must use the central Way contract.");
assert(adapter.includes("completeMyIdealyOnboarding"), "Server adapter must call the onboarding RPC.");
assert(adapter.includes("rpc/complete_my_onboarding"), "Onboarding must not PATCH profiles directly.");
assert(route.includes("getToken"), "Onboarding route must require the authenticated server session.");
assert(route.includes("hasTrustedOrigin"), "Onboarding mutation must check request origin.");
assert(route.includes('return origin === new URL(request.url).origin'), "Onboarding mutation must require a same-origin request.");
assert(route.includes("onboardingInputSchema.safeParse"), "Onboarding mutation must validate server-side.");
assert(route.includes('process.env.DEMO_MODE === "true"'), "Demo mode must remain local and explicit.");
assert(!route.includes("SUPABASE_SERVICE_ROLE"), "Onboarding route must not use a service role in user flow.");
assert(page.includes("Étape {step + 1} sur {steps.length}"), "Onboarding UI must expose its step progress.");
assert(page.includes("/api/idealy/profile/onboarding"), "Onboarding UI must use the authenticated API route.");
assert(page.includes("Object.values(wayPresentations)"), "Onboarding UI must render the central Way presentations.");
assert(layout.includes("getMyIdealyOnboardingStatus"), "Workspace must evaluate onboarding status server-side.");
assert(layout.includes("redirect(\"/onboarding\")"), "Workspace must gate incomplete regular profiles.");
assert(packageJson.includes('"test:onboarding"'), "Package scripts must include the onboarding contract.");
assert(workflow.includes("Onboarding profile contract"), "CI must execute the onboarding contract.");

console.log("Idealy onboarding contract passed.");
