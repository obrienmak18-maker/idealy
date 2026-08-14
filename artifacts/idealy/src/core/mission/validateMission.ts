import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import type { MissionContracts, ValidationReport } from './contracts';

const SECRET_PATTERNS = [
  /sk_(?:live|test)_[A-Za-z0-9]+/i,
  /whsec_[A-Za-z0-9]+/i,
  /(?:service_role|SUPABASE_ACCESS_TOKEN|PRIVATE_KEY)\s*[:=]/i,
  /ghp_[A-Za-z0-9]+/i,
];

export function validateGeneratedProject(
  schema: IdealyUniversalProjectSchema | null,
  contracts: MissionContracts,
): ValidationReport {
  const checkedAt = Date.now();
  const issues: ValidationReport['issues'] = [];
  const checks: ValidationReport['checks'] = [];
  const files = schema?.project?.files ?? {};
  const fileEntries = Object.entries(files);

  const addCheck = (id: string, label: string, status: 'passed' | 'failed' | 'warning') => {
    checks.push({ id, label, status });
  };

  if (!schema?.project) {
    issues.push({ code: 'missing-schema', message: 'Aucun projet IUPS n’a été généré.', severity: 'error' });
    addCheck('schema', 'Projet IUPS présent', 'failed');
    return { status: 'failed', checkedAt, issues, checks };
  }
  addCheck('schema', 'Projet IUPS présent', 'passed');

  const requiredFiles = schema.project.stack === 'expo-react-native'
    ? ['package.json', 'app.json']
    : ['package.json', 'index.html', 'src/main.tsx'];
  const missingFiles = requiredFiles.filter((file) => !files[file]);
  if (missingFiles.length) {
    issues.push({
      code: 'missing-files',
      message: `Fichiers structurants absents : ${missingFiles.join(', ')}.`,
      severity: 'error',
      path: 'project.files',
    });
    addCheck('required-files', 'Fichiers structurants présents', 'failed');
  } else {
    addCheck('required-files', 'Fichiers structurants présents', 'passed');
  }

  const exposedSecrets = fileEntries.flatMap(([path, content]) => {
    const pattern = SECRET_PATTERNS.find((candidate) => candidate.test(content));
    return pattern ? [{ path, pattern: pattern.source }] : [];
  });
  if (exposedSecrets.length) {
    issues.push({
      code: 'secret-exposure',
      message: `Une valeur ressemblant à un secret est présente dans : ${exposedSecrets.map((entry) => entry.path).join(', ')}.`,
      severity: 'error',
      path: 'project.files',
    });
    addCheck('secrets', 'Aucun secret serveur détecté', 'failed');
  } else {
    addCheck('secrets', 'Aucun secret serveur détecté', 'passed');
  }

  const allSource = fileEntries.map(([, content]) => content).join('\n');
  const hasReact = /from\s+['"]react['"]|React\./.test(allSource);
  if (!hasReact) {
    issues.push({ code: 'no-ui-runtime', message: 'Le projet ne contient pas de runtime React identifiable.', severity: 'warning' });
    addCheck('ui-runtime', 'Runtime UI identifiable', 'warning');
  } else {
    addCheck('ui-runtime', 'Runtime UI identifiable', 'passed');
  }

  const hasPrimaryAction = /button|onSubmit|onClick|handleSubmit/i.test(allSource);
  if (!hasPrimaryAction) {
    issues.push({ code: 'no-primary-action', message: 'Aucune action utilisateur claire n’a été détectée.', severity: 'warning' });
    addCheck('primary-action', 'Action utilisateur détectée', 'warning');
  } else {
    addCheck('primary-action', 'Action utilisateur détectée', 'passed');
  }

  if (contracts.tests.acceptance.some((test) => test.kind === 'responsive') && !/responsive|@media|sm:|md:|lg:/i.test(allSource)) {
    issues.push({ code: 'responsive-unknown', message: 'La gestion responsive n’est pas identifiable dans les fichiers générés.', severity: 'warning' });
    addCheck('responsive', 'Indice responsive présent', 'warning');
  } else {
    addCheck('responsive', 'Indice responsive présent', 'passed');
  }

  const hasErrors = issues.some((issue) => issue.severity === 'error');
  const hasWarnings = issues.some((issue) => issue.severity === 'warning');
  return {
    status: hasErrors ? 'failed' : hasWarnings ? 'warning' : 'passed',
    checkedAt,
    issues,
    checks,
  };
}
