import { getBearerToken } from "./firebase";

export type LiveSessionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "speaking"
  | "listening"
  | "error";

export type LiveAudioClientCallbacks = {
  onStatusChange?: (status: LiveSessionStatus) => void;
  onTranscription?: (text: string, isUser: boolean) => void;
  onError?: (error: string) => void;
  onAudioLevel?: (level: number) => void;
};

const PCM_CHUNK_SAMPLES = 2048;

export class LiveAudioClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private callbacks: LiveAudioClientCallbacks;
  private status: LiveSessionStatus = "disconnected";
  private isMuted = false;
  private microphoneStarted = false;
  private connectionFailed = false;
  private pendingPcm = new Int16Array(PCM_CHUNK_SAMPLES);
  private pendingPcmCount = 0;

  constructor(callbacks: LiveAudioClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  private setStatus(status: LiveSessionStatus) {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  public async connect(): Promise<void> {
    if (this.status !== "disconnected" && this.status !== "error") {
      return;
    }
    this.connectionFailed = false;
    this.microphoneStarted = false;
    this.setStatus("connecting");

    try {
      // Proactively acquire microphone during user click gesture for immediate browser prompt
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices?.getUserMedia &&
        !this.mediaStream
      ) {
        try {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              channelCount: 1,
              echoCancellation: true,
              noiseSuppression: true,
              sampleRate: 16_000,
            },
          });
        } catch (permError) {
          console.warn(
            "[LiveAudioClient] Media stream prompt deferred or denied:",
            permError
          );
        }
      }

      const bearer = await getBearerToken();
      const headers: Record<string, string> = {};
      if (bearer) {
        headers.Authorization = `Bearer ${bearer}`;
      }
      const way = localStorage.getItem("idealy_user_way") || "ninja";
      const lang = localStorage.getItem("idealy_language") || "fr";
      headers["x-idealy-way"] = way;
      headers["x-idealy-lang"] = lang;

      const response = await fetch(
        `/api/voice/session?way=${encodeURIComponent(way)}&lang=${encodeURIComponent(lang)}`,
        {
          cache: "no-store",
          credentials: "same-origin",
          headers,
        }
      );
      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Reconnectez-vous à Idealy pour utiliser le mode vocal Live."
            : "Impossible de préparer la session vocale Live."
        );
      }
      const config = (await response.json()) as {
        configured?: boolean;
        error?: string;
        model?: string;
        voiceName?: string;
        wsUrl?: string;
      };

      if (!config.configured || !config.wsUrl || !config.model) {
        throw new Error(
          config.error || "Gemini Live n’est pas configuré sur le serveur."
        );
      }

      this.ws = new WebSocket(config.wsUrl);
      this.ws.onopen = () => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          return;
        }
        this.ws.send(
          JSON.stringify({
            setup: {
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: config.voiceName || "Aoede",
                    },
                  },
                },
              },
              inputAudioTranscription: {},
              model: `models/${config.model}`,
              outputAudioTranscription: {},
            },
          })
        );
      };

      this.ws.onmessage = async (event) => {
        try {
          const raw =
            event.data instanceof Blob
              ? await event.data.text()
              : String(event.data);
          this.handleServerMessage(JSON.parse(raw) as Record<string, unknown>);
        } catch (error) {
          console.warn("[LiveAudioClient] message parse error:", error);
        }
      };

      this.ws.onerror = () => {
        this.connectionFailed = true;
        this.callbacks.onError?.(
          "La connexion au service vocal Live a échoué. Vérifiez la configuration Gemini et réessayez."
        );
        this.setStatus("error");
      };

      this.ws.onclose = (event) => {
        const abnormal = event.code !== 1000 && event.code !== 1001;
        this.ws = null;
        this.cleanup(false);
        if (this.connectionFailed || abnormal) {
          const reason = event.reason?.trim();
          this.callbacks.onError?.(
            reason
              ? `La session vocale s’est interrompue (${event.code}) : ${reason.slice(0, 140)}`
              : `La session vocale s’est interrompue (code ${event.code}). Réessayez.`
          );
          this.setStatus("error");
        } else {
          this.setStatus("disconnected");
        }
      };
    } catch (error: unknown) {
      this.connectionFailed = true;
      const message =
        error instanceof Error ? error.message : "Erreur de connexion vocale.";
      this.callbacks.onError?.(message);
      this.cleanup();
      this.setStatus("error");
    }
  }

  private handleServerMessage(data: Record<string, unknown>) {
    // Do not stream PCM until Gemini confirms the initial session handshake.
    if (data.setupComplete !== undefined && !this.microphoneStarted) {
      this.setStatus("connected");
      void this.startMicrophoneCapture();
    }

    const serverContent = data.serverContent as
      | Record<string, unknown>
      | undefined;
    if (!serverContent) {
      return;
    }

    const inputTranscription = serverContent.inputTranscription as
      | { text?: unknown }
      | undefined;
    if (
      typeof inputTranscription?.text === "string" &&
      inputTranscription.text.trim()
    ) {
      this.callbacks.onTranscription?.(inputTranscription.text.trim(), true);
    }

    const outputTranscription = serverContent.outputTranscription as
      | { text?: unknown }
      | undefined;
    if (
      typeof outputTranscription?.text === "string" &&
      outputTranscription.text.trim()
    ) {
      this.callbacks.onTranscription?.(outputTranscription.text.trim(), false);
    }

    const modelTurn = serverContent.modelTurn as
      | { parts?: Array<Record<string, unknown>> }
      | undefined;
    for (const part of modelTurn?.parts ?? []) {
      if (
        typeof part.text === "string" &&
        part.text.trim() &&
        !outputTranscription?.text
      ) {
        this.callbacks.onTranscription?.(part.text.trim(), false);
      }
      if (part.inlineData && typeof part.inlineData === "object") {
        const inlineData = part.inlineData as {
          mimeType?: string;
          data?: string;
        };
        if (
          inlineData.mimeType?.startsWith("audio/") &&
          typeof inlineData.data === "string"
        ) {
          void this.playAudioChunk(inlineData.data);
        }
      }
    }

    if (serverContent.interrupted) {
      this.setStatus("listening");
    }
  }

  private async startMicrophoneCapture() {
    if (this.microphoneStarted) {
      return;
    }
    this.microphoneStarted = true;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Ce navigateur ne permet pas l’accès au microphone. Utilisez une page HTTPS et un navigateur récent."
        );
      }
      const stream =
        this.mediaStream ??
        (await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 16_000,
          },
        }));
      this.mediaStream = stream;

      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) {
        throw new Error(
          "L’audio temps réel n’est pas pris en charge par ce navigateur."
        );
      }
      this.audioContext = new AudioCtx({ sampleRate: 16_000 });
      await this.audioContext.resume();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.processor = this.audioContext.createScriptProcessor(512, 1, 1);

      this.processor.onaudioprocess = (event) => {
        if (
          this.isMuted ||
          (this.status !== "connected" && this.status !== "listening")
        ) {
          return;
        }
        const inputData = event.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        this.callbacks.onAudioLevel?.(
          Math.min(1, Math.sqrt(sum / inputData.length) * 5)
        );

        for (let i = 0; i < inputData.length; i++) {
          const sample = Math.max(-1, Math.min(1, inputData[i]));
          this.pendingPcm[this.pendingPcmCount++] =
            sample < 0 ? sample * 0x80_00 : sample * 0x7f_ff;
          if (this.pendingPcmCount === PCM_CHUNK_SAMPLES) {
            this.sendAudioChunk(this.pendingPcm);
            this.pendingPcm = new Int16Array(PCM_CHUNK_SAMPLES);
            this.pendingPcmCount = 0;
          }
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.setStatus("listening");
    } catch (error: unknown) {
      this.connectionFailed = true;
      const name = error instanceof Error ? error.name : "";
      const message =
        name === "NotAllowedError" ||
        name === "PermissionDeniedError" ||
        name === "SecurityError"
          ? "L’accès au microphone a été refusé. Autorisez le microphone pour idealy-ai.vercel.app dans les paramètres du navigateur, puis relancez le mode Live."
          : error instanceof Error
            ? error.message
            : "Impossible d’accéder au microphone.";
      this.callbacks.onError?.(message);
      this.cleanup();
      this.setStatus("error");
    }
  }

  private sendAudioChunk(pcm16: Int16Array) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return;
    }
    const bytes = new Uint8Array(
      pcm16.buffer,
      pcm16.byteOffset,
      pcm16.byteLength
    );
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    this.ws.send(
      JSON.stringify({
        realtimeInput: {
          mediaChunks: [
            { data: btoa(binary), mimeType: "audio/pcm;rate=16000" },
          ],
        },
      })
    );
  }

  private async playAudioChunk(base64Data: string) {
    try {
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32_768;
      }

      if (!this.audioContext) {
        const AudioCtx =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtx) {
          return;
        }
        this.audioContext = new AudioCtx({ sampleRate: 24_000 });
      }
      const audioBuffer = this.audioContext.createBuffer(
        1,
        float32.length,
        24_000
      );
      audioBuffer.getChannelData(0).set(float32);
      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.audioContext.destination);
      sourceNode.onended = () => {
        if (this.status === "speaking") {
          this.setStatus("listening");
        }
      };
      this.setStatus("speaking");
      sourceNode.start();
    } catch (error) {
      console.warn("[LiveAudioClient] audio playback error:", error);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public disconnect() {
    this.cleanup();
    this.setStatus("disconnected");
  }

  private cleanup(closeSocket = true) {
    const socket = this.ws;
    this.ws = null;
    if (closeSocket && socket && socket.readyState < WebSocket.CLOSING) {
      try {
        socket.close();
      } catch {
        /* ignore close races */
      }
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== "closed") {
      void this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
    this.pendingPcm = new Int16Array(PCM_CHUNK_SAMPLES);
    this.pendingPcmCount = 0;
    this.microphoneStarted = false;
  }
}
