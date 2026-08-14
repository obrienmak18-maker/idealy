import { callAIProxy, streamAIProxy } from './provider';
import type { Way } from '@/lore/ways';
import { planMission, type ConnectorProvider, type SkillSlug } from './skillRouter';
import { buildMissionContracts } from '@/core/mission/missionContract';
import type { MissionContracts } from '@/core/mission/contracts';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';

export interface MissionContext {
  prompt: string;
  way: Way;
  rank: string;
  energyCost: number;
  skills: SkillSlug[];
  preferredConnectors: ConnectorProvider[];
  contracts: MissionContracts;
  /** Called during buildIUPS streaming with (tokensGenerated, partialText) */
  onProgress?: (tokens: number, partial: string) => void;
}

export interface TerminalCorrectionIssue {
  file: string | null;
  line: number | null;
  column: number | null;
  message: string;
}

export interface TerminalCorrectionFeedback {
  command: string;
  issues: TerminalCorrectionIssue[];
}

// ─── Intent Analysis ─────────────────────────────────────────────────────────

export async function analyzeIntent(prompt: string, way: Way): Promise<MissionContext> {
  const plan = planMission(prompt);
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
    const text = await callAIProxy({
      prompt,
      systemPrompt,
      complexity: 'fast',
      maxTokens: 350,
    });
    const clean = text.trim().replace(/^```json?\s*/i, '').replace(/\s*```\s*$/, '');
    const data = JSON.parse(clean);
    return {
      prompt,
      way,
      rank: data.rank || way.ranks[0],
      energyCost: data.energyCost || 10,
      ...plan,
      contracts: buildMissionContracts(prompt, way, plan),
    };
  } catch (error) {
    console.error('Intent analysis failed, defaulting:', error);
    return {
      prompt,
      way,
      rank: way.ranks[0],
      energyCost: 5,
      ...plan,
      contracts: buildMissionContracts(prompt, way, plan),
    };
  }
}

// ─── Robust JSON Extraction ───────────────────────────────────────────────────

function extractJSON(raw: string): Record<string, unknown> | null {
  const cleaned = raw.trim();

  // 1. Direct parse
  try { return JSON.parse(cleaned); } catch { /* continue */ }

  // 2. Strip markdown fences
  const stripped = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  try { return JSON.parse(stripped); } catch { /* continue */ }

  // 3. Brace-depth extraction — finds first complete JSON object
  let depth = 0;
  let start = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      if (start === -1) start = i;
      depth++;
    } else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { /* try next */ }
        start = -1;
      }
    }
  }
  return null;
}

// ─── IUPS Builder (code generation) ──────────────────────────────────────────

