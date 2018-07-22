pragma solidity ^0.4.24;

import "../math/SafeMath.sol";

contract Adsentior {
  using SafeMath for uint256;

  // ID sequence
  uint256 _idSequence = 0;

  // Subscription
  struct Subscription {
    uint256 id;
    address user;
    Provider provider;
    uint256 extSubscriptionId;
    uint256 amount;
    uint256 nextPaymentDate;
    uint256 period;
    address token;
  }

  // Provider
  struct Provider {
    address addr;
    address processor;
    uint256 lastExecutionDate;
    // Overdue payments. We can't use Subscription[] because it's not supported yet.
    uint256[] overduePayments;
    // External subscription id -> subscription struct.
    mapping (uint256 => Subscription) extIdToSubscription;
    // Buckets
    // date (day) -> due subscriptions
    mapping (uint256 => Subscription[]) duePayments;
  }

  // User address to subscription ids.
  mapping (address => uint256[]) userAddrToSubIds;
  // internal subscription id -> subscription struct
  mapping (uint256 => Subscription) intSubIdToSub;
  // provider address -> provider struct
  mapping (address => Provider) providers;

  /**
   * @dev Registers a provider.
   * @param _providerAddress Provider's address.
   * TODO(luka): Should we restrict this to msg.sender == _providerAddress?
   **/
  function register(address _providerAddress) external {
    // Create provider struct if provider doesn't exist yet
    require(providers[_providerAddress].addr == address(0));
    Provider memory newProvider = Provider(_providerAddress, 0, 0, new uint256[](0));
		providers[_providerAddress] = newProvider;
  }

  function isRegistered(address _providerAddress) external view returns (bool) {
    if (providers[_providerAddress].addr != address(0)) {
      return true;
    }
    else {
      return false;
    }
  }
}
