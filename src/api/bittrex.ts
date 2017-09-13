import * as request from 'request-promise-native';
import * as qs from 'query-string';
import * as crypto from 'crypto';
import { timeout } from '../utils';
import {
  map,
  merge,
  mergeDeepRight,
  pipe,
  prop,
  zipObj,
  replace,
} from 'ramda';

const API_KEY = process.env.BITTREX_API_KEY;
const API_SECRET = process.env.BITTREX_API_SECRET;
const BASE_URL = 'https://bittrex.com/api/v1.1/';

function requestUrl(method: string, options: {} = {}) {
  const nonce = Date.now() * 1000;
  const params = merge(options, {
    apikey: API_KEY,
    nonce: Date.now() * 1000,
  });
  return `${BASE_URL}${method}?${qs.stringify(params)}`;
}

function signature(url) {
  const hmac = crypto.createHmac('sha512', API_SECRET);
  hmac.update(url);
  return hmac.digest('hex');
}

function handleResponse(data) {
  if (data.success) {
    return data.result;
  } else {
    throw new Error(data);
  }
}

async function makeRequest(options) {
  const params = mergeDeepRight(options, {
    method: 'GET',
    json: true,
    headers: {
      apisign: signature(options.url),
      'Content-Type': 'application/json',
    },
  });

  return handleResponse(await Promise.race([
    request(params),
    timeout(10000),
  ]));
}

interface BittrexMarketSummary {
  MarketName: string;
  High: number;
  Low: number;
  Volume: number;
  Last: number;
  BaseVolume: number;
  TimeStamp: string;
  Bid: number;
  Ask: number;
  OpenBuyOrders: number;
  OpenSellOrders: number;
  PrevDay: number;
  Created: number;
}

const toCurrencyPair = pipe(
  (x: BittrexMarketSummary) => x.MarketName,
  replace(/-/, '_'),
);

function toTicker(x: BittrexMarketSummary): Ticker {
  return {
    currencyPair: toCurrencyPair(x),
    last: x.Last,
    lowestAsk: x.Ask,
    highestBid: x.Bid,
    percentChange: (x.Last - x.PrevDay) / x.PrevDay,
    baseVolume: x.BaseVolume,
    quoteVolume: x.Volume,
    isFrozen: false,
    '24hrHigh': x.High,
    '24hrLow': x.Low,
  };
}

function bittrexSummariesToTickers(
  summaries: BittrexMarketSummary[],
): Tickers {
  const pairs = map(toCurrencyPair, summaries);
  const tickers = map(toTicker, summaries);

  return zipObj(
    pairs,
    tickers,
  );
}

async function tickers(): Promise<Tickers> {
  const result: BittrexMarketSummary[] = await makeRequest({
    url: requestUrl('public/getmarketsummaries'),
  });
  return bittrexSummariesToTickers(result);
}

interface BittrexBalance {
  Currency: string;
  Balance: number;
  Available: number;
  Pending: number;
  CryptoAddress: string;
}

function bittrexBalancesToBalances(balances: BittrexBalance[]): Balances {
  const currencies = map(x => x.Currency, balances);
  const totals = map(x => x.Balance, balances);

  return zipObj(
    currencies,
    totals,
  );
}

async function balances(): Promise<Balances> {
  const result: BittrexBalance[] = await makeRequest({
    url: requestUrl('account/getbalances'),
  });

  return bittrexBalancesToBalances(result);
}

function buy(options): Promise<number> {
  throw new Error('not implemented');
}

function sell(options): Promise<number> {
  throw new Error('not implemented');
}

function buyRate(currencyPair, tickers): number {
  throw new Error('not implemented');
}

function sellRate(currencyPair, tickers): number {
  throw new Error('not implemented');
}

const bittrex: Api = {
  tickers,
  balances,
  buy,
  sell,
  buyRate,
  sellRate,
};
export default bittrex;
