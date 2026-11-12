import { useEffect, useState, useRef } from "react";
import { Mic, MicOff, PhoneOff, Radio, Volume2 } from "lucide-react";
import { LiveAudioClient, type LiveSessionStatus } from "../../services/liveAudioClient";

export type LiveVoiceDialogProps = {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#0d0f17]/95 p-6 shadow-2xl backdrop-blur-xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="size-4 animate-pulse text-emerald-400" />
            <h3 className="text-sm font-semibold tracking-tight text-white">
              Mode vocal Live (Gemini 3.8 Live)
            </h3>
          </div>
          <span className="rounded-full bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-medium text-cyan-400 border border-cyan-500/20">
            Voie {wayName}
          </span>
        </div>

        {/* Animated Glowing Audio Orb */}
        <div className="relative my-8 flex flex-col items-center justify-center">
          <div
            className="relative grid size-28 place-items-center rounded-full bg-gradient-to-tr from-cyan-500/30 to-emerald-500/20 shadow-lg transition-transform duration-100"
            style={{
              transform: `scale(${1 + audioLevel * 0.35})`,
            }}
          >
            <div className="size-20 rounded-full bg-gradient-to-tr from-cyan-400 to-emerald-400 opacity-80 blur-md transition-opacity duration-150" />
            <div className="relative z-10 grid size-16 place-items-center rounded-full bg-[#121624] shadow-inner">
              {status === "speaking" ? (
                <Volume2 className="size-7 text-emerald-400 animate-pulse" />
              ) : (
                <Mic className="size-7 text-cyan-400" />
              )}
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-zinc-400">
            {status === "connecting" && "Connexion au flux vocal temps réel…"}
            {status === "listening" && "Idealy vous écoute…"}
            {status === "speaking" && "Idealy répond à la voix…"}
            {status === "error" && (errorMessage || "Erreur de connexion")}
            {status === "disconnected" && "Session terminée"}
          </p>
        </div>

        {/* Live Transcripts */}
        {transcripts.length > 0 && (
          <div className="max-h-24 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-zinc-300 space-y-1">
            {transcripts.map((t, idx) => (
              <p key={idx} className={t.isUser ? "text-cyan-400" : "text-zinc-200"}>
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
                ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                : "border-white/10 bg-white/5 text-zinc-200 hover:bg-white/10"
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
