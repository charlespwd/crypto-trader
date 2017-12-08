import { expect } from 'chai';
import * as sinon from 'sinon';
import { DiversificationStrategy, DiversificationSpec } from './diversify';
import { mock } from '@coincurry/api';

const {
  MockApi,
  ticker,
  tickers,
  ONE_LTC,
  ONE_BTC,
} = mock;

const sandbox = sinon.sandbox.create({});

describe('Module: diversify', () => {
  let strategy: DiversificationStrategy;
  let api: Api;
  let diversificationSpecs: DiversificationSpec[];

  beforeEach(() => {
    api = new MockApi();
    strategy = new DiversificationStrategy({ api, ms: 0 });
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should not do anything if there are no diversification specs', () => {
    diversificationSpecs = [];
    strategy.execute(1, 'LTC', diversificationSpecs);
  });

  it('should throw if the sum of the ratios is bigger than 1', () => {
    diversificationSpecs = [
      { toCoin: 'BTC', ratio: 1.1 },
    ];
    expect(() => strategy.execute(1, 'LTC', diversificationSpecs)).to.throw(/Ratio sum/);

    diversificationSpecs = [
      { toCoin: 'BTC', ratio: 0.5 },
      { toCoin: 'XMR', ratio: 0.55 },
    ];
    expect(() => strategy.execute(1, 'LTC', diversificationSpecs)).to.throw(/Ratio sum/);
  });

  it('should throw if any of the ratios are smaller than 1', () => {
    diversificationSpecs = [
      { toCoin: 'BTC', ratio: -0.1 },
    ];
    expect(() => strategy.execute(1, 'LTC', diversificationSpecs)).to.throw(/Negative or zero ratios not allowed/);

    diversificationSpecs = [
      { toCoin: 'BTC', ratio: 0.2 },
      { toCoin: 'XMR', ratio: -0.1 },
    ];
    expect(() => strategy.execute(1, 'LTC', diversificationSpecs)).to.throw(/Negative or zero ratios not allowed/);

    diversificationSpecs = [
      { toCoin: 'BTC', ratio: 0.2 },
      { toCoin: 'XMR', ratio: 0 },
    ];
    expect(() => strategy.execute(1, 'LTC', diversificationSpecs)).to.throw(/Negative or zero ratios not allowed/);
  });

  it('should do nothing with fromCoin toFromCoin', async () => {
    const fromAmount = 100;
    const btcRatio = 0.25;
    const ltcRatio = 0.75;
    const btcSellRate = api.sellRate('BTC_LTC', tickers);
    const btcAmountReturnedFromSell = btcSellRate * btcRatio * fromAmount;
    diversificationSpecs = [
      { toCoin: 'BTC', ratio: btcRatio },
      { toCoin: 'LTC', ratio: ltcRatio },
    ];

    sandbox.spy(api, 'buy');
    sandbox.spy(api, 'sell');

    const { successfulTrades, failedTrades } = await strategy.execute(fromAmount, 'LTC', diversificationSpecs);

    expect(api.sell).to.have.been.calledOnce;
    expect(api.buy).not.to.have.been.called;
    expect(api.sell).to.have.been.calledWith({
      currencyPair: 'BTC_LTC',
      rate: btcSellRate.toString(),
      amount: (fromAmount * btcRatio).toString(),
    });

    expect(successfulTrades).to.have.lengthOf(2);
    expect(successfulTrades[0].fromCoin).to.equal('LTC');
    expect(successfulTrades[0].fromAmount).to.equal(fromAmount * btcRatio);
    expect(successfulTrades[0].toCoin).to.equal('BTC');
    expect(successfulTrades[0].toAmount).to.equal(btcAmountReturnedFromSell);

    expect(successfulTrades[1].fromCoin).to.equal('LTC');
    expect(successfulTrades[1].fromAmount).to.equal(fromAmount * ltcRatio);
    expect(successfulTrades[1].toCoin).to.equal('LTC');
    expect(successfulTrades[1].toAmount).to.equal(fromAmount * ltcRatio);
  });

  it('should throw if there is no path to destination coin', async () => {
    diversificationSpecs = [
      { toCoin: 'BTC', ratio: 0.5 },
      { toCoin: 'FOO', ratio: 0.5 },
    ];

    sandbox.spy(api, 'buy');
    sandbox.spy(api, 'sell');

    let err;
    try {
      await strategy.execute(1, 'LTC', diversificationSpecs);
    } catch (e) {
      err = e;
    }

    expect(err).to.exist;
    expect(err.message).to.match(/Cannot convert LTC to FOO/);
    expect(api.buy).not.to.have.been.called;
    expect(api.sell).not.to.have.been.called;
  });

  it('should group [x->A, A->z], [x->A, A->y] into [x->A, [A->z, A->y]]');

  it('should divide fromCoin into the ratios offered by the diversification spec', async () => {
    diversificationSpecs = [
      { toCoin: 'USDT', ratio: 1 },
    ];
    sandbox.spy(api, 'sell');

    const fromAmount = 1;
    const btcLtcRate = tickers.BTC_LTC.last;
    const usdtBtcRate = tickers.USDT_BTC.last;
    const btcAmount = btcLtcRate * fromAmount;

    const { successfulTrades } = await strategy.execute(fromAmount, 'LTC', diversificationSpecs);

    expect(api.sell).to.have.been.calledWith({
      currencyPair: 'BTC_LTC',
      rate: btcLtcRate.toString(),
      amount: fromAmount.toString(),
    });
    expect(api.sell).to.have.been.calledWith({
      currencyPair: 'USDT_BTC',
      rate: usdtBtcRate.toString(),
      amount: btcAmount.toString(),
    });

    expect(successfulTrades).to.have.lengthOf(1);
    expect(successfulTrades[0].fromCoin).to.equal('LTC');
    expect(successfulTrades[0].fromAmount).to.equal(1);
    expect(successfulTrades[0].toCoin).to.equal('USDT');
    expect(successfulTrades[0].toAmount).to.equal(ONE_LTC);
  });

  it('should divide fromCoin into the ratios offered by the diversification spec (the other way around)', async () => {
    diversificationSpecs = [
      { toCoin: 'LTC', ratio: 1 },
    ];
    sandbox.spy(api, 'buy');

    const fromAmount = ONE_LTC;
    const btcAmount = ONE_LTC / ONE_BTC;
    const ltcAmount = 1;
    const usdtBtcRate = tickers.USDT_BTC.last;
    const btcLtcRate = tickers.BTC_LTC.last;
    const { successfulTrades } = await strategy.execute(ONE_LTC, 'USDT', diversificationSpecs);

    expect(api.buy).to.have.been.calledWith({
      currencyPair: 'USDT_BTC',
      rate: usdtBtcRate.toString(),
      amount: btcAmount.toString(),
    });
    expect(api.buy).to.have.been.calledWith({
      currencyPair: 'BTC_LTC',
      rate: btcLtcRate.toString(),
      amount: ltcAmount.toString(),
    });

    expect(successfulTrades).to.have.lengthOf(1);
    expect(successfulTrades[0].fromCoin).to.equal('USDT');
    expect(successfulTrades[0].fromAmount).to.equal(fromAmount);
    expect(successfulTrades[0].toCoin).to.equal('LTC');
    expect(successfulTrades[0].toAmount).to.equal(ltcAmount);
  });

  it('should return a list of trade results and return the reason for the failed trades', async () => {
    diversificationSpecs = [
      { toCoin: 'BTC', ratio: 0.5 },
      { toCoin: 'USDT', ratio: 0.5 },
    ];

    sandbox.stub(api, 'sell')
      .withArgs(sinon.match.has('currencyPair', 'BTC_LTC')).returns(0.5)
      .withArgs(sinon.match.has('currencyPair', 'USDT_BTC')).throws(new Error('NO CAN DO BABYDOLL'));

    const { failedTrades, successfulTrades } = await strategy.execute(1, 'LTC', diversificationSpecs);
    expect(failedTrades).to.have.lengthOf(1);
    expect(successfulTrades).to.have.lengthOf(1);
    expect(failedTrades[0].reason.message).to.equal('NO CAN DO BABYDOLL');
  });

  describe('Unit: Trade Success Emission', () => {
    it('should emit trade success progress', async () => {
      const fromAmount = 1;
      const ratio = 0.5;
      diversificationSpecs = [
        { toCoin: 'BTC', ratio },
      ];

      const spy = sinon.spy();
      strategy.on(DiversificationStrategy.EVENTS.TRADE_SUCCESS, spy);

      await strategy.execute(fromAmount, 'LTC', diversificationSpecs);

      const rate = tickers.BTC_LTC.last;
      expect(spy).to.have.been.calledWith({
        destinationCoin: 'BTC',
        fromAmount: fromAmount * ratio,
        fromCoin: 'LTC',
        progress: 1,
        toAmount: rate * ratio,
        toCoin: 'BTC',
      });
    });

    it('should emit trade success progress twice on multi trade', async () => {
      const fromAmount = 1;
      const ratio = 0.5;
      diversificationSpecs = [
        { toCoin: 'USDT', ratio },
      ];

      const spy = sinon.spy();
      strategy.on(DiversificationStrategy.EVENTS.TRADE_SUCCESS, spy);

      await strategy.execute(fromAmount, 'LTC', diversificationSpecs);

      const rate = tickers.BTC_LTC.last;
      const usdRate = tickers.USDT_BTC.last;
      expect(spy.firstCall.args[0]).to.eql({
        destinationCoin: 'USDT',
        fromAmount: fromAmount * ratio,
        fromCoin: 'LTC',
        progress: 0.5,
        toAmount: rate * ratio,
        toCoin: 'BTC',
      });

      expect(spy.secondCall.args[0]).to.eql({
        destinationCoin: 'USDT',
        fromAmount: rate * ratio,
        fromCoin: 'BTC',
        progress: 1,
        toAmount: usdRate * rate * ratio,
        toCoin: 'USDT',
      });
    });
  });

  describe('Unit: Trade Failure Emission', () => {
    it('should emit trade failure', async () => {
      const fromAmount = 1;
      const ratio = 0.5;
      diversificationSpecs = [
        { toCoin: 'USDT', ratio },
      ];

      const error = new Error('NO CAN DO BABYDOLL');
      const spy = sinon.spy();
      sandbox.stub(api, 'sell')
        .returns(1)
        .withArgs(sinon.match.has('currencyPair', 'BTC_LTC'))
        .throws(error);

      strategy.on(DiversificationStrategy.EVENTS.TRADE_FAILURE, spy);

      await strategy.execute(fromAmount, 'LTC', diversificationSpecs);

      const rate = tickers.BTC_LTC.last;
      const usdRate = tickers.USDT_BTC.last;
      expect(spy).to.have.been.calledWith({
        destinationCoin: 'USDT',
        fromAmount: fromAmount * ratio,
        fromCoin: 'LTC',
        progress: 0.5,
        reason: error,
        toCoin: 'BTC',
      });
    });
  });

  describe('Unit: Trade Start Emission', () => {
    it('should declare what it is about to do before doing it', async () => {
      const fromAmount = 1;
      const ratio = 0.33;
      diversificationSpecs = [
        { toCoin: 'XMR', ratio },
        { toCoin: 'BTC', ratio },
        { toCoin: 'USDT', ratio },
      ];

      const spy = sinon.spy();
      strategy.on(DiversificationStrategy.EVENTS.TRADE, spy);

      await strategy.execute(fromAmount, 'LTC', diversificationSpecs);

      expect(spy).to.have.been.calledWith({
        progress: 0,
        destinationCoin: 'USDT',
        fromAmount: fromAmount * ratio,
        fromCoin: 'LTC',
      });
      expect(spy).to.have.been.calledWith({
        progress: 0,
        destinationCoin: 'XMR',
        fromAmount: fromAmount * ratio,
        fromCoin: 'LTC',
      });
      expect(spy).to.have.been.calledWith({
        progress: 0,
        destinationCoin: 'BTC',
        fromAmount: fromAmount * ratio,
        fromCoin: 'LTC',
      });
    });
  });
});
