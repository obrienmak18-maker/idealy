// lib/ai/live-audio-client.ts ported to Sidealy
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

export class LiveAudioClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private callbacks: LiveAudioClientCallbacks;
  private status: LiveSessionStatus = "disconnected";
  private isMuted = false;

  constructor(callbacks: LiveAudioClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  private setStatus(status: LiveSessionStatus) {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  public async connect(): Promise<void> {
    if (this.status !== "disconnected") return;
    this.setStatus("connecting");

    try {
      // 1. Fetch authorized session from server
      const bearer = await getBearerToken();
      const headers: Record<string, string> = {};
      if (bearer) {
        headers["Authorization"] = `Bearer ${bearer}`;
      }
      const res = await fetch("/api/voice/session", { headers });
      if (!res.ok) throw new Error("Impossible de créer la session vocale");
      const config = await res.json();

      if (!config.configured) {
        throw new Error(config.error || "Gemini Live API non configurée");
      }

      // 2. Open WebSocket to Gemini Live endpoint
      this.ws = new WebSocket(config.wsUrl);

      this.ws.onopen = () => {
        // Send initial handshake setup
        const setupMessage = {
          setup: {
            model: `models/${config.model}`,
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
          },
        };
        this.ws?.send(JSON.stringify(setupMessage));
        this.setStatus("connected");
        this.startMicrophoneCapture();
      };

      this.ws.onmessage = async (event) => {
        try {
          let data: Record<string, unknown>;
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            data = JSON.parse(text);
          } else {
            data = JSON.parse(event.data);
          }

          this.handleServerMessage(data);
        } catch (e) {
          console.warn("[LiveAudioClient] parse error:", e);
        }
      };

      this.ws.onerror = (e) => {
        console.error("[LiveAudioClient] WebSocket error:", e);
        this.callbacks.onError?.("Erreur de connexion WebSocket Live Voice");
        this.setStatus("error");
      };

      this.ws.onclose = () => {
        this.cleanup();
        this.setStatus("disconnected");
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de connexion";
      this.callbacks.onError?.(msg);
      this.setStatus("error");
      this.cleanup();
    }
  }

  private async startMicrophoneCapture() {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Buffer size 512 gives ~32ms chunks at 16kHz
      this.processor = this.audioContext.createScriptProcessor(512, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || this.status !== "connected" && this.status !== "listening") return;

        const inputData = e.inputBuffer.getChannelData(0);

        // Calculate simple audio level
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.callbacks.onAudioLevel?.(Math.min(1, rms * 5));

        // Convert float32 [-1, 1] to PCM 16-bit
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Base64 encode PCM data
        const uint8 = new Uint8Array(pcm16.buffer);
        let binary = "";
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const base64Audio = btoa(binary);

        const audioMsg = {
          realtimeInput: {
            mediaChunks: [
              {
                mimeType: "audio/pcm;rate=16000",
                data: base64Audio,
              },
            ],
          },
        };

        if (this.ws?.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(audioMsg));
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.setStatus("listening");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Impossible d'accéder au micro";
      this.callbacks.onError?.(msg);
      this.setStatus("error");
    }
  }

  private handleServerMessage(data: Record<string, unknown>) {
    // 1. Check for audio chunks from model
    const serverContent = data.serverContent as Record<string, unknown> | undefined;
    if (serverContent?.modelTurn) {
      const modelTurn = serverContent.modelTurn as Record<string, unknown>;
      const parts = modelTurn.parts as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(parts)) {
        for (const part of parts) {
          if (part.inlineData) {
            const inlineData = part.inlineData as { mimeType: string; data: string };
            if (inlineData.mimeType.startsWith("audio/")) {
              this.playAudioChunk(inlineData.data);
            }
          }
          if (typeof part.text === "string" && part.text) {
            this.callbacks.onTranscription?.(part.text, false);
          }
        }
      }
    }

    // 2. Check for user transcription
    if (serverContent?.interrupted) {
      this.setStatus("listening");
    }
  }

  private async playAudioChunk(base64Data: string) {
    try {
      this.setStatus("speaking");
      const binary = atob(base64Data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }

      if (!this.audioContext) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        this.audioContext = new AudioCtx({ sampleRate: 24000 });
      }

      const audioBuffer = this.audioContext.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = audioBuffer;
      sourceNode.connect(this.audioContext.destination);
      sourceNode.onended = () => {
        if (this.status === "speaking") {
          this.setStatus("listening");
        }
      };
      sourceNode.start();
    } catch (e) {
      console.warn("[LiveAudioClient] playAudio error:", e);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public disconnect() {
    this.cleanup();
    this.setStatus("disconnected");
  }

  private cleanup() {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
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
      this.audioContext.close().catch(() => undefined);
      this.audioContext = null;
    }
  }
}
