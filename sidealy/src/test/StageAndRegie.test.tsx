import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  STATIC_AGENT_REGISTRY,
  getAgentById,
  routeRun,
  buildRunForMessage,
} from "../services/agentRegistry";
import { ReasoningBlock } from "../components/chat/ReasoningBlock";
import { AgentAvatar } from "../components/chat/AgentAvatar";
import { RunStage } from "../components/chat/RunStage";

describe("Stage & Régie Engine — Recette et Spécifications Produit", () => {
  // Test 1 : Registre Statique d'Identités
  it("possède un registre statique avec des portraits réels et des couleurs exclusives", () => {
    const agents = Object.values(STATIC_AGENT_REGISTRY);
    expect(agents.length).toBeGreaterThanOrEqual(10);

    const tints = new Set<string>();
    for (const agent of agents) {
      expect(agent.id).toBeTruthy();
      expect(agent.name).toBeTruthy();
      expect(agent.role).toBeTruthy();
      expect(agent.specialty).toBeTruthy();
      expect(agent.avatar).toMatch(/^\/images\/agents\//);
      expect(agent.avatar).not.toBe("M");
      expect(agent.tint).toMatch(/^#|^var\(/);
      expect(agent.authority).toBeTruthy();
      expect(agent.voice).toBeTruthy();
      tints.add(agent.tint);
    }
  });

  // Test 2 : Test du Solo (Section 10 - Recette)
  it("Test du Solo : une question simple déclenche un run solo avec 1 seul agent sans carte d'équipe", () => {
    const route = routeRun("Comment fonctionne le hook useEffect en React ?");
    expect(route.mode).toBe("solo");
    expect(route.agents).toHaveLength(1);
    expect(route.agents[0].id).toBe("naruto");

    const run = buildRunForMessage(
      "Comment fonctionne le hook useEffect en React ?",
      "useEffect permet d'exécuter des effets de bord dans les composants fonctionnels."
    );
    expect(run.mode).toBe("solo");
    expect(run.turns).toHaveLength(1);
    expect(run.turns[0].agentId).toBe("naruto");

    const { container } = render(
      <RunStage
        run={run}
        renderFormattedContent={(content) => <div>{content}</div>}
      />
    );

    // Ne doit pas afficher de régie d'équipe
    expect(container.querySelector("[aria-label*='Régie de run']")).toBeNull();
    // Affiche le locuteur avec son nom et son rôle
    expect(screen.getByText("Naruto")).toBeDefined();
    expect(screen.getByText("Ingénieur Full-Stack")).toBeDefined();
  });

  // Test 3 : Mention explicite d'agent
  it("priorise l'agent mentionné explicitement", () => {
    const route = routeRun("@sasuke Peux-tu analyser la structure de la base de données ?");
    expect(route.mode).toBe("solo");
    expect(route.agents).toHaveLength(1);
    expect(route.agents[0].id).toBe("sasuke");
    expect(route.agents[0].name).toBe("Sasuke");
  });

  // Test 4 : Test de la Passation (Section 10 - Recette)
  it("Test de la Passation : sur une production complète, la passation est explicite et le plafond de 3 agents est respecté", () => {
    const route = routeRun(
      "Construis une application complète de gestion de tâches avec validation",
      { mode: "produce" }
    );
    expect(route.mode).toBe("équipe");
    expect(route.agents.length).toBeLessThanOrEqual(3);
    expect(route.leader?.id).toBe("minato");

    const run = buildRunForMessage(
      "Construis une application complète de gestion de tâches avec validation",
      "export const TodoApp = () => <div>App</div>;",
      { mode: "produce" }
    );

    expect(run.mode).toBe("équipe");
    expect(run.turns.length).toBe(3);

    // Premier tour : Minato cadre
    expect(run.turns[0].agentId).toBe("minato");
    expect(run.turns[0].handoff?.to).toBe("naruto");
    expect(run.turns[0].handoff?.line).toBeTruthy();

    // Deuxième tour : Naruto implémente et passe à Shikamaru
    expect(run.turns[1].agentId).toBe("naruto");
    expect(run.turns[1].handoff?.to).toBe("shikamaru");

    // Troisième tour : Shikamaru conclut
    expect(run.turns[2].agentId).toBe("shikamaru");
    expect(run.turns[2].content).toContain("Vérification terminée");

    const { container } = render(
      <RunStage
        run={run}
        renderFormattedContent={(content) => <div>{content}</div>}
      />
    );

    // Vérifie la présence de la régie d'équipe
    expect(container.querySelector("[aria-label*='Régie de run à 3']")).not.toBeNull();
    // Vérifie le connecteur de passation et la présence des agents
    expect(screen.getAllByText(/Minato/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Naruto/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Shikamaru/).length).toBeGreaterThanOrEqual(1);
  });

  // Test 5 : Test du Cadre (Section 5 & 10)
  it("Test du Cadre : la réflexion coule dans le fil sans bouton accordéon ni mention « Pensé pendant »", () => {
    const { container } = render(
      <ReasoningBlock
        agentName="Naruto"
        reasoning="Examen du cycle de vie du composant..."
        tint="#F97316"
      />
    );

    // Pas de bouton pour replier
    expect(container.querySelector("button")).toBeNull();
    // Pas de chevron
    expect(container.querySelector("svg")).toBeNull();
    // Pas de texte 'Pensé pendant'
    expect(container.textContent).not.toContain("Pensé pendant");
    expect(container.textContent).not.toContain("Pensée pendant");
    // Indentation typographique avec ligne verticale
    expect(container.querySelector("[data-reasoning-flow]")).not.toBeNull();
  });

  // Test 6 : Test du Silence (Section 10 - Recette)
  it("Test du Silence : l'avatar reflète les états distincts (attente, production, terminé)", () => {
    const agent = getAgentById("sasuke");

    const { container: activeContainer } = render(
      <AgentAvatar agent={agent} isActive={true} state="production" />
    );
    // L'agent actif n'a pas la classe grayscale
    expect(activeContainer.querySelector(".grayscale")).toBeNull();

    const { container: inactiveContainer } = render(
      <AgentAvatar agent={agent} isActive={false} state="attente" />
    );
    // L'agent inactif est désaturé
    expect(inactiveContainer.querySelector(".grayscale")).not.toBeNull();
  });
});
