/**
 * Authentication configuration and feature flags.
 * 
 * When ENABLE_LOCAL_ACCOUNTS is false (default):
 * - Hides email registration, password login, and demo 2FA inputs from AuthPage.
 * - Restricts operator sign-in to verified OAuth (Google, GitHub) and Guest sandbox access.
 * - Keeps all underlying storage models, cryptography, and sync mechanisms intact without data loss.
 */
export const ENABLE_LOCAL_ACCOUNTS: boolean = 
  typeof import.meta !== 'undefined' && import.meta.env?.VITE_ENABLE_LOCAL_ACCOUNTS === 'true';
