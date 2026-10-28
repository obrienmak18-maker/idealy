import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { ChatMessage } from "@/lib/types";
import { generateUUID } from "@/lib/utils";

type CreateDocumentProps = {
  session: Session;
  dataStream: UIMessageStreamWriter<ChatMessage>;
  modelId: string;
};

const fileSchema = z.object({
  path: z
    .string()
    .describe(
      "Relative file path with extension. E.g. 'src/components/Header.tsx', 'package.json', 'src/styles/globals.css'"
    ),
  content: z
    .string()
    .optional()
    .default("")
    .describe("Full text or source code content of the file."),
  type: z
    .enum(["file", "directory"])
    .optional()
    .default("file")
    .describe("Element type — always 'file' for code files"),
});

export const createDocument = ({
  session,
  dataStream,
  modelId,
}: CreateDocumentProps) =>
  tool({
    description:
      "Create an artifact or a multi-file project workspace. For websites, landing pages, or applications (kind: 'code'), ALWAYS supply a complete project file tree via the 'files' parameter with dynamic custom structure (.idealy/project.json, .idealy/rules.md, components, pages, styles, hooks, configs). Complete functional code in every file — no placeholders.",
    inputSchema: z.object({
      kind: z
        .enum(artifactKinds)
        .describe(
          "REQUIRED. 'code' for full multi-file applications, landing pages, websites; 'text' for documents/essays; 'sheet' for spreadsheets"
        ),
      title: z.string().describe("A concise descriptive title for the artifact"),
      prompt: z
        .string()
        .optional()
        .describe(
          "Detailed specifications, tech stack, desired sections, and features for the artifact"
        ),
      files: z
        .array(fileSchema)
        .optional()
        .describe(
          "Array of files representing the full project structure (REQUIRED for kind: 'code'). " +
          "Must include: package.json, index.html, src/App.tsx, src/components/*.tsx, src/styles/globals.css, README.md. " +
          "Each file must have its complete source code content."
        ),
    }),
    execute: async ({ title, kind, prompt, files = [] }) => {
      const id = generateUUID();

      // Robust fallback defaults: never let undefined crash the execution
      const effectiveKind: ArtifactKind =
        kind && (artifactKinds as readonly string[]).includes(kind)
          ? (kind as ArtifactKind)
          : "code";
      const effectiveTitle =
        typeof title === "string" && title.trim().length > 0
          ? title.trim()
          : "Studio IA";
      const effectivePrompt =
        typeof prompt === "string" && prompt.trim().length > 0
          ? prompt.trim()
          : effectiveTitle;

      // 1. Initialise artifact in UI
      dataStream.write({ data: effectiveKind, transient: true, type: "data-kind" });
      dataStream.write({ data: id, transient: true, type: "data-id" });
      dataStream.write({ data: effectiveTitle, transient: true, type: "data-title" });
      dataStream.write({ data: null, transient: true, type: "data-clear" });

      // 2. For code projects, ensure .idealy config dir exists
      const updatedFiles = [...files];
      if (effectiveKind === "code") {
        const hasIdealyConfig = updatedFiles.some((f) =>
          f.path.startsWith(".idealy/")
        );
        if (!hasIdealyConfig) {
          updatedFiles.push(
            {
              path: ".idealy/project.json",
              content: JSON.stringify(
                {
                  projectId: id,
                  title: effectiveTitle,
                  createdAt: new Date().toISOString(),
                  framework: "react-tailwind",
                },
                null,
                2
              ),
              type: "file",
            },
            {
              path: ".idealy/rules.md",
              content:
                "# Idealy Project Rules\n- Use modular architecture.\n- Maintain high code quality.\n- All components must be fully interactive.",
              type: "file",
            }
          );
        }
      }

      // 3. Notify the client of the file tree structure
      if (updatedFiles.length > 0) {
        dataStream.write({
          data: updatedFiles.map((f) => ({ path: f.path, type: f.type ?? "file" })),
          transient: true,
          type: "data-idealy-tree",
        });
      }

      // 4. Run the document handler (generates + streams the main code)
      const documentHandler =
        documentHandlersByArtifactKind.find((dh) => dh.kind === effectiveKind) ??
        documentHandlersByArtifactKind.find((dh) => dh.kind === "code")!;

      try {
        await documentHandler.onCreateDocument({
          dataStream,
          files: updatedFiles.length > 0 ? updatedFiles : undefined,
          id,
          modelId,
          prompt: effectivePrompt,
          session,
          title: effectiveTitle,
        });
      } catch (handlerError) {
        console.warn("createDocument handler non-fatal fallback:", handlerError);
        // Fallback: stream valid HTML preview so workspace never remains white or broken
        dataStream.write({
          data: `<!DOCTYPE html>\n<html lang="fr" class="dark">\n<head>\n  <meta charset="utf-8">\n  <title>${effectiveTitle}</title>\n  <script src="https://cdn.tailwindcss.com"></script>\n</head>\n<body class="bg-slate-950 text-slate-50 min-h-screen p-8">\n  <div class="max-w-4xl mx-auto">\n    <h1 class="text-2xl font-bold mb-4">${effectiveTitle}</h1>\n    <p class="text-slate-400">Application initialisée et disponible dans l'espace de travail.</p>\n  </div>\n</body>\n</html>`,
          transient: true,
          type: "data-codeDelta",
        });
      }

      dataStream.write({ data: null, transient: true, type: "data-finish" });

      // Additive Cloud Firestore sync (non-blocking)
      if (updatedFiles.length > 0) {
        import("@/lib/firebase/firestore-sync")
          .then(({ syncProjectToFirestoreServer }) =>
            syncProjectToFirestoreServer({
              files: updatedFiles,
              metadata: { framework: "react-tailwind", modelId },
              projectId: id,
              title: effectiveTitle,
              userId: session.user?.id,
            })
          )
          .catch(() => {});
      }

      return {
        content:
          effectiveKind === "code"
            ? `Project '${effectiveTitle}' with ${updatedFiles.length} files was created successfully.`
            : "A document was created and is now visible to the user.",
        id,
        kind: effectiveKind,
        title: effectiveTitle,
        filesCount: updatedFiles.length,
      };
    },
  });
