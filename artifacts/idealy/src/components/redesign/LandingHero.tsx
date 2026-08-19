'use client';

/**
 * LandingHero — minimal, Claude/ChatGPT-inspired landing hero for Idealy.
 * Tokens: bg #0a0a0f | surface #12121a | border #1f1f2a | text-1 #f4f4f5 | text-2 #a1a1aa
 * Accent gradient (CTA + command bar border only): #f2b1d1 → #f97316
 */

import { useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUp,
  Command,
  Paperclip,
  Mic,
  PenLine,
  ListChecks,
  Rocket,
  Menu,
  X,
  Sun,
  Moon,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ACCENT_GRADIENT = 'linear-gradient(90deg, #f2b1d1, #f3d27a, #8edee2)';

/* ------------------------------------------------------------------ */
/* Command bar (shared pattern — duplicated in WorkspaceEmptyState)    */
/* ------------------------------------------------------------------ */

export function CommandBar({
  placeholder = 'Décrivez ce que vous voulez construire…',
  onSubmit,
  autoFocus = false,
}: {
  placeholder?: string;
  onSubmit?: (value: string) => void;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit?.(trimmed);
    setValue('');
  };

  return (
    <div
      className="rounded-2xl p-px"
      style={{ background: ACCENT_GRADIENT }}
    >
      <div className="flex flex-col gap-2 rounded-[calc(1rem-1px)] bg-[#12121a] p-3">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // CJK IME protection: never submit mid-composition
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          aria-label="Décrivez votre projet"
          rows={2}
          autoFocus={autoFocus}
          className="w-full resize-none bg-transparent text-sm leading-6 text-[#f4f4f5] placeholder:text-[#a1a1aa]/70 focus:outline-none"
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Commandes slash"
              title="Commandes slash (/)"
              className="rounded-lg p-2 text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2b1d1]"
            >
              <Command className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Joindre un fichier"
              title="Joindre un fichier"
              className="rounded-lg p-2 text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2b1d1]"
            >
              <Paperclip className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Dicter au micro"
              title="Dicter au micro"
              className="rounded-lg p-2 text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2b1d1]"
            >
              <Mic className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Envoyer"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white transition-opacity disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f2b1d1]"
            style={{ background: ACCENT_GRADIENT }}
          >
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Landing hero                                                        */
/* ------------------------------------------------------------------ */

const STEPS = [
  {
    icon: PenLine,
    title: 'Décrivez',
    description: 'Expliquez votre idée en une phrase, en langage naturel.',
  },
  {
    icon: ListChecks,
    title: 'Planifiez',
    description: 'L’équipe d’agents propose un plan clair que vous validez.',
  },
  {
    icon: Rocket,
    title: 'Déployez',
    description: 'Votre app est construite, prévisualisée et mise en ligne.',
  },
];

const NAV_LINKS = [
  { label: 'Produit', href: '#produit' },
  { label: 'Tarifs', href: '/pricing' },
  { label: 'Docs', href: '/docs' },
];

export default function LandingHero({
  onSignIn,
  onSignUp,
}: {
  onSignIn?: () => void;
  onSignUp?: () => void;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lightMode, setLightMode] = useState(false);
  const [submittedPrompt, setSubmittedPrompt] = useState('');
  const reducedMotion = useReducedMotion();

  const toggleTheme = () => {
    setLightMode((current) => !current);
  };

  const fadeUp = reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.4, ease: 'easeOut' as const },
      };

  return (
    <div className={`idealy-landing min-h-screen bg-[#0a0a0f] text-[#f4f4f5] ${lightMode ? 'idealy-landing--light' : ''}`} data-theme={lightMode ? 'light' : 'dark'}>
      {/* Header */}
      <header className="border-b border-[#1f1f2a]">
        <nav
          aria-label="Navigation principale"
          className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4"
        >
          <a
            href="/"
            className="font-semibold tracking-tight focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2b1d1]"
          >
            Idealy
          </a>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-[#a1a1aa] transition-colors hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2b1d1]"
              >
                {link.label}
              </a>
            ))}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={lightMode ? 'Activer le mode sombre' : 'Activer le mode clair'}
              title={lightMode ? 'Mode sombre' : 'Mode clair'}
              className="rounded-lg p-2 text-[#a1a1aa] transition-colors hover:bg-white/5 hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f97316]"
            >
              {lightMode ? <Moon className="h-4 w-4" aria-hidden="true" /> : <Sun className="h-4 w-4" aria-hidden="true" />}
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="text-[#a1a1aa] hover:bg-white/5 hover:text-[#f4f4f5]"
              asChild
            >
              <button type="button" onClick={onSignIn}>Connexion</button>
            </Button>
            <Button
              size="sm"
              className="border-0 text-white"
              style={{ background: ACCENT_GRADIENT }}
              asChild
            >
              <button type="button" onClick={onSignUp}>Commencer</button>
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button
            type="button"
            className="rounded-lg p-2 text-[#a1a1aa] hover:bg-white/5 hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2b1d1] md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            onClick={() => setMobileMenuOpen((o) => !o)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="border-t border-[#1f1f2a] px-4 py-3 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm text-[#a1a1aa] hover:bg-white/5 hover:text-[#f4f4f5]"
                >
                  {link.label}
                </a>
              ))}
              <button type="button" onClick={onSignIn} className="rounded-lg px-3 py-2 text-left text-sm text-[#a1a1aa] hover:bg-white/5 hover:text-[#f4f4f5]">
                Connexion
              </button>
              <button type="button" onClick={onSignUp} className="mt-1 rounded-lg px-3 py-2 text-center text-sm font-medium text-white" style={{ background: ACCENT_GRADIENT }}>
                Commencer
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto flex max-w-2xl flex-col items-center px-4 pb-16 pt-20 text-center">
          <motion.div {...fadeUp} className="flex flex-col items-center gap-5 w-full">
            {/* Avatar with subtle ring */}
            <div
              className="rounded-full p-px"
              style={{ background: ACCENT_GRADIENT }}
            >
              <img
                src="/agents/avatar_pro_daniel_1785476092067.jpg"
                alt=""
                aria-hidden="true"
                width={28}
                height={28}
                className="block h-7 w-7 rounded-full bg-[#12121a] object-cover"
              />
            </div>

            <h1 className="text-balance font-sans text-3xl font-semibold tracking-tight sm:text-4xl">
              Que construisons-nous aujourd&apos;hui&nbsp;?
            </h1>
            <p className="max-w-md text-pretty text-sm leading-6 text-[#a1a1aa]">
              Décrivez votre idée. Une équipe d&apos;agents la conçoit, la code
              et la déploie — vous gardez la main à chaque étape.
            </p>

            <div className="w-full text-left">
              {!submittedPrompt ? (
                <>
                  <CommandBar onSubmit={(prompt) => setSubmittedPrompt(prompt)} />
                  <div className="mt-4 flex flex-wrap justify-center gap-2" aria-label="Exemples de demandes">
                    {['Une landing page pour une agence', 'Un dashboard de suivi', 'Un espace client simple'].map((example) => (
                      <button key={example} type="button" onClick={() => setSubmittedPrompt(example)} className="rounded-full border border-[#1f1f2a] px-3 py-1.5 text-xs text-[#a1a1aa] transition-colors hover:border-[#f2b1d1]/60 hover:text-[#f4f4f5]">
                        {example}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <motion.div initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-2xl border border-[#1f1f2a] bg-[#12121a]">
                  <div className="border-b border-[#1f1f2a] px-4 py-3 text-sm text-[#f4f4f5]">{submittedPrompt}</div>
                  <div className="flex flex-col gap-4 p-4">
                    <div className="flex items-center gap-2 text-sm text-[#f4f4f5]"><Sparkles className="h-4 w-4 text-[#f2b1d1]" aria-hidden="true" />Voici comment je vais commencer.</div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {['Structurer l’expérience', 'Créer l’interface', 'Préparer la preview'].map((step) => <div key={step} className="flex items-center gap-2 rounded-lg border border-[#1f1f2a] px-3 py-2 text-xs text-[#a1a1aa]"><Check className="h-3.5 w-3.5 text-[#8edee2]" aria-hidden="true" />{step}</div>)}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <button type="button" onClick={() => setSubmittedPrompt('')} className="rounded-lg px-3 py-2 text-sm text-[#a1a1aa] hover:bg-white/5">Modifier</button>
                      <button type="button" onClick={() => window.location.assign(`/demo?prompt=${encodeURIComponent(submittedPrompt)}`)} className="rounded-lg px-4 py-2 text-sm font-medium text-[#171522]" style={{ background: ACCENT_GRADIENT }}>Ouvrir l’espace de création <ArrowUp className="ml-1 inline h-4 w-4 rotate-45" aria-hidden="true" /></button>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </section>

        {/* Real workspace preview */}
        <section
          id="produit"
          className="mx-auto max-w-5xl px-4 pb-20"
          aria-label="Aperçu du workspace"
        >
          <div className="overflow-hidden rounded-xl border border-[#1f1f2a] bg-[#12121a]">
            {/* Fake browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-[#1f1f2a] px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#1f1f2a]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#1f1f2a]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#1f1f2a]" />
              <span className="ml-3 text-xs text-[#a1a1aa]">
                idealy.app/workspace
              </span>
            </div>
            <div
              role="img"
              aria-label="Aperçu du workspace Idealy avec conversation, plan et prévisualisation"
              className="grid min-h-64 grid-cols-[0.8fr_1.2fr] bg-[#0a0a0f] sm:min-h-96"
            >
              <div className="flex flex-col gap-4 border-r border-[#1f1f2a] p-5">
                <div className="flex items-center gap-2 text-xs text-[#a1a1aa]"><span className="h-2 w-2 rounded-full bg-[#f2b1d1]" />Mission en cours</div>
                <div className="h-2 w-4/5 rounded bg-[#1f1f2a]" />
                <div className="h-2 w-3/5 rounded bg-[#1f1f2a]" />
                <div className="mt-auto rounded-lg border border-[#1f1f2a] bg-[#12121a] p-3 text-xs text-[#a1a1aa]">Construisons une expérience simple et rapide.</div>
              </div>
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between"><span className="text-xs text-[#a1a1aa]">Preview</span><span className="rounded-full bg-[#f2b1d1]/15 px-2 py-1 text-[10px] text-[#c4b5fd]">Live</span></div>
                <div className="flex-1 rounded-lg border border-[#1f1f2a] bg-[#12121a] p-4"><div className="h-3 w-2/5 rounded bg-[#f2b1d1]/40" /><div className="mt-5 h-16 rounded bg-[#1f1f2a]" /><div className="mt-4 grid grid-cols-3 gap-2"><div className="h-10 rounded bg-[#1f1f2a]" /><div className="h-10 rounded bg-[#1f1f2a]" /><div className="h-10 rounded bg-[#1f1f2a]" /></div></div>
              </div>
            </div>
          </div>
        </section>

        {/* 3 steps */}
        <section className="border-t border-[#1f1f2a]">
          <div className="mx-auto grid max-w-5xl gap-8 px-4 py-16 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.title} className="flex flex-col gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1f1f2a] bg-[#12121a]">
                  <step.icon
                    className="h-4 w-4 text-[#a1a1aa]"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="text-sm font-semibold">{step.title}</h2>
                <p className="text-sm leading-6 text-[#a1a1aa]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
