"use client";

import {
  ArrowUpIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  Code2Icon,
  EyeIcon,
  SparklesIcon,
  WandSparklesIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DemoMessage = {
  id: number;
  author: string;
  role: string;
  text: string;
  kind: "user" | "agent" | "system";
  color: string;
};

const samplePrompt =
  "Crée une landing page pour une application de coaching créatif, avec une section mission et un espace pour commencer.";
const agentSteps = [
  {
    color: "from-violet-400 to-indigo-500",
    name: "Le Maître",
    role: "Orchestration",
    text: "Je transforme votre idée en une mission claire et je prépare les prochaines étapes.",
  },
  {
    color: "from-emerald-400 to-cyan-500",
    name: "Les Nains",
    role: "Construction",
    text: "La structure du workspace est prête. Je prépare les composants et le parcours principal.",
  },
  {
    color: "from-fuchsia-400 to-yellow-400",
    name: "Chakra",
    role: "Expérience",
    text: "J’aligne les couleurs, les états et les interactions pour que l’expérience reste fluide.",
  },
];

export default function DemoFlowPage() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeAgent, setActiveAgent] = useState("");
  const [missionDone, setMissionDone] = useState(false);

  const visiblePrompt = useMemo(() => input || samplePrompt, [input]);

  useEffect(() => {
    if (!running) {
      return;
    }
    let step = 0;
    setProgress(8);
    const timer = setInterval(() => {
      const agent = agentSteps[step];
      if (!agent) {
        clearInterval(timer);
        setActiveAgent("");
        setProgress(100);
        setMissionDone(true);
        setPreviewOpen(true);
        setMessages((current) => [
          ...current,
          {
            author: "Idealy",
            color: "from-white to-white/60",
            id: Date.now(),
            kind: "system",
            role: "Mission terminée",
            text: "Votre première version est prête à être explorée dans la preview.",
          },
        ]);
        setRunning(false);
        return;
      }
      setActiveAgent(agent.name);
      setProgress(Math.min(92, 20 + step * 25));
      setMessages((current) => [
        ...current,
        {
          author: agent.name,
          color: agent.color,
          id: Date.now() + step,
          kind: "agent",
          role: agent.role,
          text: agent.text,
        },
      ]);
      step += 1;
    }, 1050);
    return () => clearInterval(timer);
  }, [running]);

  function launchMission() {
    if (running) {
      return;
    }
    const prompt = input.trim() || samplePrompt;
    setInput(prompt);
    setMessages([
      {
        author: "Vous",
        color: "from-sky-400 to-violet-500",
        id: Date.now(),
        kind: "user",
        role: "Mission",
        text: prompt,
      },
    ]);
    setPreviewOpen(false);
    setMissionDone(false);
    setRunning(true);
  }

  return (
    <main className="min-h-dvh bg-[#0b0a11] text-white">
      <div className="flex min-h-dvh">
        <aside className="hidden w-64 shrink-0 border-r border-white/10 bg-white/[0.02] p-4 lg:hidden">
          <div className="mb-8 flex items-center gap-2 text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 via-violet-500 to-orange-400">
              <SparklesIcon className="size-4 text-white" />
            </span>
            Idealy demo
          </div>
          <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/60">Mission en cours</span>
              <span className="text-violet-200">{progress}%</span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 via-violet-400 to-orange-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-white/55">
              {running
                ? `${activeAgent || "L’équipe"} travaille...`
                : missionDone
                  ? "Mission prête à explorer"
                  : "Lancez une mission pour voir le workspace."}
            </p>
          </div>
          <div className="mt-6 space-y-1 text-sm text-white/55">
            <div className="rounded-lg bg-white/8 px-3 py-2 text-white">
              Chat de mission
            </div>
            <div className="rounded-lg px-3 py-2">Historique</div>
            <div className="rounded-lg px-3 py-2">Bibliothèque</div>
            <div className="rounded-lg px-3 py-2">Plugins & connecteurs</div>
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.15em] text-white/40">
                Démonstration du parcours
              </p>
              <h1 className="mt-1 text-lg font-semibold">
                Votre mission créative
              </h1>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/55">
              <span
                className={`size-2 rounded-full ${running ? "animate-pulse bg-yellow-300" : missionDone ? "bg-emerald-300" : "bg-white/30"}`}
              />
              {running
                ? "Agents actifs"
                : missionDone
                  ? "Prêt à prévisualiser"
                  : "En attente"}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-8">
            <div className="mx-auto max-w-2xl space-y-4">
              {messages.length === 0 ? (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
                  <WandSparklesIcon className="mx-auto size-8 text-violet-300" />
                  <h2 className="mt-4 text-xl font-semibold">
                    Voyez une mission se construire
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/55">
                    Écrivez un prompt ou utilisez l’exemple. La démo montrera la
                    conversation, les agents et l’ouverture de la preview.
                  </p>
                  <button
                    className="mt-5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
                    onClick={() => setInput(samplePrompt)}
                    type="button"
                  >
                    Utiliser l’exemple
                  </button>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    className={`flex gap-3 ${message.kind === "user" ? "flex-row-reverse text-right" : ""}`}
                    key={message.id}
                  >
                    <div
                      className={`flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${message.color} text-[10px] font-semibold text-white`}
                    >
                      {message.author[0]}
                    </div>
                    <div className="max-w-[80%]">
                      <div className="mb-1 flex items-center gap-2 text-xs text-white/45">
                        <span className="font-medium text-white/80">
                          {message.author}
                        </span>
                        <span>{message.role}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.kind === "user" ? "bg-violet-400/15 text-white/90" : "border border-white/10 bg-white/[0.04] text-white/75"}`}
                      >
                        {message.text}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="border-t border-white/10 px-5 py-5">
            <div className="mx-auto max-w-2xl">
              <div className="idealy-prompt-shell relative rounded-2xl p-px">
                <div className="relative rounded-2xl bg-[#13121b] p-3">
                  <textarea
                    className="min-h-20 w-full resize-none bg-transparent px-2 py-1 text-sm leading-6 text-white outline-none placeholder:text-white/35"
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Décrivez l’application que vous voulez créer..."
                    value={input}
                  />
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[11px] text-white/35">
                      Une mission complète · {input.length}/1000
                    </span>
                    <button
                      className="flex size-9 items-center justify-center rounded-xl bg-white text-black transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
                      disabled={running}
                      onClick={launchMission}
                      type="button"
                    >
                      <ArrowUpIcon className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-[11px] text-white/30">
                Démonstration locale : la réponse et la preview sont simulées.
              </p>
            </div>
          </div>
        </section>

        {previewOpen ? (
          <aside className="relative z-10 hidden w-[62%] shrink-0 flex-col border-l border-white/10 bg-[#111019] lg:flex">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <EyeIcon className="size-4 text-emerald-300" />
                <div>
                  <p className="text-xs text-white/45">
                    Preview de l’application
                  </p>
                  <h2 className="text-sm font-semibold">Mission créative</h2>
                </div>
              </div>
              <button
                aria-label="Fermer la preview"
                className="rounded-lg p-2 text-white/45 hover:bg-white/10 hover:text-white"
                onClick={() => setPreviewOpen(false)}
                type="button"
              >
                <XIcon className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-[#fafafa] p-5 text-[#18181b]">
              <div className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-red-400/80" />
                    <span className="size-2 rounded-full bg-yellow-300/80" />
                    <span className="size-2 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-black/45">
                    <span>Preview</span>
                    <span className="rounded border border-black/10 px-1.5 py-0.5">
                      Latest
                    </span>
                  </div>
                </div>
                <div className="hidden">
                  <span className="ml-3 text-[10px] text-black/35">
                    idealy.app / mission
                  </span>
                </div>
                <div className="min-h-[360px] bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-black/55">
                      Votre espace de création
                    </span>
                    <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-600">
                      En ligne
                    </span>
                  </div>
                  <h3 className="mt-10 max-w-sm text-3xl font-semibold leading-tight text-black">
                    Construisez avec clarté, avancez avec énergie.
                  </h3>
                  <p className="mt-4 max-w-sm text-sm leading-6 text-black/50">
                    Une première interface générée à partir de votre mission.
                    Vous pourrez l’itérer depuis le chat.
                  </p>
                  <div className="mt-8 grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-gradient-to-br from-sky-400/25 to-violet-500/10 p-4">
                      <Code2Icon className="size-4 text-sky-200" />
                      <p className="mt-8 text-xs text-black/65">
                        Structure prête
                      </p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-orange-400/25 to-fuchsia-500/10 p-4">
                      <SparklesIcon className="size-4 text-orange-200" />
                      <p className="mt-8 text-xs text-black/65">
                        Expérience alignée
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-black">
                  <CheckCircle2Icon className="size-4 text-emerald-500" />{" "}
                  Première version générée
                </div>
                <p className="mt-2 text-xs leading-5 text-black/50">
                  C’est ici que le panneau de preview apparaît après la mission.
                  La publication Vercel pourra rester une action de cette zone.
                </p>
                <button
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-black/15 px-3 py-2 text-xs text-black/70 hover:bg-black/5"
                  type="button"
                >
                  <EyeIcon className="size-3.5" /> Ouvrir la preview complète{" "}
                  <ChevronRightIcon className="size-3.5" />
                </button>
              </div>
            </div>
            <div className="border-t border-black/10 bg-white p-4">
              <button
                className="w-full rounded-xl bg-black px-4 py-3 text-sm font-medium text-white hover:bg-black/85"
                onClick={() => setPreviewOpen(false)}
                type="button"
              >
                Continuer dans le chat
              </button>
            </div>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
