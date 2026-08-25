import { geolocation, ipAddress } from "@vercel/functions";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  generateId,
  isStepCount,
  streamText,
  toUIMessageStream,
} from "ai";
import { checkBotId } from "botid/server";
import { getToken } from "next-auth/jwt";
import { after } from "next/server";
import { createResumableStreamContext } from "resumable-stream";
import { auth, type UserType } from "@/app/(auth)/auth";
import { entitlementsByUserType } from "@/lib/ai/entitlements";
import {
  allowedModelIds,
  chatModels,
  DEFAULT_CHAT_MODEL,
  getCapabilities,
  getModelAvailability,
} from "@/lib/ai/models";
import { type RequestHints, systemPrompt } from "@/lib/ai/prompts";
import {
  classifyIdealyIntent,
  createIdealyMission,
  createIdealyMissionPlan,
  updateIdealyMission,
} from "@/lib/idealy/backend-adapter";
import { getIdealyAiFunctionUrl } from "@/lib/idealy/config";
import { getIdealyDirectProviderModel } from "@/lib/idealy/provider-registry";
import { designSpecificationToPrompt, type DesignSpecification } from "@/lib/idealy/design-engine";
import { injectFreeIdealyBadge } from "@/lib/branding/free-badge";
import { getLanguageModel } from "@/lib/ai/providers";
import { createDocument } from "@/lib/ai/tools/create-document";
import { editDocument } from "@/lib/ai/tools/edit-document";
import { getWeather } from "@/lib/ai/tools/get-weather";
import { requestSuggestions } from "@/lib/ai/tools/request-suggestions";
import { updateDocument } from "@/lib/ai/tools/update-document";
import {
  isDevelopmentEnvironment,
  isProductionEnvironment,
} from "@/lib/constants";
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
  updateMessage,
} from "@/lib/db/queries";
import type { DBMessage } from "@/lib/db/schema";
import { ChatbotError } from "@/lib/errors";
import { checkIpRateLimit } from "@/lib/ratelimit";
import type { ChatMessage, WaitingStatusData } from "@/lib/types";
import { convertToUIMessages, generateUUID } from "@/lib/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { type PostRequestBody, postRequestBodySchema } from "./schema";

export const maxDuration = 60;

function shouldUseIdealyEdgeProvider() {
  return isProductionEnvironment || process.env.IDEALY_AI_PROVIDER === "supabase-function";
}

async function getSupabaseAccessToken(request: Request) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });
  return typeof token?.supabaseAccessToken === "string"
    ? token.supabaseAccessToken
    : null;
}

function getTextFromMessageParts(message: ChatMessage | undefined) {
  return (
    message?.parts
      ?.filter((part): part is { text: string; type: "text" } =>
        part.type === "text"
      )
      .map((part) => part.text)
      .join("\n")
      .trim() ?? ""
  );
}

function getIdealyPrompt(messages: ChatMessage[]) {
  return messages
    .slice(-12)
    .map((currentMessage) => {
      const text = getTextFromMessageParts(currentMessage);
      return text
        ? `${currentMessage.role.toUpperCase()}:\n${text}`
        : null;
    })
    .filter(Boolean)
    .join("\n\n");
}

