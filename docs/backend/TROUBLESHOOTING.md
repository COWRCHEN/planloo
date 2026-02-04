# Backend troubleshooting

Common issues when running the Planloo backend locally.

## "write EOF" on Windows

**Symptom:** When running `npm run dev` or `npm run dev:local` you see:

```text
✘ [ERROR] write EOF
```

This can occur in both remote (`npm run dev`) and local (`npm run dev:local`) modes.

**Cause:** Wrangler uses native Node.js modules that require the **Microsoft Visual C++ runtime** on Windows. When it is missing, the failure happens during low-level process communication and surfaces as this generic stream error instead of a clear "missing dependency" message.

**Solution:** Install **Microsoft Visual C++ 2015–2022 Redistributable** (both x64 and x86).

- **Download:** [Latest supported VC++ downloads](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) — install both **x64** and **x86**.
- **Or via winget:**
  ```powershell
  winget install Microsoft.VCRedist.2015+.x64
  winget install Microsoft.VCRedist.2015+.x86
  ```

Then **restart your terminal** (and IDE if you run the dev server from it) and run `npm run dev` again.

**Note:** You do **not** need Visual Studio Build Tools, Python, or the Windows SDK — only the VC++ Redistributable.

---

## Sign-in returns 503 or "Worker exceeded CPU time limit"

**Symptom:** `POST /api/v1/auth/sign-in/email` returns **503 Service Temporarily Unavailable** and the logs show:

```text
Worker exceeded CPU time limit.
RATE_LIMIT_KV not configured, skipping rate limit
```

**Cause:** Cloudflare Workers have strict CPU limits (e.g. 10 ms on the free tier, 50 ms on paid). Better Auth’s default password hashing (scrypt) is CPU-heavy and can exceed that during sign-in, so the Worker is terminated and returns 503.

**What we do:** In **development** only, the backend uses PBKDF2 (Web Crypto) instead of scrypt for password hashing so sign-in stays within the CPU limit. Staging and production still use the default scrypt.

**If you still see 503 in development:**

1. **New dev users:** Sign up again (or use “Forgot password”) so the account uses the dev PBKDF2 hash. Existing dev users created before this change had scrypt hashes; they need to reset password or sign up again in dev.
2. **Use local dev:** Run `npm run dev:local` instead of `npm run dev`. The worker runs in a local simulator and may have different CPU behavior (remote dev uses the real edge and limits).
3. **RATE_LIMIT_KV:** The “RATE_LIMIT_KV not configured” message is informational; auth rate limiting is skipped when KV isn’t bound. It does not cause the 503. To enable rate limiting, bind a KV namespace in `wrangler.toml` and set `RATE_LIMIT_KV` (see `wrangler.toml` comments).

---

## See also

- [LOCAL-DEV-SETUP.md](LOCAL-DEV-SETUP.md) — Prerequisites, D1 setup, and dev server commands
- [CLOUDFLARE_API_TOKEN.md](CLOUDFLARE_API_TOKEN.md) — Cloudflare API token for CI/headless use
