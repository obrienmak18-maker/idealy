import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowRight,
  Paperclip,
  Mic,
  Image as ImageIcon,
  Github,
  Figma,
  Zap,
  Users,
  Rocket,
  Shield,
  Layers,
  Wand2,
} from 'lucide-react';
import { Logo, RotatingWords } from '@/components/Brand';
import { AuthModal } from '@/components/AuthModal';
import { useIdealyStore } from '@/stores/idealyStore';

type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  onerror: () => void;
};

type BrowserSpeechRecognitionFactory = new () => BrowserSpeechRecognition;

export function LandingPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stage = useIdealyStore((s) => s.stage);

  function launch() {
    if (stage === 'guest' || stage === 'authenticated') {
      setAuthMode('signup');
      setAuthOpen(true);
    }
  }

  function openAuth(mode: 'signin' | 'signup') {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  function onFiles(files: FileList | null) {
    if (!files) return;
    const accepted = Array.from(files).filter((file) => file.size <= 10 * 1024 * 1024);
    if (accepted.length !== files.length) setNotice('Les fichiers de plus de 10 Mo ne peuvent pas être ajoutés.');
    const names = accepted.map((f) => f.name);
    setAttachments((a) => [...a, ...names].slice(0, 5));
  }

  function openFilePicker(accept = '') {
    if (!fileRef.current) return;
    fileRef.current.accept = accept;
    fileRef.current.click();
  }

  function startDictation() {
    const BrowserWindow = window as Window & {
      SpeechRecognition?: BrowserSpeechRecognitionFactory;
      webkitSpeechRecognition?: BrowserSpeechRecognitionFactory;
    };
    const Recognition = BrowserWindow.SpeechRecognition ?? BrowserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setNotice('La dictée n’est pas prise en charge par ce navigateur. Essayez Chrome ou Edge.');
      return;
    }
    const recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.onresult = (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      const transcript = Array.from(event.results).map((result) => result[0]?.transcript ?? '').join(' ').trim();
      setPrompt((current) => [current, transcript].filter(Boolean).join(current ? ' ' : ''));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setNotice('La dictée a été interrompue. Vérifiez l’autorisation du microphone.');
    };
    setListening(true);
    recognition.start();
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {notice && <p role="status" className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-xs text-electric-300 shadow-lg">{notice}</p>}
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 h-[40rem] w-[40rem] -translate-x-1/2 rounded-full bg-electric-600/10 blur-[120px] animate-drift" />
        <div className="absolute top-1/3 -right-20 h-[30rem] w-[30rem] rounded-full bg-ember-500/10 blur-[120px] animate-drift" style={{ animationDelay: '6s' }} />
        <div className="absolute bottom-0 left-0 h-[25rem] w-[25rem] rounded-full bg-electric-500/8 blur-[100px] animate-drift" style={{ animationDelay: '3s' }} />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mt-4 flex h-14 items-center justify-between rounded-2xl glass px-4">
            <Logo />
            <nav className="hidden items-center gap-7 text-sm text-ink-300 md:flex">
              <a href="#features" className="hover:text-white transition">Fonctionnalités</a>
              <a href="#ways" className="hover:text-white transition">Les Voies</a>
              <a href="#how" className="hover:text-white transition">Comment ça marche</a>
            </nav>
            <div className="flex items-center gap-2">
              <button onClick={() => openAuth('signin')} className="btn-ghost">
                Se connecter
              </button>
              <button onClick={() => openAuth('signup')} className="btn-primary">
                Commencer
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-5xl px-5 pt-20 pb-16 text-center md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6 inline-flex items-center gap-2 rounded-full glass-soft px-4 py-1.5 text-xs text-ink-200"
        >
          <Sparkles size={13} className="text-ember-400" />
          Studio de développement IA multi-agents
        </motion.div>

        <h1 className="text-balance text-5xl font-semibold leading-[1.05] text-white md:text-7xl">
          Qu'allons-nous <RotatingWords words={['construire', 'explorer', 'déployer', 'inventer']} /> aujourd'hui ?
        </h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink-300"
        >
          Décrivez votre idée. Une équipe de spécialistes IA l'analyse, la planifie,
          la construit, la corrige et la déploie — sans que vous voyiez jamais les modèles.
        </motion.p>

        {/* Prompt box */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mx-auto mt-10 max-w-2xl"
        >
          <div className="card p-4 text-left">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex : Une app de gestion de tâches avec authentification, tableau de bord, et mode sombre..."
              rows={3}
              className="w-full resize-none bg-transparent text-sm text-ink-100 placeholder:text-ink-400 focus:outline-none scrollbar-thin"
              style={{ minHeight: '4.5rem' }}
            />
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {attachments.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-md bg-white/5 px-2 py-1 text-xs text-ink-200">
                    <Paperclip size={11} /> {a}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openFilePicker()}
                  className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white transition"
                  title="Importer un fichier"
                >
                  <Paperclip size={17} />
                </button>
                <button onClick={() => openFilePicker('image/*')} className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white transition" title="Image">
                  <ImageIcon size={17} />
                </button>
                <button onClick={() => { setNotice('Connectez-vous pour importer un fichier Figma.'); openAuth('signup'); }} className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white transition" title="Figma">
                  <Figma size={16} />
                </button>
                <button onClick={() => { setNotice('Connectez-vous pour relier GitHub à votre espace Idealy.'); openAuth('signup'); }} className="rounded-lg p-2 text-ink-400 hover:bg-white/5 hover:text-white transition" title="GitHub">
                  <Github size={16} />
                </button>
                <button onClick={startDictation} aria-pressed={listening} className={`rounded-lg p-2 transition ${listening ? 'bg-electric-500/20 text-electric-300' : 'text-ink-400 hover:bg-white/5 hover:text-white'}`} title="Dicter">
                  <Mic size={17} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => onFiles(e.target.files)}
                />
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { window.location.assign('/demo'); }} className="btn-outline">
                  Voir la démo
                </button>
                <button onClick={launch} className="btn-primary">
                  Lancer la mission
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Aucune carte bancaire. Aucun crédit. Juste votre idée.
          </p>
        </motion.div>
      </section>

      {/* Ways preview */}
      <section id="ways" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Choisissez votre voie</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-300">
            Chaque voie transforme l'expérience : vocabulaire, agents, grades, énergie.
            Choisissez l'univers qui vous ressemble.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-4">
          {WAY_PREVIEWS.map((w, i) => (
            <motion.div
              key={w.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group relative overflow-hidden rounded-2xl glass"
            >
              <div className="aspect-[4/5] overflow-hidden">
                <img
                  src={w.image}
                  alt={w.name}
                  className="h-full w-full object-cover opacity-60 transition duration-700 group-hover:scale-105 group-hover:opacity-80"
                />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className={`mb-2 h-1 w-10 rounded-full ${w.bar}`} />
                <h3 className="text-lg font-semibold text-white">{w.name}</h3>
                <p className="mt-1 text-xs text-ink-300">{w.tagline}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">Un studio, pas un chatbot</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-300">
            Idealy ne dialogue pas avec un modèle. Il orchestre une équipe entière de spécialistes.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: i * 0.06, duration: 0.5 }}
              className="card p-6 hover:border-white/20 transition"
            >
              <div className="mb-4 inline-flex rounded-xl bg-white/5 p-2.5">
                <f.icon size={20} className="text-electric-400" />
              </div>
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-300">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-5xl px-5 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-semibold text-white md:text-4xl">De l'idée au déploiement</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="relative"
            >
              <div className="mb-3 text-sm font-mono text-electric-400">
                0{i + 1}
              </div>
              <h3 className="text-base font-semibold text-white">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ink-300">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-4xl px-5 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="card relative overflow-hidden p-10 text-center md:p-16"
        >
          <div className="pointer-events-none absolute inset-0 bg-halo" />
          <div className="relative">
            <h2 className="text-3xl font-semibold text-white md:text-4xl">
              Votre première mission vous attend
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-ink-300">
              Rejoignez Idealy. Choisissez votre voie. Lancez votre première mission en moins d'une minute.
            </p>
            <button
              onClick={() => openAuth('signup')}
              className="btn-primary mt-7 px-6 py-3 text-base"
            >
              Commencer gratuitement
              <ArrowRight size={17} />
            </button>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="mx-auto max-w-7xl px-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size={26} />
          <p className="text-xs text-ink-400">
            Idealy — Studio de développement IA. Chaque idée devient une mission.
          </p>
        </div>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} mode={authMode} />
    </div>
  );
}

