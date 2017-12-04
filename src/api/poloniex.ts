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
    date: moment(trade.date),
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

interface PoloniexChartData {
  date: number;
  high: number;
  low: number;
  open: number;
  close: number;
  volume: number;
  quoteVolume: number;
  weightedAverage: number;
}

function poloniexPublicTradesToTicker(currencyPair: string, trades: PoloniexChartData[]): Ticker {
  const percentChange = (a, b) => (b - a) / a;
  return {
    currencyPair,
    last: R.last(trades).open,
    lowestAsk: R.last(trades).low,
    highestBid: R.last(trades).high,
    percentChange: percentChange(
      R.last(trades).open,
      R.last(trades).close,
    ),
    baseVolume: R.last(trades).volume,
    quoteVolume: R.last(trades).quoteVolume,
    isFrozen: false,
    '24hrLow': R.last(trades).low,
    '24hrHigh': R.last(trades).high,
  };
}

async function historicalTicker(day: moment.Moment, currencyPair = 'all'): Promise<Ticker> {
  try {
    const result: PoloniexChartData[] = await get('returnChartData', {
      start: moment.utc(day).startOf('day').format('X'),
      end: moment.utc(day).add(1, 'day').endOf('day').format('X'),
      currencyPair,
      period: 86400,
    });

    return poloniexPublicTradesToTicker(currencyPair, result);
  } catch (e) {
    console.log(e.message);
    return undefined;
  }
}

async function historicalTickers(day: moment.Moment, pairs: string[]): Promise<Tickers> {
  const tickers = await Promise.all(
    pairs.map(x => historicalTicker(day, x)),
  );
  return R.reject(R.isNil, R.zipObj(pairs, tickers));
}

const sellRate = (currencyPair: string, tickers: Tickers) => tickers[currencyPair].highestBid / 1.01;
const buyRate = (currencyPair: string, tickers: Tickers) => tickers[currencyPair].lowestAsk * 1.01;

interface PoloniexLoanOrder {
  rate: string;
  amount: string;
  rangeMin: string;
  rangeMax: string;
}

interface PoloniexLoanOrderBook {
  offers: PoloniexLoanOrder[];
  demands: PoloniexLoanOrderBook[];
}

async function loanOrders(currency: string): Promise<LoanOrder[]> {
  const orders: PoloniexLoanOrderBook = await get('returnLoanOrders', {
    currency,
    limit: 200,
  });

  return orders.offers.map(x => R.map(parseFloat, x)).map(x => ({ ...x, currency }));
}

interface PoloniexOpenLoanOffer {
  id: string;
  rate: string;
  amount: string;
  duration: string;
  autoRenew: number;
  date: string;
}

interface PoloniexOpenLoanOrders {
  [currency: string]: PoloniexOpenLoanOffer[];
}

function toLoanOrders(orders: any): LoanOffer[] {
  return R.pipe(
    R.toPairs,
    R.map(([currency, offers]) =>
      R.map(
        offer => ({
          currency,
          id: offer.id,
          rate: parseFloat(offer.rate),
          amount: parseFloat(offer.amount),
          autoRenew: !!offer.autoRenew,
          duration: offer.duration,
        }),
        offers,
      ),
    ),
    R.reduce<LoanOffer[][], LoanOffer[]>(R.concat, []),
  )(orders) as LoanOffer[];
}

async function openLoanOrders(): Promise<LoanOffer[]> {
  const orders: PoloniexOpenLoanOrders = await post('returnOpenLoanOffers');
  return toLoanOrders(orders);
}

interface PoloniexActiveLoan {
  id: number;
  currency: string;
  rate: string;
  amount: string;
  duration: number;
  autoRenew: 0 | 1;
  date: string;
  fees: string;
}

async function activeLoanOrders(): Promise<LoanOffer[]> {
  const loans: PoloniexActiveLoan[] = (await post('returnActiveLoans')).provided;

  return loans.map((loan): LoanOffer => ({
    id: loan.id,
    currency: loan.currency,
    rate: parseFloat(loan.rate),
    amount: parseFloat(loan.amount),
    duration: loan.duration,
    autoRenew: !!loan.autoRenew,
  }));
}

async function cancelLoanOffer(orderNumber: number): Promise<any> {
  const result = await post('cancelLoanOffer', {
    orderNumber,
  });

  return result;
}

