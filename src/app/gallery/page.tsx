"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useEffect, useState } from "react";
import { type Address } from "viem";
import { useAccount, useReadContract, usePublicClient } from "wagmi";
import { getNftContractAddress, getTargetChain } from "@/lib/config";
import { NFT_ABI } from "@/lib/contracts";

const nftContractAddress = getNftContractAddress();
const targetChain = getTargetChain();

type NFT = {
  tokenId: bigint;
  tokenURI: string;
  metadata?: {
    name?: string;
    description?: string;
    image?: string;
  };
};

export default function GalleryPage() {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: targetChain.id });
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: balance } = useReadContract({
    address: nftContractAddress ?? undefined,
    abi: NFT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: targetChain.id,
    query: {
      enabled: Boolean(address && nftContractAddress),
    },
  });

  useEffect(() => {
    if (isConnected && address && nftContractAddress && balance !== undefined) {
      fetchNFTs();
    } else {
      setNfts([]);
    }
  }, [isConnected, address, balance]);

  const fetchNFTs = async () => {
    if (!address || !nftContractAddress || !publicClient || balance === undefined) return;

    setIsLoading(true);
    setError(null);

    console.log("Fetching NFTs for address:", address);
    console.log("Balance:", balance.toString());

    try {
      const nftList: NFT[] = [];

      // If balance is 0, no need to fetch
      if (balance === 0n) {
        setNfts([]);
        setIsLoading(false);
        return;
      }

      // Try to fetch actual token IDs using tokenOfOwnerByIndex
      let useEnumerable = true;
      for (let i = 0; i < Number(balance); i++) {
        try {
          const tokenId = await publicClient.readContract({
            address: nftContractAddress,
            abi: NFT_ABI,
            functionName: "tokenOfOwnerByIndex",
            args: [address, BigInt(i)],
          });

          console.log(`Token at index ${i}:`, tokenId.toString());

          // Try to fetch token URI
          let tokenURI = "";
          try {
            tokenURI = await publicClient.readContract({
              address: nftContractAddress,
              abi: NFT_ABI,
              functionName: "tokenURI",
              args: [tokenId],
            }) as string;
            console.log(`Token URI for ${tokenId}:`, tokenURI);
          } catch (uriErr) {
            console.warn(`Failed to fetch URI for token ${tokenId}:`, uriErr);
          }

          nftList.push({
            tokenId: tokenId as bigint,
            tokenURI,
            metadata: {
              name: "PacStac NFT",
              description: "PacStac Testnet NFT",
              image: "/assets/pacstac-testnet-nft.png",
            },
          });
        } catch (tokenErr) {
          console.error(`Failed to fetch token at index ${i}:`, tokenErr);
          useEnumerable = false;
          break;
        }
      }

      // Fallback: If contract doesn't support enumerable, show placeholder NFTs
      if (!useEnumerable && nftList.length === 0) {
        console.log("Contract doesn't support ERC721Enumerable, using fallback");
        for (let i = 0; i < Number(balance); i++) {
          nftList.push({
            tokenId: BigInt(i + 1),
            tokenURI: "",
            metadata: {
              name: "PacStac NFT",
              description: "PacStac Testnet NFT - Token details unavailable without enumerable support",
              image: "/assets/pacstac-testnet-nft.png",
            },
          });
        }
      }

      console.log("Final NFT list:", nftList);
      setNfts(nftList);
    } catch (err) {
      console.error("Error fetching NFTs:", err);
      const errorStr = String(err instanceof Error ? err.message : err);

      if (errorStr.includes("429") || errorStr.toLowerCase().includes("rate limit")) {
        setError("Rate Limited - Try Later");
      } else {
        setError(errorStr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="content">
      <div className="card">
        <h1 className="headline" style={{ marginBottom: 10 }}>
          Your PacStac NFTs
        </h1>
        <p className="subhead">
          View all PacStac NFTs in your connected wallet. Connect your wallet to see your collection.
        </p>
        <div className="hero-actions">
          <ConnectButton />
          {address && (
            <span className="pill">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
        </div>
      </div>

      <div className="card">
        {!isConnected && (
          <div className="banner">
            <span className="pill">Not connected</span>
            <span className="muted">Connect your wallet to view your NFTs</span>
          </div>
        )}

        {isConnected && isLoading && (
          <div className="banner">
            <span className="pill">Loading</span>
            <span className="muted">Fetching your NFTs...</span>
          </div>
        )}

        {isConnected && error && (
          <div className="banner">
            <span className="pill error">Error</span>
            <span className="muted">{error}</span>
          </div>
        )}

        {isConnected && !isLoading && nfts.length === 0 && !error && (
          <div className="banner">
            <span className="pill">No NFTs</span>
            <span className="muted">
              You don&apos;t own any PacStac NFTs yet.{" "}
              <Link href="/mint" className="nav-link">
                Mint one now
              </Link>
            </span>
          </div>
        )}

        {isConnected && !isLoading && nfts.length > 0 && (
          <>
            <h3 style={{ marginTop: 0 }}>Your Collection ({nfts.length})</h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
                gap: 16,
                marginTop: 16,
              }}
            >
              {nfts.map((nft) => (
                <div
                  key={nft.tokenId}
                  className="card"
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {nft.metadata?.image ? (
                    <img
                      src={nft.metadata.image}
                      alt={nft.metadata.name || `Token #${nft.tokenId}`}
                      className="nft-visual"
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: 8,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <span className="muted">Token #{nft.tokenId.toString()}</span>
                    </div>
                  )}
                  <div>
                    <div className="stat-label">Token ID</div>
                    <div className="muted">#{nft.tokenId.toString()}</div>
                  </div>
                  {nft.metadata?.name && (
                    <div>
                      <div className="stat-label">Name</div>
                      <div className="muted">{nft.metadata.name}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
