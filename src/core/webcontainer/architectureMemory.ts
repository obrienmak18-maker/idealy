import type { WebContainer } from '@webcontainer/api';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import type { MissionContracts } from '@/core/mission/contracts';

export const ARCHITECTURE_FILE = '.idealy/architecture.md';
export const MAX_RELEVANT_FILES = 3;
const MAX_ARCHITECTURE_CHARS = 6_000;
const MAX_RELEVANT_FILE_CHARS = 3_000;

export interface RelevantVFSFile {
  path: string;
  contents: string;
  reason: string;
}

export interface ArchitectureContext {
  architecture: string;
  relevantFiles: RelevantVFSFile[];
}

const ARCHITECTURE_TEMPLATE = `# Idealy Architecture Memory

> Fichier réservé au contexte de génération. Ne pas supprimer. Ne jamais y écrire de secret, token ou mot de passe.

## Produit
- Intention : à compléter par le Bâtisseur à chaque changement majeur.
- Stack : à confirmer depuis les fichiers du projet.

## Architecture applicative
- Entrée : à compléter.
- Modules principaux : à compléter.
- Flux de données : à compléter.

## Schéma de données
- Entités : à compléter.
- Relations et permissions : à compléter.

## Routes et contrats API
- Routes frontend : à compléter.
- Edge Functions / API : à compléter.
- Authentification et connecteurs : à compléter.

## Décisions récentes
- La mémoire est injectée dans chaque appel de génération.
- Les trois fichiers de travail les plus pertinents sont fournis au modèle ; le reste reste dans le VFS.
`;

