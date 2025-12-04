import { getAddress, type Address } from "viem";
import { arbitrum, arbitrumSepolia, type Chain } from "wagmi/chains";

export type MintMode = "mint" | "mintTo" | "safeMint" | "safeMintWithUri";

const DEFAULT_STAC_CONTRACT: Address =
  "0xcC8fdca1077CFD74BFD674B3763BB9eA5DDFaDEf";
const DEFAULT_STAC_REQUIRED = 1;
const DEFAULT_STAC_DECIMALS = 18;
const DEFAULT_CHAIN = arbitrumSepolia;
const DEFAULT_NFT_CONTRACT: Address =
  "0x342Dec68Bcc4494B6f2E3B06d8233aaF74e9D04C";

const METADATA_CID = "bafkreidoqepqabavue6vlz5a4zg5xrduybdqmirztlcaz7wmxo5muiy4jq";
const IMAGE_CID = "bafybeiev4ylvbwajc3fdse7idohcrk2xmuniri5yebeirxtuvjkpdwaxh4";

export const nftMetadata = {
  name: "PacStac Testnet NFT",
  description: "PacStac Testnet NFT",
  metadataCid: METADATA_CID,
  imageCid: IMAGE_CID,
  metadataUri: `ipfs://${METADATA_CID}`,
  imageUrl: `https://ipfs.io/ipfs/${IMAGE_CID}`,
};

export const supportedChains: Chain[] = [arbitrum, arbitrumSepolia];

export function getTargetChain(): Chain {
  const chainId = Number(process.env.NEXT_PUBLIC_TARGET_CHAIN_ID ?? "");
  const fromEnv = supportedChains.find((chain) => chain.id === chainId);
  return fromEnv ?? DEFAULT_CHAIN;
}

export function getRpcUrl(chain: Chain): string {
  if (chain.id === arbitrum.id) {
    return (
      (process.env.NEXT_PUBLIC_ARBITRUM_RPC_URL ?? "").trim() ||
      arbitrum.rpcUrls.default.http[0]
    );
  }

  if (chain.id === arbitrumSepolia.id) {
    return (
      (process.env.NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL ?? "").trim() ||
      arbitrumSepolia.rpcUrls.default.http[0]
    );
  }

  return chain.rpcUrls.default.http[0];
}

export function getStacConfig() {
  const configuredAddress = process.env.NEXT_PUBLIC_STAC_CONTRACT_ADDRESS;
  const address = parseAddress(configuredAddress) ?? DEFAULT_STAC_CONTRACT;

  const decimalsEnv = Number(process.env.NEXT_PUBLIC_STAC_TOKEN_DECIMALS);
  const decimals = Number.isFinite(decimalsEnv) && decimalsEnv > 0 ? decimalsEnv : DEFAULT_STAC_DECIMALS;

  const requiredEnv = Number.parseFloat(
    (process.env.NEXT_PUBLIC_PACSTAC_REQUIRED_AMOUNT ?? "").trim(),
  );
  const requiredAmount =
    Number.isFinite(requiredEnv) && requiredEnv > 0 ? requiredEnv : DEFAULT_STAC_REQUIRED;

  return { address, requiredAmount, decimals };
}

export function getNftContractAddress(): Address | null {
  const envAddress = parseAddress(process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS);
  return envAddress ?? DEFAULT_NFT_CONTRACT;
}

export function getMintMode(): MintMode {
  const value = (process.env.NEXT_PUBLIC_NFT_MINT_MODE ?? "").trim().toLowerCase();
  switch (value) {
    case "mint":
    case "minttosender":
      return "mint";
    case "mintto":
      return "mintTo";
    case "safemint":
    case "safeminttosender":
      return "safeMint";
    case "safemintwithuri":
      return "safeMintWithUri";
    default:
      return "safeMintWithUri";
  }
}

export function getTokenUri(): string {
  const fromEnv = (process.env.NEXT_PUBLIC_NFT_TOKEN_URI ?? "").trim();
  return fromEnv || nftMetadata.metadataUri;
}

export function parseAddress(value: string | undefined): Address | null {
  if (!value) return null;
  try {
    return getAddress(value.trim());
  } catch {
    return null;
  }
}

export function getExplorerBase(chain: Chain): string {
  if (chain.id === arbitrum.id) {
    return "https://arbiscan.io";
  }

  if (chain.id === arbitrumSepolia.id) {
    return "https://sepolia.arbiscan.io";
  }

  return chain.blockExplorers?.default.url ?? "";
}
