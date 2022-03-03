// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../NFTAuction.sol";

contract MockNFTAuction is NFTAuction {
    uint256 public time;

    constructor(address _marketplace, address _tokenRegistry, address payable _platformFeeRecipient, uint _platformFee) NFTAuction(_marketplace, _tokenRegistry, _platformFeeRecipient, _platformFee){}

    function setTime(uint256 t) public {
        time = t;
    }

    function increaseTime(uint256 t) public {
        time += t;
    }

    function _getNow() internal view override returns (uint256) {
        return time;
    }
}
