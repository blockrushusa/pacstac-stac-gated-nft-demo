import Link from "next/link";
import { nftMetadata, getTargetChain } from "@/lib/config";

const chain = getTargetChain();

export default function HomePage() {
  return (
    <main className="content">
      <div className="card">
        <span className="pill">PacStac · Arbitrum</span>
        <h1 className="headline">STAC Gated NFT Vendor</h1>
        <div className="hero-actions">
          <Link href="/mint" className="cta">
            Launch mint flow
          </Link>
          <Link href="/gallery" className="nav-link">
            View your NFTs
          </Link>
        </div>
      </div>
    </main>
  );
}
