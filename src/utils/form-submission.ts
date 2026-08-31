/**
 * Shared input handling for the public form endpoints (newsletter
 * subscription and prayer requests).
 *
 * These are the only routes an unauthenticated visitor can write to, so every
 * value arrives untrusted: each helper narrows the type, trims, and caps the
 * length before the value can reach the database. A helper throws
 * `SubmissionError` only for input the visitor can correct; anything merely
 * absent comes back as `undefined` for the caller to decide about.
 */

/** Invalid input whose message is safe to return to the visitor verbatim. */
export class SubmissionError extends Error {}

/** Trims and length-caps a value. Non-strings and blanks become undefined. */
export function trimmedText(
  value: unknown,
  maxLength: number
): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

/** Same as `trimmedText`, but a missing value is a visitor-correctable error. */
export function requireText(
  value: unknown,
  maxLength: number,
  label: string
): string {
  const text = trimmedText(value, maxLength);
  if (!text) throw new SubmissionError(`${label} is required.`);
  return text;
}

// Deliberately permissive: deliverability is proven by sending mail, not by a
// regex, and an over-strict pattern rejects valid addresses.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lowercases and validates an address. Absent stays absent; malformed throws. */
export function normalizeEmail(value: unknown): string | undefined {
  const text = trimmedText(value, 254);
  if (!text) return undefined;

  const address = text.toLowerCase();
  if (!EMAIL_PATTERN.test(address)) {
    throw new SubmissionError('Please enter a valid email address.');
  }
  return address;
}

/** Accepts a real boolean or the string form a URL-encoded body would send. */
export function flag(value: unknown): boolean {
  return value === true || value === 'true';
}

/** Keeps a bounded list of short strings; anything else becomes an empty list. */
export function stringList(
  value: unknown,
  maxItems: number,
  maxLength: number
): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => trimmedText(item, maxLength))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems);
}
