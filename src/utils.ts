import './types/api';
import {
  path,
  filter,
  mapObjIndexed,
} from 'ramda';

const throwTimeout = (reject) => {
  reject(new Error('Timeout error, too slow'));
};

export const sellRate = (currencyPair: string, tickers: Tickers) => tickers[currencyPair].highestBid;
export const buyRate = (currencyPair: string, tickers: Tickers) => tickers[currencyPair].lowestAsk;
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const timeout = (ms: number) => new Promise((r, reject) => setTimeout(throwTimeout, ms, reject));
export const nonZeroBalances = filter(x => x > 0);
const arr = filter(x => x > 0)([1, 2, -1]);

export const toBTC = (value: number, currency: string, tickers: Tickers) => {
  if (currency === 'BTC') return value;
  return value * parseFloat(path([`BTC_${currency}`, 'last'], tickers) as string);
};

export const btcToUSD = (value: number, tickers: Tickers) => {
  return value * tickers.USDT_BTC.last;
};

export const toUSD = (balances: Balances, tickers: Tickers): Balances => {
  const convert = (value, currency) => {
    const btc = toBTC(value, currency, tickers);
    return btcToUSD(btc, tickers);
  };
  return mapObjIndexed(
    convert,
    nonZeroBalances(balances),
  );
};

export const toCAD = (balances: Balances, tickers, btcToCad) => {
  const convert = (value, currency) => {
    const btc = toBTC(value, currency, tickers);
    return btcToCad * btc;
  };
  return mapObjIndexed(convert, nonZeroBalances(balances));
};
