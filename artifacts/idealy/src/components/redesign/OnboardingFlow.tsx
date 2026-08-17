'use client';

/**
 * OnboardingFlow — multi-step auth + personalization for Idealy.
 * Steps: auth (OAuth + email/password) → email verification → (reset flow)
 * → optional Voie personalization → first-mission checklist.
 * Supabase-style; hook up the TODOs to your Supabase client.
 */

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Github,
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Rocket,
  Sparkles,
  Wand2,
  Crosshair,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ACCENT_GRADIENT = 'linear-gradient(90deg, #8b5cf6, #f97316)';

type Step =
  | 'auth'
  | 'verify-email'
  | 'reset-request'
  | 'reset-sent'
  | 'choose-voie'
  | 'first-mission';

type FieldState = { value: string; error: string | null };

const VOIES = [
  {
    id: 'ninja',
    name: 'Voie Ninja',
    icon: Sparkles,
    color: '#64748b',
    description: 'Rapide et discret. Interface épurée, raccourcis partout.',
  },
  {
    id: 'mage',
    name: 'Voie Mage',
    icon: Wand2,
    color: '#8b5cf6',
    description: 'Créatif et expressif. Suggestions et explorations visuelles.',
  },
  {
    id: 'hunter',
    name: 'Voie Hunter',
    icon: Crosshair,
    color: '#f59e0b',
    description: 'Précis et méthodique. Plans détaillés avant chaque action.',
  },
  {
    id: 'pro',
    name: 'Voie Pro',
    icon: Briefcase,
    color: '#3b82f6',
    description: 'Sobre et professionnel. Vocabulaire neutre, zéro folklore.',
  },
] as const;

