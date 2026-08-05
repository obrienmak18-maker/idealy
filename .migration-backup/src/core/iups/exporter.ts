import type { IdealyUniversalProjectSchema } from './types';

export function iupsToCode(schema: IdealyUniversalProjectSchema): string {
  if (!schema || !schema.project || !schema.project.files) {
    return '// Aucun fichier généré.';
  }

  return Object.entries(schema.project.files)
    .map(([path, content]) => `// === Fichier : ${path} ===\n${content}`)
    .join('\n\n');
}
