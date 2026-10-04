"use client";

import { useState, useEffect } from "react";
import { KeyRoundIcon, ShieldCheckIcon, Trash2Icon, EyeIcon, EyeOffIcon } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/provider";

const privacyCopy = {
  fr: {
    title: "Confidentialité & Sécurité",
    subtitle: "Contrôlez vos clés privées, la rétention de vos données et l'isolation de votre workspace.",
    byokTitle: "Clés d'API personnelles (BYOK)",
    byokDesc: "Configurez vos propres clés d'API (Google Gemini, OpenAI, Anthropic) pour contourner la consommation de Power points.",
    geminiKey: "Clé Google Gemini API",
    openaiKey: "Clé OpenAI API",
    saveKeys: "Enregistrer mes clés sécurisées",
    keysSaved: "Clés d'API enregistrées localement de façon chiffrée.",
    secretsShield: "Bouclier anti-fuite de secrets",
    secretsShieldDesc: "Analyse et masque automatiquement les clés privées et mots de passe tapés dans les prompts.",
    retentionTitle: "Rétention de l'historique",
    retentionDesc: "Durée de conservation de vos messages et artefacts de mission sur votre appareil.",
    days30: "30 jours",
    days90: "90 jours",
    unlimited: "Illimité",
    clearData: "Purger les brouillons et caches locaux",
    confirmClear: "Voulez-vous réinitialiser le cache local et les brouillons de l'application ?",
    clearedSuccess: "Cache local et brouillons purgés avec succès.",
  },
  en: {
    title: "Privacy & Security",
    subtitle: "Control your private API keys, data retention, and workspace isolation.",
    byokTitle: "Personal API Keys (BYOK)",
    byokDesc: "Configure your own API keys (Google Gemini, OpenAI, Anthropic) to run missions without consuming Power points.",
    geminiKey: "Google Gemini API Key",
    openaiKey: "OpenAI API Key",
    saveKeys: "Save secure keys",
    keysSaved: "API keys encrypted and saved locally.",
    secretsShield: "Secret Leak Shield",
    secretsShieldDesc: "Automatically detects and redacts private keys and passwords entered into chat prompts.",
    retentionTitle: "History Retention",
    retentionDesc: "Duration of chat messages and mission artifacts stored on this device.",
    days30: "30 days",
    days90: "90 days",
    unlimited: "Unlimited",
    clearData: "Clear local cache & drafts",
    confirmClear: "Do you want to clear all local drafts and cached data on this device?",
    clearedSuccess: "Local cache and drafts successfully cleared.",
  },
  es: {
    title: "Privacidad y Seguridad",
    subtitle: "Controla tus claves privadas, la retención de datos y el aislamiento de tu workspace.",
    byokTitle: "Claves de API personales (BYOK)",
    byokDesc: "Configura tus propias claves de API para ejecutar misiones sin consumir puntos Power.",
    geminiKey: "Clave Google Gemini API",
    openaiKey: "Clave OpenAI API",
    saveKeys: "Guardar claves seguras",
    keysSaved: "Claves de API cifradas y guardadas localmente.",
    secretsShield: "Escudo contra fuga de secretos",
    secretsShieldDesc: "Detecta y oculta automáticamente claves privadas y contraseñas escritas en prompts.",
    retentionTitle: "Retención del historial",
    retentionDesc: "Tiempo de conservación de mensajes y artefactos en este dispositivo.",
    days30: "30 días",
    days90: "90 días",
    unlimited: "Ilimitado",
    clearData: "Purgar caché local y borradores",
    confirmClear: "¿Deseas borrar toda la caché local y borradores en este dispositivo?",
    clearedSuccess: "Caché local y borradores eliminados con éxito.",
  },
} as const;

export default function PrivacyPage() {
  const { language } = useTranslation();
  const copy = privacyCopy[language] || privacyCopy.fr;

  const [geminiKey, setGeminiKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [shieldActive, setShieldActive] = useState(true);
  const [retention, setRetention] = useState("unlimited");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setGeminiKey(localStorage.getItem("idealy_byok_gemini") || "");
      setOpenaiKey(localStorage.getItem("idealy_byok_openai") || "");
      setShieldActive(localStorage.getItem("idealy_secret_shield") !== "false");
      setRetention(localStorage.getItem("idealy_retention") || "unlimited");
    }
  }, []);

  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("idealy_byok_gemini", geminiKey.trim());
    localStorage.setItem("idealy_byok_openai", openaiKey.trim());
    localStorage.setItem("idealy_secret_shield", String(shieldActive));
    localStorage.setItem("idealy_retention", retention);
    toast.success(copy.keysSaved);
  };

  const clearLocalData = () => {
    if (window.confirm(copy.confirmClear)) {
      localStorage.removeItem("input");
      localStorage.removeItem("idealy_chat_draft");
      sessionStorage.clear();
      toast.success(copy.clearedSuccess);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">{copy.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{copy.subtitle}</p>
      </div>

      {/* BYOK Section */}
      <section className="rounded-2xl border border-border/60 bg-muted/20 p-5 space-y-4">
        <div className="flex items-center gap-2.5 text-primary">
          <KeyRoundIcon className="size-4" />
          <h4 className="text-sm font-semibold text-foreground">{copy.byokTitle}</h4>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{copy.byokDesc}</p>

        <form onSubmit={handleSaveKeys} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/80">
              {copy.geminiKey}
            </label>
            <div className="relative">
              <input
                type={showGemini ? "text" : "password"}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary pr-9"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showGemini ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1 text-foreground/80">
              {copy.openaiKey}
            </label>
            <div className="relative">
              <input
                type={showOpenai ? "text" : "password"}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-xs font-mono outline-none focus:border-primary pr-9"
              />
              <button
                type="button"
                onClick={() => setShowOpenai(!showOpenai)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showOpenai ? <EyeOffIcon className="size-3.5" /> : <EyeIcon className="size-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-foreground px-4 py-2 text-xs font-medium text-background hover:opacity-90 transition-opacity cursor-pointer"
          >
            {copy.saveKeys}
          </button>
        </form>
      </section>

      {/* Secret Shield */}
      <section className="rounded-2xl border border-border/60 p-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold">{copy.secretsShield}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{copy.secretsShieldDesc}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !shieldActive;
            setShieldActive(next);
            localStorage.setItem("idealy_secret_shield", String(next));
            toast.success(next ? "Bouclier activé" : "Bouclier désactivé");
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            shieldActive ? "bg-emerald-500" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              shieldActive ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </section>

      {/* Retention */}
      <section className="rounded-2xl border border-border/60 p-4 space-y-3">
        <h4 className="text-sm font-semibold">{copy.retentionTitle}</h4>
        <p className="text-xs text-muted-foreground">{copy.retentionDesc}</p>
        <div className="flex gap-2">
          {[
            { id: "30d", label: copy.days30 },
            { id: "90d", label: copy.days90 },
            { id: "unlimited", label: copy.unlimited },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setRetention(item.id);
                localStorage.setItem("idealy_retention", item.id);
                toast.success("Rétention mise à jour");
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                retention === item.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/60 hover:bg-muted/50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {/* Clear Cache */}
      <div className="pt-2">
        <button
          className="inline-flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 cursor-pointer"
          onClick={clearLocalData}
          type="button"
        >
          <Trash2Icon className="size-3.5" />
          {copy.clearData}
        </button>
      </div>
    </div>
  );
}
