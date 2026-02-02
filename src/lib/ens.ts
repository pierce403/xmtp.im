import { createPublicClient, http } from "viem";
import { normalize } from "viem/ens";
import { mainnet } from "viem/chains";

import { MAINNET_RPC_URL } from "../config";

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(MAINNET_RPC_URL),
});

export async function resolveEnsName(name: string) {
  const normalized = normalize(name);
  return publicClient.getEnsAddress({ name: normalized });
}

