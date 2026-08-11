import { useState, useCallback } from 'react';
import { getSupabaseClient } from '@/supabaseClient';
import { logger } from '@/utils/logger';
import { validateEmail, validatePassword, ValidationResult } from '@/utils/validation';

interface UseAuthReturn {
  // États
  loading: boolean;
  error: string | null;
  success: string | null;
  passwordStrength: PasswordStrength;
  
  // Actions
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
  updatePassword: (newPassword: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  clearMessages: () => void;
  
  // Validation
  validateEmailInput: (email: string) => ValidationResult;
  validatePasswordInput: (password: string) => ValidationResult;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
}

export function useAuth(): UseAuthReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'Très faible',
    color: 'bg-red-500',
  });

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const calculatePasswordStrength = useCallback((password: string): PasswordStrength => {
    let score = 0;
    
    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Complexity
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    // Normalize to 0-4
    const normalizedScore = Math.min(4, Math.floor(score / 1.2));
    
    const labels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'];
    const colors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
    
    return {
      score: normalizedScore,
      label: labels[normalizedScore],
      color: colors[normalizedScore],
    };
  }, []);

  const validateEmailInput = useCallback((email: string) => {
    return validateEmail(email);
  }, []);

  const validatePasswordInput = useCallback((password: string) => {
    return validatePassword(password);
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Email invalide');
      setLoading(false);
      return false;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Mot de passe invalide');
      setLoading(false);
      return false;
    }

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase n’est pas encore configuré. Ouvrez Paramètres → Connecteurs et entrez vos clés Supabase.');

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      setSuccess('Connexion réussie !');
      logger.info('User signed in successfully', { action: 'signIn', email });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de connexion';
      setError(message);
      logger.error('Sign in failed', err instanceof Error ? err : undefined, {
        action: 'signIn',
        email,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Email invalide');
      setLoading(false);
      return false;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Mot de passe invalide');
      setLoading(false);
      return false;
    }

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase n’est pas encore configuré. Ouvrez Paramètres → Connecteurs et entrez vos clés Supabase.');

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}`,
        },
      });

      if (signUpError) throw signUpError;

      setSuccess('Compte créé ! Vérifiez votre e-mail pour confirmer.');
      logger.info('User signed up successfully', { action: 'signUp', email });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de l\'inscription';
      setError(message);
      logger.error('Sign up failed', err instanceof Error ? err : undefined, {
        action: 'signUp',
        email,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Email invalide');
      setLoading(false);
      return false;
    }

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase n’est pas encore configuré. Ouvrez Paramètres → Connecteurs et entrez vos clés Supabase.');

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}#reset-password`,
      });

      if (resetError) throw resetError;

      setSuccess('Si ce compte existe, un lien de récupération a été envoyé.');
      logger.info('Password reset requested', { action: 'resetPassword', email });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la réinitialisation';
      setError(message);
      logger.error('Password reset failed', err instanceof Error ? err : undefined, {
        action: 'resetPassword',
        email,
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updatePassword = useCallback(async (newPassword: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || 'Mot de passe invalide');
      setLoading(false);
      return false;
    }

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Service d\'authentification non disponible.');

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess('Mot de passe mis à jour avec succès !');
      logger.info('Password updated successfully', { action: 'updatePassword' });
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la mise à jour';
      setError(message);
      logger.error('Password update failed', err instanceof Error ? err : undefined, {
        action: 'updatePassword',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async (): Promise<void> => {
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        await supabase.auth.signOut();
      }
      logger.info('User signed out', { action: 'signOut' });
    } catch (err) {
      logger.error('Sign out failed', err instanceof Error ? err : undefined, {
        action: 'signOut',
      });
    }
  }, []);

  return {
    // États
    loading,
    error,
    success,
    passwordStrength,
    
    // Actions
    signIn,
    signUp,
    resetPassword,
    updatePassword,
    signOut: handleSignOut,
    clearMessages,
    
    // Validation
    validateEmailInput,
    validatePasswordInput,
  };
}