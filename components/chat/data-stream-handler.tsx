"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { unstable_serialize } from "swr/infinite";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import {
  readIdealyNotificationPreferences,
  sendIdealyDesktopNotification,
} from "@/lib/client-notifications";
import type { MissionFile, MissionFileEvent } from "@/lib/idealy/mission-files";
import { mergeMissionFileEvent } from "@/lib/idealy/mission-files";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";
import { getChatHistoryPaginationKey } from "./sidebar-history";

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
    currentFiles.map((file) => [
      `${file.missionId}:${file.path}:${file.version}`,
      file,
    ])
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
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  const { artifact, metadata, setArtifact, setMetadata } = useArtifact();

  const missionId =
    typeof metadata?.missionId === "string" ? metadata.missionId : null;
  const lastSequence = Number(metadata?.missionFileLastSequence ?? 0);
  const missionReplayNonce = Number(metadata?.missionReplayNonce ?? 0);
  const missionFiles = Array.isArray(metadata?.missionFiles)
    ? (metadata.missionFiles as MissionFile[])
    : [];

  useEffect(() => {
    if (!missionFiles.length) {
      return;
    }
    const firstSavedFile = missionFiles.find(
      (file) =>
        typeof file.content === "string" &&
        file.content.length > 0 &&
        (file.status === "saved" || file.status === "validated")
    );
    if (!firstSavedFile) {
      return;
    }

    setArtifact((current) => ({
      ...current,
      content: current.content || firstSavedFile.content || "",
      isVisible: true,
      kind: "code",
      status: "idle",
      title: current.title || "Mission workspace",
    }));
  }, [missionFiles, setArtifact]);

  useEffect(() => {
    if (
      isDemoMode ||
      !missionId ||
      !Number.isSafeInteger(lastSequence) ||
      lastSequence < 0
    ) {
      return;
    }

    const controller = new AbortController();
    const hydrateWorkspace = async () => {
      try {
        const response = await fetch(
          `/api/idealy/missions/${missionId}/events?afterSequence=${lastSequence}`,
          { cache: "no-store", signal: controller.signal }
        );
        if (!response.ok) {
          return;
        }
        const replay = (await response.json()) as MissionReplayResponse;
        if (
          controller.signal.aborted ||
          !Array.isArray(replay.events) ||
          !Array.isArray(replay.files)
        ) {
          return;
        }

        setMetadata((current: Record<string, unknown> | null) => {
          const currentLastSequence = Number(
            current?.missionFileLastSequence ?? 0
          );
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
          const missionFiles = mergeWorkspaceSnapshot(
            mergedEvents.files,
            replay.files
          );
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
  }, [isDemoMode, lastSequence, missionId, missionReplayNonce, setMetadata]);

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
        const eventFile = delta.data.file;
        const eventContent =
          eventFile && typeof eventFile.content === "string"
            ? eventFile.content
            : "";
        const hasCoherentFile =
          eventContent.length > 0 &&
          (delta.data.eventType === "file_content" ||
            delta.data.eventType === "file_saved");
        const eventType = String(delta.data.eventType);
        const payload =
          delta.data.payload && typeof delta.data.payload === "object"
            ? delta.data.payload as Record<string, unknown>
            : {};
        const isTerminalEvent =
          eventType === "mission_completed" ||
          eventType === "mission_error";
        const isPowerEvent =
          eventType === "power_reserved" ||
          eventType === "power_consumed" ||
          eventType === "power_released";
        const completionStatus = payload.finalStatus;
        const missionSucceeded =
          eventType === "mission_completed" && completionStatus === "ready";

        if (isTerminalEvent || isPowerEvent) {
          window.dispatchEvent(new Event("idealy:power-updated"));
        }
        if (isTerminalEvent && readIdealyNotificationPreferences().squad) {
          if (missionSucceeded) {
            toast.success("Mission terminée et validée", {
              description: "Les vérifications sont passées. Le workspace est prêt à être consulté.",
            });
            sendIdealyDesktopNotification(
              "Mission terminée et validée",
              "Les vérifications sont passées. Le workspace est prêt à être consulté."
            );
          } else if (eventType === "mission_completed") {
            const description =
              typeof payload.validationStatus === "string" &&
              payload.validationStatus === "needs-user-input"
                ? "Le cycle est terminé, mais une décision ou une correction reste nécessaire."
                : "Le cycle est terminé sans validation complète. Consultez le rapport du Reviewer.";
            toast.warning("Mission terminée — validation requise", { description });
            sendIdealyDesktopNotification("Mission terminée — validation requise", description);
          } else {
            toast.error("La mission a rencontré un problème", {
              description: "Ouvrez le chat pour consulter l’état et réessayer.",
            });
            sendIdealyDesktopNotification(
              "La mission a rencontré un problème",
              "Ouvrez le chat Idealy pour consulter l’état et réessayer."
            );
          }
        }
        setArtifact((current) => ({
          ...current,
          content: eventContent || current.content,
          ...(hasCoherentFile
            ? {
                isVisible: true,
                kind: "code" as const,
                status: isTerminalEvent ? "idle" : "streaming",
                title: current.title || "Mission workspace",
              }
            : current.isVisible
              ? { status: isTerminalEvent ? "idle" : "streaming" }
              : {}),
        }));
        setMetadata((current: Record<string, unknown> | null) => {
          const merged = mergeMissionFileEvent(
            {
              files: Array.isArray(current?.missionFiles)
                ? current.missionFiles
                : [],
              lastSequence: Number(current?.missionFileLastSequence ?? 0),
            },
            delta.data
          );
          // Translate persisted mission events into workspace state. A completed
          // event is not necessarily a successful validation: finalStatus is the
          // backend's actual outcome and decides what the UI may claim.
          const eventType = String(delta.data.eventType);
          const eventPayload =
            delta.data.payload && typeof delta.data.payload === "object"
              ? delta.data.payload as Record<string, unknown>
              : {};
          let nextSquadStatus: string | undefined;
          let nextAgentName: string | null | undefined;
          let nextAgentRole: string | null | undefined;

          if (eventType === "mission_completed") {
            nextSquadStatus = "ready";
            if (
              eventPayload.finalStatus === "blocked" ||
              eventPayload.finalStatus === "needs-user-input"
            ) {
              nextSquadStatus = "needs-user-input";
            } else if (eventPayload.finalStatus && eventPayload.finalStatus !== "ready") {
              nextSquadStatus = "needs-fix";
            }
            nextAgentName = null;
            nextAgentRole = null;
          } else if (eventType === "mission_error") {
            nextSquadStatus = "needs-fix";
            nextAgentName = null;
            nextAgentRole = null;
          } else if (eventType === "auto_correction_started") {
            nextSquadStatus = "auto_correction_started";
            nextAgentName =
              typeof eventPayload.correctionOwner === "string"
                ? eventPayload.correctionOwner
                : undefined;
            nextAgentRole = "Correction des fichiers après revue";
          } else if (eventType === "agent_started") {
            nextSquadStatus =
              eventPayload.agent === "reviewer" ? "reviewing" : "building";
            nextAgentName =
              typeof eventPayload.agentName === "string"
                ? eventPayload.agentName
                : null;
            nextAgentRole =
              typeof eventPayload.agentRole === "string"
                ? eventPayload.agentRole
                : null;
          } else if (eventType === "agent_completed") {
            nextAgentName = null;
            nextAgentRole = null;
          } else if (eventType === "validation_result") {
            nextSquadStatus = "reviewing";
          } else if (
            eventType === "file_started" ||
            eventType === "file_content" ||
            eventType === "file_saved"
          ) {
            const currentSquad =
              typeof current?.missionSquadStatus === "string"
                ? current.missionSquadStatus
                : undefined;
            if (currentSquad !== "auto_correction_started") {
              nextSquadStatus = "building";
            }
          }
          return {
            ...(current ?? {}),
            missionFileLastSequence: merged.lastSequence,
            missionFileStatus: eventType,
            missionFiles: merged.files,
            ...(nextSquadStatus === undefined
              ? {}
              : { missionSquadStatus: nextSquadStatus }),
            ...(nextAgentName === undefined
              ? {}
              : { missionActiveAgentName: nextAgentName }),
            ...(nextAgentRole === undefined
              ? {}
              : { missionActiveAgentRole: nextAgentRole }),
          };
        });
        continue;
      }

      if (
        delta.type === "data-idealy-intent" ||
        delta.type === "data-idealy-mission" ||
        delta.type === "data-idealy-plan"
      ) {
        if (delta.type === "data-idealy-mission") {
          const nextMissionId =
            typeof delta.data === "string" ? delta.data : null;
          if (!nextMissionId) continue;

          // A new mission has its own file-event sequence, plan, agent status,
          // and artifact. Never let a previous mission's sequence/status hide
          // the files from this one.
          setArtifact({
            ...initialArtifactData,
            isVisible: false,
            kind: "code",
            title: "Mission workspace",
          });
          setMetadata((current: Record<string, unknown> | null) => {
            if (current?.missionId === nextMissionId) return current;
            return {
              ...(current ?? {}),
              missionId: nextMissionId,
              missionFileLastSequence: 0,
              missionFiles: [],
              missionFileStatus: null,
              missionPlan: null,
              missionReplayNonce: Number(current?.missionReplayNonce ?? 0) + 1,
              missionRunRequested: false,
              missionSquadError: null,
              missionSquadStatus: "planned",
              missionActiveAgentName: null,
              missionActiveAgentRole: null,
            };
          });
          continue;
        }

        if (delta.type === "data-idealy-plan") {
          const plan =
            delta.data && typeof delta.data === "object"
              ? delta.data as Record<string, unknown>
              : {};
          const projectKind =
            typeof plan.projectKind === "string" && plan.projectKind.trim()
              ? plan.projectKind.trim()
              : "Mission workspace";

          // Reveal the persisted plan in the workspace, but do not run the
          // squad until the user explicitly confirms the mission card.
          setArtifact((current) => ({
            ...current,
            isVisible: true,
            kind: "code",
            status: "idle",
            title: projectKind,
          }));
          setMetadata((current: Record<string, unknown> | null) => ({
            ...(current ?? {}),
            missionPlan: delta.data,
            missionSquadStatus: "planned",
            missionActiveAgentName: null,
            missionActiveAgentRole: null,
            missionSquadError: null,
            missionRunRequested: false,
          }));
          continue;
        }

        setMetadata((current: Record<string, unknown> | null) => ({
          ...(current ?? {}),
          intentCategory: delta.data,
        }));
        continue;
      }
      if (delta.type === "data-finish") {
        window.dispatchEvent(new Event("idealy:power-updated"));
        // Automatically activate live interactive preview once generation finishes
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent("idealy:set-view", { detail: "preview" })
          );
          window.dispatchEvent(new Event("idealy:refresh-preview"));
        }, 120);
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

          case "data-finish": {
            const hasGeneratedCode = Boolean(
              draftArtifact.content && draftArtifact.content.trim().length > 0
            );
            return {
              ...draftArtifact,
              isVisible: hasGeneratedCode ? true : draftArtifact.isVisible,
              status: "idle",
            };
          }

          default:
            return draftArtifact;
        }
      });
    }
  }, [dataStream, setArtifact, setMetadata, artifact, setDataStream, mutate]);

  return null;
}
