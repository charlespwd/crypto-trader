import * as request from 'request-promise-native';
import * as qs from 'query-string';
import * as crypto from 'crypto';
import * as auth from '../auth';
import * as moment from 'moment';
import { timeout, log, withLoginFactory, sleep } from '../utils';
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
const RETRY_COUNT_MAX = 5;
const RETRY_SLEEP_MS = 100;

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
    timeout(10000, 'bittrex'),
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

type AmountType = 'Quantity' | 'Price';

function getOrderStatus(orderId) {
  return makeRequest({
    url: requestUrl('account/getorder', {
      uuid: orderId,
    }),
  });
}

async function cancelOrder(orderId) {
  try {
    await makeRequest({
      url: requestUrl('market/cancel', {
        uuid: orderId,
      }),
    });
    return true;
  } catch (reason) {
    throw reason;
  }
}

function makeTradeFunction(tradeType: 'buy' | 'sell', command: string, returnProperty: AmountType) {
  return async function tradeFn(options: TradeOptions): Promise<number> {
    const result: BittrexTradeResult = await makeRequest({
      url: requestUrl(command, {
        quantity: options.amount,
        market: options.currencyPair.replace('_', '-'),
        rate: options.rate,
      }),
    });

    const orderId = result.uuid;
    const [baseCoin, coin] = options.currencyPair.split('_');

    let n = 1;
    let orderStatus: BittrexOrder = await getOrderStatus(orderId);
    const tradeDescription = `${tradeType} order for ${options.amount} ${coin} at ${options.rate} on ${options.currencyPair}`;
    while (orderStatus.IsOpen && n <= RETRY_COUNT_MAX) {
      log(`${tradeDescription} still open! Attempt # ${n}`);
      await sleep(RETRY_SLEEP_MS);
      orderStatus = await getOrderStatus(orderId);
      n = n + 1;
    }

    if (n > RETRY_COUNT_MAX) {
      log(`${tradeDescription} Reason: Retry count max reached.`);
      await cancelOrder(orderId);
      log(`${tradeDescription} cancelled.`);
      throw new Error('Retry count max reached');
    } else if (n > 1 && orderStatus.IsOpen) {
      log(`${tradeDescription} SUCCEEDED!`);
    }

    return orderStatus[returnProperty];
  };
}

export const buy = makeTradeFunction('buy', 'market/buylimit', 'Quantity');
export const sell = makeTradeFunction('sell', 'market/selllimit', 'Price');

function buyRate(currencyPair: string, tickers: Tickers): number {
  // buying 1% higher than lowest ask just to be sure
  return tickers[currencyPair].lowestAsk * 1.01;
}

function sellRate(currencyPair: string, tickers: Tickers): number {
  // selling 1% lower than lowest bid just to be sure
  return tickers[currencyPair].highestBid / 1.01;
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
  const trades: Trade[] = map(x => ({
    currencyPair: x.Exchange.replace(/-/, '_'),
    date: moment(x.TimeStamp),
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

interface BRDeposit {
  Id: number;
  Amount: number;
  Currency: string;
  Confirmations: number;
  LastUpdated: Date;
  TxId: string;
  CryptoAddress: string;
}

interface BRWithdrawal {
  Id: number;
  Amount: number;
  Currency: string;
  Confirmations: number;
  LastUpdated: Date;
  TxId: string;
  CryptoAddress: string;
}

function toDeposit(d: BRWithdrawal): Withdrawal;
function toDeposit(d: BRDeposit): Deposit {
  return {
    amount: d.Amount,
    date: moment(d.LastUpdated),
    currency: d.Currency,
  };
}

async function depositsAndWithdrawals(): Promise<DepositsAndWithdrawals> {
  const [brDeposits, brWithdrawals]: [BRDeposit[], BRWithdrawal[]] = await Promise.all([
    makeRequest({
      url: requestUrl('account/getdeposithistory'),
    }),
    makeRequest({
      url: requestUrl('account/getwithdrawalhistory'),
    }),
  ]);

  return {
    deposits: brDeposits.map(toDeposit),
    withdrawals: brWithdrawals.map(toDeposit),
  };
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
  depositsAndWithdrawals: withLogin(depositsAndWithdrawals),
};
export default bittrex;
