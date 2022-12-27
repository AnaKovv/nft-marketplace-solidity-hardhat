// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NftMarketplace__NoEarnedAmount();

contract NftMarketplace is ReentrancyGuard {
    /// @notice Structure for listed items
    struct Listing {
        uint256 price;
        address seller;
    }

    /// @notice Events for the contract
    event ListedNft(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event BoughtNft(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    event UnlistedNft(address indexed seller, address indexed nftAddress, uint256 indexed tokenId);

    // NFT contract address -> NFT tokenId -> Listing
    mapping(address => mapping(uint256 => Listing)) private listings;
    // Seller address -> Amout earned
    mapping(address => uint256) private earnedAmount;

    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        Listing memory listedNft = listings[nftAddress][tokenId];
        if (listedNft.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftAddress);
        address owner = nft.ownerOf(tokenId);
        if (spender != owner) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listedNft = listings[nftAddress][tokenId];
        if (listedNft.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    /** Method for listing NFT,
     * @param nftAddress is address of Nft contract
     * @param tokenId is Token ID of NFT
     * @param price is sale price
     */
    function listNft(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        notListed(nftAddress, tokenId, msg.sender)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        require(price > 0, "Price need to be above 0");

        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }
        listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ListedNft(msg.sender, nftAddress, tokenId, price);
    }

    /**
     * Method for buying listed NFTs
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     */
    function buyNft(
        address nftAddress,
        uint256 tokenId
    ) external payable isListed(nftAddress, tokenId) {
        Listing memory listedNft = listings[nftAddress][tokenId];
        if (msg.value < listedNft.price) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedNft.price);
        }
        earnedAmount[listedNft.seller] = earnedAmount[listedNft.seller] + msg.value;
        delete (listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listedNft.seller, msg.sender, tokenId);
        emit BoughtNft(msg.sender, nftAddress, tokenId, listedNft.price);
    }

    /**
     * Method for cancelling listing
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     */
    function cancelListing(
        address nftAddress,
        uint256 tokenId
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        delete (listings[nftAddress][tokenId]);
        emit UnlistedNft(msg.sender, nftAddress, tokenId);
    }

    /**
     * Method for updating listing
     * @param nftAddress Address of NFT contract
     * @param tokenId Token ID of NFT
     * @param newPrice Price of the item
     */
    function updatePrice(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external isListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        listings[nftAddress][tokenId].price = newPrice;
        emit ListedNft(msg.sender, nftAddress, tokenId, newPrice);
    }

    /**
     * Method for withdrawing profit from sales
     */
    function withdrawPayments() external {
        uint256 payment = earnedAmount[msg.sender];
        if (payment <= 0) {
            revert NftMarketplace__NoEarnedAmount();
        }
        earnedAmount[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: payment}("");
        require(success, "Transfer failed");
    }

    function getListing(
        address nftAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return listings[nftAddress][tokenId];
    }

    function getPayments(address seller) external view returns (uint256) {
        return earnedAmount[seller];
    }
}
