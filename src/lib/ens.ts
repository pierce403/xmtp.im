import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

import { MAINNET_RPC_URLS } from "../config";

const clientByRpcUrl = new Map<string, ReturnType<typeof createPublicClient>>();

function getClient(rpcUrl: string) {
  const cached = clientByRpcUrl.get(rpcUrl);
  if (cached) return cached;
  const created = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });
  clientByRpcUrl.set(rpcUrl, created);
  return created;
}

function toShortMessage(error: unknown) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  const maybeMessage = (error as { message?: unknown }).message;
  if (typeof maybeMessage === "string") return maybeMessage;
  return String(error);
}

export async function resolveEnsName(name: string) {
  const normalized = normalize(name);
  let lastError: unknown;

  for (const rpcUrl of MAINNET_RPC_URLS) {
    try {
      return await getClient(rpcUrl).getEnsAddress({ name: normalized });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `ENS resolution failed (RPC error). ${toShortMessage(lastError)}`,
  );
}
