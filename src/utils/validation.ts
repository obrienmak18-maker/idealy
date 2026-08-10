/**
 * Input validation utilities for the application.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  if (!email.trim()) {
    return { valid: false, error: 'L\'adresse e-mail est requise.' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'L\'adresse e-mail n\'est pas valide.' };
  }
  
  return { valid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { valid: false, error: 'Le mot de passe est requis.' };
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Le mot de passe doit comporter au moins 8 caractères.' };
  }
  
  return { valid: true };
}

export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value.trim()) {
    return { valid: false, error: `${fieldName} est requis.` };
  }
  
  return { valid: true };
}

export function validateMinLength(value: string, minLength: number, fieldName: string): ValidationResult {
  const required = validateRequired(value, fieldName);
  if (!required.valid) return required;
  
  if (value.trim().length < minLength) {
    return { valid: false, error: `${fieldName} doit comporter au moins ${minLength} caractères.` };
  }
  
  return { valid: true };
}