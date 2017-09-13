import * as request from 'request-promise-native';
import * as qs from 'query-string';
import * as crypto from 'crypto';
import { timeout } from '../utils';
import {
  map,
  zipObj,
  prop,
  merge,
  mergeDeepRight,
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

function tickers(): Promise<Tickers> {
  throw new Error('not implemented');
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
    method: 'GET',
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
