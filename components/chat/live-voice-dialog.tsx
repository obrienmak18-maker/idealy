"use client";

import { useEffect, useState, useRef } from "react";
import { Mic, MicOff, PhoneOff, Radio, Volume2 } from "lucide-react";
import { LiveAudioClient, type LiveSessionStatus } from "@/lib/ai/live-audio-client";

type LiveVoiceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  wayName?: string;
};

export function LiveVoiceDialog({
  isOpen,
  onClose,
  wayName = "Ninja",
}: LiveVoiceDialogProps) {
  const [status, setStatus] = useState<LiveSessionStatus>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcripts, setTranscripts] = useState<Array<{ text: string; isUser: boolean }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const clientRef = useRef<LiveAudioClient | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setTranscripts([]);
      const client = new LiveAudioClient({
        onStatusChange: (s) => setStatus(s),
        onTranscription: (text, isUser) => {
          setTranscripts((prev) => [...prev.slice(-10), { text, isUser }]);
        },
        onError: (err) => setErrorMessage(err),
        onAudioLevel: (lvl) => setAudioLevel(lvl),
      });
      clientRef.current = client;
      client.connect();

      return () => {
        client.disconnect();
        clientRef.current = null;
      };
    } else {
      clientRef.current?.disconnect();
      clientRef.current = null;
    }
  }, [isOpen]);

  const toggleMute = () => {
    if (clientRef.current) {
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      clientRef.current.setMute(nextMuted);
    }
  };

  const handleHangup = () => {
    clientRef.current?.disconnect();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="size-4 animate-pulse text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Mode Vocal Live (Gemini 3.8 / 2.0 Live)
            </h3>
          </div>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            Voie {wayName}
          </span>
        </div>

        {/* Animated Glowing Audio Orb */}
        <div className="relative my-8 flex flex-col items-center justify-center">
          <div
            className="relative grid size-28 place-items-center rounded-full bg-gradient-to-tr from-primary/30 to-emerald-500/20 shadow-lg transition-transform duration-100"
            style={{
              transform: `scale(${1 + audioLevel * 0.35})`,
            }}
          >
            <div className="size-20 rounded-full bg-gradient-to-tr from-primary to-emerald-500 opacity-80 blur-md transition-opacity duration-150" />
            <div className="relative z-10 grid size-16 place-items-center rounded-full bg-card shadow-inner">
              {status === "speaking" ? (
                <Volume2 className="size-7 text-emerald-400 animate-pulse" />
              ) : (
                <Mic className="size-7 text-primary" />
              )}
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-muted-foreground">
            {status === "connecting" && "Connexion au flux vocal temps réel…"}
            {status === "listening" && "Idealy vous écoute…"}
            {status === "speaking" && "Idealy répond à la voix…"}
            {status === "error" && (errorMessage || "Erreur de connexion")}
            {status === "disconnected" && "Session terminée"}
          </p>
        </div>

        {/* Live Transcripts */}
        {transcripts.length > 0 && (
          <div className="max-h-24 overflow-y-auto rounded-lg border border-border/40 bg-background/50 p-2.5 text-xs text-muted-foreground space-y-1">
            {transcripts.map((t, idx) => (
              <p key={idx} className={t.isUser ? "text-primary" : "text-foreground"}>
                <span className="font-semibold">{t.isUser ? "Vous" : "Idealy"} : </span>
                {t.text}
              </p>
            ))}
          </div>
        )}

        {/* Actions Controls */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={toggleMute}
            className={`grid size-12 place-items-center rounded-full border transition-colors ${
              isMuted
                ? "border-amber-500/50 bg-amber-500/10 text-amber-500"
                : "border-border/60 bg-muted/60 text-foreground hover:bg-muted"
            }`}
            title={isMuted ? "Activer le micro" : "Couper le micro"}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          <button
            type="button"
            onClick={handleHangup}
            className="grid size-12 place-items-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            title="Terminer l'appel"
          >
            <PhoneOff className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
