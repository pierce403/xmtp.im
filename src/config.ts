export const XMTP_ENV = "production" as const;
export const MAINNET_RPC_URL =
  import.meta.env.VITE_MAINNET_RPC_URL ?? "https://cloudflare-eth.com";

export const WALLETCONNECT_PROJECT_ID:
  | string
  | undefined = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || undefined;

export const APP_VERSION = "xmtp.im";

