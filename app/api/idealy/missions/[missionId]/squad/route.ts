import { createClient } from "@supabase/supabase-js";
import { getToken } from "next-auth/jwt";
import { auth } from "@/app/(auth)/auth";
import { isDevelopmentEnvironment } from "@/lib/constants";
import { getIdealySupabaseFunctionUrl } from "@/lib/idealy/config";
import {
  commitFreeGeneration,
  refundFreeGeneration,
  reserveFreeGeneration,
} from "@/lib/idealy/free-quota";
import {
  runWorkspaceBuildInSandbox,
  type WorkspaceBuildResult,
} from "@/lib/idealy/runtime/e2b";

export const maxDuration = 300;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonRecord
    : {};
}

function boundedMessage(value: string | undefined, fallback: string): string {
  const message = value?.trim() || fallback;
  return message.length > 1200 ? message.slice(0, 1200) : message;
}

function buildDiagnostic(report: WorkspaceBuildResult) {
  return {
    evidence: report.stderr || report.stdout || report.error || report.status,
    expectedBehavior: "npm install and npm run build must both exit successfully, and dist/index.html must exist.",
    file: "package.json",
    location: "scripts.build",
    problem: boundedMessage(report.error, "The project build did not complete successfully."),
    severity: "critical",
    suggestedCorrection:
      "Fix the missing build script, dependencies, or compiler errors, then rerun the mission build.",
  };
}

async function persistBuildVerification({
  idempotencyKey,
  missionId,
  supabaseUserId,
  report,
  validation,
}: {
  idempotencyKey: string;
  missionId: string;
  supabaseUserId: string;
  report: WorkspaceBuildResult;
  validation: JsonRecord;
}): Promise<{
  persisted: boolean;
  error?: string;
  finalStatus?: string;
  validation?: JsonRecord;
}> {
  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ""
  ).trim().replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      persisted: false,
      error: "Server-side Supabase admin configuration is unavailable.",
    };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: mission, error: missionError } = await admin
    .from("missions")
    .select("id")
    .eq("id", missionId)
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  if (missionError || !mission) {
    return {
      persisted: false,
      error: "The mission owner could not be verified for build validation.",
    };
  }

  const finalStatus = report.status === "passed" ? "ready" : "needs-fix";
  const validationRecord = {
    ...validation,
    ...(report.status === "passed"
      ? {}
      : {
          errors: [
            ...(Array.isArray(validation.errors) ? validation.errors : []),
            buildDiagnostic(report),
          ],
          status: "needs-fix",
        }),
    buildVerification: report,
  };

  const { error: updateError } = await admin
    .from("missions")
    .update({ status: finalStatus, validation: validationRecord })
    .eq("id", missionId)
    .eq("user_id", supabaseUserId);

  if (updateError) {
    return {
      persisted: false,
      error: "The build result could not be saved to the mission.",
      finalStatus: "needs-fix" as const,
      validation: {
        ...validationRecord,
        errors: [
          ...(Array.isArray(validationRecord.errors) ? validationRecord.errors : []),
          {
            evidence: updateError.message,
            expectedBehavior: "The verified build result must be persisted.",
            file: "missions.validation",
            location: "Supabase",
            problem: "The final build state could not be saved.",
            severity: "critical",
            suggestedCorrection: "Retry the mission after the database write issue is resolved.",
          },
        ],
        status: "needs-fix",
      },
    };
  }

  const appendEvent = async (
    eventType: "build_log" | "validation_result" | "mission_completed",
    suffix: string,
    payload: JsonRecord,
  ) => {
    const { error } = await admin.rpc("append_mission_file_event", {
      p_event_type: eventType,
      p_file_version: null,
      p_idempotency_key: (idempotencyKey + ":" + suffix).slice(0, 180),
      p_mission_id: missionId,
      p_path: null,
      p_payload: payload,
    });
    if (error) {
      console.warn("Mission build event persistence failed.", {
        eventType,
        missionId,
      });
    }
  };

  await appendEvent("build_log", "build-result", {
    buildStatus: report.status,
    durationMs: report.durationMs,
    level: report.status === "passed" ? "info" : "error",
    message:
      report.status === "passed"
        ? "La compilation réelle (npm install + npm run build) a réussi."
        : boundedMessage(report.error, "La compilation réelle n’a pas abouti."),
    stderr: report.stderr,
    stdout: report.stdout,
  });
  await appendEvent("validation_result", "build-validation", validationRecord);
  await appendEvent("mission_completed", "build-final", {
    buildVerificationStatus: report.status,
    finalStatus,
    runKey: idempotencyKey,
    source: "post-squad-build-verification",
    validationStatus: report.status === "passed" ? "passed" : "needs-fix",
  });

  return {
    persisted: true,
    finalStatus,
    validation: validationRecord,
  };
}

