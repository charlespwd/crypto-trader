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
  describe('Unit: btcToUSD', () => {
    it('should convert a balance to BTC', () => {
      const tickers = {
        USDT_BTC: ticker('USDT_BTC', 10),
      };
      const btcAmount = 1;
      expect(utils.btcToUSD(btcAmount, tickers)).to.equal(10);
    });
  });

  describe('Unit: toUSD', () => {
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

      expect(utils.toUSD(balances, tickers)).to.eql({
        BTC: 10,
        LTC: 0.5 * 10,
        USDT: 1,
      });
    }); 
  });
});
