import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Github, Chrome, Loader2, Eye, EyeOff } from 'lucide-react';
import { useIdealyStore } from '@/stores/idealyStore';
import { Logo } from '@/components/Brand';
import { getSupabaseClient } from '@/supabaseClient';
import { logger } from '@/utils/logger';
import { useAuth } from '@/hooks/useAuth';
import { PasswordStrength } from '@/components/PasswordStrength';

type AuthMode = 'signin' | 'signup' | 'recovery';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: AuthMode;
  onSuccess?: () => void;
}

export function AuthModal({ open, onClose, mode: initialMode, onSuccess }: Props) {
  const setStage = useIdealyStore((s) => s.setStage);
  const setProfile = useIdealyStore((s) => s.setProfile);
  const refillEnergy = useIdealyStore((s) => s.refillEnergy);
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const {
    loading,
    error,
    success,
    passwordStrength,
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    clearMessages,
    validateEmailInput,
    validatePasswordInput,
  } = useAuth();

  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setEmail('');
      setPassword('');
      setShowPassword(false);
      clearMessages();
    }
  }, [initialMode, open, clearMessages]);

  const isSignup = mode === 'signup';
  const isRecovery = mode === 'recovery';

  // Real-time validation
  const emailError = email ? validateEmailInput(email).error : null;
  const passwordError = password ? validatePasswordInput(password).error : null;

  async function finishAuthenticatedUser(user: { email?: string; user_metadata?: Record<string, unknown> }) {
    const displayName =
      (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name) ||
      (typeof user.user_metadata?.name === 'string' && user.user_metadata.name) ||
      user.email?.split('@')[0] ||
      'Utilisateur';
    setProfile({ email: user.email ?? email, displayName, avatarHue: 220 });
    refillEnergy();
    const state = useIdealyStore.getState();
    setStage(state.way && state.onboarded ? 'ready' : 'choosing-way');
    onClose();
    onSuccess?.();
  }

  async function handlePasswordReset() {
    await resetPassword(email);
  }

  async function updatePasswordHandler() {
    await updatePassword(password);
    setTimeout(() => {
      onClose();
    }, 1500);
  }

  async function handleAuth(kind: 'google' | 'github' | 'email') {
    if (kind === 'email') {
      const success = isSignup ? await signUp(email, password) : await signIn(email, password);
      // Note: For email auth, the user is already authenticated by useAuth hook
      // The parent component (App.tsx) listens to auth state changes
      if (success) {
        onClose();
      }
    } else {
      // OAuth
      try {
        const supabase = getSupabaseClient();
        if (!supabase) throw new Error('Service d\'authentification non disponible.');
        const options: any = { redirectTo: window.location.origin };
        if (kind === 'github') {
          options.scopes = 'repo';
        }

        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: kind,
          options,
        });
        if (oauthError) throw oauthError;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur de connexion';
        logger.error('OAuth authentication failed', err instanceof Error ? err : undefined, {
          component: 'AuthModal',
          action: 'handleAuth',
          kind,
        });
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm" onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.96, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 12 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="relative w-full max-w-md card p-7">
            <button onClick={onClose} className="absolute right-4 top-4 text-ink-400 transition hover:text-white" aria-label="Fermer"><X size={18} /></button>
            <div className="flex flex-col items-center text-center">
              <Logo size={36} />
              <h2 className="mt-5 text-xl font-semibold text-white">
                {isRecovery ? 'Choisissez un nouveau mot de passe' : isSignup ? 'Rejoindre Idealy' : 'Bon retour'}
              </h2>
              <p className="mt-1.5 text-sm text-ink-300">
                {isRecovery ? 'Sécurisez à nouveau votre compte.' : isSignup ? 'Créez votre compte pour lancer votre première mission.' : 'Connectez-vous pour reprendre vos missions.'}
              </p>
            </div>

            {!isRecovery && <>
              <div className="mt-6 space-y-2.5">
                <button onClick={() => handleAuth('google')} disabled={loading} className="btn-outline w-full justify-center">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Chrome size={16} />} Continuer avec Google
                </button>
                <button onClick={() => handleAuth('github')} disabled={loading} className="btn-outline w-full justify-center">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Github size={16} />} Continuer avec GitHub
                </button>
              </div>
              <div className="my-5 flex items-center gap-3 text-xs text-ink-400"><div className="h-px flex-1 bg-white/10" />ou par e-mail<div className="h-px flex-1 bg-white/10" /></div>
            </>}

            <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); isRecovery ? updatePasswordHandler() : handleAuth('email'); }}>
              {!isRecovery && (
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    className={`input pl-10 ${emailError ? 'border-red-400' : ''}`}
                    autoComplete="email"
                    required
                  />
                  {emailError && <p className="mt-1 text-[10px] text-red-400">{emailError}</p>}
                </div>
              )}

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRecovery ? 'Nouveau mot de passe (8 caractères min.)' : 'Mot de passe'}
                  className={`input pr-10 ${passwordError ? 'border-red-400' : ''}`}
                  autoComplete={isRecovery ? 'new-password' : isSignup ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-white transition"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {passwordError && <p className="text-[10px] text-red-400">{passwordError}</p>}
              {!isRecovery && isSignup && password.length > 0 && (
                <PasswordStrength strength={passwordStrength} />
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
                {loading ? <Loader2 size={16} className="animate-spin" /> : isRecovery ? 'Mettre à jour le mot de passe' : isSignup ? 'Créer mon compte' : 'Se connecter'}
              </button>
            </form>
            {!isRecovery && !isSignup && <button type="button" onClick={() => { clearMessages(); void handlePasswordReset(); }} disabled={loading} className="mt-3 w-full text-center text-xs text-ink-400 transition hover:text-electric-300">Mot de passe oublié ?</button>}
            {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
            {success && <p role="status" className="mt-3 rounded-lg border border-green-400/20 bg-green-500/10 p-3 text-sm text-green-200">{success}</p>}
            {!isRecovery && <p className="mt-5 text-center text-xs text-ink-400">{isSignup ? 'Déjà un compte ? ' : 'Pas encore de compte ? '}<button className="font-medium text-electric-400 transition hover:text-electric-300" onClick={() => { setMode(isSignup ? 'signin' : 'signup'); clearMessages(); }}>{isSignup ? 'Se connecter' : "S\'inscrire"}</button></p>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}