async function streamIdealyEdgeResponse({
  dataStream,
  directModel,
  idempotencyKey,
  intentCategory,
  messages,
  missionId,
  designSpecification,
  request,
}: {
  dataStream: Parameters<Parameters<typeof createUIMessageStream>[0]["execute"]>[0]["writer"];
  directModel?: ReturnType<typeof getIdealyDirectProviderModel>;
  idempotencyKey: string;
  intentCategory: "CONVERSATION" | "IDEATION" | "EXECUTION";
  messages: ChatMessage[];
  missionId?: string;
  designSpecification?: DesignSpecification;
  request: Request;
}) {
  const supabaseAccessToken = await getSupabaseAccessToken(request);
  if (!supabaseAccessToken) {
    throw new Error(
      "La session Supabase n’est pas disponible. Reconnectez-vous pour continuer."
    );
  }

  const response = await fetch(getIdealyAiFunctionUrl(), {
    body: JSON.stringify({
      idempotencyKey,
      intentCategory,
      ...(directModel
        ? {
            model: directModel.edgeModel,
            provider: directModel.edgeProvider,
          }
        : {}),
      ...(missionId ? { missionId, workspaceStream: true } : {}),
      maxTokens: 8000,
      mode: "auto",
      prompt: getIdealyPrompt(messages),
      stream: true,
      systemPrompt: `${systemPrompt({
        requestHints: {
          city: undefined,
          country: undefined,
          latitude: undefined,
          longitude: undefined,
        },
        supportsTools: false,
      })}${designSpecification ? `\n\n${designSpecificationToPrompt(designSpecification)}` : ""}`,
    }),
    headers: {
      Authorization: `Bearer ${supabaseAccessToken}`,
      ...(process.env.SUPABASE_ANON_KEY
        ? { apikey: process.env.SUPABASE_ANON_KEY }
        : {}),
      "Content-Type": "application/json",
      "x-client-info": "idealy-next-chat",
    },
    method: "POST",
  });

  if (!response.ok || !response.body) {
    const payload = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? `Le backend Idealy a répondu ${response.status}.`);
  }

  const assistantId = generateId();
  dataStream.write({ id: assistantId, type: "text-start" });
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw) as {
            choices?: Array<{ delta?: { content?: string } }>;
            event?: unknown;
            type?: string;
          };
          if (parsed.type === "idealy_file_event" && parsed.event) {
            dataStream.write({
              data: parsed.event as never,
              type: "data-idealy-file-event",
            });
            continue;
          }
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            dataStream.write({ delta, id: assistantId, type: "text-delta" });
          }
        } catch {
          // Ignore incomplete provider frames; the next chunk completes them.
        }
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  dataStream.write({ id: assistantId, type: "text-end" });
}

const HEALTH_CHECK_DELAY_MS = 9000;

function isModelStreamActivity(chunk: { type: string }) {
  return !["start", "start-step", "finish-step", "finish", "raw"].includes(
    chunk.type
  );
}

function getStreamContext() {
  try {
    return createResumableStreamContext({ waitUntil: after });
  } catch {
    return null;
  }
}

export { getStreamContext };

