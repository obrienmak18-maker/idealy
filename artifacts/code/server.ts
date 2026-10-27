import { streamText } from "ai";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { generateUUID } from "@/lib/utils";

function stripFences(code: string): string {
  return code
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({
    title,
    prompt: userPrompt,
    dataStream,
    modelId,
    id,
    files,
  }) => {
    let draftContent = "";

    // ─── Multi-file mode: emit each file as a mission file event ───────────
    if (files && files.length > 0) {
      const missionId = id || generateUUID();

      // Emit mission_started
      dataStream.write({
        data: {
          eventType: "mission_started",
          missionId,
          payload: { filesCount: files.length, title },
          sequence: 0,
        },
        transient: true,
        type: "data-idealy-file-event",
      });

      // Emit each file
      let sequence = 1;
      let primaryContent = "";

      for (const file of files) {
        if (file.type === "directory") {
          continue;
        }

        const fileData = {
          content: file.content,
          missionId,
          path: file.path,
          status: "validated" as const,
          version: 1,
        };

        // file_started
        sequence += 1;
        dataStream.write({
          data: {
            eventType: "file_started",
            file: { ...fileData, content: undefined },
            missionId,
            path: file.path,
            payload: {},
            sequence,
          },
          transient: true,
          type: "data-idealy-file-event",
        });

        // file_content (with actual content)
        sequence += 1;
        dataStream.write({
          data: {
            eventType: "file_content",
            file: fileData,
            missionId,
            path: file.path,
            payload: {},
            sequence,
          },
          transient: true,
          type: "data-idealy-file-event",
        });

        // file_saved
        sequence += 1;
        dataStream.write({
          data: {
            eventType: "file_saved",
            file: fileData,
            missionId,
            path: file.path,
            payload: {},
            sequence,
          },
          transient: true,
          type: "data-idealy-file-event",
        });

        // Track primary file content for the artifact
        if (
          file.path === "src/App.tsx" ||
          file.path === "src/app/page.tsx" ||
          file.path === "index.html" ||
          (file.path.endsWith(".tsx") && !primaryContent)
        ) {
          primaryContent = file.content;
        }
      }

      // Emit mission_completed
      sequence += 1;
      dataStream.write({
        data: {
          eventType: "mission_completed",
          missionId,
          payload: { filesCount: files.length, finalStatus: "ready" },
          sequence,
        },
        transient: true,
        type: "data-idealy-file-event",
      });

      // Also stream the primary content as codeDelta for preview
      draftContent = primaryContent || files[0]?.content || "";
      dataStream.write({
        data: draftContent,
        transient: true,
        type: "data-codeDelta",
      });

      return draftContent;
    }

    // ─── Single-file mode (fallback): generate via LLM streaming ──────────
    const generationPrompt =
      userPrompt && userPrompt.trim().length > 0
        ? `Project: ${title}\n\nUser Specifications & Detailed Requirements:\n${userPrompt}\n\nGenerate the complete, modern, production-ready, fully styled and interactive code now.`
        : `Project: ${title}\n\nGenerate a complete, modern, production-ready, fully styled and interactive web application or landing page for this project.`;

    const { stream } = streamText({
      instructions: `${codePrompt}\n\nOutput ONLY the clean code. Do NOT wrap in markdown \`\`\` fences. No introductory explanations, no trailing notes.`,
      model: getLanguageModel(modelId),
      prompt: generationPrompt,
    });

    for await (const delta of stream) {
      if (delta.type === "text-delta") {
        draftContent += delta.text;
        dataStream.write({
          data: stripFences(draftContent),
          transient: true,
          type: "data-codeDelta",
        });
      }
    }

    return stripFences(draftContent);
  },
  onUpdateDocument: async ({ document, description, dataStream, modelId }) => {
    let draftContent = "";

    const { stream } = streamText({
      instructions: `${updateDocumentPrompt(document.content, "code")}\n\nOutput ONLY the complete updated code. No explanations, no markdown fences, no wrapping.`,
      model: getLanguageModel(modelId),
      prompt: description,
    });

    for await (const delta of stream) {
      if (delta.type === "text-delta") {
        draftContent += delta.text;
        dataStream.write({
          data: stripFences(draftContent),
          transient: true,
          type: "data-codeDelta",
        });
      }
    }

    return stripFences(draftContent);
  },
});
