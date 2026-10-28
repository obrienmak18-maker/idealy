"use client";

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
      const res = await fetch("/api/voice/session");
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
        this.startMicrophone();
      };

      this.ws.onmessage = async (event) => {
        try {
          const raw = typeof event.data === "string" ? event.data : await (event.data as Blob).text();
          const response = JSON.parse(raw);

          // Handle server audio turn
          const parts = response?.serverContent?.modelTurn?.parts;
          if (Array.isArray(parts)) {
            for (const part of parts) {
              if (part?.inlineData?.mimeType?.startsWith("audio/pcm")) {
                this.setStatus("speaking");
                this.playPcmChunk(part.inlineData.data);
              }
              if (part?.text) {
                this.callbacks.onTranscription?.(part.text, false);
              }
            }
          }

          if (response?.serverContent?.turnComplete) {
            this.setStatus("listening");
          }
        } catch {
          // Non-JSON binary or raw chunk
        }
      };

      this.ws.onerror = () => {
        this.setStatus("error");
        this.callbacks.onError?.("Erreur de connexion WebSocket Live API");
      };

      this.ws.onclose = () => {
        this.disconnect();
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur connexion Live";
      this.setStatus("error");
      this.callbacks.onError?.(msg);
      this.disconnect();
    }
  }

  private async startMicrophone() {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted || this.status === "disconnected") return;

        const inputData = e.inputBuffer.getChannelData(0);
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        this.callbacks.onAudioLevel?.(Math.min(1, rms * 5));

        // Convert Float32 to Int16 PCM
        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Send PCM chunk as Base64 to WebSocket
        const binary = String.fromCharCode(...new Uint8Array(pcm16.buffer));
        const base64Audio = btoa(binary);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          const realtimeInput = {
            realtimeInput: {
              mediaChunks: [
                {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64Audio,
                },
              ],
            },
          };
          this.ws.send(JSON.stringify(realtimeInput));
        }
      };

      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);
      this.setStatus("listening");
    } catch (micError) {
      console.warn("[Live Audio Mic Error]", micError);
      this.callbacks.onError?.("Accès micro refusé");
      this.setStatus("error");
    }
  }

  private playPcmChunk(base64Data: string) {
    try {
      if (!this.audioContext) return;
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Data = new Int16Array(bytes.buffer);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }

      const buffer = this.audioContext.createBuffer(1, float32Data.length, 24000);
      buffer.copyToChannel(float32Data, 0);

      const sourceNode = this.audioContext.createBufferSource();
      sourceNode.buffer = buffer;
      sourceNode.connect(this.audioContext.destination);
      sourceNode.start();
    } catch {
      // Audio playback buffer error
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public disconnect() {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus("disconnected");
  }
}
