# xmtp.im
Super basic client meant for one-off XMTP conversations.

## What it does
- Visit `/<ens-or-address>` (example: `/deanpierce.eth`) to resolve the recipient and open a single DM.
- Uses the XMTP **production** network only (no dev network support).
- Defaults to a new **ephemeral** key per tab/session, with options to connect a browser wallet or WalletConnect.

## Local dev
```bash
npm install
npm run dev
```

## Optional config
- `VITE_WALLETCONNECT_PROJECT_ID`: enables WalletConnect.
- `VITE_MAINNET_RPC_URL`: overrides the default mainnet RPC (default: Cloudflare).

## Deploy (GitHub Pages)
This repo includes a GitHub Actions workflow that builds and deploys `dist/` to GitHub Pages:
- `.github/workflows/deploy.yml`

In your repo settings, set **Pages → Build and deployment → Source** to **GitHub Actions**.

Note: `public/404.html` + the script in `index.html` enable SPA-style routing on GitHub Pages so paths like `/deanpierce.eth` work.
