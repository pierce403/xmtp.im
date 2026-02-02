import { IdentifierKind, type Identifier } from "@xmtp/browser-sdk";
import { getAddress, isAddress } from "viem";

import { resolveEnsName } from "./ens";

export type ResolvedRecipient = {
  input: string;
  displayName: string;
  address: `0x${string}`;
  identifier: Identifier;
};

function looksLikeEns(input: string) {
  return input.includes(".") && !input.startsWith("0x");
}

export async function resolveRecipient(inputRaw: string): Promise<ResolvedRecipient> {
  const input = inputRaw.trim().replace(/^@/, "");
  if (!input) {
    throw new Error("Missing recipient identity.");
  }

  if (looksLikeEns(input)) {
    const address = await resolveEnsName(input);
    if (!address) {
      throw new Error(`Could not resolve ENS name: ${input}`);
    }
    const checksummed = getAddress(address);
    return {
      input,
      displayName: input,
      address: checksummed,
      identifier: {
        identifier: checksummed.toLowerCase(),
        identifierKind: IdentifierKind.Ethereum,
      },
    };
  }

  if (!isAddress(input)) {
    throw new Error(`Not a valid ENS name or address: ${input}`);
  }

  const checksummed = getAddress(input);
  return {
    input,
    displayName: checksummed,
    address: checksummed,
    identifier: {
      identifier: checksummed.toLowerCase(),
      identifierKind: IdentifierKind.Ethereum,
    },
  };
}
