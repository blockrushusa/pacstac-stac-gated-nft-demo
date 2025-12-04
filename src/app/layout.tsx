import type { Metadata } from "next";
import Link from "next/link";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "PacStac NFT Vendor",
  description:
    "Gated Arbitrum NFT minting experience for PacStac holders. Connect, verify STAC balance, and mint the PacStac NFT.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <div className="app-shell">
            <header className="app-bar">
              <div className="logo">PACSTAC · STAC GATED NFT VENDOR</div>
              <nav className="nav-links">
                <Link className="nav-link" href="/mint">
                  Mint NFT
                </Link>
                <Link className="nav-link" href="/gallery">
                  Gallery
                </Link>
              </nav>
            </header>
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
