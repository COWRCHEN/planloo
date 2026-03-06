# Test Cases: page-password

**Source:** `backend/src/lib/page-password.ts`
**Test file:** `backend/src/lib/page-password.test.ts`
**Total tests:** 12

Uses the Web Crypto API (`crypto.subtle.digest`, `crypto.getRandomValues`) — available natively in the Cloudflare Workers runtime and in the Node.js test environment (Vitest `environment: 'node'`).

Stored format: `"<hex-salt>:<hex-hash>"` where salt is 16 bytes (32 hex chars) and hash is SHA-256 (64 hex chars).

---

## `hashPagePassword(password)`

Generates a random salt, hashes `salt + password` with SHA-256, returns `"salt:hash"`.

| # | Test | Input | Expected |
|---|------|-------|----------|
| 1 | returns string in `salt:hash` format | `'mypassword'` | result splits on `:` into exactly 2 parts, both hex |
| 2 | produces different hashes on each call (random salt) | `'mypassword'` called twice | hash1 ≠ hash2 |
| 3 | salt is 16 bytes (32 hex chars) | `'mypassword'` | `result.split(':')[0].length === 32` |
| 4 | hash is SHA-256 output (64 hex chars) | `'mypassword'` | `result.split(':')[1].length === 64` |

---

## `verifyPagePassword(input, stored)`

Re-computes the hash from the stored salt and compares it to the stored hash.

| # | Test | Input | Expected |
|---|------|-------|----------|
| 5 | returns true for correct password | hash of `'correct-password'` | `true` |
| 6 | returns false for wrong password | `'wrong-password'` vs hash of `'correct-password'` | `false` |
| 7 | returns false for empty input | `''` vs hash of `'correct-password'` | `false` |
| 8 | returns false when stored has no colon | `'invalidstoredstring'` | `false` |
| 9 | returns false when stored has too many colons | `'a:b:c'` | `false` |
| 10 | is case-sensitive | `'password'` vs hash of `'Password'` | `false` |
| 11 | `'Password'` matches its own hash | `'Password'` vs hash of `'Password'` | `true` |
| 12 | handles unicode passwords | `'パスワード'` | correct password → `true`, wrong → `false` |
