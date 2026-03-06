import { describe, it, expect } from 'vitest';
import { hashPagePassword, verifyPagePassword } from './page-password';

describe('hashPagePassword', () => {
  it('returns a string in "salt:hash" format', async () => {
    const result = await hashPagePassword('mypassword');
    const parts = result.split(':');
    expect(parts).toHaveLength(2);
    expect(parts[0]).toMatch(/^[0-9a-f]+$/); // hex salt
    expect(parts[1]).toMatch(/^[0-9a-f]+$/); // hex hash
  });

  it('produces different hashes for the same password on each call (random salt)', async () => {
    const hash1 = await hashPagePassword('mypassword');
    const hash2 = await hashPagePassword('mypassword');
    expect(hash1).not.toBe(hash2);
  });

  it('salt is 16 bytes (32 hex chars)', async () => {
    const result = await hashPagePassword('mypassword');
    const salt = result.split(':')[0]!;
    expect(salt).toHaveLength(32);
  });

  it('hash is SHA-256 output (64 hex chars)', async () => {
    const result = await hashPagePassword('mypassword');
    const hash = result.split(':')[1]!;
    expect(hash).toHaveLength(64);
  });
});

describe('verifyPagePassword', () => {
  it('returns true for correct password', async () => {
    const stored = await hashPagePassword('correct-password');
    const result = await verifyPagePassword('correct-password', stored);
    expect(result).toBe(true);
  });

  it('returns false for wrong password', async () => {
    const stored = await hashPagePassword('correct-password');
    const result = await verifyPagePassword('wrong-password', stored);
    expect(result).toBe(false);
  });

  it('returns false for empty password against non-empty stored', async () => {
    const stored = await hashPagePassword('correct-password');
    const result = await verifyPagePassword('', stored);
    expect(result).toBe(false);
  });

  it('returns false for stored string with invalid format (no colon)', async () => {
    const result = await verifyPagePassword('password', 'invalidstoredstring');
    expect(result).toBe(false);
  });

  it('returns false for stored string with too many colons', async () => {
    const result = await verifyPagePassword('password', 'a:b:c');
    expect(result).toBe(false);
  });

  it('is case-sensitive', async () => {
    const stored = await hashPagePassword('Password');
    expect(await verifyPagePassword('password', stored)).toBe(false);
    expect(await verifyPagePassword('Password', stored)).toBe(true);
  });

  it('handles unicode passwords', async () => {
    const stored = await hashPagePassword('パスワード');
    expect(await verifyPagePassword('パスワード', stored)).toBe(true);
    expect(await verifyPagePassword('password', stored)).toBe(false);
  });
});
