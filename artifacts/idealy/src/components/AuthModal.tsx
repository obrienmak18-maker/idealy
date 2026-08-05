import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Github, Chrome, Loader2 } from 'lucide-react';
import { useIdealyStore } from '@/stores/idealyStore';
import { Logo } from '@/components/Brand';
import { getSupabaseClient } from '@/supabaseClient';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'signin' | 'signup';
  onSuccess?: () => void;
}

export function AuthModal({ open, onClose, mode: initialMode, onSuccess }: Props) {
  // Manage mode locally so the sign-in / sign-up toggle works without requiring the
  // parent to re-open the modal with a different prop.
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  const setStage = useIdealyStore((s) => s.setStage);
  const setProfile = useIdealyStore((s) => s.setProfile);
  const refillEnergy = useIdealyStore((s) => s.refillEnergy);
  const [loading, setLoading] = useState<null | 'google' | 'github' | 'email'>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignup = mode === 'signup';

  async function handlePasswordReset() {
    setLoading('email');
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase n\'est pas encore configuré.');
      if (!email) {
        setError('Saisissez votre adresse e-mail pour recevoir un lien de récupération.');
        return;
      }
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (resetError) throw resetError;
      setNotice('Si un compte correspond à cette adresse, un lien de récupération vient d\'être envoyé.');
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Impossible d\'envoyer le lien de récupération.');
    } finally {
      setLoading(null);
    }
  }

  async function handleAuth(kind: 'google' | 'github' | 'email') {
    setLoading(kind);
    setError(null);
    setNotice(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error(
          "Supabase n'est pas encore configuré. Ouvrez Paramètres → Connecteurs et entrez vos clés Supabase.",
        );
      }

      if (kind === 'email') {
        if (isSignup) {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });
          if (signUpError) throw signUpError;
          if (!data.user) {
            setNotice(
              'Un e-mail de confirmation vous a été envoyé. Vérifiez votre boîte de réception.',
            );
            setLoading(null);
            return;
          }
          setProfile({
            email: data.user.email ?? email,
            displayName: data.user.user_metadata?.full_name ?? email.split('@')[0],
            avatarHue: 220,
          });
        } else {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          if (signInError) throw signInError;
          if (!data.user) throw new Error('Connexion échouée. Vérifiez vos identifiants.');
          setProfile({
            email: data.user.email ?? email,
            displayName: data.user.user_metadata?.full_name ?? email.split('@')[0],
            avatarHue: 220,
          });
        }
        refillEnergy();
        const { way, onboarded } = useIdealyStore.getState();
        setStage(way && onboarded ? 'ready' : 'choosing-way');
        onClose();
        onSuccess?.();
      } else {
        // OAuth — redirects away from the page; App.tsx onAuthStateChange handles the return
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: kind,
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        });
        if (oauthError) throw oauthError;
        // Page will redirect; no further action needed here
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    } finally {
      setLoading(null);
    }
  }

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-ink-900/90 p-8 shadow-2xl backdrop-blur-xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full p-1.5 text-ink-400 hover:bg-white/5 hover:text-ink-200 transition"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>

            <Logo size={28} />

            <h2 className="mt-5 text-xl font-semibold text-white">
              {isSignup ? 'Rejoindre Idealy' : 'Content de vous revoir'}
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              {isSignup
                ? 'Créez votre compte pour lancer votre première mission.'
                : 'Connectez-vous pour rejoindre votre équipe.'}
            </p>

            {/* OAuth buttons */}
            <div className="mt-6 flex flex-col gap-2.5">
              <button
                onClick={() => handleAuth('google')}
                disabled={!!loading}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-ink-100 transition hover:bg-white/10 disabled:opacity-50"
              >
                {loading === 'google' ? (
                  <Loader2 size={17} className="animate-spin text-ink-400" />
                ) : (
                  <Chrome size={17} />
                )}
                Continuer avec Google
              </button>

              <button
                onClick={() => handleAuth('github')}
                disabled={!!loading}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-ink-100 transition hover:bg-white/10 disabled:opacity-50"
              >
                {loading === 'github' ? (
                  <Loader2 size={17} className="animate-spin text-ink-400" />
                ) : (
                  <Github size={17} />
                )}
                Continuer avec GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/8" />
              <span className="text-xs text-ink-500">ou par e-mail</span>
              <div className="h-px flex-1 bg-white/8" />
            </div>

            {/* Email / password form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAuth('email');
              }}
              className="flex flex-col gap-3"
            >
              <div className="relative">
                <Mail
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="input pl-10"
                  required
                  autoComplete="email"
                />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="input"
                required
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                minLength={6}
              />
              {!isSignup && (
                <button
                  type="button"
                  onClick={handlePasswordReset}
                  disabled={!!loading}
                  className="self-end text-xs text-electric-400 transition hover:text-electric-300 disabled:opacity-60"
                >
                  Mot de passe oublié ?
                </button>
              )}
              <button
                type="submit"
                disabled={!!loading}
                className="btn-primary w-full justify-center disabled:opacity-60"
              >
                {loading === 'email' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isSignup ? (
                  'Créer mon compte'
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>

            {/* Error / notice */}
            {error && (
              <p
                role="alert"
                className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200"
              >
                {error}
              </p>
            )}
            {notice && (
              <p
                role="status"
                className="mt-3 rounded-lg border border-electric-400/20 bg-electric-500/10 p-3 text-sm text-electric-200"
              >
                {notice}
              </p>
            )}

            {/* Toggle sign-in / sign-up */}
            <p className="mt-5 text-center text-xs text-ink-400">
              {isSignup ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
              <button
                type="button"
                className="font-medium text-electric-400 transition hover:text-electric-300"
                onClick={() => {
                  setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
                  setError(null);
                  setNotice(null);
                }}
              >
                {isSignup ? 'Se connecter' : "S'inscrire"}
              </button>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
