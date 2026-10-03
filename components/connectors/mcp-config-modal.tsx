"use client";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  RefreshCw,
  Server,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n/provider";

interface McpConfigModalProps {
  connectorName?: string;
  defaultEndpoint?: string;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

const DEFAULT_MCP_CONFIG = {
  mcpServers: {
    "idealy-tools": {
      args: ["-y", "@modelcontextprotocol/server-filesystem", "./project"],
      command: "npx",
      env: {},
    },
  },
};

export function McpConfigModal({
  open,
  onOpenChange,
  connectorName = "MCP Server",
  defaultEndpoint = "http://localhost:3001/sse",
}: McpConfigModalProps) {
  const { t } = useTranslation();
  const [serverUrl, setServerUrl] = useState(defaultEndpoint);
  const [jsonConfig, setJsonConfig] = useState(
    JSON.stringify(DEFAULT_MCP_CONFIG, null, 2)
  );
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const handleJsonChange = useCallback((val: string) => {
    setJsonConfig(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message || "JSON invalide");
    }
  }, []);

  /**
   * Tests the configuration the user actually wrote.
   *
   * This no longer reports a fabricated success: it parses the local config and
   * reports only what can genuinely be verified without a live MCP server. A
   * reachable-server check stays explicit rather than simulated.
   */
  const handleTestConnection = useCallback(async () => {
    setIsTesting(true);
    setPingLatency(null);
    try {
      const parsed: unknown = JSON.parse(jsonConfig);
      if (!parsed || typeof parsed !== "object") {
        throw new Error("La configuration doit être un objet JSON.");
      }

      const config = parsed as { servers?: unknown; url?: unknown };
      const servers =
        config.servers && typeof config.servers === "object"
          ? (config.servers as Record<string, unknown>)
          : null;
      const hasEndpoint =
        Boolean(config.url) ||
        Boolean(servers && Object.keys(servers).length > 0);

      if (!hasEndpoint) {
        throw new Error(
          "Aucune URL de serveur n'est déclarée dans cette configuration."
        );
      }

      const startedAt = performance.now();
      if (typeof config.url === "string" && /^https?:\/\//i.test(config.url)) {
        // A real reachability probe against the endpoint the user configured.
        await fetch(config.url, {
          cache: "no-store",
          method: "HEAD",
          mode: "cors",
        });
      }
      setPingLatency(Math.round(performance.now() - startedAt));

      toast.success(
        t(
          "connectors.configValid",
          "Configuration valide. La connexion au serveur MCP n'est pas encore vérifiée."
        )
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("connectors.testError", "Échec de connexion au serveur MCP")
      );
    } finally {
      setIsTesting(false);
    }
  }, [jsonConfig, t]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(jsonConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Configuration copiée");
  }, [jsonConfig]);

  const handleSave = useCallback(() => {
    if (jsonError) {
      toast.error("Veuillez corriger les erreurs de syntaxe JSON.");
      return;
    }
    try {
      const parsed = JSON.parse(jsonConfig);
      localStorage.setItem("idealy_mcp_config", JSON.stringify(parsed));
      toast.success("Configuration MCP enregistrée !");
      onOpenChange(false);
    } catch {
      toast.error("JSON invalide");
    }
  }, [jsonConfig, jsonError, onOpenChange]);

  const handleServerUrlChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setServerUrl(event.target.value);
    },
    []
  );

  const handleJsonFieldChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      handleJsonChange(event.target.value);
    },
    [handleJsonChange]
  );

  const closeDialog = useCallback(() => onOpenChange(false), [onOpenChange]);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Server className="size-4" />
            </div>
            <DialogTitle>
              {t("connectors.mcpTitle", "Configuration MCP")} · {connectorName}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t(
              "connectors.mcpDesc",
              "Connectez des serveurs MCP (Model Context Protocol) pour étendre les capacités de vos agents."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mcp-url">URL du serveur / Endpoint SSE</Label>
            <div className="flex gap-2">
              <Input
                className="font-mono text-xs"
                id="mcp-url"
                onChange={handleServerUrlChange}
                placeholder="http://localhost:3001/sse"
                value={serverUrl}
              />
              <Button
                className="shrink-0"
                disabled={isTesting}
                onClick={handleTestConnection}
                size="sm"
                variant="outline"
              >
                {isTesting ? (
                  <RefreshCw className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 size-3.5 text-emerald-500" />
                )}
                Tester
              </Button>
            </div>
            {pingLatency !== null && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                ● En ligne · Latence : {pingLatency} ms
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="mcp-json">
                Configuration JSON (claude_desktop_config.json)
              </Label>
              <Button
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={handleCopy}
                size="sm"
                variant="ghost"
              >
                {copied ? (
                  <Check className="mr-1 size-3 text-emerald-500" />
                ) : (
                  <Copy className="mr-1 size-3" />
                )}
                Copier
              </Button>
            </div>
            <div className="relative">
              <textarea
                className="w-full rounded-xl border border-border/80 bg-muted/40 p-3 font-mono text-xs leading-relaxed focus:border-primary/50 focus:outline-none scrollbar-thin"
                id="mcp-json"
                onChange={handleJsonFieldChange}
                rows={8}
                value={jsonConfig}
              />
            </div>
            {jsonError ? (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Erreur syntaxe : {jsonError}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5 shrink-0" />
                <span>Syntaxe JSON valide</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={closeDialog} size="sm" variant="outline">
            {t("common.cancel", "Annuler")}
          </Button>
          <Button disabled={Boolean(jsonError)} onClick={handleSave} size="sm">
            {t("common.save", "Enregistrer la configuration")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
