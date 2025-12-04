import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";
import { getRpcUrl } from "./config";

export const chains = [arbitrum, arbitrumSepolia] as const;

export const wagmiConfig = getDefaultConfig({
  appName: "PacStac NFT Vendor",
  projectId: process.env.NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID ?? "demo-rainbowkit-id",
  chains,
  ssr: true,
  transports: {
    [arbitrum.id]: http(getRpcUrl(arbitrum)),
    [arbitrumSepolia.id]: http(getRpcUrl(arbitrumSepolia)),
  },
});
