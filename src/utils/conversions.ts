import {
  path,
  filter,
  mapObjIndexed,
} from 'ramda';

export const nonZeroBalances = filter(x => x > 0);

const toBTC = (value: number, currency: string, tickers: Tickers) => {
  if (currency === 'BTC') return value;
  if (currency === 'USDT') return value / tickers.USDT_BTC.last;
  return value * path<number>([`BTC_${currency}`, 'last'], tickers);
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

export const toCAD = (balances: Balances, tickers: Tickers, usdPerCad: number) => {
  const convert = (value, currency) => {
    const btc = toBTC(value, currency, tickers);
    return btcToUSD(btc, tickers) / usdPerCad;
  };
  return mapObjIndexed(convert, nonZeroBalances(balances));
};
