/**
 * Page Password Hashing
 *
 * Hash and verify event page passwords using SHA-256 with a random salt.
 * Stored format: "salt:hash" (both hex-encoded).
 */

const SALT_BYTES = 16;

function toHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i]!.toString(16).padStart(2, '0');
  }
  return hex;
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function hashPagePassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const encoder = new TextEncoder();
  const data = new Uint8Array([...salt, ...encoder.encode(password)]);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return `${toHex(salt.buffer as ArrayBuffer)}:${toHex(hash)}`;
}

export async function verifyPagePassword(input: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');
  if (parts.length !== 2) return false;

  const salt = fromHex(parts[0]!);
  const expectedHash = parts[1]!;

  const encoder = new TextEncoder();
  const data = new Uint8Array([...salt, ...encoder.encode(input)]);
  const hash = await crypto.subtle.digest('SHA-256', data);

  return toHex(hash) === expectedHash;
}
