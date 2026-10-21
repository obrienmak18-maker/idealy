"use client";

import { motion, useReducedMotion } from "framer-motion";
import { IdealyMark } from "@/components/branding/idealy-logo";
import { listConnectorDefinitions } from "@/lib/idealy/connectors";
import { getConnectorBrandLogo } from "./brand-logos";

interface IdealyOrbitalDiscProps {
  connectedIds?: readonly string[];
  activeConnectorId?: string;
  onSelectConnector?: (id: string) => void;
  onAddConnector?: () => void;
}

const MAX_ORBITING_CONNECTORS = 8;

export function IdealyOrbitalDisc({
  connectedIds = [],
  activeConnectorId,
  onSelectConnector,
  onAddConnector,
}: IdealyOrbitalDiscProps) {
  const prefersReducedMotion = useReducedMotion();
  const catalog = listConnectorDefinitions();
  const connected = connectedIds
    .map((id) => catalog.find((connector) => connector.id === id))
    .filter((connector): connector is (typeof catalog)[number] => Boolean(connector));
  const orbiting = connected.slice(0, MAX_ORBITING_CONNECTORS);
  const overflow = connected.slice(MAX_ORBITING_CONNECTORS);
  const iconSize = orbiting.length >= 7 ? 18 : orbiting.length >= 5 ? 21 : 24;
  const orbitDuration = Math.max(28, orbiting.length * 5);

  return (
    <section
      aria-label="Connecteurs connectés à Idealy"
      className="mx-auto w-full max-w-4xl select-none"
    >
      <div className="relative mx-auto min-h-[230px] max-w-[760px] sm:min-h-[290px]">
        {orbiting.length > 0 ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            initial={{ rotate: 0 }}
            animate={prefersReducedMotion ? { rotate: 0 } : { rotate: 360 }}
            transition={{
              duration: orbitDuration,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            {orbiting.map((connector, index) => {
              const angle = (index / orbiting.length) * Math.PI * 2 - Math.PI / 2;
              const left = `${50 + Math.cos(angle) * 43}%`;
              const top = `${50 + Math.sin(angle) * 39}%`;

              return (
                <motion.div
                  key={connector.id}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                  style={{ left, top }}
                  animate={prefersReducedMotion ? { rotate: 0 } : { rotate: -360 }}
                  transition={{
                    duration: orbitDuration,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  <button
                    aria-label={`Ouvrir ${connector.label}`}
                    className={`pointer-events-auto flex items-center justify-center rounded-full border p-2.5 shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 ${
                      activeConnectorId === connector.id
                        ? "border-primary/60 bg-primary/10 shadow-[var(--shadow-glow)]"
                        : "border-border/80 bg-background/90 hover:border-primary/50 hover:bg-card"
                    }`}
                    onClick={() => onSelectConnector?.(connector.id)}
                    title={connector.label}
                    type="button"
                  >
                    {getConnectorBrandLogo(
                      connector.id,
                      "shrink-0",
                      iconSize,
                    )}
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        ) : null}

        <div className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center">
          <div className="relative flex items-center justify-center">
            <div
              aria-hidden="true"
              className="absolute -inset-5 rounded-full bg-gradient-to-br from-teal-500/10 via-cyan-500/10 to-violet-500/10 blur-2xl"
            />
            <IdealyMark
              animated={!prefersReducedMotion}
              size={112}
              className="relative drop-shadow-[0_0_18px_rgba(56,189,248,0.16)] sm:size-[128px]"
            />
          </div>
          <span className="mt-1 text-xs font-semibold tracking-[0.18em] text-muted-foreground">
            IDEALY
          </span>
        </div>
      </div>

      {orbiting.length === 0 ? (
        <div className="mx-auto -mt-2 max-w-sm text-center">
          <p className="text-sm text-muted-foreground">
            Les outils connectés apparaîtront ici et suivront l’orbite d’Idealy.
          </p>
          <button
            className="mt-3 inline-flex items-center rounded-full border border-border/80 bg-card/70 px-3.5 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            onClick={onAddConnector}
            type="button"
          >
            Parcourir les connecteurs
          </button>
        </div>
      ) : null}

      {overflow.length > 0 ? (
        <div className="mx-auto mt-2 flex max-w-2xl flex-wrap items-center justify-center gap-2">
          {overflow.map((connector) => (
            <button
              key={connector.id}
              aria-label={`Ouvrir ${connector.label}`}
              className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-colors ${
                activeConnectorId === connector.id
                  ? "border-primary/60 bg-primary/10 text-foreground"
                  : "border-border/70 bg-card/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
              onClick={() => onSelectConnector?.(connector.id)}
              type="button"
            >
              {getConnectorBrandLogo(connector.id, "shrink-0", 14)}
              <span>{connector.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
