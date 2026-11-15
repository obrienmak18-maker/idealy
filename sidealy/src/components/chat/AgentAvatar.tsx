import { Check, AlertCircle } from "lucide-react";
import type React from "react";
import type { AgentState, StaticAgent } from "../../types";

export interface AgentAvatarProps {
  agent: StaticAgent;
  isActive?: boolean;
  size?: "sm" | "md" | "lg";
  state?: AgentState;
}

/**
 * AgentAvatar — Avatar avec portrait réel (JAMAIS d'initiales).
 * - Pleines couleurs quand l'agent a le micro.
 * - Désaturé (niveaux de gris + opacité réduite) quand l'agent est inactif ou en attente.
 * - Liseré / arc de la couleur exclusive de l'agent (tint) servant d'identifiant immédiat.
 */
export const AgentAvatar: React.FC<AgentAvatarProps> = ({
  agent,
  isActive = true,
  size = "md",
  state = "terminé",
}) => {
  const sizeClasses = {
    sm: "w-7 h-7 min-w-[28px] min-h-[28px]",
    md: "w-8 h-8 min-w-[32px] min-h-[32px]",
    lg: "w-9 h-9 min-w-[36px] min-h-[36px]",
  }[size];

  const badgeSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

  // États : attente | réflexion | production | terminé | erreur
  const isWaiting = state === "attente" || (!isActive && state !== "terminé");
  const isThinking = state === "réflexion" && isActive;
  const isProducing = state === "production" && isActive;
  const isDone = state === "terminé";
  const isError = state === "erreur";

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses}`}>
      {/* Arc d'activité ou anneau selon l'état */}
      {isThinking && (
        <span
          aria-hidden="true"
          className="absolute -inset-0.5 rounded-full animate-spin border-2 border-transparent"
          style={{
            borderTopColor: agent.tint,
            borderRightColor: agent.tint,
          }}
        />
      )}

      {isProducing && (
        <span
          aria-hidden="true"
          className="absolute -inset-0.5 rounded-full animate-pulse border-2"
          style={{ borderColor: agent.tint }}
        />
      )}

      {/* Conteneur de l'image de portrait avec liseré d'identité */}
      <div
        className={`w-full h-full rounded-full overflow-hidden transition-all duration-300 relative ${
          isWaiting
            ? "grayscale opacity-50 ring-1 ring-[var(--dsw-alias-border-l2)]"
            : "ring-2 shadow-sm"
        }`}
        style={{
          boxShadow: isActive ? `0 0 12px -2px ${agent.tint}40` : undefined,
          borderColor: isActive ? agent.tint : undefined,
        }}
      >
        <img
          alt={agent.name}
          className="w-full h-full object-cover rounded-full"
          loading="lazy"
          onError={(e) => {
            // Repli gracieux vers Minato si l'image exacte manquait
            (e.currentTarget as HTMLImageElement).src = "/images/agents/Minato.jpg";
          }}
          src={agent.avatar}
        />
      </div>

      {/* Badge d'état discret */}
      {isDone && (
        <span
          aria-label="Terminé"
          className={`absolute -bottom-0.5 -right-0.5 ${badgeSize} rounded-full bg-[var(--dsw-alias-bg-base)] text-[var(--idealy-teal-petrol)] ring-1 ring-[var(--dsw-alias-border-l2)] flex items-center justify-center`}
          title={`${agent.name} a terminé`}
        >
          <Check className="w-2.5 h-2.5 stroke-[3]" />
        </span>
      )}

      {isError && (
        <span
          aria-label="Erreur"
          className={`absolute -bottom-0.5 -right-0.5 ${badgeSize} rounded-full bg-red-500 text-white flex items-center justify-center ring-1 ring-white/50`}
          title={`${agent.name} a rencontré une anomalie`}
        >
          <AlertCircle className="w-2.5 h-2.5 stroke-[2.5]" />
        </span>
      )}

      {isWaiting && (
        <span
          aria-label="En attente"
          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[var(--dsw-alias-border-l1)] ring-1 ring-[var(--dsw-alias-bg-base)]"
          title={`${agent.name} en attente`}
        />
      )}
    </div>
  );
};
