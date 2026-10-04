"use client";

import { useState, useEffect } from "react";
import { KeyboardIcon, PlayIcon, CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/provider";

const shortcutsCopy = {
  fr: {
    title: "Raccourcis clavier",
    subtitle: "Gagnez en vélocité pendant vos sessions de création avec l'escouade.",
    testTitle: "Testeur de raccourcis interactif",
    testPlaceholder: "Tapez une combinaison au clavier pour la tester...",
    testMatched: "Raccourci reconnu !",
    testNone: "Combinaison détectée :",
    cmdPaletteTitle: "Ouvrir la palette de commandes",
    cmdPaletteDesc: "Recherche instantanée d'actions, de fichiers et de missions",
    newChatTitle: "Nouvelle discussion / mission",
    newChatDesc: "Réinitialise le chat et lance un nouveau contexte de travail",
    toggleSidebarTitle: "Basculer la barre latérale",
    toggleSidebarDesc: "Affiche ou masque le panneau gauche pour maximiser l'espace",
    toggleVoiceTitle: "Activer / couper la dictée vocale",
    toggleVoiceDesc: "Lance la reconnaissance vocale sans utiliser la souris",
    closeModalTitle: "Fermer les modales et fenêtres",
    closeModalDesc: "Quitte n'importe quel panneau ou dialogue ouvert",
    submitTitle: "Envoyer le message",
    submitDesc: "Transmet l'ordre de mission à l'escouade",
    newLineTitle: "Nouvelle ligne dans le prompt",
    newLineDesc: "Saut de ligne sans soumettre le formulaire",
    testBtn: "Tester l'action",
  },
  en: {
    title: "Keyboard Shortcuts",
    subtitle: "Accelerate your velocity while building with the AI squad.",
    testTitle: "Interactive shortcut tester",
    testPlaceholder: "Press any key combination on your keyboard...",
    testMatched: "Shortcut recognized!",
    testNone: "Detected key combination:",
    cmdPaletteTitle: "Open Command Palette",
    cmdPaletteDesc: "Instant lookup for actions, files, and missions",
    newChatTitle: "New Chat / Mission",
    newChatDesc: "Resets the chat and initiates a fresh workspace context",
    toggleSidebarTitle: "Toggle Sidebar",
    toggleSidebarDesc: "Expands or collapses the left sidebar to maximize workspace",
    toggleVoiceTitle: "Toggle Voice Input",
    toggleVoiceDesc: "Triggers speech recognition hands-free",
    closeModalTitle: "Close Modals & Dialogs",
    closeModalDesc: "Dismisses any currently open overlay or panel",
    submitTitle: "Send Message",
    submitDesc: "Dispatches the mission brief to the squad",
    newLineTitle: "New line in prompt",
    newLineDesc: "Line break without submitting",
    testBtn: "Test action",
  },
  es: {
    title: "Atajos de teclado",
    subtitle: "Acelera tu velocidad de creación con el equipo de IA.",
    testTitle: "Probador interactivo de atajos",
    testPlaceholder: "Presiona cualquier combinación en tu teclado...",
    testMatched: "¡Atajo reconocido!",
    testNone: "Combinación detectada:",
    cmdPaletteTitle: "Abrir paleta de comandos",
    cmdPaletteDesc: "Búsqueda instantánea de acciones, archivos y misiones",
    newChatTitle: "Nueva conversación / misión",
    newChatDesc: "Reinicia el chat e inicia un nuevo contexto",
    toggleSidebarTitle: "Alternar barra lateral",
    toggleSidebarDesc: "Expande o contrae el panel izquierdo",
    toggleVoiceTitle: "Activar / pausar dictado por voz",
    toggleVoiceDesc: "Inicia el reconocimiento de voz",
    closeModalTitle: "Cerrar modales y diálogos",
    closeModalDesc: "Cierra cualquier ventana emergente",
    submitTitle: "Enviar mensaje",
    submitDesc: "Transmite la orden de misión al equipo",
    newLineTitle: "Nueva línea en prompt",
    newLineDesc: "Salto de línea sin enviar",
    testBtn: "Probar acción",
  },
} as const;

export default function ShortcutsPage() {
  const { language } = useTranslation();
  const copy = shortcutsCopy[language] || shortcutsCopy.fr;
  const [pressedCombo, setPressedCombo] = useState<string>("");
  const [matchedAction, setMatchedAction] = useState<string | null>(null);

  const shortcutsList = [
    {
      keys: ["⌘", "K"],
      altKeys: ["Ctrl", "K"],
      title: copy.cmdPaletteTitle,
      desc: copy.cmdPaletteDesc,
      action: () => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }));
        toast.info("Palette de commandes ouverte");
      },
    },
    {
      keys: ["⌘", "⇧", "O"],
      altKeys: ["Ctrl", "Shift", "O"],
      title: copy.newChatTitle,
      desc: copy.newChatDesc,
      action: () => {
        toast.info("Raccourci Nouvelle Discussion validé");
      },
    },
    {
      keys: ["⌘", "/"],
      altKeys: ["Ctrl", "/"],
      title: copy.toggleSidebarTitle,
      desc: copy.toggleSidebarDesc,
      action: () => {
        toast.info("Raccourci Barre Latérale validé");
      },
    },
    {
      keys: ["⌘", "M"],
      altKeys: ["Ctrl", "M"],
      title: copy.toggleVoiceTitle,
      desc: copy.toggleVoiceDesc,
      action: () => {
        window.dispatchEvent(new CustomEvent("idealy:toggle-voice"));
        toast.info("Microphonie activée");
      },
    },
    {
      keys: ["Esc"],
      altKeys: ["Échap"],
      title: copy.closeModalTitle,
      desc: copy.closeModalDesc,
      action: () => {
        toast.info("Fermeture des panneaux");
      },
    },
    {
      keys: ["Enter"],
      altKeys: ["Entrée"],
      title: copy.submitTitle,
      desc: copy.submitDesc,
    },
    {
      keys: ["⇧", "Enter"],
      altKeys: ["Shift", "Entrée"],
      title: copy.newLineTitle,
      desc: copy.newLineDesc,
    },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const parts: string[] = [];
      if (e.metaKey || e.ctrlKey) parts.push("Ctrl");
      if (e.shiftKey) parts.push("Shift");
      if (e.altKey) parts.push("Alt");
      if (e.key && !["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        parts.push(e.key.toUpperCase());
      }
      if (parts.length > 0) {
        const combo = parts.join(" + ");
        setPressedCombo(combo);

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
          setMatchedAction(copy.cmdPaletteTitle);
        } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "o") {
          setMatchedAction(copy.newChatTitle);
        } else if ((e.ctrlKey || e.metaKey) && e.key === "/") {
          setMatchedAction(copy.toggleSidebarTitle);
        } else if (e.key === "Escape") {
          setMatchedAction(copy.closeModalTitle);
        } else {
          setMatchedAction(null);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [copy]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">{copy.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{copy.subtitle}</p>
      </div>

      {/* Interactive tester box */}
      <section className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card/50 to-primary/5 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyboardIcon className="size-4 text-primary" />
            <h4 className="text-xs font-semibold uppercase tracking-wider text-primary">
              {copy.testTitle}
            </h4>
          </div>
          {matchedAction && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-semibold">
              <CheckCircle2Icon className="size-3.5" /> {copy.testMatched}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/80 px-4 py-3">
          <span className="text-xs font-mono text-foreground font-semibold">
            {pressedCombo || copy.testPlaceholder}
          </span>
          {matchedAction && (
            <span className="text-xs font-medium text-primary bg-primary/15 px-2 py-0.5 rounded-md">
              {matchedAction}
            </span>
          )}
        </div>
      </section>

      {/* Shortcuts List */}
      <div className="space-y-2">
        {shortcutsList.map((item, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-4 rounded-xl border border-border/60 bg-muted/15 p-3.5 transition-colors hover:bg-muted/30"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {item.keys.map((k, i) => (
                  <kbd
                    key={i}
                    className="inline-flex min-w-[24px] items-center justify-center rounded-md border border-border/80 bg-background px-1.5 py-1 text-[11px] font-mono font-semibold text-foreground shadow-xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
              {item.action && (
                <button
                  type="button"
                  onClick={item.action}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  title={copy.testBtn}
                >
                  <PlayIcon className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
