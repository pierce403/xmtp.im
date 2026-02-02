export const XMTP_ENV = "production" as const;

const DEFAULT_MAINNET_RPCS = [
  // Cloudflare's public RPC currently fails some ENS Universal Resolver calls
  // (e.g. `resolveWithGateways`), so don't use it as the default.
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://1rpc.io/eth",
  "https://cloudflare-eth.com",
];

export const MAINNET_RPC_URLS = [
  import.meta.env.VITE_MAINNET_RPC_URL,
  ...DEFAULT_MAINNET_RPCS,
].filter(Boolean) as string[];

export const MAINNET_RPC_URL = MAINNET_RPC_URLS[0]!;

export const WALLETCONNECT_PROJECT_ID:
  | string
  | undefined = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || undefined;

export const APP_VERSION = "xmtp.im";
