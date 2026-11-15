import type React from "react";

export interface ReasoningBlockProps {
  agentName?: string;
  duration?: number;
  isStreaming?: boolean;
  reasoning: string;
  tint?: string;
}

/**
 * Réflexion typographique dans le fil (Section 5 du Manifeste Produit).
 * 
 * RÈGLES ABSOLUES :
 * - Jamais de boîte, de carte fermée ou d'accordéon.
 * - Pas de mention « Pensée pendant 12 s » ni de chevron de repli.
 * - Coule naturellement dans la même colonne de texte, en retrait typographique.
 * - Corps légèrement plus petit, couleur plus basse, en italique sobre.
 * - Précédée d'une fine ligne verticale portant la teinte exclusive de l'agent.
 * - S'écrit progressivement et reste en place à la fin (jamais masquée ou pliée).
 */
export const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
  agentName,
  isStreaming = false,
  reasoning,
  tint = "var(--idealy-indigo)",
}) => {
  if (!reasoning && !isStreaming) return null;

  return (
    <div
      aria-label={agentName ? `Cheminement de pensée de ${agentName}` : "Réflexion de l'agent"}
      className="relative pl-3.5 my-2.5 text-[13px] md:text-[13.5px] leading-relaxed italic text-[var(--dsw-alias-label-tertiary)] transition-opacity"
      data-reasoning-flow
    >
      {/* Fine ligne verticale d'identification portant la couleur de l'agent */}
      <span
        aria-hidden="true"
        className="absolute left-0 top-1 bottom-1 w-[2px] rounded-full opacity-65"
        style={{ backgroundColor: tint }}
      />

      <div className="whitespace-pre-wrap break-words font-sans select-text">
        {reasoning}
        {isStreaming && (
          <span
            aria-hidden="true"
            className="inline-block w-1.5 h-3.5 ml-1 rounded-sm animate-pulse align-middle"
            style={{ backgroundColor: tint }}
          />
        )}
      </div>
    </div>
  );
};