function validateEmail(email: string): string | null {
  if (!email.trim()) return 'L’email est requis.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Format d’email invalide.';
  }
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return 'Le mot de passe est requis.';
  if (password.length < 8) return 'Au moins 8 caractères.';
  if (!/[0-9]/.test(password)) return 'Au moins un chiffre.';
  return null;
}

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-center gap-1.5 text-xs text-red-400"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function StepShell({
  children,
  stepKey,
}: {
  children: React.ReactNode;
  stepKey: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex w-full flex-col gap-6"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Main flow                                                           */
/* ------------------------------------------------------------------ */

export default function OnboardingFlow({
  onComplete,
}: {
  onComplete?: (options: { voie: string | null }) => void;
}) {
  const [step, setStep] = useState<Step>('auth');
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState<FieldState>({ value: '', error: null });
  const [password, setPassword] = useState<FieldState>({
    value: '',
    error: null,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);
  const [selectedVoie, setSelectedVoie] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({ missionLaunched: false });

  const handleOAuth = async (provider: 'google' | 'github') => {
    setLoading(true);
    // TODO: connect to Supabase auth
    // await supabase.auth.signInWithOAuth({ provider, options: { redirectTo } })
    console.log('oauth:', provider);
    setLoading(false);
    setStep('choose-voie');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email.value);
    const passwordError = validatePassword(password.value);
    setEmail((s) => ({ ...s, error: emailError }));
    setPassword((s) => ({ ...s, error: passwordError }));
    if (emailError || passwordError) return;

    setLoading(true);
    // TODO: connect to Supabase auth
    // signup: await supabase.auth.signUp({ email, password })
    // signin: await supabase.auth.signInWithPassword({ email, password })
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setStep(mode === 'signup' ? 'verify-email' : 'choose-voie');
  };

  const handleResend = async () => {
    setResendLoading(true);
    // TODO: connect to Supabase auth — supabase.auth.resend({ type: 'signup', email })
    await new Promise((r) => setTimeout(r, 600));
    setResendLoading(false);
    setResendDone(true);
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailError = validateEmail(email.value);
    setEmail((s) => ({ ...s, error: emailError }));
    if (emailError) return;
    setLoading(true);
    // TODO: connect to Supabase auth — supabase.auth.resetPasswordForEmail(email)
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    setStep('reset-sent');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] px-4 py-12 text-[#f4f4f5]">
      <div className="w-full max-w-sm">
        {/* ---------------- Step: auth ---------------- */}
        {step === 'auth' && (
          <StepShell stepKey="auth">
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight">
                {mode === 'signup' ? 'Créer votre compte' : 'Bon retour'}
              </h1>
              <p className="mt-1.5 text-sm text-[#a1a1aa]">
                {mode === 'signup'
                  ? 'Lancez votre première mission en deux minutes.'
                  : 'Connectez-vous pour retrouver vos projets.'}
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => handleOAuth('google')}
                className="w-full border-[#1f1f2a] bg-[#12121a] text-[#f4f4f5] hover:bg-white/5 hover:text-[#f4f4f5]"
              >
                {/* Simple "G" mark to avoid brand-asset dependencies */}
                <span
                  aria-hidden="true"
                  className="mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-current text-[10px] font-bold"
                >
                  G
                </span>
                Continuer avec Google
              </Button>
              <Button
                variant="outline"
                disabled={loading}
                onClick={() => handleOAuth('github')}
                className="w-full border-[#1f1f2a] bg-[#12121a] text-[#f4f4f5] hover:bg-white/5 hover:text-[#f4f4f5]"
              >
                <Github className="mr-2 h-4 w-4" aria-hidden="true" />
                Continuer avec GitHub
              </Button>
            </div>

            <div className="flex items-center gap-3" aria-hidden="true">
              <div className="h-px flex-1 bg-[#1f1f2a]" />
              <span className="text-xs text-[#a1a1aa]">ou</span>
              <div className="h-px flex-1 bg-[#1f1f2a]" />
            </div>

            <form onSubmit={handleEmailSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-[#f4f4f5]">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email.value}
                  aria-invalid={!!email.error}
                  aria-describedby={email.error ? 'email-error' : undefined}
                  onChange={(e) =>
                    setEmail({ value: e.target.value, error: null })
                  }
                  className="border-[#1f1f2a] bg-[#12121a] text-[#f4f4f5] placeholder:text-[#a1a1aa]/60"
                  placeholder="vous@exemple.com"
                />
                {email.error && (
                  <FieldError id="email-error" message={email.error} />
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[#f4f4f5]">
                    Mot de passe
                  </Label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setStep('reset-request')}
                      className="text-xs text-[#a1a1aa] underline-offset-2 hover:text-[#f4f4f5] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
                    >
                      Mot de passe oublié&nbsp;?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={
                      mode === 'signup' ? 'new-password' : 'current-password'
                    }
                    value={password.value}
                    aria-invalid={!!password.error}
                    aria-describedby={
                      password.error ? 'password-error' : 'password-hint'
                    }
                    onChange={(e) =>
                      setPassword({ value: e.target.value, error: null })
                    }
                    className="border-[#1f1f2a] bg-[#12121a] pr-10 text-[#f4f4f5]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword
                        ? 'Masquer le mot de passe'
                        : 'Afficher le mot de passe'
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[#a1a1aa] hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
                {password.error ? (
                  <FieldError id="password-error" message={password.error} />
                ) : (
                  mode === 'signup' && (
                    <p id="password-hint" className="text-xs text-[#a1a1aa]">
                      8 caractères minimum, dont un chiffre.
                    </p>
                  )
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full border-0 text-white"
                style={{ background: ACCENT_GRADIENT }}
              >
                {loading && (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                )}
                {mode === 'signup' ? 'Créer mon compte' : 'Se connecter'}
              </Button>
            </form>

            <p className="text-center text-xs text-[#a1a1aa]">
              {mode === 'signup' ? (
                <>
                  Déjà un compte&nbsp;?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-[#f4f4f5] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
                  >
                    Se connecter
                  </button>
                </>
              ) : (
                <>
                  Pas de compte&nbsp;?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-[#f4f4f5] underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
                  >
                    S&apos;inscrire
                  </button>
                </>
              )}
            </p>

            {mode === 'signup' && (
              <p className="text-center text-xs leading-5 text-[#a1a1aa]">
                En continuant, vous acceptez nos{' '}
                <a
                  href="/terms"
                  className="underline underline-offset-2 hover:text-[#f4f4f5]"
                >
                  Conditions d&apos;utilisation
                </a>{' '}
                et notre{' '}
                <a
                  href="/privacy"
                  className="underline underline-offset-2 hover:text-[#f4f4f5]"
                >
                  Politique de confidentialité
                </a>
                .
              </p>
            )}
          </StepShell>
        )}

        {/* ---------------- Step: verify email ---------------- */}
        {step === 'verify-email' && (
          <StepShell stepKey="verify-email">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1f1f2a] bg-[#12121a]">
                <Mail className="h-5 w-5 text-[#a1a1aa]" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Vérifiez votre boîte mail
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-[#a1a1aa]">
                  Nous avons envoyé un lien de confirmation à{' '}
                  <span className="text-[#f4f4f5]">
                    {email.value || 'votre adresse'}
                  </span>
                  . Cliquez dessus pour activer votre compte.
                </p>
              </div>
              {resendDone ? (
                <p className="flex items-center gap-1.5 text-sm text-green-400">
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Email renvoyé.
                </p>
              ) : (
                <Button
                  variant="outline"
                  disabled={resendLoading}
                  onClick={handleResend}
                  className="border-[#1f1f2a] bg-transparent text-[#f4f4f5] hover:bg-white/5 hover:text-[#f4f4f5]"
                >
                  {resendLoading && (
                    <Loader2
                      className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                      aria-hidden="true"
                    />
                  )}
                  Renvoyer l&apos;email
                </Button>
              )}
              {/* Demo shortcut — remove once Supabase email verification is wired */}
              <button
                type="button"
                onClick={() => setStep('choose-voie')}
                className="text-xs text-[#a1a1aa] underline underline-offset-2 hover:text-[#f4f4f5]"
              >
                J&apos;ai confirmé mon email
              </button>
            </div>
          </StepShell>
        )}

        {/* ---------------- Step: reset request ---------------- */}
        {step === 'reset-request' && (
          <StepShell stepKey="reset-request">
            <button
              type="button"
              onClick={() => setStep('auth')}
              className="flex items-center gap-1.5 self-start text-sm text-[#a1a1aa] hover:text-[#f4f4f5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Retour
            </button>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Réinitialiser le mot de passe
              </h1>
              <p className="mt-1.5 text-sm text-[#a1a1aa]">
                Entrez votre email, nous vous enverrons un lien de
                réinitialisation.
              </p>
            </div>
            <form onSubmit={handleResetRequest} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reset-email" className="text-[#f4f4f5]">
                  Email
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  value={email.value}
                  aria-invalid={!!email.error}
                  aria-describedby={
                    email.error ? 'reset-email-error' : undefined
                  }
                  onChange={(e) =>
                    setEmail({ value: e.target.value, error: null })
                  }
                  className="border-[#1f1f2a] bg-[#12121a] text-[#f4f4f5]"
                  placeholder="vous@exemple.com"
                />
                {email.error && (
                  <FieldError id="reset-email-error" message={email.error} />
                )}
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full border-0 text-white"
                style={{ background: ACCENT_GRADIENT }}
              >
                {loading && (
                  <Loader2
                    className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none"
                    aria-hidden="true"
                  />
                )}
                Envoyer le lien
              </Button>
            </form>
          </StepShell>
        )}

        {/* ---------------- Step: reset sent ---------------- */}
        {step === 'reset-sent' && (
          <StepShell stepKey="reset-sent">
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2
                className="h-8 w-8 text-green-400"
                aria-hidden="true"
              />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Lien envoyé
                </h1>
                <p className="mt-1.5 text-sm leading-6 text-[#a1a1aa]">
                  Si un compte existe pour{' '}
                  <span className="text-[#f4f4f5]">{email.value}</span>, vous
                  recevrez un email dans quelques instants.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setStep('auth')}
                className="border-[#1f1f2a] bg-transparent text-[#f4f4f5] hover:bg-white/5 hover:text-[#f4f4f5]"
              >
                Retour à la connexion
              </Button>
            </div>
          </StepShell>
        )}

        {/* ---------------- Step: choose voie (optional) ---------------- */}
        {step === 'choose-voie' && (
          <StepShell stepKey="choose-voie">
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight">
                Choisissez votre Voie
              </h1>
              <p className="mt-1.5 text-sm text-[#a1a1aa]">
                Personnalisation optionnelle — vous pourrez changer à tout
                moment dans les paramètres.
              </p>
            </div>

            <div
              role="radiogroup"
              aria-label="Choisir une Voie"
              className="flex flex-col gap-2.5"
            >
              {VOIES.map((voie) => {
                const selected = selectedVoie === voie.id;
                return (
                  <button
                    key={voie.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSelectedVoie(voie.id)}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#8b5cf6] ${
                      selected
                        ? 'border-[#8b5cf6] bg-[#12121a]'
                        : 'border-[#1f1f2a] bg-[#12121a] hover:border-[#8b5cf6]/40'
                    }`}
                  >
                    <voie.icon
                      className="mt-0.5 h-4 w-4 shrink-0"
                      style={{ color: voie.color }}
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{voie.name}</span>
                      <span className="text-xs leading-5 text-[#a1a1aa]">
                        {voie.description}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={() => setStep('first-mission')}
                className="w-full border-0 text-white"
                style={{ background: ACCENT_GRADIENT }}
              >
                Continuer
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedVoie(null);
                  setStep('first-mission');
                }}
                className="w-full text-[#a1a1aa] hover:bg-white/5 hover:text-[#f4f4f5]"
              >
                Passer cette étape
              </Button>
            </div>
          </StepShell>
        )}

        {/* ---------------- Step: first mission checklist ---------------- */}
        {step === 'first-mission' && (
          <StepShell stepKey="first-mission">
            <div className="text-center">
              <h1 className="text-xl font-semibold tracking-tight">
                Tout est prêt
              </h1>
              <p className="mt-1.5 text-sm text-[#a1a1aa]">
                Une dernière étape pour découvrir Idealy.
              </p>
            </div>

            <div className="rounded-xl border border-[#1f1f2a] bg-[#12121a] p-4">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    checklist.missionLaunched
                      ? 'border-green-400 text-green-400'
                      : 'border-[#1f1f2a] text-transparent'
                  }`}
                  aria-hidden="true"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    Lancez votre première mission
                  </span>
                  <span className="text-xs leading-5 text-[#a1a1aa]">
                    Décrivez une idée simple — une landing page, un
                    formulaire — et regardez l&apos;équipe la construire.
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                setChecklist({ missionLaunched: true });
                onComplete?.({ voie: selectedVoie });
                // TODO: navigate to /workspace
              }}
              className="w-full border-0 text-white"
              style={{ background: ACCENT_GRADIENT }}
            >
              <Rocket className="mr-2 h-4 w-4" aria-hidden="true" />
              Ouvrir le workspace
            </Button>
          </StepShell>
        )}
      </div>
    </div>
  );
}
