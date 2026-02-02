# AGENTS.md - Instructions for Coding Agents (xmtp.im)

## Self-Improvement Directive
**IMPORTANT:** Update this file whenever you learn something important about this repo.
Capture both wins to repeat and misses to avoid, plus collaborator preferences. Be specific:
- Exact commands that worked (or failed) and why
- Where things live (file paths) and what not to change
- Common pitfalls + fixes
- Deployment and verification steps

Keep this doc concise and prune stale notes.

## Project Overview
This repo is a Vite + React + TypeScript static SPA deployed to GitHub Pages. It’s intentionally minimal: one URL → one XMTP DM.

### Product constraints
- **XMTP production only**: keep `src/config.ts` set to `XMTP_ENV = "production"` (no dev/staging toggles).
- **Single-conversation UX**: the app is meant for one recipient per URL (`/:target`) and one focused DM flow.
- **Default ephemeral identity**: the default path should generate a new ephemeral key in-tab; wallet modes are optional convenience.
- **No persistent local DB**: XMTP client is created with `dbPath: null` for ephemeral sessions.

### Recipient resolution
- `/:target` accepts `name.eth` or `0x…`.
- ENS resolution uses `viem` on Ethereum mainnet via `VITE_MAINNET_RPC_URL` (defaults to Cloudflare).

### Wallet connections
- Browser wallet uses `window.ethereum` (MetaMask/Coinbase/etc).
- WalletConnect is optional and requires `VITE_WALLETCONNECT_PROJECT_ID` at build time.

## Build & Test Commands
```bash
npm install
npm run dev
npm run build
```

## Coding Conventions
- Treat `src/config.ts` as the single source of truth for XMTP env and mainnet RPC.
- Keep the UI focused on a single DM; avoid adding multi-inbox or multi-thread UI unless requested.
- Keep TypeScript strict; prefer fixing types over loosening compiler settings.

## GitHub Pages Deployment
- Deploy workflow: `.github/workflows/deploy.yml`
- SPA routing on Pages: `public/404.html` + the redirect script in `index.html`.
- `.nojekyll` is present to avoid Pages/Jekyll quirks.

## Known Issues & Solutions
- **GitHub Actions runner acquisition failures**: if you see “The job was not acquired by Runner of type hosted…”, check GitHub status and retry later (it’s often an external outage), then rerun with `gh run rerun <run-id>`.
- **TypeScript picking up global @types**: if you hit `TS2688: Cannot find type definition file for 'hapi__shot'` (or similar), constrain `typeRoots` in `tsconfig.app.json` / `tsconfig.node.json` to `./node_modules/@types` (already done).
- **Pages deep-link 404s**: if `/name.eth` breaks on GitHub Pages, ensure `public/404.html` and the redirect script in `index.html` remain intact.

## Agent Tips
- **Commit + push for every task update** (small, atomic commits preferred).
- After pushing, verify deploy + Pages config:
  - Latest run: `gh run list --workflow Deploy --branch main -L 1`
  - Watch: `gh run watch <run-id> --exit-status`
  - Pages config: `gh api repos/pierce403/xmtp.im/pages`
- If the collaborator mentions a different domain (e.g. `xmtp.to`), confirm whether the Pages CNAME should change before editing settings.

## Rapport & Reflection
- Collaborator preferences observed: React+TypeScript, compile in GitHub Actions, XMTP production only, minimal one-recipient UX, commit+push on every update, verify deploy with `gh`.

### Wins & Misses (keep recent)
- 2026-02-02 Win: Production-only XMTP + ENS resolution + single-DM UX shipped with local `npm run build` succeeding.
- 2026-02-02 Miss: GitHub Actions hosted runners failed to acquire due to an external outage; check status early before tweaking workflow configs.
