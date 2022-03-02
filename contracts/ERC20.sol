// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract USDC is ERC20{
    constructor() ERC20('USDC Token', 'USDC') {
        _mint(msg.sender, 2_500_000_000 * 10 ** 18);
    }
}