function trimForPrompt(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max)}\n\n[… contenu tronqué pour préserver le budget de contexte …]`;
}

function safeText(value: string): string {
  return value
    .replace(/(api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*[^\s,;]+/gi, '$1: [redacted]')
    .replace(/[\r\n]+/g, ' ')
    .slice(0, 240);
}

function isSensitiveName(value: string): boolean {
  return /(api[_-]?key|secret|token|password|private[_-]?key|credential)/i.test(value);
}

export function generateArchitectureSummary(
  schema: IdealyUniversalProjectSchema,
  contracts?: MissionContracts,
): string {
  const paths = Object.keys(schema.project.files).filter((path) => path !== ARCHITECTURE_FILE && !/(^|\/)\.env/i.test(path));
  const routes = paths.filter((path) => /(^|\/)(routes?|pages?|app)(\/|$)/i.test(path));
  const components = paths.filter((path) => /(^|\/)components?(\/|$)|\.(tsx?|jsx?)$/i.test(path)).slice(0, 24);
  const apiFiles = paths.filter((path) => /(api|server|function|supabase|hook|store|context)/i.test(path));
  const screens = contracts?.design.screens.map((screen) => `- ${safeText(screen.id)} — ${safeText(screen.name)} (${safeText(screen.purpose)})`) ?? [];
  const entities = contracts?.data.entities.map((entity) => {
    const fields = entity.fields
      .filter((field) => !isSensitiveName(field.name))
      .map((field) => `${safeText(field.name)}: ${safeText(field.type)}`)
      .join(', ');
    return `- ${safeText(entity.name)}${fields ? ` — ${fields}` : ''}`;
  }) ?? [];
  const requiredConnectors = contracts?.deploy.requiredConnectors.filter((connector) => !isSensitiveName(connector)).map(safeText) ?? [];

  return [
    '# Idealy Architecture Memory',
    '',
    '> Index généré automatiquement par Idealy. Ce fichier ne contient volontairement ni code source, ni secret, ni token.',
    '',
    '## Produit',
    `- Nom : ${safeText(schema.project.name)}`,
    `- Stack : ${safeText(schema.project.stack ?? 'non spécifiée')}`,
    `- Description : ${safeText(schema.project.description ?? 'non spécifiée')}`,
    '',
    '## Architecture applicative',
    `- Fichiers du projet : ${paths.length}`,
    `- Composants principaux : ${components.length > 0 ? components.join(', ') : 'à compléter'}`,
    `- Modules données/API : ${apiFiles.length > 0 ? apiFiles.join(', ') : 'à compléter'}`,
    '',
    '## Routes et écrans',
    ...(routes.length > 0 ? routes.map((path) => `- ${path}`) : ['- Routes déduites : à compléter']),
    ...(screens.length > 0 ? screens : ['- Écrans contractuels : à compléter']),
    '',
    '## Schéma de données',
    `- Fournisseur : ${safeText(contracts?.data.provider ?? 'non spécifié')}`,
    ...(entities.length > 0 ? entities : ['- Entités contractuelles : à compléter']),
    '',
    '## Connecteurs et déploiement',
    `- Cible : ${safeText(contracts?.deploy.target ?? 'preview')}`,
    `- Environnement : ${safeText(contracts?.deploy.environment ?? 'local')}`,
    `- Connecteurs requis : ${requiredConnectors.length > 0 ? requiredConnectors.join(', ') : 'aucun déclaré'}`,
    '',
    '## Décisions récentes',
    '- architecture.md est injecté dans chaque appel de génération.',
    '- Le modèle reçoit au maximum trois fichiers VFS pertinents ; les autres restent dans WebContainer.',
    '- Les secrets sont exclus de cette mémoire et doivent rester côté serveur.',
  ].join('\n').slice(0, MAX_ARCHITECTURE_CHARS);
}

export async function readArchitectureFile(instance: WebContainer): Promise<string | null> {
  try {
    const content = await instance.fs.readFile(ARCHITECTURE_FILE, 'utf-8');
    return content.trim() || null;
  } catch {
    return null;
  }
}

export async function writeArchitectureFile(instance: WebContainer, content: string): Promise<void> {
  await instance.fs.mkdir('.idealy', { recursive: true }).catch(() => undefined);
  await instance.fs.writeFile(ARCHITECTURE_FILE, (content.trim() || ARCHITECTURE_TEMPLATE).slice(0, MAX_ARCHITECTURE_CHARS));
}

export function getArchitectureMemory(files: Record<string, string> | undefined): string {
  const memory = files?.[ARCHITECTURE_FILE]?.trim();
  return memory ? trimForPrompt(memory, MAX_ARCHITECTURE_CHARS) : ARCHITECTURE_TEMPLATE;
}

function tokenize(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9à-ÿ]+/i).filter((token) => token.length >= 3);
}

function relevanceScore(path: string, contents: string, prompt: string, changedFiles: string[]): { score: number; reason: string } {
  const pathTokens = tokenize(path);
  const promptTokens = new Set(tokenize(prompt));
  let score = 0;
  const reasons: string[] = [];

  if (changedFiles.includes(path)) {
    score += 100;
    reasons.push('fichier récemment modifié');
  }
  if (/package\.json|tsconfig|vite\.config|app\.config/i.test(path)) {
    score += 40;
    reasons.push('contrat de build');
  }
  if (/src\/(app|main|routes?|pages?)\//i.test(path) || /(^|\/)App\.(tsx?|jsx?)$/i.test(path)) {
    score += 35;
    reasons.push('entrée ou route applicative');
  }
  if (/schema|supabase|api|server|function|hook|store|context/i.test(path)) {
    score += 28;
    reasons.push('contrat de données ou API');
  }

  const matchingTokens = pathTokens.filter((token) => promptTokens.has(token));
  if (matchingTokens.length > 0) {
    score += matchingTokens.length * 12;
    reasons.push(`correspondance avec la mission : ${matchingTokens.slice(0, 3).join(', ')}`);
  }
  score += Math.min(8, Math.floor(contents.length / 2_000));

  return { score, reason: reasons[0] ?? 'fichier proche de la surface applicative' };
}

export function selectRelevantFiles(
  files: Record<string, string> | undefined,
  prompt: string,
  changedFiles: string[] = [],
): RelevantVFSFile[] {
  if (!files) return [];

  return Object.entries(files)
    .filter(([path]) => path !== ARCHITECTURE_FILE)
    .map(([path, contents]) => {
      const relevance = relevanceScore(path, contents, prompt, changedFiles);
      return {
        path,
        contents: trimForPrompt(contents, MAX_RELEVANT_FILE_CHARS),
        reason: relevance.reason,
        score: relevance.score,
      };
    })
    .sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
    .slice(0, MAX_RELEVANT_FILES)
    .map(({ score: _score, ...file }) => file);
}

export function ensureArchitectureFile(
  schema: IdealyUniversalProjectSchema,
  architecture: string,
): IdealyUniversalProjectSchema {
  const files = schema.project.files;
  if (files[ARCHITECTURE_FILE]?.trim()) return schema;

  return {
    ...schema,
    project: {
      ...schema.project,
      files: {
        ...files,
        [ARCHITECTURE_FILE]: architecture.trim() || ARCHITECTURE_TEMPLATE,
      },
    },
  };
}

export function buildArchitectureContext(
  architecture: string,
  relevantFiles: RelevantVFSFile[],
): string {
  const vfs = relevantFiles.length > 0
    ? relevantFiles.map((file) => `### ${file.path}\nRaison : ${file.reason}\n\n\`\`\`\n${file.contents}\n\`\`\``).join('\n\n')
    : 'Aucun fichier existant pertinent n’a été sélectionné ; travaille à partir de la mission et des contrats.';

  return `

MÉMOIRE D’ARCHITECTURE — INJECTÉE À CHAQUE APPEL
Le fichier caché .idealy/architecture.md est la source de continuité du projet. Lis-le, respecte ses décisions et retourne toujours une version mise à jour lorsque tu crées ou modifies un fichier majeur.

--- architecture.md ---
${trimForPrompt(architecture || ARCHITECTURE_TEMPLATE, MAX_ARCHITECTURE_CHARS)}
--- fin architecture.md ---

VFS CIBLÉ — EXACTEMENT LES FICHIERS LES PLUS PERTINENTS
Le reste du projet existe dans le VFS mais n’est pas envoyé dans ce tour. Ne réécris pas les fichiers non sélectionnés sans raison explicite.

${vfs}

RÈGLE DE MÉMOIRE
Si un fichier majeur est créé ou modifié, mets à jour .idealy/architecture.md dans la réponse JSON avec les sections Produit, Architecture applicative, Schéma de données, Routes et contrats API et Décisions récentes. N’y mets jamais de secret.
`;
}

export function createArchitectureContext(
  files: Record<string, string> | undefined,
  prompt: string,
  changedFiles: string[] = [],
): ArchitectureContext {
  return {
    architecture: getArchitectureMemory(files),
    relevantFiles: selectRelevantFiles(files, prompt, changedFiles),
  };
}
