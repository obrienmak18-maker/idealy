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

const PIZZA_FILES: Record<string, string> = {
  'package.json': JSON.stringify({
    name: 'idealy-pizzeria-demo',
    private: true,
    version: '0.0.0',
    type: 'module',
    scripts: { dev: 'vite', build: 'tsc -b && vite build' },
    dependencies: { '@vitejs/plugin-react': 'latest', react: 'latest', 'react-dom': 'latest', vite: 'latest', typescript: 'latest' },
  }, null, 2),
  'index.html': '<!doctype html>\n<html lang="fr">\n  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Forno — Pizza & partage</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n',
  'src/main.tsx': "import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './styles.css';\n\ncreateRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);\n",
  'src/App.tsx': `import { useState } from 'react';

const menu = [
  { name: 'Margherita', description: 'Tomate, fior di latte, basilic frais', price: '9,50 €' },
  { name: 'Diavola', description: 'Tomate, mozzarella, salami piquant, miel', price: '12,00 €' },
  { name: 'Verdure', description: 'Courgette grillée, poivron, olives, roquette', price: '11,50 €' },
];

const photos = [
  'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85',
];

export default function App() {
  const [sent, setSent] = useState(false);
  return (
    <main className="page">
      <nav className="nav"><span className="brand">FORNO<span>•</span></span><div className="nav-links"><a href="#menu">Le menu</a><a href="#contact">Contact</a></div><a className="nav-cta" href="#contact">Réserver une table</a></nav>
      <section className="hero">
        <div className="hero-copy"><p className="eyebrow">PIZZA · FEU · PARTAGE</p><h1>La pâte prend son temps. <em>Vous aussi.</em></h1><p className="lead">Des pizzas au feu de bois, des produits simples et une salle où l’on vient comme on est.</p><a className="primary" href="#menu">Découvrir le menu <span>↗</span></a></div>
        <div className="hero-image"><img src={photos[0]} alt="Pizza fraîche sortie du four" /><span className="stamp">Cuite au feu<br />de bois</span></div>
      </section>
      <section className="intro"><p className="eyebrow">NOTRE TABLE</p><h2>Une bonne pizza commence par de bons ingrédients.</h2><p>Farine italienne, fermentation lente et légumes de saison. Chaque assiette est préparée à la commande, dans notre four à 450°.</p></section>
      <section className="gallery">{photos.slice(1).map((photo) => <img key={photo} src={photo} alt="Pizza artisanale Forno" />)}</section>
      <section className="menu" id="menu"><div className="section-heading"><p className="eyebrow">À LA CARTE</p><h2>Les classiques du four.</h2></div><div className="menu-list">{menu.map((item) => <article className="menu-item" key={item.name}><div><h3>{item.name}</h3><p>{item.description}</p></div><strong>{item.price}</strong></article>)}</div></section>
      <section className="contact" id="contact"><div><p className="eyebrow">ON SE RETROUVE ?</p><h2>Votre table est à deux clics.</h2><p>18 rue des Oliviers · Ouvert du mardi au dimanche, 18h30—23h.</p></div><form onSubmit={(event) => { event.preventDefault(); setSent(true); }}><input aria-label="Votre email" type="email" placeholder="votre@email.com" required /><button type="submit">{sent ? 'Demande envoyée ✓' : 'Être rappelé'}</button></form></section>
      <footer><span className="brand">FORNO<span>•</span></span><span>Une démo locale créée avec Idealy.</span></footer>
    </main>
  );
}
`,
  'src/styles.css': `:root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #27201c; background: #f7f1e8; font-synthesis: none; } * { box-sizing: border-box; } html { scroll-behavior: smooth; } body { margin: 0; min-width: 320px; } a { color: inherit; text-decoration: none; } .page { max-width: 1180px; margin: 0 auto; padding: 24px 48px 0; } .nav { display: flex; align-items: center; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d9cdbc; padding-bottom: 20px; } .brand { font-size: 1.15rem; font-weight: 900; letter-spacing: .18em; } .brand span { color: #d85b32; margin-left: 3px; } .nav-links { display: flex; gap: 28px; color: #766b61; font-size: .88rem; } .nav-cta, .primary { display: inline-flex; align-items: center; gap: 12px; border-radius: 999px; background: #27201c; color: #fff9f0; padding: 12px 18px; font-size: .82rem; font-weight: 800; } .hero { display: grid; grid-template-columns: 1fr .9fr; align-items: center; gap: 72px; padding: 84px 0 112px; } .eyebrow { color: #c25532; font-size: .7rem; font-weight: 900; letter-spacing: .18em; } h1 { max-width: 570px; margin: 18px 0; font-size: clamp(3rem, 6vw, 6.4rem); line-height: .94; letter-spacing: -.07em; } h1 em { color: #c25532; font-style: normal; } h2 { margin: 12px 0 18px; font-size: clamp(2rem, 4vw, 4rem); line-height: 1; letter-spacing: -.06em; } .lead { max-width: 470px; color: #766b61; font-size: 1.05rem; line-height: 1.7; } .primary { margin-top: 24px; background: #c25532; } .hero-image { position: relative; } .hero-image img { display: block; width: 100%; height: 520px; object-fit: cover; border-radius: 220px 220px 12px 12px; } .stamp { position: absolute; right: -18px; bottom: 34px; display: grid; place-items: center; width: 112px; height: 112px; border: 1px solid #f7f1e8; border-radius: 50%; background: #d8a548; color: #fff9f0; text-align: center; font-size: .72rem; font-weight: 900; text-transform: uppercase; transform: rotate(10deg); } .intro { max-width: 760px; border-top: 1px solid #d9cdbc; padding: 64px 0 72px; } .intro p:last-child, .contact p:last-child { max-width: 520px; color: #766b61; line-height: 1.7; } .gallery { display: grid; grid-template-columns: 1.25fr .75fr; gap: 18px; } .gallery img { width: 100%; height: 360px; object-fit: cover; border-radius: 8px; } .gallery img + img { height: 280px; margin-top: 80px; } .menu { padding: 120px 0; display: grid; grid-template-columns: .8fr 1.2fr; gap: 72px; } .menu-list { border-top: 1px solid #d9cdbc; } .menu-item { display: flex; align-items: start; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d9cdbc; padding: 22px 0; } .menu-item h3 { margin: 0 0 8px; font-size: 1.25rem; } .menu-item p { margin: 0; color: #766b61; font-size: .9rem; } .menu-item strong { color: #c25532; white-space: nowrap; } .contact { display: flex; align-items: end; justify-content: space-between; gap: 40px; border-top: 1px solid #d9cdbc; padding: 80px 0; } form { display: flex; gap: 8px; } input { min-width: 230px; border: 1px solid #cbbcad; border-radius: 999px; background: transparent; padding: 13px 16px; color: inherit; } button { border: 0; border-radius: 999px; background: #c25532; color: white; padding: 13px 18px; font-weight: 800; cursor: pointer; } footer { display: flex; justify-content: space-between; border-top: 1px solid #d9cdbc; padding: 24px 0 32px; color: #766b61; font-size: .78rem; } @media (max-width: 760px) { .page { padding: 18px 20px 0; } .nav-links { display: none; } .hero, .menu { grid-template-columns: 1fr; gap: 38px; padding: 58px 0 72px; } .hero-image img { height: 390px; } .gallery { grid-template-columns: 1fr; } .gallery img, .gallery img + img { height: 260px; margin-top: 0; } .contact, form, footer { align-items: stretch; flex-direction: column; } input { min-width: 0; } }
`,
};

