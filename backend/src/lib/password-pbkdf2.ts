/**
 * PBKDF2 password hashing for Cloudflare Workers
 *
 * Used in development to stay within Worker CPU time limits.
 * Better Auth's default scrypt is CPU-heavy and can exceed the 10ms (free) / 50ms (paid) limit.
 * PBKDF2 via Web Crypto is faster and runs within limits.
 *
 * Stored format: "pbkdf2:iterations:saltBase64:keyBase64"
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const ALGORITHM = 'SHA-256';

function encodeBase64(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let binary = '';
  for (let i = 0; i < u8.length; i++) {
    binary += String.fromCharCode(u8[i]);
  }
  return btoa(binary);
}

function decodeBase64(str: string): Uint8Array {
  const binary = atob(str);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    u8[i] = binary.charCodeAt(i);
  }
  return u8;
}

/**
 * Hash a password with PBKDF2-SHA256.
 * Returns a string in format "pbkdf2:iterations:salt:key" (salt and key base64).
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: ALGORITHM,
    },
    keyMaterial,
    KEY_BYTES * 8
  );
  const saltB64 = encodeBase64(salt);
  const keyB64 = encodeBase64(derived);
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltB64}:${keyB64}`;
}

/**
 * Verify a password against a stored PBKDF2 hash.
 * Stored hash must be in format "pbkdf2:iterations:salt:key".
 */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }
  const iterations = parseInt(parts[1], 10);
  if (!Number.isInteger(iterations) || iterations < 1) {
    return false;
  }
  const salt = decodeBase64(parts[2]);
  const expectedKey = decodeBase64(parts[3]);
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: ALGORITHM,
    },
    keyMaterial,
    expectedKey.length * 8
  );
  const derivedKey = new Uint8Array(derived);
  if (derivedKey.length !== expectedKey.length) {
    return false;
  }
  for (let i = 0; i < derivedKey.length; i++) {
    if (derivedKey[i] !== expectedKey[i]) {
      return false;
    }
  }
  return true;
}
