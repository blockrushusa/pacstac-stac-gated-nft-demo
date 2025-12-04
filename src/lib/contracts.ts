import { parseAbi } from "viem";

export const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
]);

export const NFT_ABI = parseAbi([
  "function mint() public returns (uint256)",
  "function mint(address to) public returns (uint256)",
  "function safeMint(address to) public returns (uint256)",
  "function safeMint(address to, string uri) public returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function requiredBalance() view returns (uint256)",
  "function stacToken() view returns (address)",
  "function owner() view returns (address)",
]);
