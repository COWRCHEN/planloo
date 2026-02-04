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

## See also

- [LOCAL-DEV-SETUP.md](LOCAL-DEV-SETUP.md) — Prerequisites, D1 setup, and dev server commands
- [CLOUDFLARE_API_TOKEN.md](CLOUDFLARE_API_TOKEN.md) — Cloudflare API token for CI/headless use
