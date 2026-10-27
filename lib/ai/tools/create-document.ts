import { tool, type UIMessageStreamWriter } from "ai";
import type { Session } from "next-auth";
import { z } from "zod";
import {
  artifactKinds,
  documentHandlersByArtifactKind,
} from "@/lib/artifacts/server";
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
  content: z.string().describe("Full text or source code content of the file."),
  type: z
    .enum(["file", "directory"])
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
      "Create an artifact or a multi-file project workspace. For websites, landing pages, or applications (kind: 'code'), ALWAYS supply a complete project file tree via the 'files' parameter including components, configurations, styles, and types.",
    execute: async ({ title, kind, prompt, files = [] }) => {
      const id = generateUUID();

      // 1. Initialise artifact in UI
      dataStream.write({ data: kind, transient: true, type: "data-kind" });
      dataStream.write({ data: id, transient: true, type: "data-id" });
      dataStream.write({ data: title, transient: true, type: "data-title" });
      dataStream.write({ data: null, transient: true, type: "data-clear" });

      // 2. For code projects, ensure .idealy config dir exists
      const updatedFiles = [...files];
      if (kind === "code") {
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
                  title,
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
      const documentHandler = documentHandlersByArtifactKind.find(
        (dh) => dh.kind === kind
      );

      if (!documentHandler) {
        throw new Error(`No document handler found for kind: ${kind}`);
      }

      await documentHandler.onCreateDocument({
        dataStream,
        files: updatedFiles.length > 0 ? updatedFiles : undefined,
        id,
        modelId,
        prompt,
        session,
        title,
      });

      dataStream.write({ data: null, transient: true, type: "data-finish" });

      return {
        content:
          kind === "code"
            ? `Project '${title}' with ${updatedFiles.length} files was created successfully.`
            : "A document was created and is now visible to the user.",
        id,
        kind,
        title,
        filesCount: updatedFiles.length,
      };
    },
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
  });
