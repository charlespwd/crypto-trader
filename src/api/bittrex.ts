import * as request from 'request-promise-native';
import * as qs from 'query-string';
import * as crypto from 'crypto';
import * as auth from '../auth';
import { timeout, log, withLoginFactory } from '../utils';
import {
  map,
  merge,
  mergeDeepRight,
  pipe,
  prop,
  zipObj,
  replace,
  reject,
  isNil,
  groupBy,
} from 'ramda';

const BASE_URL = 'https://bittrex.com/api/v1.1/';

const state = {
  exchangeName: 'bittrex',
  isLoggedIn: false,
  API_KEY: null,
  API_SECRET: null,
};

const withLogin = withLoginFactory(state);

function init() {
  const API_KEY = auth.getKey('bittrex');
  const API_SECRET = auth.getSecret('bittrex');

  if (state.isLoggedIn || !API_KEY || !API_SECRET) return;

  state.API_KEY = API_KEY;
  state.API_SECRET = API_SECRET;
  state.isLoggedIn = true;
}

function requestUrl(method: string, options: {} = {}) {
  const nonce = Date.now() * 1000;
  const params = merge(options, {
    apikey: state.API_KEY,
    nonce: Date.now() * 1000,
  });
  return `${BASE_URL}${method}?${qs.stringify(params)}`;
}

function signature(url) {
  const hmac = crypto.createHmac('sha512', state.API_SECRET);
  hmac.update(url);
  return hmac.digest('hex');
}

function handleResponse(data) {
  if (data.success) {
    return data.result;
  } else {
    throw new Error(data.message);
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
  CryptoAddress: string | null;
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

function bittrexBalancesToAddresses(balances: BittrexBalance[]): DepositAddresses {
  const currencies = map(x => x.Currency, balances);
  const addresses = map(x => x.CryptoAddress, balances);

  return reject(isNil, zipObj(
    currencies,
    addresses,
  ));
}

async function addresses(): Promise<DepositAddresses> {
  const result: BittrexBalance[] = await makeRequest({
    url: requestUrl('account/getbalances'),
  });

  return bittrexBalancesToAddresses(result);
}

interface BittrexTradeResult {
  uuid: string;
}

interface BittrexOrder {
  AccountId: string;
  OrderUuid: string;
  Exchange: string;
  Type: 'LIMIT_BUY' | 'LIMIT_SELL';
  Quantity: number;
  QuantityRemaining: number;
  Limit: number;
  Reserved: number;
  ReserveRemaining: number;
  CommissionReserved: number;
  CommissionReserveRemaining: number;
  CommissionPaid: number;
  Price: number;
  PricePerUnit: number;
  Opened: string;
  Closed: string;
  IsOpen: boolean;
  Sentinel: string;
  CancelInitiated: boolean;
  ImmediateOrCancel: boolean;
  IsConditional: boolean;
  Condition: 'NONE';
  ConditionTarget: boolean;
}

async function buy(options: TradeOptions): Promise<number> {
  const result: BittrexTradeResult = await makeRequest({
    url: requestUrl('market/buylimit', {
      quantity: options.amount,
      market: options.currencyPair.replace('_', '-'),
      rate: options.rate,
    }),
  });

  const orderId = result.uuid;

  const orderStatus: BittrexOrder = await makeRequest({
    url: requestUrl('account/getorder', {
      uuid: orderId,
    }),
  });

  if (orderStatus.IsOpen) {
    log(`Buy order for ${JSON.stringify(options)} is still open!`);
  }

  return orderStatus.Quantity;
}

async function sell(options: TradeOptions): Promise<number> {
  const result: BittrexTradeResult = await makeRequest({
    url: requestUrl('market/selllimit', {
      quantity: options.amount,
      market: options.currencyPair.replace('_', '-'),
      rate: options.rate,
    }),
  });

  const orderId = result.uuid;

  const orderStatus: BittrexOrder = await makeRequest({
    url: requestUrl('account/getorder', {
      uuid: orderId,
    }),
  });

  if (orderStatus.IsOpen) {
    log(`Sell order for ${JSON.stringify(options)} is still open!`);
  }

  return orderStatus.Price;
}

function buyRate(currencyPair: string, tickers: Tickers): number {
  // buying 0.25% higher than lowest ask just to be sure
  return tickers[currencyPair].lowestAsk * (1 + 0.0025);
}

function sellRate(currencyPair: string, tickers: Tickers): number {
  // selling 0.25% lower than lowest bid just to be sure
  return tickers[currencyPair].highestBid * (1 - 0.0025);
}

type BittrexTradeType = 'LIMIT_BUY' | 'LIMIT_SELL';

interface BittrexTrade {
  OrderUuid: string;
  Exchange: string;
  TimeStamp: string;
  OrderType: BittrexTradeType;
  Limit: number;
  Quantity: number;
  QuantityRemaining: number;
  Commission: number;
  Price: number;
  PricePerUnit: number;
  IsConditional: boolean;
  Condition: string | null;
  ConditionTarget: number;
  ImmediateOrCancel: boolean;
}

function convertTradeType(x: BittrexTradeType): TradeType {
  switch (x) {
    case 'LIMIT_BUY': return 'buy';
    case 'LIMIT_SELL': return 'sell';
    default: throw new Error(`${x} not supported`);
  }
}

const types = {
  LIMIT_BUY: 'buy',
  LIMIT_SELL: 'sell',
};

function toTradeHistory(bittrexTrades: BittrexTrade[]): TradeHistory {
  const trades = map(x => ({
    currencyPair: x.Exchange.replace(/-/, '_'),
    type: convertTradeType(x.OrderType),
    amount: x.Quantity,
    total: x.Price,
    rate: x.PricePerUnit,
  }), bittrexTrades);

  return groupBy(
    x => x.currencyPair,
    trades,
  );
}

async function trades(): Promise<TradeHistory> {
  const result: BittrexTrade[] = await makeRequest({
    url: requestUrl('account/getorderhistory'),
  });

  return toTradeHistory(result);
}

const bittrex: Api = {
  name: 'bittrex',
  init,
  addresses: withLogin(addresses),
  tickers: withLogin(tickers),
  balances: withLogin(balances),
  buy: withLogin(buy),
  sell: withLogin(sell),
  buyRate: withLogin(buyRate),
  sellRate: withLogin(sellRate),
  trades: withLogin(trades),
};
export default bittrex;
