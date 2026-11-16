---
name: idealy-prelaunch-quality-gate
description: Pre-launch quality assurance protocol, contractual verification suites, Vitest/Playwright test suites, security checks, and readiness determination (Ready for Internal Testing, Private Beta, Public Launch, Not Ready).
license: MIT
metadata:
  author: Idealy Engineering Team
  version: "1.0.0"
---

# Idealy Pre-Launch Quality Gate

## Verification Criteria
1. **Zero Mocking of Critical Systems**: All auth, billing, connectors, and power systems must reflect true backend state.
2. **Tri-lingual Validation**: Every user screen must render in `fr`, `en`, and `es` without regression or hardcoded leaks.
3. **Responsive Stability**: Viewports 1440px, 1280px, 1024px, 768px, 375px tested without layout breaks or blocked tap targets.
4. **Execution of Test Suites**:
   - `npm --prefix sidealy test` (Vitest)
   - `tsc --noEmit` & `npm --prefix sidealy run build`
   - Contract test scripts in `scripts/`
   - Playwright end-to-end scenarios
5. **Readiness Evaluation**:
   - Classify product state: `READY FOR INTERNAL TESTING`, `READY FOR PRIVATE BETA`, `READY FOR PUBLIC LAUNCH`, or `NOT READY`.
