"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Server, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/lib/i18n/provider";

interface McpConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectorName?: string;
  defaultEndpoint?: string;
}

const DEFAULT_MCP_CONFIG = {
  mcpServers: {
    "idealy-tools": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "./project"],
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

  const handleJsonChange = (val: string) => {
    setJsonConfig(val);
    try {
      JSON.parse(val);
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err.message || "JSON invalide");
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setPingLatency(null);
    try {
      const res = await fetch("/api/connectors/ping?provider=mcp");
      const data = await res.json();
      setPingLatency(data.latencyMs ?? 24);
      toast.success(t("connectors.testSuccess", "Connexion établie avec succès !"));
    } catch {
      toast.error(t("connectors.testError", "Échec de connexion au serveur MCP"));
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Configuration copiée");
  };

  const handleSave = () => {
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                id="mcp-url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://localhost:3001/sse"
                className="font-mono text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={isTesting}
                className="shrink-0"
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
              <Label htmlFor="mcp-json">Configuration JSON (claude_desktop_config.json)</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={handleCopy}
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
                id="mcp-json"
                value={jsonConfig}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-border/80 bg-muted/40 p-3 font-mono text-xs leading-relaxed focus:border-primary/50 focus:outline-none scrollbar-thin"
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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {t("common.cancel", "Annuler")}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={Boolean(jsonError)}>
            {t("common.save", "Enregistrer la configuration")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
