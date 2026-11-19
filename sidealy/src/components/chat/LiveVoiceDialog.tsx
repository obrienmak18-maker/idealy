import { useEffect, useState, useRef } from "react";
import { Mic, MicOff, PhoneOff, Radio, Volume2 } from "lucide-react";
import { LiveAudioClient, type LiveSessionStatus } from "../../services/liveAudioClient";
import { useTranslation } from "../../services/i18n";
import { useApp } from "../../context/AppContext";

export type LiveVoiceDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  wayName?: string;
};

const wayThemes: Record<string, { badge: string; glow: string; text: string }> = {
  ninja: {
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    glow: "from-orange-500/40 to-red-500/30",
    text: "text-orange-400",
  },
  mage: {
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    glow: "from-sky-500/40 to-violet-500/30",
    text: "text-sky-400",
  },
  hunter: {
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    glow: "from-emerald-500/40 to-cyan-500/30",
    text: "text-emerald-400",
  },
  professional: {
    badge: "bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20",
    glow: "from-fuchsia-500/40 to-amber-500/30",
    text: "text-fuchsia-400",
  },
};

function getWayDisplayLabel(way: string, lang: string): string {
  const isEn = lang === "en";
  const isEs = lang === "es";
  switch (way) {
    case "mage":
      return isEn ? "Mage Way" : isEs ? "Camino del Mago" : "Voie du Mage";
    case "hunter":
      return isEn ? "Hunter Way" : isEs ? "Camino del Cazador" : "Voie du Hunter";
    case "professional":
      return isEn ? "Pro Way" : isEs ? "Camino Profesional" : "Voie du Pro";
    case "ninja":
    default:
      return isEn ? "Ninja Way" : isEs ? "Camino del Ninja" : "Voie du Ninja";
  }
}

export function LiveVoiceDialog({
  isOpen,
  onClose,
  wayName = "ninja",
}: LiveVoiceDialogProps) {
  const { language } = useApp();
  const { t } = useTranslation();
  const normalizedWay = (wayName || "ninja").toLowerCase();
  const activeTheme = wayThemes[normalizedWay] || wayThemes.ninja;
  const wayLabel = getWayDisplayLabel(normalizedWay, language);
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
              {t("voice.title")} — {wayLabel}
            </h3>
          </div>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${activeTheme.badge}`}>
            {wayLabel}
          </span>
        </div>

        {/* Animated Glowing Audio Orb */}
        <div className="relative my-8 flex flex-col items-center justify-center">
          <div
            className={`relative grid size-28 place-items-center rounded-full bg-gradient-to-tr ${activeTheme.glow} shadow-lg transition-transform duration-100`}
            style={{
              transform: `scale(${1 + audioLevel * 0.35})`,
            }}
          >
            <div className={`size-20 rounded-full bg-gradient-to-tr ${activeTheme.glow} opacity-80 blur-md transition-opacity duration-150`} />
            <div className="relative z-10 grid size-16 place-items-center rounded-full bg-[#121624] shadow-inner">
              {status === "speaking" ? (
                <Volume2 className="size-7 text-emerald-400 animate-pulse" />
              ) : (
                <Mic className={`size-7 ${activeTheme.text}`} />
              )}
            </div>
          </div>

          <p className="mt-4 text-xs font-medium text-zinc-400">
            {status === "connecting" && (language === "fr" ? "Connexion au flux vocal temps réel…" : language === "es" ? "Conectando al flujo de voz en tiempo real…" : "Connecting to real-time voice stream…")}
            {status === "listening" && (language === "fr" ? "Idealy vous écoute…" : language === "es" ? "Idealy está escuchando…" : "Idealy is listening…")}
            {status === "speaking" && (language === "fr" ? "Idealy répond à la voix…" : language === "es" ? "Idealy está respondiendo…" : "Idealy is speaking…")}
            {status === "error" && (errorMessage || t("voice.statusError"))}
            {status === "disconnected" && t("voice.statusDisconnected")}
          </p>
        </div>

        {/* Live Transcripts */}
        {transcripts.length > 0 && (
          <div className="max-h-24 overflow-y-auto rounded-lg border border-white/10 bg-black/40 p-2.5 text-xs text-zinc-300 space-y-1">
            {transcripts.map((tItem, idx) => (
              <p key={idx} className={tItem.isUser ? "text-cyan-400" : "text-zinc-200"}>
                <span className="font-semibold">{tItem.isUser ? (language === "fr" ? "Vous" : language === "es" ? "Tú" : "You") : "Idealy"} : </span>
                {tItem.text}
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
            title={isMuted ? t("voice.unmute") : t("voice.mute")}
          >
            {isMuted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>

          <button
            type="button"
            onClick={handleHangup}
            className="grid size-12 place-items-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
            title={t("voice.endSession")}
          >
            <PhoneOff className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
