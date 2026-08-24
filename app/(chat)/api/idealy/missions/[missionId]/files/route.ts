import { getToken } from "next-auth/jwt";
import { isDevelopmentEnvironment } from "@/lib/constants";
import type { MissionFile, MissionFileEvent } from "@/lib/idealy/mission-files";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ missionId: string }> }
) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  const accessToken =
    typeof token?.supabaseAccessToken === "string"
      ? token.supabaseAccessToken
      : null;
  if (!accessToken) return jsonError("Supabase session required.", 401);

  const { missionId } = await context.params;
  if (!isUuid(missionId)) return jsonError("Invalid mission id.", 400);

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return jsonError("Supabase server configuration is incomplete.", 503);
  }

  const headers = {
    apikey: anonKey,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  const afterSequence = Number(
    new URL(request.url).searchParams.get("afterSequence") ?? "0"
  );
  const sequenceFilter = Number.isInteger(afterSequence) && afterSequence > 0
    ? `&sequence=gt.${afterSequence}`
    : "";

  const filesUrl = `${supabaseUrl}/rest/v1/mission_files?select=id,mission_id,path,content,language,version,status,checksum,updated_at&mission_id=eq.${missionId}&order=path.asc,version.desc&limit=500`;
  const eventsUrl = `${supabaseUrl}/rest/v1/mission_file_events?select=id,mission_id,sequence,event_type,path,file_version,payload,created_at&mission_id=eq.${missionId}${sequenceFilter}&order=sequence.asc&limit=500`;

  const [filesResponse, eventsResponse] = await Promise.all([
    fetch(filesUrl, { headers, cache: "no-store" }),
    fetch(eventsUrl, { headers, cache: "no-store" }),
  ]);
  if (!filesResponse.ok || !eventsResponse.ok) {
    const status = !filesResponse.ok ? filesResponse.status : eventsResponse.status;
    if (status === 404) return jsonError("Mission file workspace is not migrated yet.", 503);
    return jsonError("Unable to load mission files.", 502);
  }

  const rawFiles = (await filesResponse.json()) as Array<Record<string, unknown>>;
  const rawEvents = (await eventsResponse.json()) as Array<Record<string, unknown>>;
  const files: MissionFile[] = rawFiles.map((file) => ({
    checksum: typeof file.checksum === "string" ? file.checksum : undefined,
    content: typeof file.content === "string" ? file.content : undefined,
    id: typeof file.id === "string" ? file.id : undefined,
    language: typeof file.language === "string" ? file.language : undefined,
    missionId: String(file.mission_id),
    path: String(file.path),
    status: file.status as MissionFile["status"],
    updatedAt: typeof file.updated_at === "string" ? file.updated_at : undefined,
    version: Number(file.version),
  }));
  const events: MissionFileEvent[] = rawEvents.map((event) => ({
    eventType: event.event_type as MissionFileEvent["eventType"],
    missionId: String(event.mission_id),
    path: typeof event.path === "string" ? event.path : undefined,
    payload: event.payload && typeof event.payload === "object"
      ? event.payload as Record<string, unknown>
      : undefined,
    sequence: Number(event.sequence),
  }));
  const lastSequence = events.reduce(
    (highest, event) => Math.max(highest, Number(event.sequence) || 0),
    afterSequence
  );

  return Response.json({ events, files, lastSequence, missionId });
}
