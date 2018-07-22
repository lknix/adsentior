const Adsentior = artifacts.require('Adsentior');
const erc20Token = artifacts.require('TokenMock');
const assertRevert = require('../helpers/assertRevert');

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
      const period = "2592000"  // 30 days

      await adsentior.register(provider);

      await token.approve(adsentior.address, allowance, {from: user});
      await adsentior.subscribe(provider, "12345", allowance, nextPaymentDate, "2592000",
        token.address, {from: user});

      const actualSubIds = await adsentior.getSubscriptionIds({from: user});
      assert.strictEqual(actualSubIds.length, 1);
      assert.strictEqual(actualSubIds[0].toString(), "1");
    });
  });
});
