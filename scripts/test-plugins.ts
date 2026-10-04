/**
 * Plugin engine behavioural tests.
 *
 * These exercise the real logic (permission gate, lifecycle, retry policy,
 * manifest validation, execution pipeline) rather than asserting on source text.
 *
 * Run with: pnpm run test:plugins
 */
import assert from "node:assert/strict";
import {
  authorizeToolExecution,
  checkPlanMinimum,
  classifyFailure,
  createPluginRegistry,
  decideRetry,
  type EnvironmentFacts,
  executePluginTool,
  missingRequirements,
  PLUGIN_MANIFESTS,
  type PluginInstallation,
  type PluginPermission,
  parsePluginManifest,
  pluginRegistry,
  resolveGrantablePermissions,
  toPublicPlugin,
} from "../lib/idealy/plugins/index";

const baseManifestInput = {
  agents: [],
  author: "Idealy",
  category: "code",
  dependencies: [],
  description: "Test plugin",
  id: "test-plugin",
  minimumPlan: "free",
  name: "Test Plugin",
  requestedPermissions: ["repository.read", "repository.write", "tool.execute"],
  requirements: {
    connectorProvider: "github",
    requiredScopes: ["repo"],
    requiredSecretEnvNames: ["GITHUB_CLIENT_ID"],
  },
  skills: [],
  tools: [
    {
      description: "Read a repository",
      id: "read-repository",
      label: "Read repository",
      permissions: ["repository.read", "tool.execute"],
      requiresConfirmation: false,
      risk: "read",
    },
    {
      description: "Push a branch",
      id: "create-branch",
      label: "Create branch",
      permissions: ["repository.write", "tool.execute"],
      requiresConfirmation: true,
      risk: "write",
    },
  ],
  transport: "native",
  version: "1.0.0",
};

function makeManifest() {
  const result = parsePluginManifest(baseManifestInput);
  assert.equal(result.ok, true, "base manifest must validate");
  if (!result.ok) {
    throw new Error(
      (result as { errors: readonly string[] }).errors.join("; ")
    );
  }
  return result.manifest;
}

const READ_AND_EXECUTE: PluginPermission[] = [
  "repository.read",
  "tool.execute",
];
const ALL_PERMISSIONS: PluginPermission[] = [
  "repository.read",
  "repository.write",
  "tool.execute",
];

function makeInstallation(
  overrides: Partial<PluginInstallation> = {}
): PluginInstallation {
  return {
    authorizedAt: "2026-01-01T00:00:00.000Z",
    configuration: {},
    configuredAt: "2026-01-01T00:00:00.000Z",
    connectorProvider: "github",
    disabledAt: null,
    grantedPermissions: ALL_PERMISSIONS,
    installedAt: "2026-01-01T00:00:00.000Z",
    lastError: null,
    pluginId: "test-plugin",
    pluginVersion: "1.0.0",
    state: "authorized",
    userId: "user-a",
    workspaceId: null,
    ...overrides,
  };
}

const readyFacts: EnvironmentFacts = {
  connectorActive: true,
  grantedScopes: new Set(["repo"]),
  hasConfiguration: true,
  presentSecretEnvNames: new Set(["GITHUB_CLIENT_ID"]),
};

