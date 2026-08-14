import { classifyIntent } from '../supabase/functions/process-ai-request/intentRouter.ts';

const cases = [
  ['OK, je comprends.', 'CONVERSATION'],
  ['Pourquoi le Canvas est-il central ?', 'CONVERSATION'],
  ['Propose-moi trois idées d’application pour une école.', 'IDEATION'],
  ['Crée une landing page SaaS avec un formulaire de contact.', 'EXECUTION'],
  ['Refactorise le composant dashboard et corrige le code TypeScript.', 'EXECUTION'],
] as const;

for (const [prompt, expected] of cases) {
  const result = classifyIntent(prompt);
  if (result.category !== expected) throw new Error(`${prompt} => ${result.category}, expected ${expected}`);
}

console.log('intent-router-smoke: PASS');