export function createDemoPizzeriaMission(way: Way, prompt: string, missionId = 'demo-pizzeria-local'): DemoMissionBundle {
  const contracts = buildMissionContracts(prompt, way);
  const baseSchema: IdealyUniversalProjectSchema = {
    project: {
      name: 'Forno — Pizza & partage',
      description: 'Landing page locale de démonstration pour une pizzeria artisanale.',
      stack: 'react-vite-typescript',
      files: PIZZA_FILES,
    },
  };
  const validation = validateGeneratedProject(baseSchema, contracts);
  const snapshot = createMissionSnapshot(baseSchema, 'Landing pizzeria validée', 'generation', validation);
  const dna = appendSnapshot(
    {
      ...createMissionDNA(missionId, prompt, way, contracts),
      status: validation.status === 'failed' ? 'needs-fix' : 'ready',
      passport: {
        codename: `${way.name} · Mission pizzeria`,
        rank: way.grades[0] ?? 'Genin',
        wayName: way.name,
        objective: 'Créer une landing page pizzeria avec menu, contact et photos réelles.',
        nextAction: 'Ouvrir la preview puis examiner le code généré.',
        generatedAt: Date.now(),
      },
    },
    snapshot,
    validation.status === 'failed' ? 'needs-fix' : 'ready',
    validation,
  );
  return {
    prompt,
    schema: { ...baseSchema, contracts, validation, snapshotId: snapshot.id },
    dna: { ...dna, preflight: buildPreflightProofs(baseSchema, validation, [snapshot]) },
  };
}
