const Adsentior = artifacts.require('Adsentior');
const assertRevert = require('../helpers/assertRevert');

contract('subscription/Adsentior', (accounts) => {
  let adsentior;
  const owner = accounts[0];
  const provider = accounts[1];
  const user = accounts[2];

  beforeEach(async () => {
    adsentior = await Adsentior.new();
  });

  it('should register a provider', async () => {
    await adsentior.register(provider);
    const isRegistred = await adsentior.isRegistered(provider);
    assert.strictEqual(isRegistred, true);
  });

  it('should return false if provider is not registered', async () => {
    const isRegistred = await adsentior.isRegistered(provider);
    assert.strictEqual(isRegistred, false);
  });
});
