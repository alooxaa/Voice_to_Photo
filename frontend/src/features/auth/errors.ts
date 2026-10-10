import { ApiError, NetworkError } from '../../shared/api/client';

/** Error codes the backend sends that have their own translated message. */
const KNOWN_CODES = new Set([
  'username_taken',
  'username_invalid',
  'passwords_differ',
  'password_short',
]);

/** Field name → translation key under `errors.` */
export type FieldErrors = Record<string, string>;

/** Turn a failed auth request into translation keys, per form field. */
export function authErrors(error: unknown): FieldErrors {
  if (error instanceof NetworkError) return { form: 'network' };
  if (!(error instanceof ApiError)) return { form: 'generic' };
  if (error.status === 401) return { form: 'login_failed' };

  const result: FieldErrors = {};
  const body = (error.body ?? {}) as Record<string, unknown>;
  for (const [field, messages] of Object.entries(body)) {
    const code = Array.isArray(messages) ? String(messages[0]) : String(messages);
    result[field] = KNOWN_CODES.has(code) ? code : 'generic';
  }
  return Object.keys(result).length ? result : { form: 'generic' };
}
