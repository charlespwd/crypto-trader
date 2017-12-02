export const ticker = (pair, last) => ({
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

// all in US dolars
export const ONE_BTC = 7000;
export const ONE_LTC = 60;
export const ONE_XMR = 90;
export const ONE_NEO = 1;
export const tickers = {
  BTC_LTC: ticker('BTC_LTC', ONE_LTC / ONE_BTC),
  USDT_BTC: ticker('USDT_BTC', ONE_BTC),
  BTC_XMR: ticker('BTC_XMR', ONE_XMR / ONE_BTC),
  BTC_NEO: ticker('BTC_NEO', ONE_NEO / ONE_BTC),
};

export class MockApi implements Api {
  name = 'mockapi';
  init() {}
  tickers = async () => tickers;
  addresses = async () => ({});
  balances = async () => ({});
  sell = async ({ rate, amount }) => amount * rate;
  buy = async ({ rate, amount }) => parseFloat(amount);
  trades = async () => ({});
  buyRate = (currencyPair, tickers) => tickers[currencyPair].lowestAsk;
  sellRate = (currencyPair, tickers) => tickers[currencyPair].highestBid;
}
