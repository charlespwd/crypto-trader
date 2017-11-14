import * as request from 'request-promise-native';
import * as crypto from 'crypto';
import * as R from 'ramda';
import * as qs from 'query-string';
import * as moment from 'moment';
import * as auth from '../auth';
import { timeout, log, Queue, withLoginFactory } from '../utils';
const throttle = require('lodash.throttle');

const API_LIMIT = 6; // calls per second
const queue = new Queue(API_LIMIT);
const enqueue = queue.enqueue.bind(queue);

const PUBLIC_API = 'https://poloniex.com/public';
const TRADING_API = 'https://poloniex.com/tradingApi';

const state = {
  exchangeName: 'poloniex',
  isLoggedIn: false,
  API_KEY: null,
  API_SECRET: null,
};

const withLogin = withLoginFactory(state);

function init() {
  const API_KEY = auth.getKey('poloniex');
  const API_SECRET = auth.getSecret('poloniex');

  if (state.isLoggedIn || !API_SECRET || !API_KEY) return;

  state.API_KEY = API_KEY;
  state.API_SECRET = API_SECRET;
  state.isLoggedIn = true;
}

function signature(body: any) {
  const hmac = crypto.createHmac('sha512', state.API_SECRET);
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
    timeout(10000, 'poloniex'),
  ]));
}

function post(command: string, options = {}) {
  const body = getBody(command, options);

  const params = {
    method: 'POST',
    url: TRADING_API,
    form: body,
    headers: {
      Key: state.API_KEY,
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
  const tickers: PoloniexTickers = await get('returnTicker');
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

async function addresses(): Promise<DepositAddresses> {
  const result = await post('returnDepositAddresses');
  return result;
}

interface PoloniexTrade {
  globalTradeID: number;
  tradeID: string;
  date: string;
  rate: string;
  amount: string;
  total: string;
  fee: string;
  orderNumber: string;
  type: 'sell' | 'buy';
  category: 'exchange' | 'settlement' | 'marginTrade';
}

interface PoloniexTradeHistory {
  [currencyPair: string]: PoloniexTrade[];
}

const fromPoloniexTradeToTrade = (pair: string) => (
  (trade: PoloniexTrade): Trade => ({
    type: trade.type,
    currencyPair: pair,
    amount: parseFloat(trade.amount),
    total: parseFloat(trade.total),
    rate: parseFloat(trade.rate),
  })
);

function fromPoloniexTradeHistoryToTradeHistory(hist: PoloniexTradeHistory): TradeHistory {
  return R.mapObjIndexed(
    (trades, currencyPair) => (
      R.map(fromPoloniexTradeToTrade(currencyPair), trades)
    ),
    hist,
  );
}

async function trades(): Promise<TradeHistory> {
  const result: PoloniexTradeHistory = await post('returnTradeHistory', {
    start: moment().startOf('year').format('X'),
    end: moment().format('X'),
    currencyPair: 'all',
    limit: 10000,
  });
  return fromPoloniexTradeHistoryToTradeHistory(result);
}

const sellRate = (currencyPair: string, tickers: Tickers) => tickers[currencyPair].highestBid / 1.01;
const buyRate = (currencyPair: string, tickers: Tickers) => tickers[currencyPair].lowestAsk * 1.01;
const api: Api = {
  name: 'poloniex',
  init,
  balances: withLogin(balances),
  tickers: withLogin(throttle(tickers, 1000, { leading: true, trailing: false })),
  sell: withLogin(makeTradeCommand('sell')),
  buy: withLogin(makeTradeCommand('buy')),
  sellRate: withLogin(sellRate),
  buyRate: withLogin(buyRate),
  addresses: withLogin(addresses),
  trades: withLogin(trades),
};

export default api;
