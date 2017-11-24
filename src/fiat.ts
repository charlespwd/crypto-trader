import './types/api';
import * as R from 'ramda';
import * as request from 'request-promise-native';

const API_URL = 'http://api.fixer.io/latest';
const rateUrl = base => `${API_URL}?base=${base}`;

const rateToTicker = base => ([currency, rate]: [string, number]) => ({
  currencyPair: `${base}_${currency}`,
  last: 1 / rate,
  lowestAsk: 1 / rate,
  highestBid: 1 / rate,
  percentChange: 0,
  baseVolume: 0,
  quoteVolume: 0,
  isFrozen: false,
  '24hrHigh': 1 / rate,
  '24hrLow': 1 / rate,
});

export async function tickers(): Promise<Tickers> {
  const rates = await getRates('USD');
  const transform = R.pipe(
    R.toPairs,
    R.map(rateToTicker('USDT')),
    (tickers: Ticker[]) => R.indexBy<Ticker, Tickers>(R.prop('currencyPair'), tickers),
  );
  return transform(rates);
}

export async function getRates(from) {
  const fromCurrency = from.toUpperCase();
  try {
    const response = await request({
      method: 'GET',
      url: rateUrl(fromCurrency),
    });
    return JSON.parse(response).rates;
  } catch (e) {
    throw new Error(`Can't get ${from} rates. ${e.message}`);
  }
}

export async function getRate(from, to) {
  const toCurrency = to.toUpperCase();
  const rates = await getRates(from);
  return rates[toCurrency];
}

export function getUsdPerCad() {
  return getRate('CAD', 'USD');
}