async function verifyMissionBuild({
  idempotencyKey,
  missionId,
  supabaseUserId,
  validation,
}: {
  idempotencyKey: string;
  missionId: string;
  supabaseUserId: string;
  validation: JsonRecord;
}): Promise<{
  report: WorkspaceBuildResult;
  persisted: boolean;
  finalStatus: string;
  validation: JsonRecord;
}> {
  const failedReport = (error: string): WorkspaceBuildResult => ({
    durationMs: 0,
    error,
    stderr: "",
    status: "failed",
    stdout: "",
  });

  const supabaseUrl = (
    process.env.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    ""
  ).trim().replace(/\/+$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    const report = failedReport(
      "Server-side Supabase admin configuration is unavailable; the build was not verified.",
    );
    return {
      report,
      persisted: false,
      finalStatus: "needs-fix",
      validation: {
        ...validation,
        buildVerification: report,
        errors: [
          ...(Array.isArray(validation.errors) ? validation.errors : []),
          buildDiagnostic(report),
        ],
        status: "needs-fix",
      },
    };
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: mission, error: missionError } = await admin
    .from("missions")
    .select("id")
    .eq("id", missionId)
    .eq("user_id", supabaseUserId)
    .maybeSingle();

  if (missionError || !mission) {
    const report = failedReport(
      "The mission owner could not be verified; no build was run.",
    );
    return {
      report,
      persisted: false,
      finalStatus: "needs-fix",
      validation: {
        ...validation,
        buildVerification: report,
        errors: [
          ...(Array.isArray(validation.errors) ? validation.errors : []),
          buildDiagnostic(report),
        ],
        status: "needs-fix",
      },
    };
  }

  const { data: files, error: filesError } = await admin
    .from("mission_files")
    .select("path,content")
    .eq("mission_id", missionId)
    .eq("status", "saved")
    .order("path", { ascending: true })
    .limit(500);

  let report: WorkspaceBuildResult;
  const pendingValidation = {
    ...validation,
    buildVerification: {
      startedAt: new Date().toISOString(),
      status: "building",
    },
    status: "building",
  };
  const { error: markBuildingError } = await admin
    .from("missions")
    .update({ status: "building", validation: pendingValidation })
    .eq("id", missionId)
    .eq("user_id", supabaseUserId);

  if (markBuildingError) {
    const report = failedReport("The mission could not enter its real build-verification state.");
    const failedValidation = {
      ...pendingValidation,
      buildVerification: report,
      errors: [
        ...(Array.isArray(validation.errors) ? validation.errors : []),
        buildDiagnostic(report),
      ],
      status: "needs-fix",
    };
    await admin
      .from("missions")
      .update({ status: "needs-fix", validation: failedValidation })
      .eq("id", missionId)
      .eq("user_id", supabaseUserId);
    return {
      report,
      persisted: false,
      finalStatus: "needs-fix",
      validation: failedValidation,
    };
  }

  const { error: buildStartedEventError } = await admin.rpc("append_mission_file_event", {
    p_event_type: "build_log",
    p_file_version: null,
    p_idempotency_key: (idempotencyKey + ":build-started").slice(0, 180),
    p_mission_id: missionId,
    p_path: null,
    p_payload: {
      level: "info",
      message: "Compilation réelle en sandbox : npm install puis npm run build.",
      status: "building",
    },
  });
  if (buildStartedEventError) {
    console.warn("Mission build-start event persistence failed.", { missionId });
  }

  if (filesError || !files) {
    report = failedReport("Saved workspace files could not be loaded for compilation.");
  } else {
    try {
      report = await runWorkspaceBuildInSandbox(
        files.map((item) => ({ path: item.path, content: item.content })),
      );
    } catch (error: unknown) {
      report = failedReport(
        error instanceof Error ? error.message : "Workspace build execution failed.",
      );
    }
  }

  const persisted = await persistBuildVerification({
    idempotencyKey,
    missionId,
    supabaseUserId,
    report,
    validation,
  });
  const combinedValidation = persisted.validation ?? {
    ...validation,
    ...(report.status === "passed"
      ? {}
      : {
          errors: [
            ...(Array.isArray(validation.errors) ? validation.errors : []),
            buildDiagnostic(report),
          ],
          status: "needs-fix",
        }),
    buildVerification: report,
  };

  return {
    report,
    persisted: persisted.persisted,
    finalStatus:
      persisted.finalStatus ??
      (persisted.persisted && report.status === "passed" ? "ready" : "needs-fix"),
    validation: combinedValidation,
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ missionId: string }> },
) {
  const { missionId } = await params;
  const [session, token] = await Promise.all([
    auth(),
    getToken({
      req: request,
      secret: process.env.AUTH_SECRET,
      secureCookie: !isDevelopmentEnvironment,
    }),
  ]);

  const supabaseAccessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;
  const supabaseUserId =
    typeof token?.supabaseUserId === "string"
      ? token.supabaseUserId
      : null;
  const userId = session?.user?.id ?? (typeof token?.sub === "string" ? token.sub : null);

  if (!supabaseAccessToken || !userId) {
    return Response.json(
      { error: "Une session Idealy authentifiée est requise." },
      { status: 401 }
    );
  }

  const input = (await request.json().catch(() => null)) as {
    idempotencyKey?: unknown;
  } | null;
  if (!input || typeof input.idempotencyKey !== "string" || !input.idempotencyKey.trim()) {
    return Response.json(
      { error: "Une clé d’idempotence est requise pour lancer une mission." },
      { status: 400 }
    );
  }

  const quotaReservation = await reserveFreeGeneration({
    actionType: "mission_squad",
    idempotencyKey: input.idempotencyKey,
    userId,
  });

  if (!quotaReservation.allowed) {
    return Response.json(
      {
        code: "FREE_QUOTA_EXCEEDED",
        error: quotaReservation.message,
        quota: quotaReservation,
      },
      { status: 403 }
    );
  }

  let orchestratorSucceeded = false;
  let quotaCommitted = false;

  try {
    const response = await fetch(
      getIdealySupabaseFunctionUrl("orchestrate-mission"),
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + supabaseAccessToken,
          "Content-Type": "application/json",
          ...(process.env.SUPABASE_ANON_KEY
            ? { apikey: process.env.SUPABASE_ANON_KEY }
            : {}),
        },
        body: JSON.stringify({
          idempotencyKey: input.idempotencyKey,
          missionId,
        }),
      }
    );

    const responseText = await response.text();
    const responseHeaders = {
      "Cache-Control": "no-store",
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    };

    if (!response.ok) {
      await refundFreeGeneration({
        idempotencyKey: input.idempotencyKey,
        userId,
      });
      return new Response(responseText, {
        status: response.status,
        headers: responseHeaders,
      });
    }

    orchestratorSucceeded = true;
    await commitFreeGeneration({
      idempotencyKey: input.idempotencyKey,
      userId,
    });
    quotaCommitted = true;

    let payloadValue: unknown;
    try {
      payloadValue = JSON.parse(responseText);
    } catch {
      return Response.json(
        { error: "Le backend d’orchestration a renvoyé une réponse non vérifiable." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    const payload = asRecord(payloadValue);
    if (payload.missionId && payload.missionId !== missionId) {
      return Response.json(
        { error: "Le backend a renvoyé une mission différente de celle demandée." },
        { status: 502, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (payload.status !== "ready") {
      return Response.json(payload, { status: response.status, headers: responseHeaders });
    }

    if (!supabaseUserId) {
      const report: WorkspaceBuildResult = {
        durationMs: 0,
        error: "La session ne contient pas d’identifiant Supabase vérifiable.",
        stderr: "",
        status: "failed",
        stdout: "",
      };
      const validation = {
        ...asRecord(payload.validation),
        buildVerification: report,
        errors: [
          ...(Array.isArray(asRecord(payload.validation).errors)
            ? asRecord(payload.validation).errors as unknown[]
            : []),
          buildDiagnostic(report),
        ],
        status: "needs-fix",
      };
      return Response.json(
        { ...payload, status: "needs-fix", validation },
        { status: response.status, headers: responseHeaders },
      );
    }

    const buildResult = await verifyMissionBuild({
      idempotencyKey: input.idempotencyKey,
      missionId,
      supabaseUserId,
      validation: asRecord(payload.validation),
    });

    const finalStatus =
      buildResult.persisted && buildResult.report.status === "passed"
        ? "ready"
        : "needs-fix";

    return Response.json(
      {
        ...payload,
        buildVerification: buildResult.report,
        status: finalStatus,
        validation: {
          ...buildResult.validation,
          buildVerification: buildResult.report,
          status: finalStatus === "ready" ? "passed" : "needs-fix",
        },
      },
      { status: response.status, headers: responseHeaders },
    );
  } catch (error) {
    if (!quotaCommitted) {
      await refundFreeGeneration({
        idempotencyKey: input.idempotencyKey,
        userId,
      }).catch(() => undefined);
    }
    console.error("Mission squad proxy failed", error);
    return Response.json(
      {
        error: "L’escouade Idealy est momentanément indisponible.",
        ...(orchestratorSucceeded ? { generationWasCompleted: true } : {}),
      },
      { status: 502 }
    );
  }
}
