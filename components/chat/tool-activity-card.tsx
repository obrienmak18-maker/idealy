"use client";

import { useTranslation } from "@/lib/i18n/provider";
import { CheckCircle2, ExternalLink, LoaderCircle, AlertCircle } from "lucide-react";
import { Tool, ToolContent, ToolHeader, type ToolPart } from "@/components/ai-elements/tool";

type ToolKind = "webSearch" | "searchImages" | "generateImage" | "executeSandbox";

type ToolActivityCardProps = {
  toolCallId: string;
  kind: ToolKind;
  state: ToolPart["state"];
  input: unknown;
  output: unknown;
  errorText?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null) : [];
}

function safeHttpUrl(value: unknown): string | null {
  const raw = stringValue(value);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

const toolCopy = {
  fr: {
    runningSearch: "Recherche des sources pertinentes…",
    runningImages: "Recherche des visuels…",
    generating: "Création du visuel…",
    runningCode: "Exécution dans un environnement isolé…",
    noResults: "Aucun résultat exploitable n’a été renvoyé.",
    unavailable: "Cette action n’est pas disponible pour le moment.",
    sources: "Sources",
    photos: "Photos de Pexels",
    generated: "Visuels générés",
    photographer: "Photo par",
    onPexels: "sur Pexels",
    open: "Ouvrir la source",
    output: "Sortie",
    errors: "Erreurs",
    notConfigured: "Le fournisseur n’est pas configuré côté serveur. Aucun résultat n’a été inventé.",
    creditNeeded: "Le fournisseur demande des crédits. Aucun visuel n’a été généré.",
    completed: "Terminé",
    failed: "Échec",
    seconds: "ms",
    query: "Recherche",
  },
  en: {
    runningSearch: "Searching relevant sources…",
    runningImages: "Finding images…",
    generating: "Generating the visual…",
    runningCode: "Running in an isolated environment…",
    noResults: "No usable results were returned.",
    unavailable: "This action is unavailable right now.",
    sources: "Sources",
    photos: "Pexels photos",
    generated: "Generated visuals",
    photographer: "Photo by",
    onPexels: "on Pexels",
    open: "Open source",
    output: "Output",
    errors: "Errors",
    notConfigured: "The provider is not configured on the server. No results were fabricated.",
    creditNeeded: "The provider needs credits. No image was generated.",
    completed: "Completed",
    failed: "Failed",
    seconds: "ms",
    query: "Search",
  },
  es: {
    runningSearch: "Buscando fuentes relevantes…",
    runningImages: "Buscando imágenes…",
    generating: "Generando el visual…",
    runningCode: "Ejecutando en un entorno aislado…",
    noResults: "No se devolvieron resultados utilizables.",
    unavailable: "Esta acción no está disponible en este momento.",
    sources: "Fuentes",
    photos: "Fotos de Pexels",
    generated: "Imágenes generadas",
    photographer: "Foto de",
    onPexels: "en Pexels",
    open: "Abrir fuente",
    output: "Salida",
    errors: "Errores",
    notConfigured: "El proveedor no está configurado en el servidor. No se inventaron resultados.",
    creditNeeded: "El proveedor necesita créditos. No se generó ninguna imagen.",
    completed: "Completado",
    failed: "Error",
    seconds: "ms",
    query: "Búsqueda",
  },
} as const;

const toolTitles = {
  fr: { webSearch: "Recherche sur le Web", searchImages: "Recherche d’images", generateImage: "Génération d’image", executeSandbox: "Exécution du code" },
  en: { webSearch: "Web search", searchImages: "Image search", generateImage: "Image generation", executeSandbox: "Code execution" },
  es: { webSearch: "Búsqueda web", searchImages: "Búsqueda de imágenes", generateImage: "Generación de imágenes", executeSandbox: "Ejecución de código" },
} as const;

function ResultLink({ url, title, description }: { url: string; title: string; description?: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="group flex min-w-0 items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground"><ExternalLink className="size-3.5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block line-clamp-2 text-xs font-medium text-foreground group-hover:text-primary">{title || url}</span>
        {description ? <span className="mt-1 block line-clamp-2 text-[11px] leading-4 text-muted-foreground">{description}</span> : null}
        <span className="mt-1 block truncate text-[10px] text-muted-foreground/70">{new URL(url).hostname}</span>
      </span>
    </a>
  );
}

function ImageGrid({ images, credits, sourceLabel, creditPrefix, creditSuffix }: { images: Array<Record<string, unknown>>; credits: boolean; sourceLabel: string; creditPrefix: string; creditSuffix: string }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {images.slice(0, 6).map((image, index) => {
        const imageUrl = safeHttpUrl(image.thumbnail) ?? safeHttpUrl(image.url);
        const sourceUrl = safeHttpUrl(image.url);
        if (!imageUrl) return null;
        const alt = stringValue(image.alt) || stringValue(image.prompt) || "Image result";
        const photographer = stringValue(image.photographer);
        return (
          <div className="min-w-0 overflow-hidden rounded-xl border border-border/60 bg-background" key={sourceUrl ?? imageUrl + index}>
            <a href={sourceUrl ?? imageUrl} target="_blank" rel="noopener noreferrer" className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt={alt} loading="lazy" className="h-28 w-full object-cover transition-transform duration-200 hover:scale-[1.025]" />
            </a>
            {credits && photographer ? (
              <p className="truncate px-2 py-1.5 text-[10px] text-muted-foreground">{creditPrefix} {photographer} {creditSuffix}</p>
            ) : null}
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="block truncate px-2 pb-2 text-[10px] text-primary hover:underline">{credits ? "Pexels" : sourceLabel}</a>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

export function ToolActivityCard({ toolCallId, kind, state, input, output, errorText }: ToolActivityCardProps) {
  const { language } = useTranslation();
  const locale = language === "en" || language === "es" ? language : "fr";
  const text = toolCopy[locale];
  const title = toolTitles[locale][kind];
  const inputData = asRecord(input);
  const result = asRecord(output);
  const status = stringValue(result?.status);
  const isTerminal = state === "output-available" || state === "output-error" || state === "output-denied";
  const isRunning = state === "input-streaming" || state === "input-available";
  const isSuccessful = status === "success" || status === "completed";
  const isProviderUnavailable = status === "unconfigured" || status === "needs_credits";
  const isFailed = status === "error" || status === "failed" || state === "output-error";
  const rawMessage = stringValue(result?.message);
  const friendlyMessage = isProviderUnavailable
    ? status === "needs_credits" ? text.creditNeeded : text.notConfigured
    : rawMessage || errorText || stringValue(result?.error) || "";
  const isSearch = kind === "webSearch";
  const isPexels = kind === "searchImages";
  const isGeneration = kind === "generateImage";
  const sources = arrayRecords(result?.results);
  const photos = arrayRecords(result?.photos);
  const generatedImages = arrayRecords(result?.images);
  const images = isPexels ? photos : generatedImages;
  const snippets = (item: Record<string, unknown>) =>
    Array.isArray(item.highlights) ? item.highlights.filter((v): v is string => typeof v === "string").slice(0, 2).join(" ") : "";
  const sourceCount = typeof result?.count === "number" ? result.count : typeof result?.total === "number" ? result.total : sources.length || images.length;
  const stdout = stringValue(result?.stdout);
  const stderr = stringValue(result?.stderr);
  const executionError = stringValue(result?.error);
  const executionTime = typeof result?.executionTimeMs === "number" ? result.executionTimeMs : null;

  return (
    <Tool className="w-[min(100%,560px)] overflow-hidden rounded-xl border border-border/60 bg-card/60 shadow-xs" defaultOpen={!isTerminal} key={toolCallId}>
      <ToolHeader className="px-3 py-2.5" state={state} title={title} toolName={kind} type="dynamic-tool" />
      <ToolContent className="space-y-3 border-t border-border/50 px-3 py-3">
        {isRunning ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <LoaderCircle className="size-3.5 animate-spin text-primary" />
            <span>{kind === "webSearch" ? text.runningSearch : kind === "searchImages" ? text.runningImages : kind === "generateImage" ? text.generating : text.runningCode}</span>
          </div>
        ) : null}

        {kind === "webSearch" && isTerminal ? (
          <>
            {friendlyMessage ? <p className={`rounded-lg px-2.5 py-2 text-xs leading-5 ${isFailed || isProviderUnavailable ? "border border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{friendlyMessage}</p> : null}
            {sources.length ? (
              <div className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2 px-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{text.sources}</p>
                  <span className="text-[10px] text-muted-foreground">{sourceCount}</span>
                </div>
                {stringValue(result?.query) || stringValue(inputData?.query) ? <p className="px-2.5 text-[11px] text-muted-foreground">{text.query}: {stringValue(result?.query) || stringValue(inputData?.query)}</p> : null}
                {sources.slice(0, 5).map((item, index) => {
                  const url = safeHttpUrl(item.url);
                  if (!url) return null;
                  return <ResultLink key={url + index} url={url} title={stringValue(item.title)} description={snippets(item)} />;
                })}
              </div>
            ) : !friendlyMessage ? <p className="text-xs text-muted-foreground">{text.noResults}</p> : null}
          </>
        ) : null}

        {(kind === "searchImages" || kind === "generateImage") && isTerminal ? (
          <>
            {friendlyMessage ? <p className={`rounded-lg px-2.5 py-2 text-xs leading-5 ${isFailed || isProviderUnavailable ? "border border-amber-500/25 bg-amber-500/5 text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{friendlyMessage}</p> : null}
            {images.length ? (
              <>
                <div className="flex items-center justify-between gap-2 px-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{isPexels ? text.photos : text.generated}</p>
                  <span className="text-[10px] text-muted-foreground">{images.length}</span>
                </div>
                <ImageGrid credits={isPexels} images={images} sourceLabel={text.open} creditPrefix={text.photographer} creditSuffix={text.onPexels} />
              </>
            ) : !friendlyMessage ? <p className="text-xs text-muted-foreground">{text.noResults}</p> : null}
          </>
        ) : null}

        {kind === "executeSandbox" && isTerminal ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              {isSuccessful ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <AlertCircle className="size-3.5 text-amber-600" />}
              <span className="font-medium text-foreground">{isSuccessful ? text.completed : text.failed}</span>
              {executionTime !== null ? <span className="text-muted-foreground">{executionTime} {text.seconds}</span> : null}
            </div>
            {stringValue(result?.purpose) || stringValue(inputData?.purpose) ? <p className="text-[11px] text-muted-foreground">{stringValue(result?.purpose) || stringValue(inputData?.purpose)}</p> : null}
            {stdout ? (
              <details className="overflow-hidden rounded-lg border border-border/50">
                <summary className="cursor-pointer bg-muted/35 px-2.5 py-2 text-[11px] font-medium">{text.output}</summary>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words bg-background/60 p-2.5 text-[11px] leading-5 text-foreground">{stdout}</pre>
              </details>
            ) : null}
            {stderr || executionError || friendlyMessage ? (
              <details open={Boolean(stderr || executionError || isFailed)} className="overflow-hidden rounded-lg border border-amber-500/20">
                <summary className="cursor-pointer bg-amber-500/5 px-2.5 py-2 text-[11px] font-medium text-amber-700 dark:text-amber-300">{text.errors}</summary>
                <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words bg-background/60 p-2.5 text-[11px] leading-5 text-muted-foreground">{stderr || executionError || friendlyMessage}</pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </ToolContent>
    </Tool>
  );
}
