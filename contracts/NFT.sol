//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/draft-EIP712.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract NFT is ERC1155, Ownable, ReentrancyGuard, EIP712, AccessControl {
    
    using SafeERC20 for IERC20;
    using SafeMath for uint256;
    using Strings for uint256;
    using ECDSA for bytes32;

    uint public platformFees = 500;
    uint public auctionMarketPlaceIndex = 1000000000000000000;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    bool public paused = true;

    address public marketPlace;
    address public auction;

    mapping (address => bool) public acceptedTokens;
    mapping(uint256 => string) private _tokenURIs;
    mapping(uint256 => bool) public isNonceUsed;

    // string private _baseURIextended;

    /// @notice Represents an un-minted NFT, which has not yet been recorded into the blockchain. A signed voucher can be redeemed for a real NFT using the redeem function.
    struct NFTVoucher {
        /// @notice The id of the token to be redeemed. Must be unique - if another token with this ID already exists, the redeem function will revert.
        uint256 tokenId;

        /// @notice The amount of tokens to be minted.
        uint256 quantity;

        /// @notice The minimum price (in wei) that the NFT creator is willing to accept for the initial sale of this NFT.
        uint256 minPrice;

        /// @notice The metadata URI to associate with this token.
        string uri;

        /// @notice The original creator of this token.
        address creator;

        /// @notice address of accepted token
        address token;

        /// @notice unique nonce
        uint256 nonce;

        /// @notice the EIP-712 signature of all other fields in the NFTVoucher struct. For a voucher to be valid, it must be signed by an account with the MINTER_ROLE.
        bytes signature;
    }

    constructor(string memory dapp, string memory version) ERC1155("") EIP712(dapp, version) ReentrancyGuard() {
        _setupRole(MINTER_ROLE, msg.sender);
    }

    /// @notice Redeems an NFTVoucher for an actual NFT, creating it in the process.
    /// @param voucher An NFTVoucher that describes the NFT to be redeemed.
    function redeem(NFTVoucher calldata voucher) public payable {
        require(!paused, "NFT: contract is paused");
        require(!isNonceUsed[voucher.nonce], "NFT: nonce is used");
        address signer = _verify(voucher);
        require(hasRole(MINTER_ROLE, signer), "Signature invalid or unauthorized");
        uint platformFeeAmount = (platformFees * voucher.minPrice * voucher.quantity) / 10000;
        
        if (voucher.token == address(0)) {
            require(msg.value >= voucher.minPrice * voucher.quantity, "Insufficient funds to redeem");
            uint creatorFee = msg.value - platformFeeAmount;
            payable(voucher.creator).transfer(creatorFee);
            payable(signer).transfer(platformFeeAmount);
        } else {
            require(acceptedTokens[voucher.token], "Token not accepted");
            uint creatorFee = (voucher.minPrice * voucher.quantity) - platformFeeAmount;
            IERC20(voucher.token).safeTransferFrom(msg.sender, voucher.creator, creatorFee);
            IERC20(voucher.token).safeTransferFrom(msg.sender, signer, platformFeeAmount);
        }
        isNonceUsed[voucher.nonce] = true;
        _mint(voucher.creator, voucher.tokenId, voucher.quantity, "");
        _setTokenURI(voucher.tokenId, voucher.uri);
        _safeTransferFrom(voucher.creator, msg.sender, voucher.tokenId, voucher.quantity, "");
    }

    function _setTokenURI(uint tokenId, string calldata _tokenURI) internal {
        _tokenURIs[tokenId] = _tokenURI;
    }

    ///@notice fetches the URI associated with a token
    ///@param tokenId the id of the token
    function uri(uint256 tokenId) override public view returns (string memory) {
        return _tokenURIs[tokenId];
    }

    /// @notice Sets the accepted token addresses.
    /// @param _tokens is an array of token addresses.
    /// @param value is the flag to be set
    function setTokens(address[] calldata _tokens, bool value) external onlyOwner {
        for (uint256 i = 0; i < _tokens.length; i++) {
            acceptedTokens[_tokens[i]] = value;
        }
    }

    ///@notice Sets platform fees
    ///@param _platformFees is the platform fees
    function setPlatformFees(uint _platformFees) external onlyOwner {
        platformFees = _platformFees;
    }

    ///@notice toggles paused state
    function togglePauseState() external onlyOwner {
        paused = !paused;
    }

    ///@notice Withdraws platform fees
    function withdraw() external onlyOwner {
        uint balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function airdrop(address _to, uint256 _tokenId, uint256 _quantity, string calldata _uri) external {
        require(msg.sender == owner() || msg.sender == marketPlace || msg.sender == auction, "Only owner or marketPlace or auction can airdrop");
        _mint(_to, _tokenId, _quantity, "");
        _setTokenURI(_tokenId, _uri);
    }

    function updateAddresses(address _marketPlace, address _auction) external onlyOwner {
        marketPlace = _marketPlace;
        auction = _auction;
    }

    function _hash(NFTVoucher calldata voucher) internal view returns (bytes32) {
        return _hashTypedDataV4(keccak256(abi.encode(
            keccak256("NFTVoucher(uint256 tokenId,uint256 quantity,uint256 minPrice,string uri,address creator,address token,uint256 nonce)"),
            voucher.tokenId,
            voucher.quantity,
            voucher.minPrice,
            keccak256(bytes(voucher.uri)),
            voucher.creator,
            voucher.token,
            voucher.nonce
        )));
    }

    function _verify(NFTVoucher calldata voucher) internal view returns (address) {
        bytes32 digest = _hash(voucher);
        return ECDSA.recover(digest, voucher.signature);
    }

    function getChainID() external view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override (AccessControl, ERC1155) returns (bool) {
        return ERC1155.supportsInterface(interfaceId) || AccessControl.supportsInterface(interfaceId);
    }

}