// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721URIStorage, ERC721} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PacStac NFT Vendor
/// @notice Gated minting: caller must hold the configured amount of STAC tokens to mint.
///         Supports EIP-2981 royalty standard.
///         Supports the mint signatures used by the front-end:
///         - mint() -> mints to caller
///         - mint(address) -> mints to recipient
///         - safeMint(address) -> mints to recipient
///         - safeMint(address,string) -> mints to recipient with provided token URI
///         All variants enforce the STAC balance check against msg.sender.
contract PacStacNftVendor is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    IERC20 public stacToken;
    uint256 public requiredBalance;
    string private _defaultTokenUri;
    uint256 private _nextTokenId = 1;
    uint256 private _totalMinted;

    event Minted(address indexed minter, address indexed to, uint256 indexed tokenId, string tokenUri);
    event RequiredBalanceUpdated(uint256 newRequiredBalance);
    event StacTokenUpdated(address token);
    event DefaultTokenUriUpdated(string newTokenUri);

    /// @param stacToken_ Address of the STAC ERC20 token
    /// @param requiredBalance_ Minimum STAC balance required to mint
    /// @param defaultTokenUri_ Default metadata URI for minted tokens
    /// @param initialOwner Contract owner address
    /// @param royaltyReceiver Address to receive royalty payments
    /// @param royaltyBps Royalty percentage in basis points (e.g., 500 = 5%)
    constructor(
        address stacToken_,
        uint256 requiredBalance_,
        string memory defaultTokenUri_,
        address initialOwner,
        address royaltyReceiver,
        uint96 royaltyBps
    ) ERC721("PacStac NFT", "PSTAC-NFT") Ownable(initialOwner) {
        require(stacToken_ != address(0), "STAC token required");
        require(initialOwner != address(0), "Owner required");
        require(royaltyReceiver != address(0), "Royalty receiver required");
        require(royaltyBps <= 1000, "Royalty cannot exceed 10%");

        stacToken = IERC20(stacToken_);
        requiredBalance = requiredBalance_;
        _defaultTokenUri = defaultTokenUri_;
        _setDefaultRoyalty(royaltyReceiver, royaltyBps);
    }

    /* -------------------------------------------------------------------------- */
    /*                                   MINTING                                  */
    /* -------------------------------------------------------------------------- */

    function mint() external nonReentrant returns (uint256) {
        return _safeMintInternal(msg.sender, _defaultTokenUri);
    }

    function mint(address to) external nonReentrant returns (uint256) {
        return _safeMintInternal(to, _defaultTokenUri);
    }

    function safeMint(address to) external nonReentrant returns (uint256) {
        return _safeMintInternal(to, _defaultTokenUri);
    }

    function safeMint(address to, string memory tokenUri) external nonReentrant returns (uint256) {
        return _safeMintInternal(to, tokenUri);
    }

    function _safeMintInternal(address to, string memory tokenUri) internal returns (uint256 tokenId) {
        _requireStac(msg.sender);

        tokenId = _nextTokenId++;
        _totalMinted += 1;

        _safeMint(to, tokenId);
        string memory resolvedUri = bytes(tokenUri).length == 0 ? _defaultTokenUri : tokenUri;
        require(bytes(resolvedUri).length > 0, "Token URI required");
        _setTokenURI(tokenId, resolvedUri);

        emit Minted(msg.sender, to, tokenId, resolvedUri);
    }

    /* -------------------------------------------------------------------------- */
    /*                                    ADMIN                                   */
    /* -------------------------------------------------------------------------- */

    function setRequiredBalance(uint256 newRequiredBalance) external onlyOwner {
        requiredBalance = newRequiredBalance;
        emit RequiredBalanceUpdated(newRequiredBalance);
    }

    function setStacToken(address newStacToken) external onlyOwner {
        require(newStacToken != address(0), "Token address required");
        stacToken = IERC20(newStacToken);
        emit StacTokenUpdated(newStacToken);
    }

    function setDefaultTokenUri(string calldata newTokenUri) external onlyOwner {
        _defaultTokenUri = newTokenUri;
        emit DefaultTokenUriUpdated(newTokenUri);
    }

    /// @notice Set default royalty for all tokens
    /// @param receiver Address to receive royalties
    /// @param feeNumerator Royalty in basis points (e.g., 500 = 5%)
    function setDefaultRoyalty(address receiver, uint96 feeNumerator) external onlyOwner {
        require(receiver != address(0), "Royalty receiver required");
        require(feeNumerator <= 1000, "Royalty cannot exceed 10%");
        _setDefaultRoyalty(receiver, feeNumerator);
    }

    /// @notice Set royalty for a specific token (overrides default)
    /// @param tokenId Token to set royalty for
    /// @param receiver Address to receive royalties
    /// @param feeNumerator Royalty in basis points
    function setTokenRoyalty(uint256 tokenId, address receiver, uint96 feeNumerator) external onlyOwner {
        require(receiver != address(0), "Royalty receiver required");
        require(feeNumerator <= 1000, "Royalty cannot exceed 10%");
        _setTokenRoyalty(tokenId, receiver, feeNumerator);
    }

    /// @notice Remove default royalty
    function deleteDefaultRoyalty() external onlyOwner {
        _deleteDefaultRoyalty();
    }

    /// @notice Remove royalty for a specific token
    function resetTokenRoyalty(uint256 tokenId) external onlyOwner {
        _resetTokenRoyalty(tokenId);
    }

    function withdraw(address payable to) external onlyOwner {
        require(to != address(0), "Recipient required");
        (bool ok, ) = to.call{value: address(this).balance}("");
        require(ok, "Withdraw failed");
    }

    /* -------------------------------------------------------------------------- */
    /*                                    VIEWS                                   */
    /* -------------------------------------------------------------------------- */

    function totalSupply() external view returns (uint256) {
        return _totalMinted;
    }

    function defaultTokenUri() external view returns (string memory) {
        return _defaultTokenUri;
    }

    /* -------------------------------------------------------------------------- */
    /*                                  OVERRIDES                                 */
    /* -------------------------------------------------------------------------- */

    /// @dev Required override for ERC721URIStorage + ERC2981
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _requireStac(address account) internal view {
        require(stacToken.balanceOf(account) >= requiredBalance, "Insufficient STAC balance");
    }
}
