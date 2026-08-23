import type { Way } from '@/lore/ways';
import type { IdealyUniversalProjectSchema } from '@/core/iups/types';
import { buildMissionContracts } from './missionContract';
import { createMissionDNA, createMissionSnapshot, appendSnapshot } from './missionDNA';
import { buildPreflightProofs } from './preflight';
import { validateGeneratedProject } from './validateMission';
import type { MissionDNA } from './contracts';

const DEMO_PROMPT = 'Créer un tableau de bord de mission simple avec un brief, une action principale et un état de validation.';

const DEMO_FILES: Record<string, string> = {
  'package.json': JSON.stringify({
    name: 'idealy-mission-demo',
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'tsc -b && vite build' },
    dependencies: { '@vitejs/plugin-react': 'latest', react: 'latest', 'react-dom': 'latest', vite: 'latest', typescript: 'latest' },
  }, null, 2),
  'index.html': '<!doctype html>\n<html lang="fr">\n  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Mission Idealy — Démo</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n',
  'src/main.tsx': "import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './styles.css';\n\ncreateRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);\n",
  'src/App.tsx': "import { useState } from 'react';\n\nconst demoSteps = ['Brief reçu', 'Structure préparée', 'Validation structurelle'];\n\nexport default function App() {\n  const [started, setStarted] = useState(false);\n  return (\n    <main className=\"shell\">\n      <section className=\"hero\">\n        <p className=\"eyebrow\">MODE DÉMO · AUCUN COMPTE REQUIS</p>\n        <h1>Une idée devient une mission lisible.</h1>\n        <p className=\"lead\">Cette application est un exemple local créé par Idealy. Les données sont fictives et aucune connexion externe n’est utilisée.</p>\n        <button onClick={() => setStarted(true)}>{started ? 'Mission ouverte' : 'Ouvrir la mission'}</button>\n      </section>\n      <section className=\"mission\">\n        <div><span className=\"label\">MISSION</span><h2>Tableau de bord de mission</h2><p>Un espace léger pour transformer un brief en prochaine action.</p></div>\n        <div className=\"steps\">{demoSteps.map((step, index) => <div className={started || index === 0 ? 'step active' : 'step'} key={step}><span>{index + 1}</span>{step}</div>)}</div>\n        <div className=\"demo-note\">{started ? 'La mission démo est prête à être explorée.' : 'Cliquez sur le bouton pour voir l’état progresser.'}</div>\n      </section>\n    </main>\n  );\n}\n",
  'src/styles.css': ":root { font-family: Inter, system-ui, sans-serif; color: #f5f7ff; background: #08111f; } * { box-sizing: border-box; } body { margin: 0; min-width: 320px; } .shell { min-height: 100vh; display: grid; grid-template-columns: 1.1fr .9fr; gap: 5vw; align-items: center; padding: 8vw; background: radial-gradient(circle at top left, #17345a, transparent 50%), #08111f; } .hero { max-width: 620px; } .eyebrow, .label { color: #8bd5ff; font-size: .72rem; letter-spacing: .14em; font-weight: 700; } h1 { max-width: 600px; font-size: clamp(2.6rem, 6vw, 5.8rem); line-height: .98; margin: 1rem 0; } h2 { font-size: 1.5rem; margin: .5rem 0; } .lead, .mission p { color: #aab8ce; line-height: 1.7; } button { border: 0; border-radius: 999px; padding: .85rem 1.2rem; background: #8bd5ff; color: #08111f; font-weight: 800; cursor: pointer; } .mission { border: 1px solid rgba(255,255,255,.14); padding: 2rem; background: rgba(255,255,255,.06); } .steps { display: grid; gap: .8rem; margin: 2rem 0; } .step { color: #6f8099; display: flex; gap: .75rem; align-items: center; } .step span { width: 1.8rem; height: 1.8rem; display: grid; place-items: center; border-radius: 50%; border: 1px solid currentColor; } .step.active { color: #8bd5ff; } .demo-note { color: #dbe8f7; font-size: .85rem; } @media (max-width: 760px) { .shell { grid-template-columns: 1fr; padding: 2rem; } }\n",
};

export interface DemoMissionBundle {
  prompt: string;
  schema: IdealyUniversalProjectSchema;
  dna: MissionDNA;
}

export function createDemoMission(way: Way): DemoMissionBundle {
  const missionId = 'demo-idealy-local';
  const contracts = buildMissionContracts(DEMO_PROMPT, way);
  const baseSchema: IdealyUniversalProjectSchema = {
    project: {
      name: 'Idealy Mission Demo',
      description: 'Démo locale sans compte ni fournisseur IA.',
      stack: 'react-vite-typescript',
      files: DEMO_FILES,
    },
  };
  const validation = validateGeneratedProject(baseSchema, contracts);
  const snapshot = createMissionSnapshot(baseSchema, 'Démo validée', 'generation', validation);
  const dna = appendSnapshot(
    {
      ...createMissionDNA(missionId, DEMO_PROMPT, way, contracts),
      status: 'ready',
      passport: {
        codename: `${way.name} · Mission démo`,
        rank: 'Genin',
        wayName: way.name,
        objective: 'Explorer une mission complète sans compte ni clé IA.',
        nextAction: 'Lire les preuves puis ouvrir le code généré.',
        generatedAt: Date.now(),
      },
    },
    snapshot,
    'ready',
    validation,
  );
  return {
    prompt: DEMO_PROMPT,
    schema: { ...baseSchema, contracts, validation, snapshotId: snapshot.id },
    dna: { ...dna, preflight: buildPreflightProofs(baseSchema, validation, [snapshot]) },
  };
}
