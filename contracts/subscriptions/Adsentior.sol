pragma solidity ^0.4.24;

import "../math/SafeMath.sol";
import "../datetime/DateTime.sol";
import "@0xcert/ethereum-erc20/contracts/tokens/ERC20.sol";

contract Adsentior is DateTime {
  using SafeMath for uint256;

  enum SubscriptionState {Active, Cancelled}
  enum TimeUnit {Month, Day, Hour}

  // Subscription
  struct Subscription {
    uint256 id;
    address user;
    Provider provider;
    uint256 extSubscriptionId;
    uint256 amount;
    uint256 nextPaymentDate;
    TimeUnit timeUnit;
    uint256 period;
    address asset;
    SubscriptionState state;
  }

  // Provider
  struct Provider {
    address addr;
    address processor;
    uint256 lastExecutionDate;
    // Overdue payments. We can't use Subscription[] because it's not supported yet.
    uint256[] overduePayments;
    // External subscription id -> subscription struct.
    //mapping (uint256 => Subscription) subIdToSubscription;
    // Buckets
    // date (day) -> due subscriptions
    mapping (uint256 => Subscription[]) duePayments;
  }

  // User address to subscription ids.
  mapping (address => uint256[]) userToSubIds;
  // internal subscription id -> subscription struct
  mapping (uint256 => Subscription) subIdToSub;
  // provider address -> provider struct
  mapping (address => Provider) providers;

  /**
   * @dev This emits when subscription is created.
   **/
  event SubscriptionCreate(address indexed _user,
                           address indexed _provider,
                           uint256 indexed _subscriptionId);

  /**
   * @dev This emits when subscription is cancelled. _from address belongs to
   * user or provider.
   **/
  event SubscriptionCancellation(address indexed _from,
                                 address indexed _provider,
                                 uint256 indexed _subscriptionId);

  /**
   * @dev This emits when recurring payment is executed. _from address belongs
   * to provider (or processor).
   **/
  event SubscriptionPayment(address indexed _from,
                            address indexed _provider,
                            uint256 indexed _subscriptionId);

  /**
   * @dev Return user subscription IDs if there are any.
   * @param _user User's address.
   * @return Array of subscription IDs.
   **/
  function getSubscriptionIds(address _user) external view returns (uint256[]){
    return userToSubIds[_user];
  }

   /**
   * @dev Get subscription's details.
   * @param _subscriptionId Subscription's ID.
   * @return Subscription plan as tuple of:
   *  _user User's address
   *  _subscriptionId subscriptionId
   *  _amount Amount to be paid in the next billing period. Amount returned can
   *          be constant or it can vary over time (per usage based subscriptions,
   *          subscriptions supporting trial and discounted periods).
   *  _nextPaymentDate Next payment date as defined in a subscription plan.
   *                   If there's no next payment date this is set to 0.
   *                   This could be the case in a limited subscription (predefined
   *                   number of recurring payment periods).
   *  _timeUnit Predefined constant representing an hour, day, month or a year.
   *  _period Number of _timeUnits between recurring payments.
   *  _asset Payment asset address.
   **/
  function getSubscription(uint256 _subscriptionId)
    external view
    returns(address,
            address,
            uint256,
            uint256,
            uint256,
            TimeUnit,
            uint256,
            address,
            SubscriptionState)
    //returns(address _provider,
    //        address _user,
    //        uint256 _id,
    //        uint256 _amount,
    //        uint256 _nextPaymentDate,
    //        uint8 _timeUnit,
    //        uint256 _period,
    //        address _asset,
    //        SubscriptionState _state)
    {
      Subscription storage _s = subIdToSub[_subscriptionId];
      return (_s.provider.addr,
              _s.user,
              _s.id,
              _s.amount,
              _s.nextPaymentDate,
              _s.timeUnit,
              _s.period,
              _s.asset,
              _s.state);
    }


  /**
   * @dev Cancel active subscription. This can be done by user or provider.
   * @param _subscriptionId Subscription's ID.
   **/
  function cancelSubscription(uint256 _subscriptionId) external {
    Subscription storage _subscription = subIdToSub[_subscriptionId];

    require(msg.sender == _subscription.provider.addr ||
            msg.sender == _subscription.user);
    require(_subscription.state == SubscriptionState.Active);

    _subscription.state = SubscriptionState.Cancelled;

    //TODO: check if there are no due payments!
    //TODO: remove subscription from payment datastructures!
  }

  function executePayments(uint256[] _subscriptionIds) external {
    for(uint i = 0; i < _subscriptionIds.length; i++) {
      executePayment(_subscriptionIds[i]);
    }
  }

  /**
   * @notice Called by provider.
   * @dev Execute overdue payment.
   * @param _subscriptionId Subscription ID.
   **/
  function executePayment(uint256 _subscriptionId) public {
    Subscription storage _subscription = subIdToSub[_subscriptionId];
    require(msg.sender == _subscription.provider.addr);
    require(_subscription.state == SubscriptionState.Active);
    require(_subscription.nextPaymentDate < now);

    ERC20(_subscription.asset).transferFrom(_subscription.user, _subscription.provider.addr,
                                            _subscription.amount);

    uint256 _previousPaymentDate = _subscription.nextPaymentDate;

    if (_subscription.timeUnit == TimeUnit.Hour) {
      _subscription.nextPaymentDate = _previousPaymentDate.add(_subscription.period.mul(HOUR_IN_SECONDS));
    }

    else if (_subscription.timeUnit == TimeUnit.Day) {
      _subscription.nextPaymentDate = _previousPaymentDate.add(_subscription.period.mul(DAY_IN_SECONDS));
    }

    else if (_subscription.timeUnit == TimeUnit.Month) {
      _DateTime memory _nextPaymentDate = parseTimestamp(_previousPaymentDate);
      uint8 _months = _nextPaymentDate.month + uint8(_subscription.period);

      if (_months > 12) {
        _nextPaymentDate.year = _nextPaymentDate.year + (_months / 12);
        _nextPaymentDate.month = _months % 12;
      }

      else {
        _nextPaymentDate.month = _months;
      }

      _subscription.nextPaymentDate = toTimestamp(_nextPaymentDate.year, _nextPaymentDate.month,
                                                  _nextPaymentDate.day, _nextPaymentDate.hour,
                                                  _nextPaymentDate.minute, _nextPaymentDate.second);
    }

    else {
      revert();
    }

  }

  /**
   * @dev Initiate a subscription. This is call is invoked by users who
   *      wants to subscribe.
   * @param _provider Provider's address.
   * @param _extSubscriptionId Subscription ID specified by the provider.
   * @param _amount Amount to be paid each period.
   * @param _nextPaymentDate Date when next payment is due.
   * @param _timeUnit Predefined unit of time: 5 - hour, 4 - day, 3 - week,
   *                  2 - month, 1 - year.
   * @param _period Period between payments.
   * @param _asset Asset address used for payment (e.g. ERC20 token address).
   **/
  function subscribe(address _provider,
                     uint256 _extSubscriptionId,
                     uint256 _amount,
                     uint256 _nextPaymentDate,
                     TimeUnit _timeUnit,
                     uint256 _period,
                     address _asset
                     ) external
  {
    // Before user can subscribe they have to set token allowance for this contract.
    require(ERC20(_asset).allowance(msg.sender, address(this)) > 0);
    require(providers[_provider].addr != address(0));
    require(subIdToSub[_getSubsriptionId(_provider, _extSubscriptionId)].id == 0);

    Subscription memory newSub = Subscription(_getSubsriptionId(_provider, _extSubscriptionId),
                                              msg.sender,
                                              providers[_provider],
                                              _extSubscriptionId,
                                              _amount,
                                              _nextPaymentDate,
                                              _timeUnit,
                                              _period,
                                              _asset,
                                              SubscriptionState.Active);

    userToSubIds[msg.sender].push(newSub.id);
    subIdToSub[newSub.id] = newSub;
    emit SubscriptionCreate(msg.sender, _provider, newSub.id);
    //providers[_provider].subIdToSubscription[_extSubscriptionId] = newSub;

    //TODO(luka): add subscription to provider.duePayments mapping!
  }


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

  function _getSubsriptionId(address _provider, uint256 _extSubscriptionId)
    internal
    pure
    returns (uint256)
  {
    return uint256(keccak256(abi.encodePacked(_provider, _extSubscriptionId)));
  }
}
