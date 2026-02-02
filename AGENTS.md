# Agent Notes (xmtp.im)

This repo is a Vite + React + TypeScript static site deployed to GitHub Pages. It’s intentionally minimal: one URL → one XMTP DM.

## Product constraints
- **XMTP production only**: keep `src/config.ts` set to `XMTP_ENV = "production"` (no dev/staging toggles).
- **Single-conversation UX**: the app is meant for one recipient per URL (`/:target`) and one focused DM flow.
- **Default ephemeral identity**: the default path should generate a new ephemeral key in-tab; wallet modes are optional convenience.
- **No persistent local DB**: XMTP client is created with `dbPath: null` for ephemeral sessions.

## Recipient resolution
- `/:target` accepts `name.eth` or `0x…`.
- ENS resolution uses `viem` on Ethereum mainnet via `VITE_MAINNET_RPC_URL` (defaults to Cloudflare).

## Wallet connections
- Browser wallet uses `window.ethereum` (MetaMask/Coinbase/etc).
- WalletConnect is optional and requires `VITE_WALLETCONNECT_PROJECT_ID` at build time.

## Dev commands
- Install: `npm install`
- Dev server: `npm run dev`
- Production build (typecheck + build): `npm run build`

## GitHub Pages deployment
- Deploy workflow: `.github/workflows/deploy.yml`
- SPA routing on Pages: `public/404.html` + the redirect script in `index.html`.
- `.nojekyll` is present to avoid Pages/Jekyll quirks.

## Workflow for changes (required)
- **Commit + push for every task update** (small, atomic commits preferred).
- After pushing, **verify Pages deploy via `gh`**:
  - Find the latest run: `gh run list --workflow Deploy --branch main -L 1`
  - Watch it complete: `gh run watch <run-id> --exit-status`
  - Confirm Pages config/domain: `gh api repos/:owner/:repo/pages`

