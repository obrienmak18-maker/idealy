import assert from "node:assert/strict";
import {
  buildDesignSpecification,
  designSpecificationToMarkdown,
  runDesignCritic,
} from "../lib/idealy/design-engine/index";

const material = buildDesignSpecification(
  "Build a fintech dashboard with Material UI and accessible tables."
);
assert(material.selectedProviders.includes("material-ui"));
assert.equal(material.analysis.productType, "dashboard");
assert.equal(material.analysis.sector, "fintech");
assert(material.dependencies.includes("@mui/material"));

const stitch = buildDesignSpecification(
  "Explore three landing page directions with Google Stitch, then implement the best one."
);
assert(stitch.requestedProviders.includes("stitch"));
assert(stitch.selectedProviders.includes("stitch"));
assert(!stitch.dependencies.includes("stitch"));
assert(stitch.constraints.join(" ").includes("configured"));

const threeD = buildDesignSpecification(
  "Create a portfolio homepage with a Three.js hero scene and a mobile-safe fallback."
);
assert.equal(threeD.analysis.threeD, true);
assert(threeD.selectedProviders.includes("three"));
assert(threeD.selectedProviders.includes("react-three-fiber"));
assert(threeD.selectedProviders.includes("drei"));
assert(threeD.constraints.join(" ").includes("fallback"));
assert(runDesignCritic(threeD).issues.some((issue) => issue.code === "mobile-3d-performance"));

const prompt = "Build a calm SaaS workspace for a small team.";
const first = buildDesignSpecification(prompt);
const second = buildDesignSpecification(prompt);
assert.deepEqual(second, first);
assert(first.selectedProviders.includes("shadcn"));
assert(first.selectedProviders.includes("lucide"));
assert(first.selectedProviders.includes("css-animation"));
assert(first.selectedProviders.length <= 4);
const markdown = designSpecificationToMarkdown(first, runDesignCritic(first));
assert(markdown.includes("# Design Specification"));
assert(markdown.includes("shadcn"));

const conflicting = buildDesignSpecification(
  "Use Material UI and Chakra UI together for an admin dashboard."
);
const critic = runDesignCritic(conflicting);
assert(conflicting.constraints.join(" ").includes("Conflicting full UI systems"));
assert.equal(critic.passed, false);
assert(critic.issues.some((issue) => issue.code === "explicit-provider-not-selected"));

console.log("Design Engine checks passed: 5 scenarios plus Markdown serialization.");
