import type { DesignSpecification } from "./types";
import type { DesignCriticResult } from "./critic";

function list(values: string[]) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- None";
}

export function designSpecificationToMarkdown(
  specification: DesignSpecification,
  critic?: DesignCriticResult
) {
  return `# Design Specification

Version: ${specification.version}

## Visual direction

**${specification.visualDirection.name}** — ${specification.visualDirection.rationale}

## Product analysis

| Dimension | Value |
|---|---|
| Product | ${specification.analysis.productType} |
| Sector | ${specification.analysis.sector} |
| Audience | ${specification.analysis.audience} |
| Platform | ${specification.analysis.platform} |
| Framework | ${specification.analysis.framework} |
| Density | ${specification.analysis.density} |
| Tone | ${specification.analysis.tone} |
| Motion | ${specification.analysis.motion} |
| Charts | ${specification.analysis.charts ? "yes" : "no"} |
| 3D | ${specification.analysis.threeD ? "yes" : "no"} |
| Accessibility | ${specification.analysis.accessibility} |

## Design stack

### Providers

${list(specification.stack.providers)}

### Dependencies allowed

${list(specification.stack.dependencies)}

## Tokens

| Token | Rule |
|---|---|
| Color | ${specification.tokens.colorStrategy} |
| Typography | ${specification.tokens.typography} |
| Spacing | ${specification.tokens.spacing} |
| Radius | ${specification.tokens.borderRadius} |
| Borders | ${specification.tokens.borderStyle} |
| Shadows | ${specification.tokens.shadowStrategy} |
| Motion duration | ${specification.tokens.motionDuration} |
| Density | ${specification.tokens.density} |

## Instructions

${list(specification.instructions)}

## Constraints

${list(specification.constraints)}

## Design Critic

${critic ? `Status: ${critic.passed ? "passed" : "requires changes"}\nScore: ${critic.score}/100\n\n${critic.issues.length ? critic.issues.map((issue) => `- [${issue.severity}] ${issue.code}: ${issue.message} ${issue.recommendation}`).join("\\n") : "- No issues"}` : "Not run"}
`;
}
