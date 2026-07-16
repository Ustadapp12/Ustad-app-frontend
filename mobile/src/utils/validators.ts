// Matches app/auth/validators.py::validate_full_name on the backend exactly
// (ASCII letters only) — keep in sync so the client never shows a name as
// valid that the server will then reject with INVALID_NAME.
const NAME_CHARS_RE = /^[A-Za-z\s'-]+$/;
const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateName(value: string): string | null {
  const name = value.trim();
  if (!name) return 'Full name is required.';
  if (name.length < 2) return 'Name must be at least 2 characters.';
  if (name.length > 50) return 'Name cannot exceed 50 characters.';
  if (!NAME_CHARS_RE.test(name)) {
    return 'Name may only contain letters, spaces, apostrophes and hyphens.';
  }
  return null;
}

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (!EMAIL_FORMAT_RE.test(email)) return 'Enter a valid email address.';
  return null;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

// "ahmadsh2390@gmail.com" -> "ah*********@gmail.com" — first 2 characters of
// the local part kept, the rest starred out 1:1, domain shown in full. Used
// to hint which email is expected on Forgot Password without ever displaying
// it in full.
export function maskEmail(email: string): string {
  const at = email.indexOf('@');
  if (at <= 0) return email;
  const local = email.slice(0, at);
  const domain = email.slice(at);
  const kept = local.slice(0, Math.min(2, local.length));
  const stars = '*'.repeat(local.length - kept.length);
  return `${kept}${stars}${domain}`;
}

export interface PasswordChecklist {
  minLength: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

export function getPasswordChecklist(password: string): PasswordChecklist {
  return {
    minLength: password.length >= 8 && password.length <= 128,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  return Object.values(getPasswordChecklist(password)).every(Boolean);
}

export type PasswordStrength = 'Weak' | 'Medium' | 'Strong';

export function getPasswordStrength(checklist: PasswordChecklist): PasswordStrength {
  const met = Object.values(checklist).filter(Boolean).length;
  if (met <= 2) return 'Weak';
  if (met <= 4) return 'Medium';
  return 'Strong';
}
