"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import type { MissionFile, MissionFileEvent } from "@/lib/idealy/mission-files";
import { mergeMissionFileEvent } from "@/lib/idealy/mission-files";

type MissionReplayResponse = {
  events: Array<{
    created_at: string;
    event_type: MissionFileEvent["eventType"];
    file_version: number | null;
    mission_id: string;
    path: string | null;
    payload: Record<string, unknown>;
    sequence: number;
  }>;
  files: Array<{
    checksum: string | null;
    content: string;
    id: string;
    language: string | null;
    mission_id: string;
    path: string;
    status: MissionFile["status"];
    updated_at: string;
    version: number;
  }>;
  lastSequence: number;
};

function mergeWorkspaceSnapshot(
  currentFiles: MissionFile[],
  incomingFiles: MissionReplayResponse["files"]
) {
  const files = new Map(
    currentFiles.map((file) => [`${file.missionId}:${file.path}:${file.version}`, file])
  );

  for (const file of incomingFiles) {
    const key = `${file.mission_id}:${file.path}:${file.version}`;
    const existing = files.get(key);
    files.set(key, {
      ...(existing ?? {}),
      checksum: file.checksum ?? undefined,
      content: file.content,
      id: file.id,
      language: file.language ?? undefined,
      missionId: file.mission_id,
      path: file.path,
      status: file.status,
      updatedAt: file.updated_at,
      version: file.version,
    });
  }

  return [...files.values()];
}

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  const { artifact, metadata, setArtifact, setMetadata } = useArtifact();

  const missionId =
    typeof metadata?.missionId === "string" ? metadata.missionId : null;
  const lastSequence = Number(metadata?.missionFileLastSequence ?? 0);

  useEffect(() => {
    if (!missionId || !Number.isSafeInteger(lastSequence) || lastSequence < 0) {
      return;
    }

    const controller = new AbortController();
    const hydrateWorkspace = async () => {
      try {
        const response = await fetch(
          `/api/idealy/missions/${missionId}/events?afterSequence=${lastSequence}`,
          { cache: "no-store", signal: controller.signal }
        );
        if (!response.ok) return;
        const replay = (await response.json()) as MissionReplayResponse;
        if (controller.signal.aborted || !Array.isArray(replay.events) || !Array.isArray(replay.files)) {
          return;
        }

        setMetadata((current: Record<string, unknown> | null) => {
          const currentLastSequence = Number(current?.missionFileLastSequence ?? 0);
          const currentFiles = Array.isArray(current?.missionFiles)
            ? (current.missionFiles as MissionFile[])
            : [];
          const mergedEvents = replay.events.reduce(
            (state, event) =>
              mergeMissionFileEvent(state, {
                eventType: event.event_type,
                missionId: event.mission_id,
                path: event.path ?? undefined,
                payload: event.payload,
                sequence: event.sequence,
              }),
            { files: currentFiles, lastSequence: currentLastSequence }
          );
          const missionFiles = mergeWorkspaceSnapshot(mergedEvents.files, replay.files);
          const nextLastSequence = Math.max(
            mergedEvents.lastSequence,
            Number.isSafeInteger(replay.lastSequence) ? replay.lastSequence : 0
          );

          if (
            nextLastSequence === currentLastSequence &&
            missionFiles.length === currentFiles.length
          ) {
            return current;
          }

          return {
            ...(current ?? {}),
            missionFileLastSequence: nextLastSequence,
            missionFiles,
          };
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.warn("Workspace event replay unavailable", error);
        }
      }
    };

    void hydrateWorkspace();
    return () => controller.abort();
  }, [lastSequence, missionId, setMetadata]);

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice();
    setDataStream([]);

    for (const delta of newDeltas) {
      if (delta.type === "data-chat-title") {
        mutate(unstable_serialize(getChatHistoryPaginationKey));
        continue;
      }

      if (delta.type === "data-idealy-file-event") {
        setMetadata((current: Record<string, unknown> | null) => {
          const merged = mergeMissionFileEvent(
            {
              files: Array.isArray(current?.missionFiles) ? current.missionFiles : [],
              lastSequence: Number(current?.missionFileLastSequence ?? 0),
            },
            delta.data
          );
          return {
            ...(current ?? {}),
            missionFileLastSequence: merged.lastSequence,
            missionFileStatus: delta.data.eventType,
            missionFiles: merged.files,
          };
        });
        continue;
      }

      if (
        delta.type === "data-idealy-intent" ||
        delta.type === "data-idealy-mission" ||
        delta.type === "data-idealy-plan"
      ) {
        setMetadata((current: Record<string, unknown> | null) => ({
          ...(current ?? {}),
          ...(delta.type === "data-idealy-intent"
            ? { intentCategory: delta.data }
            : delta.type === "data-idealy-mission"
              ? { missionId: delta.data }
              : { missionPlan: delta.data }),
        }));
        continue;
      }
      const streamKind =
        delta.type === "data-kind" && typeof delta.data === "string"
          ? delta.data
          : artifact.kind;
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === streamKind
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          setArtifact,
          setMetadata,
          streamPart: delta,
        });
      }

      setArtifact((draftArtifact) => {
        if (!draftArtifact) {
          return { ...initialArtifactData, status: "streaming" };
        }

        switch (delta.type) {
          case "data-id":
            return {
              ...draftArtifact,
              documentId: delta.data,
              status: "streaming",
            };

          case "data-title":
            return {
              ...draftArtifact,
              status: "streaming",
              title: delta.data,
            };

          case "data-kind":
            return {
              ...draftArtifact,
              kind: delta.data,
              status: "streaming",
            };

          case "data-clear":
            return {
              ...draftArtifact,
              content: "",
              status: "streaming",
            };

          case "data-codeDelta": {
            const content = typeof delta.data === "string" ? delta.data : "";
            return {
              ...draftArtifact,
              content,
              isVisible: content.length >= 240 ? true : draftArtifact.isVisible,
              status: "streaming",
            };
          }

          case "data-preview":
            return {
              ...draftArtifact,
              preview: typeof delta.data === "string" ? delta.data : "",
              status: "streaming",
            };

          case "data-finish":
            return {
              ...draftArtifact,
              status: "idle",
            };

          default:
            return draftArtifact;
        }
      });
    }
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream, mutate]);

  return null;
}