let passed = 0;
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ok  ${name}`);
    });
}

async function main() {
  console.log("Idealy plugin engine tests");

  // ─── Manifest validation ────────────────────────────────────────────────
  await check("rejects a tool permission that was never requested", () => {
    const result = parsePluginManifest({
      ...baseManifestInput,
      requestedPermissions: ["tool.execute"],
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join(" "), /not in requestedPermissions/);
  });

  await check("rejects a tool with no declared permission", () => {
    const result = parsePluginManifest({
      ...baseManifestInput,
      tools: [{ ...baseManifestInput.tools[0], permissions: [] }],
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join(" "), /at least one permission/);
  });

  await check("rejects duplicate tool ids", () => {
    const result = parsePluginManifest({
      ...baseManifestInput,
      tools: [baseManifestInput.tools[0], baseManifestInput.tools[0]],
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join(" "), /duplicate id/);
  });

  await check("rejects an unknown permission string", () => {
    const result = parsePluginManifest({
      ...baseManifestInput,
      requestedPermissions: ["root.access"],
    });
    assert.equal(result.ok, false);
    assert.match(result.errors.join(" "), /subset of PLUGIN_PERMISSIONS/);
  });

  // ─── Permission gate ──────────────────────────────────────────────────
  const manifest = makeManifest();

  await check("denies a tool whose permission was not granted", () => {
    const result = authorizeToolExecution({
      confirmed: true,
      grantedPermissions: READ_AND_EXECUTE,
      installation: makeInstallation(),
      installedPluginIds: new Set(["test-plugin"]),
      manifest,
      toolId: "create-branch",
      userPlan: "free",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, "PERMISSION_NOT_GRANTED");
      assert.deepEqual(result.missingPermissions, ["repository.write"]);
    }
  });

  await check("denies a write tool without explicit confirmation", () => {
    const result = authorizeToolExecution({
      confirmed: false,
      grantedPermissions: ALL_PERMISSIONS,
      installation: makeInstallation(),
      installedPluginIds: new Set(["test-plugin"]),
      manifest,
      toolId: "create-branch",
      userPlan: "free",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, "CONFIRMATION_REQUIRED");
    }
  });

  await check("allows a granted, unconfirmed read tool", () => {
    const result = authorizeToolExecution({
      confirmed: false,
      grantedPermissions: ALL_PERMISSIONS,
      installation: makeInstallation(),
      installedPluginIds: new Set(["test-plugin"]),
      manifest,
      toolId: "read-repository",
      userPlan: "free",
    });
    assert.equal(result.allowed, true);
  });

  await check("denies an uninstalled plugin", () => {
    const result = authorizeToolExecution({
      confirmed: true,
      grantedPermissions: ALL_PERMISSIONS,
      installation: null,
      installedPluginIds: new Set(),
      manifest,
      toolId: "read-repository",
      userPlan: "pro",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, "PLUGIN_NOT_AVAILABLE");
    }
  });

  await check("denies a disabled plugin", () => {
    const result = authorizeToolExecution({
      confirmed: true,
      grantedPermissions: ALL_PERMISSIONS,
      installation: makeInstallation({ state: "disabled" }),
      installedPluginIds: new Set(["test-plugin"]),
      manifest,
      toolId: "read-repository",
      userPlan: "pro",
    });
    assert.equal(result.allowed, false);
  });

  await check("denies an unknown tool id", () => {
    const result = authorizeToolExecution({
      confirmed: true,
      grantedPermissions: ALL_PERMISSIONS,
      installation: makeInstallation(),
      installedPluginIds: new Set(["test-plugin"]),
      manifest,
      toolId: "not-a-tool",
      userPlan: "pro",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, "TOOL_NOT_FOUND");
    }
  });

  await check("denies a plan below the plugin minimum", () => {
    const proManifest = parsePluginManifest({
      ...baseManifestInput,
      minimumPlan: "pro",
    });
    assert.equal(proManifest.ok, true);
    if (!proManifest.ok) {
      return;
    }
    const result = authorizeToolExecution({
      confirmed: true,
      grantedPermissions: ALL_PERMISSIONS,
      installation: makeInstallation(),
      installedPluginIds: new Set(["test-plugin"]),
      manifest: proManifest.manifest,
      toolId: "read-repository",
      userPlan: "free",
    });
    assert.equal(result.allowed, false);
    if (!result.allowed) {
      assert.equal(result.code, "PLAN_INSUFFICIENT");
    }
  });

  await check("checkPlanMinimum ranks free < pro < business", () => {
    assert.equal(
      checkPlanMinimum({ minimumPlan: "pro", userPlan: "free" }).allowed,
      false
    );
    assert.equal(
      checkPlanMinimum({ minimumPlan: "pro", userPlan: "pro" }).allowed,
      true
    );
    assert.equal(
      checkPlanMinimum({ minimumPlan: "pro", userPlan: "business" }).allowed,
      true
    );
  });

  // ─── Grantable permissions ────────────────────────────────────────────
  await check("grants only the intersection with the manifest request", () => {
    const result = resolveGrantablePermissions({
      manifest,
      requested: ["repository.read", "deployment.execute", "tool.execute"],
    });
    assert.deepEqual(
      result.toSorted((a, b) => a.localeCompare(b)),
      ["repository.read", "tool.execute"]
    );
  });

  await check(
    "drops unknown permission strings instead of storing them",
    () => {
      const result = resolveGrantablePermissions({
        manifest,
        requested: ["repository.read", "root.access", 42, null],
      });
      assert.deepEqual(result, ["repository.read"]);
    }
  );

  // ─── Requirements / lifecycle projection ──────────────────────────────
  await check(
    "reports a missing server secret as configuration required",
    () => {
      const missing = missingRequirements({
        facts: { ...readyFacts, presentSecretEnvNames: new Set() },
        manifest,
      });
      assert.ok(missing.includes("server_secret:GITHUB_CLIENT_ID"));
    }
  );

  await check("reports a missing scope rather than claiming authorized", () => {
    const missing = missingRequirements({
      facts: { ...readyFacts, grantedScopes: new Set() },
      manifest,
    });
    assert.ok(missing.includes("scope:repo"));
  });

  await check("reports nothing missing when fully configured", () => {
    assert.deepEqual(missingRequirements({ facts: readyFacts, manifest }), []);
  });

  await check("never projects an uninstalled plugin as available", () => {
    const view = toPublicPlugin({
      facts: readyFacts,
      installation: null,
      manifest,
      userPlan: "pro",
    });
    assert.equal(view.installed, false);
    assert.equal(view.available, false);
    assert.equal(view.configurationRequired, true);
  });

  await check(
    "never projects a plugin with a missing secret as available",
    () => {
      const view = toPublicPlugin({
        facts: { ...readyFacts, presentSecretEnvNames: new Set() },
        installation: makeInstallation(),
        manifest,
        userPlan: "pro",
      });
      assert.equal(view.available, false);
      assert.ok(view.missingRequirements.length > 0);
    }
  );

  await check("projects a fully configured plugin as available", () => {
    const view = toPublicPlugin({
      facts: readyFacts,
      installation: makeInstallation(),
      manifest,
      userPlan: "pro",
    });
    assert.equal(view.available, true);
    assert.equal(view.configurationRequired, false);
  });

  await check(
    "managed Supabase and Stripe plugins do not request user OAuth grants",
    () => {
      for (const pluginId of ["supabase", "stripe"]) {
        const managed = PLUGIN_MANIFESTS.find((item) => item.id === pluginId);
        assert.ok(managed, `${pluginId} manifest must exist`);
        assert.equal(managed.requirements.connectorProvider, undefined);
        assert.deepEqual(managed.requirements.requiredScopes, []);
        assert.deepEqual(
          missingRequirements({
            facts: {
              connectorActive: false,
              grantedScopes: new Set(),
              hasConfiguration: true,
              presentSecretEnvNames: new Set(),
            },
            manifest: managed,
          }),
          []
        );
      }
    }
  );

  await check(
    "marks an insufficient plan as requiring action",
    () => {
      const proManifest = parsePluginManifest({
        ...baseManifestInput,
        minimumPlan: "pro",
      });
      assert.equal(proManifest.ok, true);
      if (!proManifest.ok) {
        return;
      }
      const view = toPublicPlugin({
        facts: readyFacts,
        installation: makeInstallation(),
        manifest: proManifest.manifest,
        userPlan: "free",
      });
      assert.equal(view.available, false);
      assert.equal(view.configurationRequired, true);
      assert.ok(view.missingRequirements.includes("plan"));
    }
  );

  await check(
    "accepts GitHub's existing broader user scope for read:user",
    () => {
      const githubManifest = PLUGIN_MANIFESTS.find((item) => item.id === "github");
      assert.ok(githubManifest, "GitHub manifest must exist");
      const lacking = missingRequirements({
        facts: {
          connectorActive: true,
          grantedScopes: new Set(["repo", "user"]),
          hasConfiguration: true,
          presentSecretEnvNames: new Set(["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"]),
        },
        manifest: githubManifest,
      });
      assert.deepEqual(lacking, []);
    }
  );

  // ─── Registry ─────────────────────────────────────────────────────────
  await check("registry builds from every connector in the catalog", () => {
    assert.equal(pluginRegistry.list().length, PLUGIN_MANIFESTS.length);
    assert.ok(pluginRegistry.list().length >= 9);
  });

  await check("registry rejects a duplicate plugin id", () => {
    assert.throws(
      () => createPluginRegistry([manifest, manifest]),
      /Duplicate plugin id/
    );
  });

  await check("registry resolves dependency install order", () => {
    const base = parsePluginManifest({
      ...baseManifestInput,
      id: "base-plugin",
      name: "Base",
    });
    const dependent = parsePluginManifest({
      ...baseManifestInput,
      dependencies: ["base-plugin"],
      id: "dependent-plugin",
      name: "Dependent",
    });
    assert.equal(base.ok, true);
    assert.equal(dependent.ok, true);
    if (!base.ok || !dependent.ok) {
      return;
    }
    const registry = createPluginRegistry([dependent.manifest, base.manifest]);
    const order = registry.resolveInstallOrder(["dependent-plugin"]);
    assert.equal(order.ok, true);
    assert.deepEqual(order.order, ["base-plugin", "dependent-plugin"]);
  });

  await check("registry detects a dependency cycle", () => {
    const a = parsePluginManifest({
      ...baseManifestInput,
      dependencies: ["cycle-b"],
      id: "cycle-a",
    });
    const b = parsePluginManifest({
      ...baseManifestInput,
      dependencies: ["cycle-a"],
      id: "cycle-b",
    });
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    if (!a.ok || !b.ok) {
      return;
    }
    const order = createPluginRegistry([
      a.manifest,
      b.manifest,
    ]).resolveInstallOrder(["cycle-a"]);
    assert.equal(order.ok, false);
    assert.match(order.errors.join(" "), /cycle/);
  });

  await check("registry refuses an unknown plugin id", () => {
    const order = pluginRegistry.resolveInstallOrder(["does-not-exist"]);
    assert.equal(order.ok, false);
  });
  // ─── Failure classification & retry ───────────────────────────────────
  await check("classifies the failure families distinctly", () => {
    assert.equal(classifyFailure(new Error("Request timed out")), "timeout");
    assert.equal(classifyFailure(new Error("429 rate limit")), "rate_limit");
    assert.equal(classifyFailure(new Error("fetch failed")), "network");
    assert.equal(classifyFailure(new Error("403 forbidden")), "permission");
    assert.equal(
      classifyFailure(new Error("invalid payload")),
      "invalid_input"
    );
    assert.equal(
      classifyFailure(new Error("upstream 502")),
      "provider_failure"
    );
    assert.equal(
      classifyFailure(new Error("assertion failed")),
      "logical_failure"
    );
  });

  await check("retries only transient failures", () => {
    assert.equal(
      decideRetry({ attempt: 1, failureClass: "timeout" }).retry,
      true
    );
    assert.equal(
      decideRetry({ attempt: 1, failureClass: "rate_limit" }).retry,
      true
    );
    assert.equal(
      decideRetry({ attempt: 1, failureClass: "permission" }).retry,
      false
    );
    assert.equal(
      decideRetry({ attempt: 1, failureClass: "invalid_input" }).retry,
      false
    );
  });

  await check("never retries beyond the attempt budget", () => {
    const decision = decideRetry({ attempt: 3, failureClass: "timeout" });
    assert.equal(decision.retry, false);
    if (!decision.retry) {
      assert.match(decision.reason, /exhausted/);
    }
  });

  await check("honours a longer provider retry-after on rate limits", () => {
    const decision = decideRetry({
      attempt: 1,
      failureClass: "rate_limit",
      retryAfterMs: 9000,
    });
    assert.equal(decision.retry, true);
    if (decision.retry) {
      assert.equal(decision.delayMs, 9000);
    }
  });

  // ─── Execution pipeline ───────────────────────────────────────────────
  const baseContext = {
    actorUserId: "user-a",
    confirmed: false,
    grantedPermissions: ALL_PERMISSIONS,
    installation: makeInstallation(),
    installedPluginIds: new Set(["test-plugin"]),
    missionId: "mission-1",
    pluginId: "test-plugin",
    pluginVersion: "1.0.0",
    taskId: "task-1",
    toolId: "read-repository",
    userPlan: "free" as const,
    workspaceId: null,
  };

  await check(
    "never calls the provider when permission is denied",
    async () => {
      let called = false;
      const outcome = await executePluginTool({
        context: {
          ...baseContext,
          grantedPermissions: ["tool.execute" as PluginPermission],
        },
        executionId: "exec-denied",
        input: { repo: "idealy" },
        manifest,
        provider: () => {
          called = true;
          return Promise.resolve({ ok: true });
        },
      });
      assert.equal(outcome.ok, false);
      assert.equal(called, false, "provider must not be reached");
      assert.equal(outcome.execution.status, "denied");
      assert.equal(outcome.execution.errorCode, "PERMISSION_NOT_GRANTED");
    }
  );

  await check("returns the real provider output on success", async () => {
    const outcome = await executePluginTool({
      context: baseContext,
      executionId: "exec-ok",
      input: { repo: "idealy" },
      manifest,
      provider: async () => ({ stars: 42 }),
    });
    assert.equal(outcome.ok, true);
    assert.deepEqual(outcome.output, { stars: 42 });
    assert.equal(outcome.execution.status, "succeeded");
  });

  await check(
    "records a genuine failure instead of a fake success",
    async () => {
      const outcome = await executePluginTool({
        context: baseContext,
        executionId: "exec-fail",
        input: {},
        manifest,
        provider: () => Promise.reject(new Error("403 forbidden")),
      });
      assert.equal(outcome.ok, false);
      assert.equal(outcome.execution.status, "failed");
      assert.equal(outcome.execution.errorCode, "permission");
      assert.equal(
        outcome.execution.attempts,
        1,
        "permission errors are not retried"
      );
    }
  );

  await check("retries a transient failure and can then succeed", async () => {
    let attempts = 0;
    const outcome = await executePluginTool({
      context: baseContext,
      executionId: "exec-retry",
      input: {},
      manifest,
      provider: () => {
        attempts += 1;
        if (attempts < 2) {
          return Promise.reject(new Error("fetch failed"));
        }
        return Promise.resolve({ recovered: true });
      },
    });
    assert.equal(outcome.ok, true);
    assert.equal(attempts, 2);
    assert.equal(outcome.execution.attempts, 2);
  });

  console.log(`\n${passed} plugin engine assertions passed.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
