import { generateText, streamText } from 'ai';
import { getModel } from './provider';
import type { Way } from '@/lore/ways';
import { planMission, type ConnectorProvider, type SkillSlug } from './skillRouter';

export interface MissionContext {
  prompt: string;
  way: Way;
  rank: string;
  energyCost: number;
  skills: SkillSlug[];
  preferredConnectors: ConnectorProvider[];
}

/**
 * Analyzes the user's prompt to determine project complexity and assign a rank.
 */
export async function analyzeIntent(prompt: string, way: Way): Promise<MissionContext> {
  const plan = planMission(prompt);
  // Use a fast model to analyze the intent
  const model = getModel('fast');
  
  const ranksList = way.ranks.join(', ');
  
  const systemPrompt = `Tu es l'Orchestrateur en chef de la voie "${way.name}".
Ta tâche est d'analyser la demande de l'utilisateur pour estimer sa complexité.
Tu dois répondre UNIQUEMENT avec un objet JSON strict :
{
  "rank": "Le rang assigné, parmi : ${ranksList}",
  "energyCost": 10
}
Un projet simple (ex: un bouton, une todo list) coûte peu d'énergie (5-10) et reçoit le rang le plus bas.
Un projet complexe (ex: un SaaS, un réseau social) coûte plus d'énergie (30-50) et reçoit un rang élevé.`;

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt,
    });
    
    // Parse the JSON
    const data = JSON.parse(text.trim().replace(/```json/g, '').replace(/```/g, ''));
    return {
      prompt,
      way,
      rank: data.rank || way.ranks[0],
      energyCost: data.energyCost || 10,
      ...plan,
    };
  } catch (error) {
    console.error('Intent analysis failed, defaulting:', error);
    return {
      prompt,
      way,
      rank: way.ranks[0],
      energyCost: 5,
      ...plan,
    };
  }
}

/**
 * Generates the IUPS representation of the project using a high-capability model.
 */
