pragma solidity ^0.4.24;

import "@0xcert/ethereum-erc20/contracts/tokens/Token.sol";

contract TokenMock is Token {

  constructor() public {
    tokenName = "Mock Token";
    tokenSymbol = "MCK";
    tokenDecimals = 18;
    tokenTotalSupply = 100000000000000000000000000;

    balances[msg.sender] = tokenTotalSupply;
    emit Transfer(address(0x0), msg.sender, tokenTotalSupply);
  }
}
