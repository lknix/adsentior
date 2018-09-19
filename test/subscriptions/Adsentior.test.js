const Adsentior = artifacts.require('Adsentior');
const erc20Token = artifacts.require('TokenMock');
const assertRevert = require('../helpers/assertRevert');
const utils = require('web3-utils');

const BigNumber = web3.BigNumber;

contract('subscription/Adsentior', (accounts) => {
  let adsentior;
  let token;
  const owner = accounts[0];
  const provider = accounts[1];
  const user = accounts[2];
  const decimalsMul = new BigNumber('1e+18');  // 10 ** 18
  const userTokenAmount = new BigNumber(100000).mul(decimalsMul);  // 100k, 18 decimals

  describe('Provider registration', function() {
    beforeEach(async () => {
      adsentior = await Adsentior.new();
    });

    it('should register a provider', async () => {
      await adsentior.register(provider, {from: provider});
      const isRegistred = await adsentior.isRegistered(provider);
      assert.strictEqual(isRegistred, true);
    });

    it('should revert registration if already registered', async () => {
      await adsentior.register(provider, {from: provider});
      await assertRevert(adsentior.register(provider, {from: provider}));
    });

    it('should return false if provider is not registered', async () => {
      const isRegistred = await adsentior.isRegistered(provider);
      assert.strictEqual(isRegistred, false);
    });
  });

  describe('New subscription', function() {
    beforeEach(async () => {
      adsentior = await Adsentior.new({from: owner});
      token = await erc20Token.new({from: owner});
      await token.transfer(user, userTokenAmount, {from: owner});
    });

    it('should create a new subscription', async () => {
      const allowance = new BigNumber(1000).mul(decimalsMul);
      const nextPaymentDate = "1536008820";  // '2018-09-03 23:07:00 CEST'
      const period = "1";  // 30 days
      const timeUnit = "1";

      await adsentior.register(provider);

      await token.approve(adsentior.address, allowance, {from: user});
      await adsentior.subscribe(provider, "12345", allowance, nextPaymentDate, timeUnit, period,
        token.address, {from: user});

      const actualSubIds = await adsentior.getSubscriptionIds(user, {from: user});
      assert.strictEqual(actualSubIds.length, 1);
      // TODO: calculate sub hash!
      //assert.strictEqual(utils.toHex(actualSubIds[0]),
      //  "0xf077185fdd1fc200027f8e9a2f932d583a02f507fab55079eb770ed9f6e90519");
    });

    it('should revert on a duplicate new subscription', async () => {
      const allowance = new BigNumber(1000).mul(decimalsMul);
      const nextPaymentDate = "1536008820";  // '2018-09-03 23:07:00 CEST'
      const period = "1";  // 30 days
      const timeUnit = "1";

      await adsentior.register(provider);

      await token.approve(adsentior.address, allowance, {from: user});
      await adsentior.subscribe(provider, "12345", allowance, nextPaymentDate, timeUnit, period,
        token.address, {from: user});

      await assertRevert(adsentior.subscribe(provider, "12345", allowance, nextPaymentDate,
        timeUnit, period, token.address, {from: user}));

    });
  });

  describe('Cancel subscription', function() {
    beforeEach(async () => {
      adsentior = await Adsentior.new({from: owner});
      token = await erc20Token.new({from: owner});
      await token.transfer(user, userTokenAmount, {from: owner});
    });

    it('user should cancel a subscription', async () => {
      const allowance = new BigNumber(1000).mul(decimalsMul);
      const nextPaymentDate = "1536008820";  // '2018-09-03 23:07:00 CEST'
      const period = "1";  // 30 days
      const timeUnit = "1";

      await adsentior.register(provider);

      await token.approve(adsentior.address, allowance, {from: user});
      await adsentior.subscribe(provider, "12345", allowance, nextPaymentDate, timeUnit, period,
        token.address, {from: user});

      const actualSubIds = await adsentior.getSubscriptionIds(user, {from: user});

      let actualSub = await adsentior.getSubscription(actualSubIds[0], {from: user});
      assert.strictEqual(actualSub[8].toNumber(), 0);

      await adsentior.cancelSubscription(actualSubIds[0], {from: user});

      actualSub = await adsentior.getSubscription(actualSubIds[0], {from: user});
      assert.strictEqual(actualSub[8].toNumber(), 1);
    });
  });

  describe('Execute subscription', function() {
    beforeEach(async () => {
      adsentior = await Adsentior.new({from: owner});
      token = await erc20Token.new({from: owner});
      await token.transfer(user, userTokenAmount, {from: owner});
    });

    it.only('provider should execute a daily subscription payment', async () => {
      const allowance = new BigNumber(1000).mul(decimalsMul);
      const amount = new BigNumber(100).mul(decimalsMul);
      const nextPaymentDate = "1530802800";  // 'Thu Jul  5 17:00:00 CEST 2018'
      const period = "10";  // 30 days
      const timeUnit = "1";

      await adsentior.register(provider);

      await token.approve(adsentior.address, amount, {from: user});
      await adsentior.subscribe(provider, "12345", amount, nextPaymentDate, timeUnit,
        period, token.address, {from: user});

      const actualSubIds = await adsentior.getSubscriptionIds(user, {from: user});
      const userBalanceBefore = await token.balanceOf(user);

      await adsentior.executePayment(actualSubIds[0], {from: provider});

      const providerBalance = await token.balanceOf(provider);
      assert.strictEqual(providerBalance.toString(), amount.toString());

      const userBalanceAfter = await token.balanceOf(user);
      assert.strictEqual(userBalanceBefore.toString(), userBalanceAfter.add(amount).toString());

      actualSub = await adsentior.getSubscription(actualSubIds[0], {from: user});
      assert.strictEqual(actualSub[4].toString(), (new BigNumber(nextPaymentDate)).add(10 * 24 * 3600).toString());
    });

    it.only('provider should execute an hourly subscription payment', async () => {
      const allowance = new BigNumber(1000).mul(decimalsMul);
      const amount = new BigNumber(100).mul(decimalsMul);
      const nextPaymentDate = "1530802800";  // 'Thu Jul  5 17:00:00 CEST 2018'
      const period = "100";  // 30 days
      const timeUnit = "2";

      await adsentior.register(provider);

      await token.approve(adsentior.address, amount, {from: user});
      await adsentior.subscribe(provider, "12345", amount, nextPaymentDate, timeUnit,
        period, token.address, {from: user});

      const actualSubIds = await adsentior.getSubscriptionIds(user, {from: user});
      const userBalanceBefore = await token.balanceOf(user);

      await adsentior.executePayment(actualSubIds[0], {from: provider});

      const providerBalance = await token.balanceOf(provider);
      assert.strictEqual(providerBalance.toString(), amount.toString());

      const userBalanceAfter = await token.balanceOf(user);
      assert.strictEqual(userBalanceBefore.toString(), userBalanceAfter.add(amount).toString());

      actualSub = await adsentior.getSubscription(actualSubIds[0], {from: user});
      assert.strictEqual(actualSub[4].toString(), (new BigNumber(nextPaymentDate)).add(100 * 3600).toString());
    });

    it.only('provider should execute a 10-month subscription payment', async () => {
      const allowance = new BigNumber(1000).mul(decimalsMul);
      const amount = new BigNumber(100).mul(decimalsMul);
      const nextPaymentDate = "1530802800";  // 'Thu Jul  5 17:00:00 CEST 2018'
      const period = "10";
      const timeUnit = "0";
      let tx;

      await adsentior.register(provider);

      await token.approve(adsentior.address, amount, {from: user});
      tx = await adsentior.subscribe(provider, "12345", amount, nextPaymentDate, timeUnit,
        period, token.address, {from: user});
      console.log(`Subscribe Tx: ${tx.receipt.cumulativeGasUsed}`);

      const actualSubIds = await adsentior.getSubscriptionIds(user, {from: user});
      const userBalanceBefore = await token.balanceOf(user);

      tx = await adsentior.executePayment(actualSubIds[0], {from: provider});
      console.log(`Sub Payment Tx: ${tx.receipt.cumulativeGasUsed}`);

      const providerBalance = await token.balanceOf(provider);
      assert.strictEqual(providerBalance.toString(), amount.toString());

      const userBalanceAfter = await token.balanceOf(user);
      assert.strictEqual(userBalanceBefore.toString(), userBalanceAfter.add(amount).toString());

      actualSub = await adsentior.getSubscription(actualSubIds[0], {from: user});
      assert.strictEqual(actualSub[4].toString(), "1557068400");
    });

    it.only('provider should execute a monthly subscription payment', async () => {
      const allowance = new BigNumber(1000).mul(decimalsMul);
      const amount = new BigNumber(100).mul(decimalsMul);
      const nextPaymentDate = "1530802800";  // 'Thu Jul  5 17:00:00 CEST 2018'
      const period = "1";
      const timeUnit = "0";

      await adsentior.register(provider);

      await token.approve(adsentior.address, amount, {from: user});
      await adsentior.subscribe(provider, "12345", amount, nextPaymentDate, timeUnit,
        period, token.address, {from: user});

      const actualSubIds = await adsentior.getSubscriptionIds(user, {from: user});
      const userBalanceBefore = await token.balanceOf(user);

      await adsentior.executePayment(actualSubIds[0], {from: provider});

      const providerBalance = await token.balanceOf(provider);
      assert.strictEqual(providerBalance.toString(), amount.toString());

      const userBalanceAfter = await token.balanceOf(user);
      assert.strictEqual(userBalanceBefore.toString(), userBalanceAfter.add(amount).toString());

      actualSub = await adsentior.getSubscription(actualSubIds[0], {from: user});
      assert.strictEqual(actualSub[4].toString(), "1533481200");
    });
  });
});