export async function buildIUPS(context: MissionContext) {
  const model = getModel('high');

  // Detect if the user wants a mobile app (Rork style)
  const mobileKeywords = /mobile|android|ios|expo|react.native|app.store|téléphone|smartphone|apk/i;
  const isMobile = mobileKeywords.test(context.prompt);

  const webSystemPrompt = `Tu es une IA experte en développement web full-stack (React, TypeScript, Tailwind, Vite).
La demande est : "${context.prompt}"
Rang de complexité : ${context.rank}

MISSION : Génère un projet web complet, production-ready, avec une UI moderne et professionnelle.

RÈGLES IMPÉRATIVES :
- Génère un vrai projet fonctionnel, pas un template vide.
- Le code doit être complet, pas tronqué.
- Utilise des couleurs harmonieuses (pas de couleurs crues), du glassmorphisme, des animations CSS subtiles.
- Génère AU MINIMUM : package.json, vite.config.js, index.html, src/main.tsx, src/App.tsx, src/App.css (ou Tailwind).
- Pour un projet complexe, génère aussi : src/components/, src/pages/, src/hooks/, src/utils/.
- Chaque fichier doit être complet et syntaxiquement correct.
- N'utilise PAS de placeholder comme "// TODO" ou "..." dans le code.

STRUCTURE JSON OBLIGATOIRE (ne renvoie QUE ce JSON, sans markdown) :
{
  "project": {
    "name": "Nom du projet (kebab-case)",
    "description": "Description courte",
    "stack": "react-vite-typescript",
    "files": {
      "package.json": "{ \\"name\\": \\"mon-app\\", \\"type\\": \\"module\\", \\"scripts\\": { \\"dev\\": \\"vite\\", \\"build\\": \\"vite build\\" }, \\"dependencies\\": { \\"react\\": \\"^18.2.0\\", \\"react-dom\\": \\"^18.2.0\\" }, \\"devDependencies\\": { \\"vite\\": \\"^5.0.0\\", \\"@vitejs/plugin-react\\": \\"^4.0.0\\" } }",
      "vite.config.js": "import { defineConfig } from 'vite';\\nimport react from '@vitejs/plugin-react';\\nexport default defineConfig({ plugins: [react()] });",
      "index.html": "<!DOCTYPE html><html lang=\\"fr\\"><head><meta charset=\\"UTF-8\\"/><title>Mon App</title></head><body><div id=\\"root\\"></div><script type=\\"module\\" src=\\"/src/main.tsx\\"></script></body></html>",
      "src/main.tsx": "import React from 'react';\\nimport ReactDOM from 'react-dom/client';\\nimport App from './App.tsx';\\nimport './App.css';\\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);",
      "src/App.tsx": "... code complet de l'app ...",
      "src/App.css": "... styles complets ..."
    }
  }
}`;

  const mobileSystemPrompt = `Tu es une IA experte en développement mobile React Native / Expo.
La demande est : "${context.prompt}"
Rang de complexité : ${context.rank}

MISSION : Génère un projet Expo (React Native) complet et fonctionnel, mobile-first.

RÈGLES IMPÉRATIVES :
- Génère un vrai projet Expo, pas un template vide.
- Utilise expo-router pour la navigation.
- Génère AU MINIMUM : package.json, app.json, app/(tabs)/index.tsx, app/(tabs)/_layout.tsx, components/ThemedView.tsx.
- N'utilise PAS de placeholder.

STRUCTURE JSON OBLIGATOIRE (ne renvoie QUE ce JSON) :
{
  "project": {
    "name": "nom-app-mobile",
    "description": "Description courte",
    "stack": "expo-react-native",
    "files": {
      "package.json": "{ \\"name\\": \\"mon-app\\", \\"main\\": \\"expo-router/entry\\", \\"dependencies\\": { \\"expo\\": \\"~52.0.0\\", \\"expo-router\\": \\"~4.0.0\\", \\"react\\": \\"18.3.1\\", \\"react-native\\": \\"0.76.0\\" } }",
      "app.json": "{ \\"expo\\": { \\"name\\": \\"MonApp\\", \\"scheme\\": \\"mon-app\\", \\"platforms\\": [\\"ios\\", \\"android\\", \\"web\\"] } }",
      "app/(tabs)/index.tsx": "... code de l'écran principal ...",
      "app/(tabs)/_layout.tsx": "... code de la navigation par tabs ..."
    }
  }
}`;

  const systemPrompt = isMobile ? mobileSystemPrompt : webSystemPrompt;

  try {
    const { text } = await generateText({
      model,
      system: systemPrompt,
      prompt: "Génère l'IUPS complet pour ma mission. Réponds UNIQUEMENT avec le JSON, sans markdown, sans explication.",
      maxOutputTokens: 8000,
    });

    // Robust JSON extraction
    const cleaned = text.trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found in response');
    
    return JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
  } catch (error) {
    console.error('IUPS generation failed:', error);
    return null;
  }
}

/**
 * Streams an agent's response, asking them to think first, then summarize and pass the baton.
 */
export async function streamAgentMessage(
  agent: Way['agents'][number],
  way: Way,
  contextText: string,
  missionPrompt: string,
  instruction: string
) {
  const model = getModel('fast');

  const systemPrompt = `Tu es ${agent.name} (${agent.role}), un membre incontournable de la voie "${way.name}".
Ta personnalité profonde (agis EXACTEMENT comme ce personnage sans briser le 4ème mur) : ${agent.personality}.
Ta spécialité : ${agent.specialty}.
Ton expression fétiche que tu utilises naturellement : "${agent.catchphrase}".

L'utilisateur a demandé : "${missionPrompt}".
Contexte actuel :
${contextText}

Instructions spécifiques pour cette étape :
${instruction}

RÈGLE ABSOLUE : Tu dois TOUJOURS structurer ta réponse ainsi :
1. Commence par tes pensées détaillées, ton raisonnement, tes doutes, ou ce que tu fais techniquement, encadré EXACTEMENT par <think> et </think>.
2. Ensuite, écris ton message final (résumé clair, direct, dans le ton de ta personnalité) qui sera lu par l'utilisateur et l'agent suivant. Tu es un expert technique, mais tu t'exprimes avec le fort caractère de ton personnage.`;

  return streamText({
    model,
    system: systemPrompt,
    prompt: "A toi de jouer.",
  });
}