export async function buildIUPS(
  context: MissionContext,
  correction?: TerminalCorrectionFeedback,
  onProgress: MissionContext['onProgress'] = context.onProgress,
): Promise<IdealyUniversalProjectSchema | null> {
  const mobileKeywords = /mobile|android|ios|expo|react.native|app.store|téléphone|smartphone|apk/i;
  const isMobile = mobileKeywords.test(context.prompt);

  const webSystemPrompt = `Tu es une IA experte en développement web full-stack (React, TypeScript, Tailwind, Vite).
La demande est : "${context.prompt}"
Rang de complexité : ${context.rank}

MISSION : Génère un projet web complet, production-ready, avec une UI moderne et professionnelle.

CONTRAT DE MISSION À RESPECTER :
${JSON.stringify(context.contracts)}

RÈGLES IMPÉRATIVES :
- Génère un vrai projet fonctionnel, pas un template vide.
- Le code doit être complet, pas tronqué.
- Utilise des couleurs harmonieuses, du glassmorphisme, des animations CSS subtiles.
- Génère AU MINIMUM : package.json, vite.config.js, index.html, src/main.tsx, src/App.tsx, src/App.css.
- Pour un projet complexe, génère aussi : src/components/, src/pages/, src/hooks/, src/utils/.
- Chaque fichier doit être complet et syntaxiquement correct.
- N'utilise PAS de placeholder comme "// TODO" ou "..." dans le code.
- Génère une première tranche verticale utilisable : données de démonstration cohérentes, action principale, états loading/empty/error/success et responsive.
- Ne place jamais de clé secrète, token privé ou mot de passe dans les fichiers générés.
  - Respecte le DesignContract, les entités du DataContract et les critères du TestContract ci-dessus.
  - Les contrats, le rapport de validation et le snapshotId sont ajoutés par Idealy après génération ; ne mets aucun secret dans ces métadonnées.

STRUCTURE JSON OBLIGATOIRE (ne renvoie QUE ce JSON, sans markdown) :
{
  "project": {
    "name": "nom-kebab-case",
    "description": "Description courte",
    "stack": "react-vite-typescript",
    "files": {
      "package.json": "contenu complet",
      "vite.config.js": "contenu complet",
      "index.html": "contenu complet",
      "src/main.tsx": "contenu complet",
      "src/App.tsx": "contenu complet",
      "src/App.css": "contenu complet"
    }
  }
}`;

  const mobileSystemPrompt = `Tu es une IA experte en développement mobile React Native / Expo.
La demande est : "${context.prompt}"
Rang de complexité : ${context.rank}

MISSION : Génère un projet Expo (React Native) complet et fonctionnel, mobile-first.

CONTRAT DE MISSION À RESPECTER :
${JSON.stringify(context.contracts)}

RÈGLES IMPÉRATIVES :
- Génère un vrai projet Expo, pas un template vide.
- Utilise expo-router pour la navigation.
- Génère AU MINIMUM : package.json, app.json, app/(tabs)/index.tsx, app/(tabs)/_layout.tsx.
- N'utilise PAS de placeholder.
- Génère des états de chargement, vide, succès et erreur pour l’action principale.
- Ne place jamais de secret dans les fichiers générés.
  - Respecte le DesignContract, le DataContract et le TestContract.
  - Les métadonnées de contrat et de validation sont ajoutées par Idealy après génération.

STRUCTURE JSON OBLIGATOIRE (ne renvoie QUE ce JSON) :
{
  "project": {
    "name": "nom-app-mobile",
    "description": "Description courte",
    "stack": "expo-react-native",
    "files": {
      "package.json": "contenu complet",
      "app.json": "contenu complet",
      "app/(tabs)/index.tsx": "contenu complet",
      "app/(tabs)/_layout.tsx": "contenu complet"
    }
  }
}`;

  const correctionSystemPrompt = correction
    ? `

SELF-CORRECTION TERMINALISÉE — TOUR SUIVANT
Le projet précédent a été exécuté dans WebContainer. Corrige uniquement les erreurs réelles ci-dessous.
N'invente pas d'autres erreurs, ne change pas l'intention du produit et retourne le projet complet au même format JSON.
${correction.issues.map((issue) => {
  const location = issue.file
    ? `Fichier concerné : ${issue.file}.`
    : 'Fichier concerné : emplacement non déterminé.';
  return `- ${location} Message d'erreur : ${issue.message}`;
}).join('\n')}
`
    : '';
  const systemPrompt = `${isMobile ? mobileSystemPrompt : webSystemPrompt}${correctionSystemPrompt}`;

  try {
    let accumulated = '';
    let tokenCount = 0;

    // Un seul appel LLM par tour : la boucle de correction est pilotée par le terminal.
    const textStream = await streamAIProxy({
      systemPrompt,
      prompt: correction
        ? "Corrige les fichiers signalés par le terminal. Réponds UNIQUEMENT avec le JSON complet, sans markdown ni explication."
        : "Génère l'IUPS complet pour ma mission. Réponds UNIQUEMENT avec le JSON, sans markdown, sans explication.",
      complexity: 'high',
      maxTokens: 8000,
    });

    for await (const delta of textStream) {
      accumulated += delta;
      tokenCount += delta.length;
      // Notify every ~50 chars
      if (onProgress && tokenCount % 50 < delta.length) {
        onProgress(tokenCount, accumulated);
      }
    }

    const parsed = extractJSON(accumulated);
    if (parsed && typeof parsed === 'object' && 'project' in parsed) {
      return {
        ...(parsed as unknown as IdealyUniversalProjectSchema),
        contracts: context.contracts,
      };
    }
    console.warn(`[buildIUPS] JSON extraction failed, raw length=${accumulated.length}`);
  } catch (error) {
    console.error('[buildIUPS] Generation threw:', error);
  }

  return null;
}

// ─── Agent Message Streamer ───────────────────────────────────────────────────

export async function streamAgentMessage(
  agent: Way['agents'][number],
  way: Way,
  contextText: string,
  missionPrompt: string,
  instruction: string
) {
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

  return {
    textStream: await streamAIProxy({
      systemPrompt,
      prompt: 'À toi de jouer.',
      complexity: 'fast',
      maxTokens: 900,
    }),
  };
}
