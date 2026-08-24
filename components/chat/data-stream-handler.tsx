"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { getChatHistoryPaginationKey } from "./sidebar-history";
import type { MissionFileEvent } from "@/lib/idealy/mission-files";
import { mergeMissionFileEvent } from "@/lib/idealy/mission-files";

export function DataStreamHandler() {
  const { dataStream, setDataStream } = useDataStream();
  const { mutate } = useSWRConfig();

  const { artifact, setArtifact, setMetadata } = useArtifact();

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
