import { streamText } from "ai";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

function stripFences(code: string): string {
  return code
    .replace(/^```[\w]*\n?/, "")
    .replace(/\n?```\s*$/, "")
    .trim();
}

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ title, prompt: userPrompt, dataStream, modelId }) => {
    let draftContent = "";
    const generationPrompt = userPrompt && userPrompt.trim().length > 0
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
