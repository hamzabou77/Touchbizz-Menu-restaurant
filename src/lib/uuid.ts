/**
 * UUID utility functions ensuring strict RFC 4122 v4 compliance
 * to prevent PostgreSQL 22P02 "invalid input syntax for type uuid" errors.
 */

export function isValidUUID(id?: string | null): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim());
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // fallback if crypto.randomUUID fails in restricted context
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Checks whether an error is a PostgreSQL 22P02 UUID syntax error
 */
export function isInvalidUUIDError(error: any): boolean {
  if (!error) return false;
  const code = error?.code;
  const msg = typeof error?.message === 'string' ? error.message : JSON.stringify(error || '');
  return (
    code === '22P02' ||
    msg.includes('invalid input syntax for type uuid') ||
    msg.includes('invalid input syntax for uuid') ||
    msg.includes('invalid UUID')
  );
}
