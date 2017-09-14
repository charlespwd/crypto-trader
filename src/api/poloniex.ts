import '../types/api';
import * as request from 'request-promise-native';
import * as crypto from 'crypto';
import * as R from 'ramda';
import { throttle } from 'lodash';
import * as qs from 'query-string';
import { PROD } from '../constants';
import Queue from '../queue';
import { timeout, log } from '../utils';

const API_LIMIT = 6; // calls per second
const queue = new Queue(API_LIMIT);
const enqueue = queue.enqueue.bind(queue);

const PUBLIC_API = 'https://poloniex.com/public';
const TRADING_API = 'https://poloniex.com/tradingApi';
const API_KEY = process.env.POLONIEX_API_KEY;
const API_SECRET = process.env.POLONIEX_API_SECRET;

if (!API_SECRET || !API_KEY) throw new Error('POLONIEX_API_KEY or POLONIEX_API_SECRET missing.');

function signature(body: any) {
  const hmac = crypto.createHmac('sha512', API_SECRET);
  hmac.update(body);
  return hmac.digest('hex');
}

function getBody(command: string, options: any) {
  const body = R.merge(options, {
    nonce: Date.now() * 1000,
    command,
  });
  return qs.stringify(body);
}

function handleResponse(rawData: string) {
  const data = JSON.parse(rawData);
  if (data.error) {
    throw new Error(data.error);
  } else {
    return data;
  }
}

async function makeRequest(params: any) {
  return handleResponse(await Promise.race([
    request(params),
    timeout(10000),
  ]));
}

function post(command: string, options = {}) {
  const body = getBody(command, options);

  const params = {
    method: 'POST',
    url: TRADING_API,
    form: body,
    headers: {
      Key: API_KEY,
      Sign: signature(body),
    },
  };

  return makeRequest(params);
}

function get(command: string, options = {}) {
  const query = qs.stringify(R.merge({ command }, options));

  const params = {
    method: 'GET',
    url: `${PUBLIC_API}?${query}`,
  };

  return enqueue(R.partial(makeRequest, [params]));
}

const parseResponseOrder = (isBuyOrder: boolean) => R.pipe(
  R.prop('resultingTrades'),
  R.map(R.pipe(
    R.prop(isBuyOrder ? 'amount' : 'total'),
    parseFloat,
  )),
  R.sum,
);

const makeTradeCommand = (command: string) => async ({
  amount,
  currencyPair,
  rate,
}: any) => {
  const toAmount = parseResponseOrder(command === 'buy');

  const params = {
    amount,
    currencyPair,
    fillOrKill: '1',
    immediateOrCancel: '1',
    rate,
  };

  const response = await enqueue(R.partial(post, [command, params]));

  return toAmount(response);
};

async function logged(s: any, x: any): Promise<undefined> {
  log(s, x);
  return undefined;
}

interface PoloniexCompleteBalance {
  available: string;
  onOrders: string;
  btcValue: string;
}

interface PoloniexCompleteBalances {
  [currency: string]: PoloniexCompleteBalance;
}

async function balances(): Promise<Balances> {
  const balances = await post('returnCompleteBalances', {
    account: 'all',
  }) as PoloniexCompleteBalances;
  const transform = R.pipe(
    R.map(R.map(parseFloat)) as any,
    R.map((x: PoloniexCompleteBalance) => x.available + x.onOrders) as any,
  );
  return transform(balances) as Balances;
}

interface PoloniexTicker {
  currencyPair: string;
  last: string;
  lowestAsk: string;
  highestBid: string;
  percentChange: string;
  baseVolume: string;
  quoteVolume: string;
  isFrozen: string;
  '24hrHigh': string;
  '24hrLow': string;
}

interface PoloniexTickers {
  [currencyPair: string]: PoloniexTicker;
}

async function tickers(): Promise<Tickers> {
  const tickers = await get('returnTicker') as PoloniexTickers;
  return R.mapObjIndexed((ticker: PoloniexTicker, currencyPair: string) => ({
    last: parseFloat(ticker.last),
    lowestAsk: parseFloat(ticker.lowestAsk),
    highestBid: parseFloat(ticker.highestBid),
    percentChange: parseFloat(ticker.percentChange),
    baseVolume: parseFloat(ticker.baseVolume),
    quoteVolume: parseFloat(ticker.quoteVolume),
    isFrozen: !!parseInt(ticker.isFrozen, 10),
    '24hrHigh': parseFloat(ticker['24hrHigh']),
    '24hrLow': parseFloat(ticker['24hrLow']),
    currencyPair,
  }), tickers);
}

const sellRate = (currencyPair: string, tickers: Tickers) => tickers[currencyPair].highestBid;
const buyRate = (currencyPair: string, tickers: Tickers) => tickers[currencyPair].lowestAsk;
const api: Api = {
  name: 'poloniex',
  balances,
  tickers: throttle(tickers, 1000, { leading: true, trailing: false }),
  sell: PROD ? makeTradeCommand('sell') : (x => logged('sell', x)),
  buy: PROD ? makeTradeCommand('buy') : (x => logged('buy', x)),
  sellRate,
  buyRate,
};

export default api;