export async function POST(request: Request) {
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody =
      process.env.DEMO_MODE === "true"
        ? (json as PostRequestBody)
        : postRequestBodySchema.parse(json);
  } catch {
    return new ChatbotError("bad_request:api").toResponse();
  }

  try {
    const { id, message, messages, selectedChatModel, selectedVisibilityType } =
      requestBody;

    if (process.env.DEMO_MODE === "true") {
      const demoText =
        "J’ai compris votre idée. En mode démonstration, les agents Idealy prennent le relais : l’Architecte structure la mission, le Builder prépare le premier écran et le Reviewer vérifie la cohérence. La preview s’ouvre maintenant dans le canvas de droite, comme dans l’espace de création V0.";
      const demoCode = `import React from "react";\n\nexport default function MissionWorkspace() {\n  return (\n    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100 md:px-12">\n      <div className="mx-auto max-w-5xl">\n        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">Idealy / Build complete</p>\n        <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">Turn one clear idea into a beautiful product.</h1>\n        <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">A focused workspace for shaping the experience, validating the details, and moving from concept to launch.</p>\n        <div className="mt-14 h-px w-full bg-gradient-to-r from-sky-400/70 via-violet-400/40 to-transparent" />\n        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-3 text-sm text-slate-400">\n          <span><strong className="text-slate-100">Product direction</strong> defined</span>\n          <span><strong className="text-slate-100">Interface system</strong> ready</span>\n          <span><strong className="text-slate-100">Launch checklist</strong> 4 items left</span>\n        </div>\n      </div>\n    </main>\n  );\n}`;
      const demoPreview = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Idealy workspace</title><style>*{box-sizing:border-box}body{margin:0;background:#020617;color:#f8fafc;font-family:Inter,system-ui,sans-serif}main{min-height:100vh;padding:48px 7vw;background:radial-gradient(circle at 12% 8%,#0ea5e933,transparent 32%),radial-gradient(circle at 86% 90%,#8b5cf633,transparent 36%),#020617}.eyebrow{font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#7dd3fc}.wrap{max-width:1120px;margin:auto}.hero{max-width:900px}.hero h1{font-size:clamp(42px,7vw,88px);line-height:1.02;letter-spacing:-.06em;margin:26px 0 0}.hero p{max-width:680px;margin:26px 0 0;color:#cbd5e1;font-size:clamp(15px,2vw,19px);line-height:1.7}.rule{height:1px;margin-top:72px;background:linear-gradient(90deg,#38bdf8b3,#a78bfa66,transparent)}.meta{display:flex;flex-wrap:wrap;gap:12px 38px;margin-top:22px;color:#94a3b8;font-size:13px}.meta strong{color:#f8fafc;font-weight:600}@media(max-width:760px){main{padding:32px 22px}.hero h1{font-size:48px}.rule{margin-top:52px}.meta{display:grid;gap:12px}} </style></head><body><main><div class="wrap"><div class="hero"><div class="eyebrow">Idealy / Build complete</div><h1>Turn one clear idea into a beautiful product.</h1><p>A focused workspace for shaping the experience, validating the details, and moving from concept to launch.</p></div><div class="rule"></div><div class="meta"><span><strong>Product direction</strong> defined</span><span><strong>Interface system</strong> ready</span><span><strong>Launch checklist</strong> 4 items left</span></div></div></main></body></html>`;
      const demoStream = createUIMessageStream({
        execute: async ({ writer }) => {
          const textId = generateId();
          const documentId = generateId();
          writer.write({ data: "code", type: "data-kind" });
          writer.write({ data: documentId, type: "data-id" });
          writer.write({ data: "Mission workspace", type: "data-title" });
          writer.write({
            data: injectFreeIdealyBadge(demoPreview, true),
            type: "data-preview",
          });
          writer.write({ data: true, type: "data-clear" });
          writer.write({ id: textId, type: "text-start" });
          for (const chunk of demoText.match(/.{1,18}(?:\s|$)/g) ?? [
            demoText,
          ]) {
            writer.write({ delta: chunk, id: textId, type: "text-delta" });
            await new Promise((resolve) => setTimeout(resolve, 45));
          }
          writer.write({ id: textId, type: "text-end" });
          for (let end = 80; end <= demoCode.length; end += 80) {
            writer.write({
              data: demoCode.slice(0, end),
              type: "data-codeDelta",
            });
            await new Promise((resolve) => setTimeout(resolve, 90));
          }
          writer.write({ data: demoCode, type: "data-codeDelta" });
          writer.write({ data: true, type: "data-finish" });
        },
      });
      return createUIMessageStreamResponse({ stream: demoStream });
    }

    const [botIdResult, session] = await Promise.all([
      checkBotId().catch(() => null),
      auth(),
    ]);

    if (botIdResult?.isBot) {
      return new ChatbotError("forbidden:api").toResponse();
    }

    if (!session?.user) {
      return new ChatbotError("unauthorized:chat").toResponse();
    }

    const chatModel = allowedModelIds.has(selectedChatModel)
      ? selectedChatModel
      : DEFAULT_CHAT_MODEL;

    await checkIpRateLimit(ipAddress(request));

    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      differenceInHours: 1,
      id: session.user.id,
    });

    if (messageCount >= entitlementsByUserType[userType].maxMessagesPerHour) {
      return new ChatbotError("rate_limit:chat").toResponse();
    }

    const isToolApprovalFlow = Boolean(messages);

    const chat = await getChatById({ id });
    let messagesFromDb: DBMessage[] = [];
    let titlePromise: Promise<string> | null = null;

    if (chat) {
      if (chat.userId !== session.user.id) {
        return new ChatbotError("forbidden:chat").toResponse();
      }
      messagesFromDb = await getMessagesByChatId({ id });
    } else if (message?.role === "user") {
      await saveChat({
        id,
        title: "New chat",
        userId: session.user.id,
        visibility: selectedVisibilityType,
      });
      titlePromise = generateTitleFromUserMessage({ message });
    }

    let uiMessages: ChatMessage[];

    if (isToolApprovalFlow && messages) {
      const dbMessages = convertToUIMessages(messagesFromDb);
      const approvalStates = new Map(
        messages.flatMap(
          (m) =>
            m.parts
              ?.filter(
                (p: Record<string, unknown>) =>
                  p.state === "approval-responded" ||
                  p.state === "output-denied"
              )
              .map((p: Record<string, unknown>) => [
                String(p.toolCallId ?? ""),
                p,
              ]) ?? []
        )
      );
      uiMessages = dbMessages.map((msg) => ({
        ...msg,
        parts: msg.parts.map((part) => {
          if (
            "toolCallId" in part &&
            approvalStates.has(String(part.toolCallId))
          ) {
            return { ...part, ...approvalStates.get(String(part.toolCallId)) };
          }
          return part;
        }),
      })) as ChatMessage[];
    } else {
      uiMessages = [
        ...convertToUIMessages(messagesFromDb),
        message as ChatMessage,
      ];
    }

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      city,
      country,
      latitude,
      longitude,
    };

    if (message?.role === "user") {
      await saveMessages({
        messages: [
          {
            attachments: [],
            chatId: id,
            createdAt: new Date(),
            id: message.id,
            parts: message.parts,
            role: "user",
          },
        ],
      });
    }

    const modelConfig = chatModels.find((m) => m.id === chatModel);
    const directModel = getIdealyDirectProviderModel(chatModel);
    const modelCapabilities = await getCapabilities();
    const capabilities = modelCapabilities[chatModel];
    const isReasoningModel = capabilities?.reasoning === true;
    const supportsTools = capabilities?.tools === true;

    const modelMessages = await convertToModelMessages(uiMessages);

    const stream = createUIMessageStream({
      execute: async ({ writer: dataStream }) => {
        const modelName = modelConfig?.name ?? chatModel;
        let hasModelActivity = false;
        let healthCheckTimer: ReturnType<typeof setTimeout> | undefined;

        const clearHealthCheckTimer = () => {
          if (healthCheckTimer) {
            clearTimeout(healthCheckTimer);
          }
        };

        const writeWaitingStatus = (
          phase: WaitingStatusData["phase"],
          messageText: string
        ) => {
          if (hasModelActivity && phase !== "thinking") {
            return;
          }
          dataStream.write({
            data: {
              message: messageText,
              modelId: chatModel,
              modelName,
              phase,
            },
            transient: true,
            type: "data-waiting-status",
          });
        };

        writeWaitingStatus("waiting", "Waiting...");

        healthCheckTimer = setTimeout(() => {
          getModelAvailability(chatModel)
            .then((availability) => {
              if (availability === "impacted") {
                writeWaitingStatus(
                  "health",
                  `${modelName} may be slow or unavailable right now...`
                );
              } else {
                writeWaitingStatus("still-waiting", "Still waiting...");
              }
            })
            .catch(() => {
              writeWaitingStatus("still-waiting", "Still waiting...");
            });
        }, HEALTH_CHECK_DELAY_MS);

        const markModelActive = () => {
          if (hasModelActivity) {
            return;
          }
          hasModelActivity = true;
          clearHealthCheckTimer();
          writeWaitingStatus("thinking", "Thinking...");
        };

        const stopWaitingStatus = () => {
          hasModelActivity = true;
          clearHealthCheckTimer();
        };

        if (shouldUseIdealyEdgeProvider()) {
          let intentCategory:
            | "CONVERSATION"
            | "IDEATION"
            | "EXECUTION" = "CONVERSATION";
          const idealyPrompt =
            message?.role === "user" ? getIdealyPrompt(uiMessages) : "";
          const idempotencyKey =
            message?.role === "user"
              ? `chat:${id}:${message.id}`
              : `chat:${id}:continuation`;

          let missionId: string | undefined;
          let missionPlan:
            | Awaited<ReturnType<typeof createIdealyMissionPlan>>
            | undefined;

          if (idealyPrompt) {
            writeWaitingStatus("thinking", "Routing your mission...");
            intentCategory = await classifyIdealyIntent(request, idealyPrompt);
            dataStream.write({ data: intentCategory, type: "data-idealy-intent" });

            // Une discussion ou une idéation restent sans effet de bord : elles
            // peuvent produire une réponse et une proposition, mais seule une
            // intention d’exécution ouvre un projet, une mission et le VFS.
            if (intentCategory === "EXECUTION") {
              writeWaitingStatus("thinking", "Creating the mission workspace...");
              const mission = await createIdealyMission({
                chatId: id,
                intentCategory,
                prompt: idealyPrompt,
                request,
              });
              missionId = mission.id;
              dataStream.write({ data: mission.id, type: "data-idealy-mission" });

              writeWaitingStatus("thinking", "Planning the next build step...");
              missionPlan = await createIdealyMissionPlan({
                idempotencyKey: `${idempotencyKey}:plan`,
                ...(directModel ? { model: directModel.edgeModel } : {}),
                missionId,
                prompt: idealyPrompt,
                ...(directModel ? { provider: directModel.edgeProvider } : {}),
                request,
              });
              dataStream.write({ data: missionPlan, type: "data-idealy-plan" });
              await updateIdealyMission({
                dna: { intentCategory, plan: missionPlan, stage: "planned" },
                missionId,
                request,
                status: "planned",
              });
            }
          }

          try {
            if (intentCategory === "EXECUTION" && missionId && missionPlan) {
              const assistantId = generateId();
              dataStream.write({ id: assistantId, type: "text-start" });
              dataStream.write({
                delta: `Plan enregistré pour **${missionPlan.projectKind}**. L’escouade reste en attente de votre validation : ouvrez le workspace puis choisissez **Run squad** pour lancer Architecte, Builder et Reviewer.`,
                id: assistantId,
                type: "text-delta",
              });
              dataStream.write({ id: assistantId, type: "text-end" });
            } else {
              await streamIdealyEdgeResponse({
                dataStream,
                directModel,
                idempotencyKey: `${idempotencyKey}:run`,
                intentCategory,
                messages: uiMessages,
                missionId,
                designSpecification: missionPlan?.design,
                request,
              });
            }
            stopWaitingStatus();
          } catch (error) {
            if (missionId) {
              await updateIdealyMission({
                validation: {
                  error: error instanceof Error ? error.message : String(error),
                  status: "failed",
                },
                missionId,
                request,
                status: "needs-fix",
              }).catch(() => undefined);
            }
            throw error;
          }
        } else {
          const result = streamText({
            activeTools:
              isReasoningModel && !supportsTools
                ? []
                : [
                    "getWeather",
                    "createDocument",
                    "editDocument",
                    "updateDocument",
                    "requestSuggestions",
                  ],
            instructions: systemPrompt({ requestHints, supportsTools }),
            messages: modelMessages,
            model: getLanguageModel(chatModel),
            onAbort() {
              stopWaitingStatus();
            },
            onChunk({ chunk }) {
              if (isModelStreamActivity(chunk)) {
                markModelActive();
              }
            },
            onEnd() {
              stopWaitingStatus();
            },
            onError() {
              stopWaitingStatus();
            },
            providerOptions: {
              ...(modelConfig?.gatewayOrder && {
                gateway: { order: modelConfig.gatewayOrder },
              }),
              ...(modelConfig?.reasoningEffort && {
                openai: { reasoningEffort: modelConfig.reasoningEffort },
              }),
            },
            stopWhen: isStepCount(5),
            telemetry: {
              functionId: "stream-text",
              isEnabled: isProductionEnvironment,
            },
            tools: {
              createDocument: createDocument({
                dataStream,
                modelId: chatModel,
                session,
              }),
              editDocument: editDocument({ dataStream, session }),
              getWeather,
              requestSuggestions: requestSuggestions({
                dataStream,
                modelId: chatModel,
                session,
              }),
              updateDocument: updateDocument({
                dataStream,
                modelId: chatModel,
                session,
              }),
            },
          });

          dataStream.merge(
            toUIMessageStream({
              sendReasoning: isReasoningModel,
              stream: result.stream,
            })
          );
        }

        if (titlePromise) {
          try {
            const title = await titlePromise;
            dataStream.write({ data: title, type: "data-chat-title" });
            updateChatTitleById({ chatId: id, title });
          } catch {
            /* non-fatal */
          }
        }
      },
      generateId: generateUUID,
      onEnd: async ({ messages: finishedMessages }) => {
        if (isToolApprovalFlow) {
          await Promise.all(
            finishedMessages.map(async (finishedMsg) => {
              const existingMsg = uiMessages.find(
                (m) => m.id === finishedMsg.id
              );
              if (existingMsg) {
                await updateMessage({
                  id: finishedMsg.id,
                  parts: finishedMsg.parts,
                });
                return;
              }

              await saveMessages({
                messages: [
                  {
                    attachments: [],
                    chatId: id,
                    createdAt: new Date(),
                    id: finishedMsg.id,
                    parts: finishedMsg.parts,
                    role: finishedMsg.role,
                  },
                ],
              });
            })
          );
        } else if (finishedMessages.length > 0) {
          await saveMessages({
            messages: finishedMessages.map((currentMessage) => ({
              attachments: [],
              chatId: id,
              createdAt: new Date(),
              id: currentMessage.id,
              parts: currentMessage.parts,
              role: currentMessage.role,
            })),
          });
        }
      },
      onError: (error) => {
        if (
          error instanceof Error &&
          error.message?.includes(
            "AI Gateway requires a valid credit card on file to service requests"
          )
        ) {
          return "Le moteur IA d’Idealy est temporairement indisponible. Réessayez dans un instant.";
        }
        return "Une erreur est survenue. Réessayez dans un instant.";
      },
      originalMessages: isToolApprovalFlow ? uiMessages : undefined,
    });

    return createUIMessageStreamResponse({
      async consumeSseStream({ stream: sseStream }) {
        if (!process.env.REDIS_URL) {
          return;
        }
        try {
          const streamContext = getStreamContext();
          if (streamContext) {
            const streamId = generateId();
            await createStreamId({ chatId: id, streamId });
            await streamContext.createNewResumableStream(
              streamId,
              () => sseStream
            );
          }
        } catch {
          /* non-critical */
        }
      },
      stream,
    });
  } catch (error) {
    const vercelId = request.headers.get("x-vercel-id");

    if (error instanceof ChatbotError) {
      return error.toResponse();
    }

    if (
      error instanceof Error &&
      error.message?.includes(
        "AI Gateway requires a valid credit card on file to service requests"
      )
    ) {
      return new ChatbotError("bad_request:activate_gateway").toResponse();
    }

    console.error("Unhandled error in chat API:", error, { vercelId });
    return new ChatbotError("offline:chat").toResponse();
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new ChatbotError("bad_request:api").toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    return new ChatbotError("unauthorized:chat").toResponse();
  }

  const chat = await getChatById({ id });

  if (chat?.userId !== session.user.id) {
    return new ChatbotError("forbidden:chat").toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
