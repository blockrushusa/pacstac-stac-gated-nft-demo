# PacStac NFT Vendor

Arbitrum-focused NFT minting UI gated by PacStac (STAC) token ownership. Built with Next.js App Router, RainbowKit, wagmi, and viem; based on the PacStac verification demo.

## Setup
```bash
npm install
npm run dev
# visit http://localhost:3000 (mint page at /mint)
```

## Configuration
Create a `.env.local` to override defaults:
```ini
NEXT_PUBLIC_RAINBOWKIT_PROJECT_ID=<walletconnect_id_or_demo>
NEXT_PUBLIC_ARBITRUM_RPC_URL=<arbitrum_mainnet_rpc_optional>
NEXT_PUBLIC_ARBITRUM_SEPOLIA_RPC_URL=<arbitrum_sepolia_rpc_optional>
NEXT_PUBLIC_TARGET_CHAIN_ID=42161                 # set to 421614 to target Arbitrum Sepolia

NEXT_PUBLIC_STAC_CONTRACT_ADDRESS=0xcC8fdca1077CFD74BFD674B3763BB9eA5DDFaDEf
NEXT_PUBLIC_PACSTAC_REQUIRED_AMOUNT=1
NEXT_PUBLIC_STAC_TOKEN_DECIMALS=18

NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=0x342Dec68Bcc4494B6f2E3B06d8233aaF74e9D04C
NEXT_PUBLIC_NFT_MINT_MODE=safeMintWithUri         # mint | mintTo | safeMint | safeMintWithUri
NEXT_PUBLIC_NFT_TOKEN_URI=ipfs://bafkreidoqepqabavue6vlz5a4zg5xrduybdqmirztlcaz7wmxo5muiy4jq
```

Notes:
- Default STAC contract is the public Arbitrum Sepolia deployment from the verification demo. Override for production. The default NFT contract address is `0x342Dec68Bcc4494B6f2E3B06d8233aaF74e9D04C`; set `NEXT_PUBLIC_TARGET_CHAIN_ID` to the chain you deploy it on (42161 for Arbitrum One, 421614 for Arbitrum Sepolia). The mint UI also includes an in-app toggle between Arbitrum One and Arbitrum Sepolia; wallets still need to switch networks accordingly.
- The included NFT metadata lives at `ipfs://bafkreidoqepqabavue6vlz5a4zg5xrduybdqmirztlcaz7wmxo5muiy4jq` with image CID `bafybeiev4ylvbwajc3fdse7idohcrk2xmuniri5yebeirxtuvjkpdwaxh4`. A local copy is in `public/assets/pacstac-testnet-nft.png` for preview fallback.
- `NEXT_PUBLIC_NFT_MINT_MODE` controls the contract call signature:
  - `mint` → `mint()`
  - `mintTo` → `mint(address)`
  - `safeMint` → `safeMint(address)` (default)
  - `safeMintWithUri` → `safeMint(address,string)` using `NEXT_PUBLIC_NFT_TOKEN_URI`
- Set `NEXT_PUBLIC_TARGET_CHAIN_ID` to the chain your NFT contract lives on (defaults to Arbitrum Sepolia).

## What the UI does
- Connect with RainbowKit, verify the user is on the target Arbitrum network, and read STAC balance on each wallet change.
- Disable the mint button until the STAC threshold is met and the network/contract configuration is valid.
- Submit the configured mint call, surface transaction hash + explorer link, and update once the receipt is confirmed.
