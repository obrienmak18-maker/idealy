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

export function AuthModal({ open, onClose, mode, onSuccess }: Props) {
  const setStage = useIdealyStore((s) => s.setStage);
  const setProfile = useIdealyStore((s) => s.setProfile);
  const refillEnergy = useIdealyStore((s) => s.refillEnergy);
  const [loading, setLoading] = useState<null | 'google' | 'github' | 'email'>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  /* Removed legacy simulated authentication flow.
    setLoading(kind);
    // Simulated auth — real Supabase wiring lands in Phase 4.
    await new Promise((r) => setTimeout(r, 700));
    
    const fakeEmail =
      kind === 'email' ? email || 'apprenti@idealy.studio' : `shinobi@${kind}.com`;
    setProfile({
      email: fakeEmail,
      displayName: fakeEmail.split('@')[0],
      avatarHue: Math.floor(Math.random() * 360),
    });
    refillEnergy();

    const { way, onboarded } = useIdealyStore.getState();
    if (way && onboarded) {
      setStage('ready'); // Déjà onboardé, on saute le choix de voie
    } else {
      setStage('choosing-way');
    }
    
    setLoading(null);
    onClose();
    onSuccess?.();
  }

  */
  async function handleAuth(kind: 'google' | 'github' | 'email') {
    setLoading(kind);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase is not configured.');
      if (kind === 'email') {
        const result = mode === 'signup'
          ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
          : await supabase.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        if (!result.data.user) throw new Error('Check your email to confirm your account.');
        setProfile({ email: result.data.user.email ?? email, displayName: result.data.user.user_metadata.full_name ?? email.split('@')[0], avatarHue: 220 });
      } else {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: kind, options: { redirectTo: window.location.origin } });
        if (oauthError) throw oauthError;
        return;
      }
      refillEnergy();
      const { way, onboarded } = useIdealyStore.getState();
      setStage(way && onboarded ? 'ready' : 'choosing-way');
      onClose();
      onSuccess?.();
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    } finally { setLoading(null); }
  }

  const isSignup = mode === 'signup';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md card p-7"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-ink-400 hover:text-white transition"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
            <div className="flex flex-col items-center text-center">
              <Logo size={36} />
              <h2 className="mt-5 text-xl font-semibold text-white">
                {isSignup ? "Rejoindre l'organisation" : 'Retour au quartier'}
              </h2>
              <p className="mt-1.5 text-sm text-ink-300">
                {isSignup
                  ? "Créez votre compte pour lancer votre première mission."
                  : 'Connectez-vous pour reprendre vos missions.'}
              </p>
            </div>

            <div className="mt-6 space-y-2.5">
              <button
                onClick={() => handleAuth('google')}
                disabled={loading !== null}
                className="btn-outline w-full justify-center"
              >
                {loading === 'google' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Chrome size={16} />
                )}
                Continuer avec Google
              </button>
              <button
                onClick={() => handleAuth('github')}
                disabled={loading !== null}
                className="btn-outline w-full justify-center"
              >
                {loading === 'github' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Github size={16} />
                )}
                Continuer avec GitHub
              </button>
            </div>

            <div className="my-5 flex items-center gap-3 text-xs text-ink-400">
              <div className="h-px flex-1 bg-white/10" />
              ou par email
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                handleAuth('email');
              }}
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
                />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                className="input"
                required
              />
              <button type="submit" className="btn-primary w-full justify-center">
                {loading === 'email' ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isSignup ? (
                  'Créer mon compte'
                ) : (
                  'Se connecter'
                )}
              </button>
            </form>
            {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}

            <p className="mt-5 text-center text-xs text-ink-400">
              {isSignup ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}
              <button
                className="text-electric-400 hover:text-electric-300 transition font-medium"
                onClick={() => useIdealyStore.setState({})}
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
