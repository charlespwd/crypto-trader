import '../types/api';
import * as EventEmitter from 'events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as strategy from './strategy';

const ticker = (pair, last) => ({
  currencyPair: pair,
  last,
  lowestAsk: last,
  highestBid: last,
  percentChange: last,
  baseVolume: last,
  quoteVolume: last,
  isFrozen: false,
  '24hrHigh': last,
  '24hrLow': last,
});

describe('Module: strategy', () => {
  describe('Unit: execute(api, fromAmount, strategy, fromCoin, isDryRun)', () => {
    let api: Api;
    let execute;
    let trade;
    let emitter;
    let toAmount;

    beforeEach(() => {
      toAmount = 0.5423;
      emitter = new EventEmitter();
      const tickers = {
        BTC_XMR: ticker('BTC_XMR', 0.5),
        BTC_NEO: ticker('BTC_NEO', 0.2),
        BTC_LTC: ticker('BTC_LTC', 0.1),
      };

      api = {
        name: 'mock',
        init: sinon.stub(),
        tickers: async () => tickers,
        addresses: sinon.stub(),
        balances: sinon.stub(),
        sell: sinon.stub(),
        buy: sinon.stub(),
        buyRate: sinon.stub(),
        sellRate: sinon.stub(),
        trades: sinon.stub(),
      };

      trade = () => Promise.resolve(toAmount);

      execute = strategy.strategyFactory(emitter, trade);
    });

    describe('hooks', () => {
      const fromAmount = 1;
      const fromCoin = 'LTC';
      const strat = strategy.namedListStrategy(['NEO', 'XMR']);

      it('should declare what it is doing', (done) => {
        emitter.on('start', (data) => {
          try {
            expect(data.api).to.eql(api);
            expect(data.fromAmount).to.eql(fromAmount);
            expect(data.fromCoin).to.eql(fromCoin);
            expect(data.strategy).to.eql(strat);
            done();
          } catch (e) {
            done(e);
          }
        });

        execute(api, fromAmount, strat, fromCoin, true);
      });

      it('should turn LTC into BTC before doing anything', (done) => {
        emitter.once(strategy.STRATEGY_EVENTS.TRADE_SUCCESS, (data) => {
          try {
            expect(data.fromCoin).to.equal(fromCoin);
            expect(data.fromAmount).to.equal(fromAmount * 2 / 3);
            expect(data.toCoin).to.equal('BTC');
            expect(data.toAmount).to.equal(toAmount);
            done();
          } catch (e) {
            done(e);
          }
        });

        execute(api, fromAmount, strat, fromCoin, true);
      });
    });

    describe('Strategy: top-by-volume', () => {
      it('should convert fromAmount into n top currencies by trading volume', async () => {
      });
    });
  });
});
