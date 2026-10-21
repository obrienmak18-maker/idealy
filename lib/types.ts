import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { createDocument } from "./ai/tools/create-document";
import type { editDocument } from "./ai/tools/edit-document";
import type { executeSandbox } from "./ai/tools/execute-sandbox";
import type { generateImage } from "./ai/tools/generate-image";
import type { searchImages } from "./ai/tools/search-images";
import type { webSearch } from "./ai/tools/web-search";
import type { getWeather } from "./ai/tools/get-weather";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";
import type {
  IdealyIntentCategory,
  MissionPlan,
} from "./idealy/backend-adapter";
import type { MissionFileEvent } from "./idealy/mission-files";

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type editDocumentTool = InferUITool<ReturnType<typeof editDocument>>;
type executeSandboxTool = InferUITool<ReturnType<typeof executeSandbox>>;
type generateImageTool = InferUITool<ReturnType<typeof generateImage>>;
type searchImagesTool = InferUITool<ReturnType<typeof searchImages>>;
type webSearchTool = InferUITool<ReturnType<typeof webSearch>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  editDocument: editDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  searchImages: searchImagesTool;
  generateImage: generateImageTool;
  webSearch: webSearchTool;
  executeSandbox: executeSandboxTool;
};

export type WaitingStatusData = {
  phase: "waiting" | "still-waiting" | "health" | "thinking";
  message: string;
  modelId: string;
  modelName: string;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  preview: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
  "waiting-status": WaitingStatusData;
  "idealy-intent": IdealyIntentCategory;
  "idealy-mission": string;
  "idealy-plan": MissionPlan;
  "idealy-file-event": MissionFileEvent;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
