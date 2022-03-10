//SPDX-License-Identifier: Unlicense

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "../NFT.sol";

contract NFTERC1155Test is NFT {
    constructor() NFT("dapp", "version"){}
    function mint(address receiver, uint tokenID, uint quantity) external {
        _mint(receiver, tokenID, quantity, "");
    }
}