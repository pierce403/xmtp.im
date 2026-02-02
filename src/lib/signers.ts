import type { Signer } from "@xmtp/browser-sdk";
import { IdentifierKind } from "@xmtp/browser-sdk";
import { createWalletClient, custom, toBytes, type EIP1193Provider } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export type ConnectedSigner = {
  label: string;
  address: `0x${string}`;
  signer: Signer;
  disconnect?: () => Promise<void>;
};

export function createEphemeralSigner(): ConnectedSigner {
  const account = privateKeyToAccount(generatePrivateKey());
  return {
    label: "Ephemeral",
    address: account.address,
    signer: {
      type: "EOA",
      getIdentifier: () => ({
        identifier: account.address.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum,
      }),
      signMessage: async (message: string) =>
        toBytes(await account.signMessage({ message })),
    },
  };
}

export async function connectBrowserWallet(): Promise<ConnectedSigner> {
  const ethereum = (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
  if (!ethereum) {
    throw new Error("No browser wallet found (window.ethereum is missing).");
  }

  const walletClient = createWalletClient({
    transport: custom(ethereum),
  });

  const [address] = await walletClient.requestAddresses();
  if (!address) {
    throw new Error("Wallet did not return an address.");
  }

  return {
    label: "Browser wallet",
    address,
    signer: {
      type: "EOA",
      getIdentifier: () => ({
        identifier: address.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum,
      }),
      signMessage: async (message: string) =>
        toBytes(await walletClient.signMessage({ account: address, message })),
    },
  };
}

export async function connectWalletConnect(
  projectId: string,
  rpcUrl: string,
): Promise<ConnectedSigner> {
  const { default: EthereumProvider } = await import(
    "@walletconnect/ethereum-provider"
  );

  const provider = await EthereumProvider.init({
    projectId,
    chains: [1],
    optionalChains: [1],
    showQrModal: true,
    rpcMap: {
      1: rpcUrl,
    },
  });

  await provider.connect();

  const account = provider.accounts?.[0] as `0x${string}` | undefined;
  if (!account) {
    await provider.disconnect();
    throw new Error("WalletConnect did not return an account.");
  }

  const walletClient = createWalletClient({
    transport: custom(provider),
  });

  return {
    label: "WalletConnect",
    address: account,
    signer: {
      type: "EOA",
      getIdentifier: () => ({
        identifier: account.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum,
      }),
      signMessage: async (message: string) =>
        toBytes(
          await walletClient.signMessage({
            account,
            message,
          }),
        ),
    },
    disconnect: async () => {
      await provider.disconnect();
    },
  };
}
