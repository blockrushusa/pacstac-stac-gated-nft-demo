"use client";
/* eslint-disable @next/next/no-img-element */

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  formatUnits,
  type Address,
  type Hash,
} from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
  useSwitchChain,
  usePublicClient,
} from "wagmi";
import { ERC20_ABI, NFT_ABI } from "@/lib/contracts";
import {
  getExplorerBase,
  getMintMode,
  getNftContractAddress,
  getStacConfig,
  getTargetChain,
  getTokenUri,
  nftMetadata,
  type MintMode,
} from "@/lib/config";
import { arbitrum, arbitrumSepolia } from "wagmi/chains";

const initialChain = getTargetChain();
const stacConfig = getStacConfig();
const mintMode = getMintMode();
const nftContractAddress = getNftContractAddress();
const tokenUri = getTokenUri();

type MintArgs = [] | [Address] | [Address, string];

type MintCall = {
  functionName: "mint" | "safeMint";
  args: MintArgs;
};

function buildMintCall(to: Address, mode: MintMode): MintCall {
  switch (mode) {
    case "mint":
      return { functionName: "mint", args: [] };
    case "mintTo":
      return { functionName: "mint", args: [to] };
    case "safeMintWithUri":
      return { functionName: "safeMint", args: [to, tokenUri] };
    case "safeMint":
    default:
      return { functionName: "safeMint", args: [to] };
  }
}