const WAY_PREVIEWS = [
  { name: 'Voie du Ninja', tagline: 'Devenez la nouvelle génération', image: 'https://images.pexels.com/photos/27377336/pexels-photo-27377336.jpeg?auto=compress&cs=tinysrgb&h=600&w=450', bar: 'bg-ember-500' },
  { name: 'Voie du Mage', tagline: "Maîtrisez l'arcane du code", image: 'https://images.pexels.com/photos/19187321/pexels-photo-19187321.jpeg?auto=compress&cs=tinysrgb&h=600&w=450', bar: 'bg-electric-500' },
  { name: 'Voie du Hunter', tagline: 'Le monde est ton terrain de chasse', image: 'https://images.pexels.com/photos/20372562/pexels-photo-20372562.jpeg?auto=compress&cs=tinysrgb&h=600&w=450', bar: 'bg-success-500' },
  { name: 'Voie Pro', tagline: 'La rigueur, sans le folklore', image: 'https://images.pexels.com/photos/11516441/pexels-photo-11516441.jpeg?auto=compress&cs=tinysrgb&h=600&w=450', bar: 'bg-ink-300' },
];

const FEATURES = [
  { icon: Users, title: 'Multi-agents', desc: "Une escouade de spécialistes collabore, débat, se corrige et demande des renforts en temps réel." },
  { icon: Wand2, title: 'Modèles invisibles', desc: "Idealy choisit automatiquement le meilleur moteur. Vous ne voyez jamais GPT, Claude ou Gemini." },
  { icon: Layers, title: 'Export universel', desc: "React, Vue, Nuxt, SvelteKit, Expo, Flutter, SwiftUI. Un projet, plusieurs cibles." },
  { icon: Zap, title: 'Renforts dynamiques', desc: "La mission grimpe en rang ? De nouveaux agents arrivent automatiquement pour renflouer l'équipe." },
  { icon: Rocket, title: 'Déploiement intégré', desc: "Publiez directement sur Vercel sans quitter le studio." },
  { icon: Shield, title: 'Sans serveur', desc: "Vos clés restent les vôtres. Aucune infrastructure à gérer, aucune dépense cachée." },
];

const STEPS = [
  { title: 'Décrivez', desc: 'Écrivez votre idée, importez un fichier, collez une URL.' },
  { title: 'Choisissez votre voie', desc: 'Ninja, Mage, Hunter ou Pro. Votre univers, votre vocabulaire.' },
  { title: "L'équipe travaille", desc: 'Les agents analysent, planifient, construisent et se corrigent.' },
  { title: 'Déployez', desc: 'Prévisualisez, exportez, publiez. Mission accomplie.' },
];