interface LoanOfferOptions {
  currency: string;
  amount: number;
  duration: number;
  autoRenew: boolean;
  rate: number;
}

async function placeLoanOffer(options: LoanOfferOptions): Promise<any> {
  const result = await post('createLoanOffer', {
    currency: options.currency,
    amount: options.amount,
    duration: options.duration,
    autoRenew: options.autoRenew ? 1 : 0,
    lendingRate: options.rate,
  });

  return result;
}

async function getLendingBalances(): Promise<Balances> {
  const balances = await post('returnAvailableAccountBalances', {
    account: 'lending',
  }) as PoloniexCompleteBalances;
  const transform = R.pipe(
    R.prop('lending'),
    R.map(parseFloat) as any,
  );
  return transform(balances) as Balances;
}

interface PoloniexLoan {
  id: number;
  currency: string;
  rate: string;
  amount: string;
  duration: string;
  interest: string;
  fee: string;
  earned: string;
  open: string;
  close: string;
}

function convertLoan(x: PoloniexLoan): Loan {
  return {
    id: x.id,
    currency: x.currency,
    amount: parseFloat(x.amount),
    duration: parseFloat(x.duration),
    interest: parseFloat(x.interest),
    fee: parseFloat(x.fee),
    earned: parseFloat(x.earned),
    open: moment(x.open).format('x'),
    close: moment(x.close).format('x'),
  };
}

async function lendingHistory(): Promise<Loan[]> {
  const response = await post('returnLendingHistory', {
    start: moment().subtract(1, 'year').format('X'),
    end: moment().format('X'),
    limit: 1000,
  });

  return response.map(convertLoan);
}

interface PoloniexDeposit {
  address: string;
  amount: string;
  confirmations: number;
  currency: string;
  status: string;
  timestamp: number;
  txid: string;
}

interface PoloniexWithdrawal {
  address: string;
  amount: string;
  currency: string;
  fee: string;
  ipAddress: string;
  status: string;
  timestamp: number;
  withdrawalNumber: number;
}

interface PoloniexDepositsAndWithdrawals {
  deposits: PoloniexDeposit[];
  withdrawals: PoloniexWithdrawal[];
}

function toDeposit(x: PoloniexDeposit): Deposit {
  return {
    amount: parseFloat(x.amount),
    currency: x.currency,
    date: moment(x.timestamp, 'X'),
  };
}

function toWithdrawal(x: PoloniexWithdrawal): Withdrawal {
  return {
    amount: parseFloat(x.amount),
    currency: x.currency,
    date: moment(x.timestamp, 'X'),
  };
}

async function depositsAndWithdrawals(): Promise<DepositsAndWithdrawals> {
  const response: PoloniexDepositsAndWithdrawals = await post('returnDepositsWithdrawals', {
    start: moment('2013-01-01', 'YYYY-MM-DD').format('X'),
    end: moment().format('X'),
  });

  return {
    deposits: response.deposits.map(toDeposit),
    withdrawals: response.withdrawals.map(toWithdrawal),
  };
}

interface PoloniexApi extends Api {
  historicalTicker(day: moment.Moment, currencyPair: string): Promise<Ticker>;
  historicalTickers(day: moment.Moment, currencyPairs: string[]): Promise<Ticker>;
  loanOrders(currency: string): Promise<LoanOrder[]>;
  openLoanOrders(): Promise<LoanOffer[]>;
  cancelLoanOffer(on: number): Promise<any>;
  placeLoanOffer(options: LoanOfferOptions): Promise<any>;
  getLendingBalances(): Promise<Balances>;
  lendingHistory(): Promise<Loan[]>;
  activeLoanOrders(): Promise<LoanOffer[]>;
}

const api: PoloniexApi = {
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
  depositsAndWithdrawals: withLogin(depositsAndWithdrawals),
  historicalTicker: withLogin(historicalTicker),
  historicalTickers: withLogin(historicalTickers),
  loanOrders: withLogin(loanOrders),
  openLoanOrders: withLogin(openLoanOrders),
  cancelLoanOffer: withLogin(cancelLoanOffer),
  placeLoanOffer: withLogin(placeLoanOffer),
  getLendingBalances: withLogin(getLendingBalances),
  lendingHistory: withLogin(lendingHistory),
  activeLoanOrders: withLogin(activeLoanOrders),
};

export default api;
