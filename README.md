# xmtp.im
Super basic client meant for one-off XMTP conversations.

## What it does
- Visit `/<ens-or-address>` (example: `/xmtp-docs.eth`) to resolve the recipient and open a single DM.
- Uses the XMTP **production** network only (no dev network support).
- Defaults to a new **ephemeral** key per tab/session, with options to connect a browser wallet or WalletConnect.

## Local dev
```bash
npm install
npm run dev
```

## E2E (Playwright)
By default, the E2E suite does **not** send messages. To run it:
```bash
npx playwright install chromium
npm run e2e
```

To opt-in to sending a real XMTP message:
```bash
E2E_SEND_MESSAGE=1 E2E_RECIPIENT=xmtp-docs.eth npm run e2e
```

## Optional config
- `VITE_WALLETCONNECT_PROJECT_ID`: enables WalletConnect.
- `VITE_MAINNET_RPC_URL`: overrides the mainnet RPC used for ENS resolution (defaults to `https://ethereum.publicnode.com` with fallbacks).

## Deploy (GitHub Pages)
This repo includes a GitHub Actions workflow that builds and deploys `dist/` to GitHub Pages:
- `.github/workflows/deploy.yml`

In your repo settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

Note: `public/404.html` + the script in `index.html` enable SPA-style routing on GitHub Pages so paths like `/xmtp-docs.eth` work.

## Cloudflare hosting

Native Git publishes `main` with `npm run build:cloudflare` and `npm run deploy`.
The original generator and GitHub Pages build remain available for recovery.
Cloudflare-only postprocessing adds a no-store revision marker and terminal404;
previews are disabled and deployment credentials stay in Cloudflare.
Application source, local data formats and existing public URLs are preserved.

The hosting handler passed generated binding type checks, three routing tests
and ten real local Worker checks using pinned Wrangler4.151.0 at the configured
October14 compatibility date. Existing production XMTP installation verification
remains a separate known failure from the pre-migration baseline; hosting checks
do not claim chat delivery and send no messages. Pages retains its original
redirect fallback.