export default function MintPage() {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();

  const [selectedChain, setSelectedChain] = useState(initialChain);
  const publicClient = usePublicClient({ chainId: selectedChain?.id });
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [requiredStacAmount, setRequiredStacAmount] = useState<number>(stacConfig.requiredAmount);
  const [selectedMintMode, setSelectedMintMode] = useState<MintMode>(mintMode);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);

  const explorerBase = useMemo(
    () => getExplorerBase(selectedChain),
    [selectedChain],
  );

  const isWrongNetwork = Boolean(chainId && chainId !== selectedChain.id);

  const handleSelectChain = async (chain: typeof arbitrum | typeof arbitrumSepolia) => {
    setSelectedChain(chain);
    setStatusMessage(null);
    setError(null);

    if (!isConnected || chainId === chain.id || !switchChainAsync) {
      return;
    }

    try {
      setStatusMessage(`Switching to ${chain.name}...`);
      await switchChainAsync({ chainId: chain.id });
      setStatusMessage(`Switched to ${chain.name}.`);
    } catch (err) {
      setStatusMessage(null);
      setError(err instanceof Error ? err.message : "Network switch was rejected.");
    }
  };

  const {
    data: rawBalance,
    isLoading: isBalanceLoading,
    isFetching: isBalanceFetching,
    refetch: refetchBalance,
    error: balanceError,
  } = useReadContract({
    address: stacConfig.address,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: selectedChain.id,
    query: {
      enabled: Boolean(address),
      refetchOnWindowFocus: false,
    },
  });

  const {
    data: contractRequiredBalance,
    isLoading: isLoadingContractConfig,
  } = useReadContract({
    address: nftContractAddress ?? undefined,
    abi: NFT_ABI,
    functionName: "requiredBalance",
    chainId: selectedChain.id,
    query: {
      enabled: Boolean(nftContractAddress),
      refetchOnWindowFocus: false,
    },
  });

  const {
    data: contractStacToken,
  } = useReadContract({
    address: nftContractAddress ?? undefined,
    abi: NFT_ABI,
    functionName: "stacToken",
    chainId: selectedChain.id,
    query: {
      enabled: Boolean(nftContractAddress),
      refetchOnWindowFocus: false,
    },
  });

  const {
    data: contractOwner,
  } = useReadContract({
    address: nftContractAddress ?? undefined,
    abi: NFT_ABI,
    functionName: "owner",
    chainId: selectedChain.id,
    query: {
      enabled: Boolean(nftContractAddress),
      refetchOnWindowFocus: false,
    },
  });

  const formattedBalance = useMemo(() => {
    if (!rawBalance) return "0";
    return formatUnits(rawBalance, stacConfig.decimals);
  }, [rawBalance]);

  const formattedContractRequired = useMemo(() => {
    if (!contractRequiredBalance) return "0";
    return formatUnits(contractRequiredBalance, stacConfig.decimals);
  }, [contractRequiredBalance]);

  const numericBalance = Number.parseFloat(formattedBalance);
  const hasEnoughStac =
    Number.isFinite(numericBalance) && numericBalance >= requiredStacAmount;

  const { writeContractAsync, isPending: isWriting } = useWriteContract();

  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: selectedChain.id,
  });

  useEffect(() => {
    if (isConfirmed) {
      setStatusMessage("Mint confirmed on-chain.");
    }
  }, [isConfirmed]);

  useEffect(() => {
    if (receiptError) {
      setError(receiptError.message);
    }
  }, [receiptError]);

  const isMintDisabled =
    !isConnected ||
    isWrongNetwork ||
    !nftContractAddress ||
    isWriting ||
    isConfirming ||
    isSwitching ||
    (!hasEnoughStac && !isBalanceLoading && !isBalanceFetching);

  const mintButtonLabel = (() => {
    if (!isConnected) return "Connect to mint";
    if (isWrongNetwork) return `Switch to ${selectedChain.name}`;
    if (!nftContractAddress) return "Set NFT contract";
    if (!hasEnoughStac && !isBalanceLoading) return "Need more STAC";
    if (isSwitching) return "Switching network...";
    if (isConfirming) return "Awaiting confirmations...";
    if (isWriting) return "Sending mint...";
    return "Mint PacStac NFT";
  })();

  const handleSimulate = async () => {
    setSimulationResult(null);
    setError(null);

    if (!address || !nftContractAddress || !publicClient) {
      setError("Cannot simulate - missing address or client");
      return;
    }

    try {
      const mintCall = buildMintCall(address, selectedMintMode);
      setSimulationResult("Simulating...");

      // Log the call details for debugging
      console.log("Simulating mint with:", {
        mode: selectedMintMode,
        functionName: mintCall.functionName,
        args: mintCall.args,
        contractAddress: nftContractAddress,
        userAddress: address,
      });

      await publicClient.simulateContract({
        account: address,
        address: nftContractAddress,
        abi: NFT_ABI,
        functionName: mintCall.functionName,
        args: mintCall.args,
      });

      setSimulationResult("✓ Simulation successful! Transaction should work.");
    } catch (err: any) {
      console.error("Simulation error:", err);
      console.error("Error details:", {
        message: err?.message,
        cause: err?.cause,
        reason: err?.reason,
        data: err?.data,
        shortMessage: err?.shortMessage,
        details: err?.details,
      });

      const errorStr = String(err?.message || err || "");

      // Check for rate limit errors
      if (errorStr.includes("429") || errorStr.toLowerCase().includes("rate limit") || errorStr.toLowerCase().includes("too many requests")) {
        setSimulationResult("✗ Rate Limited - Try Later");
        setError("Rate Limited - Try Later");
        return;
      }

      // Try to extract the actual revert reason
      let reason = "Unknown error";
      if (err?.cause?.reason) {
        reason = err.cause.reason;
      } else if (err?.reason) {
        reason = err.reason;
      } else if (err?.shortMessage) {
        reason = err.shortMessage;
      } else if (err?.details) {
        reason = err.details;
      } else if (err?.message) {
        reason = err.message;
      }

      setSimulationResult(`✗ Simulation failed: ${reason}`);
      setError(`Simulation failed: ${reason}`);
    }
  };

  const handleMint = async () => {
    setError(null);
    setStatusMessage(null);

    if (!address || !isConnected) {
      setError("Connect a wallet to mint.");
      return;
    }

    if (isWrongNetwork) {
      setError(`Switch to ${selectedChain.name} to mint.`);
      return;
    }

    if (!nftContractAddress) {
      setError("Missing NFT contract address. Set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS.");
      return;
    }

    const freshBalance = await refetchBalance();
    const latestBalance = freshBalance.data ?? rawBalance;
    const formattedLatest = latestBalance
      ? formatUnits(latestBalance, stacConfig.decimals)
      : "0";
    const latestValue = Number.parseFloat(formattedLatest);

    if (!Number.isFinite(latestValue) || latestValue < requiredStacAmount) {
      setError(`At least ${requiredStacAmount} STAC required to mint.`);
      return;
    }

    try {
      setStatusMessage("Requesting wallet to submit the mint transaction...");
      const mintCall = buildMintCall(address, selectedMintMode);

      // Try to estimate gas first
      let gasLimit: bigint | undefined;
      try {
        if (publicClient) {
          gasLimit = await publicClient.estimateContractGas({
            account: address,
            address: nftContractAddress,
            abi: NFT_ABI,
            functionName: mintCall.functionName,
            args: mintCall.args,
          });
          console.log("Estimated gas:", gasLimit);
          // Add 20% buffer to gas estimate
          gasLimit = (gasLimit * 120n) / 100n;
        }
      } catch (gasErr) {
        console.error("Gas estimation failed:", gasErr);
        // Continue without gas limit - let the wallet handle it
      }

      const hash = await writeContractAsync({
        chainId: selectedChain.id,
        address: nftContractAddress,
        abi: NFT_ABI,
        functionName: mintCall.functionName,
        args: mintCall.args,
        gas: gasLimit,
      });

      setTxHash(hash);
      setStatusMessage("Transaction submitted. Waiting for confirmations...");
    } catch (err) {
      setTxHash(undefined);
      setStatusMessage(null);

      // Try to extract more detailed error info
      let errorMessage = "Mint transaction was rejected.";
      if (err instanceof Error) {
        const errorStr = String(err.message || "");
        const errorJson = JSON.stringify(err, null, 2);

        // Check for rate limit errors (higher priority check)
        if (
          errorStr.includes("429") ||
          errorStr.toLowerCase().includes("rate limit") ||
          errorStr.toLowerCase().includes("too many requests") ||
          errorJson.includes("429") ||
          errorJson.toLowerCase().includes("rate limit")
        ) {
          setError("Rate Limited - Try Later");
          return;
        }

        errorMessage = err.message;

        // Try to parse the error for more details
        if (errorJson.includes("execution reverted")) {
          const match = errorJson.match(/"message":\s*"([^"]+)"/);
          if (match) errorMessage = match[1];
        }
      }

      setError(errorMessage);
      console.error("Mint error details:", err);
    }
  };

  return (
    <main className="content">
      <div className="card">
        <div className="status-row" style={{ flexWrap: "wrap" }}>
          <span className="pill">Target: {selectedChain.name}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="pill">Mint mode:</span>
            <select
              value={selectedMintMode}
              onChange={(e) => setSelectedMintMode(e.target.value as MintMode)}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: "1px solid rgba(255, 255, 255, 0.2)",
                background: "rgba(255, 255, 255, 0.05)",
                color: "inherit",
                fontSize: 12,
              }}
            >
              <option value="mint">mint()</option>
              <option value="mintTo">mint(address)</option>
              <option value="safeMint">safeMint(address)</option>
              <option value="safeMintWithUri">safeMint(address,string)</option>
            </select>
          </div>
          <span className="pill">Requires: {requiredStacAmount} STAC</span>
        </div>
        <h1 className="headline" style={{ marginBottom: 10 }}>
          Mint the PacStac NFT
        </h1>
        <p className="subhead">
          Connect on {selectedChain.name}, prove your STAC balance, and mint the PacStac NFT.
          The contract call is blocked until the balance requirement is met.
        </p>
        <div className="hero-actions">
          <ConnectButton />
          {address && (
            <span className="pill">
              Connected: {address.slice(0, 6)}...{address.slice(-4)}
            </span>
          )}
        </div>
        <div className="status-row" style={{ marginTop: 12, flexWrap: "wrap" }}>
          <span className="pill">Network toggle</span>
          <button
            type="button"
            className="button ghost"
            disabled={isSwitching}
            style={{
              borderColor:
                selectedChain.id === arbitrum.id ? "rgba(122, 161, 255, 0.8)" : undefined,
            }}
            onClick={() => handleSelectChain(arbitrum)}
          >
            Arbitrum (mainnet)
          </button>
          <button
            type="button"
            className="button ghost"
            disabled={isSwitching}
            style={{
              borderColor:
                selectedChain.id === arbitrumSepolia.id
                  ? "rgba(122, 161, 255, 0.8)"
                  : undefined,
            }}
            onClick={() => handleSelectChain(arbitrumSepolia)}
          >
            Arbitrum Sepolia (testnet)
          </button>
        </div>
        {isWrongNetwork && (
          <div className="status-row" style={{ marginTop: 12 }}>
            <span className="pill warn">Network</span>
            <span className="muted">
              Switch to {selectedChain.name} before minting.
            </span>
          </div>
        )}
      </div>

      <div className="panel-grid">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>1) Verify STAC balance</h3>
          <div className="stat">
            <div className="stat-label">STAC contract</div>
            <div className="muted">{stacConfig.address}</div>
          </div>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat-label">Required (editable)</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={requiredStacAmount}
                  onChange={(e) => {
                    const val = Number.parseFloat(e.target.value);
                    if (Number.isFinite(val) && val >= 0) {
                      setRequiredStacAmount(val);
                    }
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 4,
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    background: "rgba(255, 255, 255, 0.05)",
                    color: "inherit",
                    fontSize: 14,
                    width: 120,
                  }}
                />
                <span className="muted">STAC</span>
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Your balance</div>
              <div className="muted">
                {isBalanceLoading || isBalanceFetching ? "Loading..." : formattedBalance}
              </div>
            </div>
          </div>

          <div className="banner" style={{ marginTop: 12 }}>
            <span className={`pill ${hasEnoughStac ? "success" : "warn"}`}>
              {hasEnoughStac ? "Ready" : "Needs STAC"}
            </span>
            <span className="muted">
              {hasEnoughStac
                ? "Balance meets the gate. You can submit the mint."
                : "Hold the minimum STAC before minting."}
            </span>
          </div>

          {balanceError && (
            <div className="status-row">
              <span className="pill error">Balance check</span>
              <span className="muted">
                {balanceError.message?.includes("429") ||
                 balanceError.message?.toLowerCase().includes("rate limit") ||
                 balanceError.message?.toLowerCase().includes("too many requests")
                  ? "Rate Limited - Try Later"
                  : balanceError.message}
              </span>
            </div>
          )}

          {!isLoadingContractConfig && (contractStacToken || contractRequiredBalance || contractOwner) && (
            <div style={{ marginTop: 12, padding: 12, border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Contract Configuration (On-Chain)</div>
              {contractStacToken && (
                <div className="stat" style={{ marginBottom: 6 }}>
                  <div className="stat-label">Contract expects STAC at</div>
                  <div className="muted" style={{ fontSize: 11 }}>{contractStacToken}</div>
                </div>
              )}
              {contractRequiredBalance && (
                <div className="stat" style={{ marginBottom: 6 }}>
                  <div className="stat-label">Contract requires</div>
                  <div className="muted">{formattedContractRequired} STAC</div>
                </div>
              )}
              {contractOwner && (
                <div className="stat">
                  <div className="stat-label">Contract owner</div>
                  <div className="muted" style={{ fontSize: 11 }}>{contractOwner}</div>
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              className="button"
              onClick={handleMint}
              disabled={isMintDisabled}
              style={{ flex: 1, minWidth: 200 }}
            >
              {mintButtonLabel}
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={handleSimulate}
              disabled={!isConnected || !nftContractAddress}
              style={{ minWidth: 150 }}
            >
              Test Transaction
            </button>
          </div>

          {simulationResult && (
            <div className="status-row">
              <span className={`pill ${simulationResult.startsWith('✓') ? 'success' : 'warn'}`}>
                Simulation
              </span>
              <span className="muted">{simulationResult}</span>
            </div>
          )}

          {statusMessage && (
            <div className="status-row">
              <span className="pill success">Status</span>
              <span className="muted">{statusMessage}</span>
            </div>
          )}

          {error && (
            <div className="status-row">
              <span className="pill error">Error</span>
              <span className="muted">{error}</span>
            </div>
          )}

          {txHash && (
            <div className="status-row">
              <span className="pill">Tx hash</span>
              <Link
                className="nav-link"
                href={`${explorerBase}/tx/${txHash}`}
                target="_blank"
              >
                View on explorer
              </Link>
            </div>
          )}

          {receipt && (
            <div className="status-row">
              <span className="pill success">Receipt</span>
              <span className="muted">Block {receipt.blockNumber?.toString() ?? "?"}</span>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>2) Preview the NFT</h3>
          <img
            src={nftMetadata.imageUrl}
            alt="PacStac NFT"
            className="nft-visual"
            onError={(event) => {
              const target = event.currentTarget;
              target.onerror = null;
              target.src = "/assets/pacstac-testnet-nft.png";
            }}
          />
          <div className="stacked" style={{ marginTop: 12 }}>
            <div className="stat">
              <div className="stat-label">Name</div>
              <div className="muted">{nftMetadata.name}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Description</div>
              <div className="muted">{nftMetadata.description}</div>
            </div>
            <div className="stat">
              <div className="stat-label">Metadata URI</div>
              <div className="muted">
                <code>ipfs://{nftMetadata.metadataCid}</code>
              </div>
            </div>
            <div className="stat">
              <div className="stat-label">Contract target</div>
              <div className="muted">
                {nftContractAddress ?? "Set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
