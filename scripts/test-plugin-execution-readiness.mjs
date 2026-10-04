import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [route, registry, oauth, service] = await Promise.all([
  readFile("app/api/idealy/plugins/[pluginId]/execute/route.ts", "utf8"),
  readFile("lib/idealy/plugins/registry.ts", "utf8"),
  readFile("supabase/functions/integration-connect/index.ts", "utf8"),
  readFile("lib/idealy/plugins/service.ts", "utf8"),
]);

const planCheck = route.indexOf("getVerifiedUserPlan({ accessToken })");
const readinessCheck = route.indexOf("describePlugins({", planCheck);
const permissionCheck = route.indexOf("authorizeToolExecution({", readinessCheck);
assert.ok(planCheck >= 0 && readinessCheck > planCheck && permissionCheck > readinessCheck);
assert.match(route, /describePlugins\(\{[\s\S]*?installations,[\s\S]*?plan,/);
assert.match(route, /if \(!readiness\?\.available\)[\s\S]*?PLUGIN_NOT_AVAILABLE[\s\S]*?409/);
assert.match(registry, /requiredScope === "read:user" && grantedScopes\.has\("user"\)/);
assert.match(oauth, /scope: "repo read:user"/);
assert.match(service, /user_integrations\?select=provider,scopes,status&provider=in\.\(/);
assert.match(service, /if \(error \|\| !data\)[\s\S]*?Connector authorization could not be verified/);
assert.match(service, /if \(connectorResult\.error\) \{[\s\S]*?return \{ error: connectorResult\.error, plugins: \[\] \}/);

console.log("Plugin execution readiness contract passed.");
