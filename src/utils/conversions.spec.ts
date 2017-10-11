import '../types/api';
import { expect } from 'chai';
import * as utils from './conversions';

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

describe('Module: utils', () => {
  describe('Unit: estimate(fromAmount, fromCoin, toCoin, tickers)', () => {
    it('should estimate A to A', () => {
      const tickers = {};
      expect(utils.estimate(0.5, 'A', 'A', tickers)).to.equal(0.5);
    });

    it('should estimate from A to B and vice versa', () => {
      const tickers = {
        A_B: ticker('A_B', 0.5),
      };
      expect(utils.estimate(1, 'B', 'A', tickers)).to.equal(0.5);
      expect(utils.estimate(1, 'A', 'B', tickers)).to.equal(2);
    });

    it('should estimate from A to C via B and vice versa', () => {
      const tickers = {
        A_B: ticker('A_B', 0.1),  // 1 B = 0.1 A => 1 A = 10 B
        B_C: ticker('B_C', 0.01), // 1 C = 0.01 B => 1 B = 100 C
      };
      expect(utils.estimate(1, 'A', 'C', tickers)).to.equal(1000);
      expect(utils.estimate(1, 'C', 'A', tickers)).to.equal(0.001);
    });

    it('should throw an error when no path between A & D exist', () => {
      const tickers = {
        A_B: ticker('A_B', 0.1),  // 1 B = 0.1 A => 1 A = 10 B
        B_C: ticker('B_C', 0.01), // 1 C = 0.01 B => 1 B = 100 C
      };
      expect(() => utils.estimate(1, 'A', 'D', tickers)).to.throw(/Cannot convert A to D/);
    });
  });

  describe('Unit: btcToUSD', () => {
    it('should convert a balance to BTC', () => {
      const tickers = {
        USDT_BTC: ticker('USDT_BTC', 10),
      };
      const btcAmount = 1;
      expect(utils.btcToUSD(btcAmount, tickers)).to.equal(10);
    });
  });

  describe('Unit: toUSDBalances', () => {
    it('should convert a set of balances to USD', () => {
      const balances = {
        BTC: 1,
        LTC: 1,
        USDT: 1,
      };
      const tickers = {
        USDT_BTC: ticker('USDT_BTC', 10),
        BTC_LTC: ticker('BTC_LTC', 0.5),
      };

      expect(utils.toUSDBalances(balances, tickers)).to.eql({
        BTC: 10,
        LTC: 0.5 * 10,
        USDT: 1,
      });
    });
  });
});
