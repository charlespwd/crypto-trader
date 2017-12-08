import * as request from 'request-promise-native';
import * as moment from 'moment';
import { Client } from 'coinbase';
import { promisify } from 'util';
import * as R from 'ramda';
import * as auth from '@coincurry/auth';
import { withLoginFactory } from '@coincurry/utils';

namespace Coinbase {
  export interface Client {
    baseApiUri: string;
    tokenUri: string;
    caFile: string[];
    strictSSL: boolean;
    apiKey: string;
    apiSecret: string;
  }

  export interface Amount {
    amount: string;
    currency: string;
  }

  export interface NativeAmount {
    amount: string;
    currency: string;
  }

  export interface Buy {
    id: string;
    resource: string;
    resource_path: string;
  }

  export interface Details {
    title: string;
    subtitle: string;
    payment_method_name: string;
  }

  export interface Client2 {
    baseApiUri: string;
    tokenUri: string;
    caFile: string[];
    strictSSL: boolean;
    apiKey: string;
    apiSecret: string;
  }

  export interface Balance {
    amount: string;
    currency: string;
  }

  export interface NativeBalance {
    amount: string;
    currency: string;
  }

  export interface Account {
    client: Client2;
    id: string;
    name: string;
    primary: boolean;
    type: string;
    currency: string;
    balance: Balance;
    created_at: Date;
    updated_at: Date;
    resource: string;
    resource_path: string;
    native_balance: NativeBalance;
  }

  export interface Transaction {
    client: Client;
    id: string;
    type: string;
    status: string;
    amount: Amount;
    native_amount: NativeAmount;
    description?: any;
    created_at: Date;
    updated_at: Date;
    resource: string;
    resource_path: string;
    instant_exchange: boolean;
    buy?: Buy;
    sell?: any;
    details: Details;
    account: Account;
  }
}

const state = {
  exchangeName: 'coinbase',
  isLoggedIn: false,
  client: null,
  getAccount: null,
  getAccounts: null,
};

const withLogin = withLoginFactory(state);

function init(): void {
  const API_KEY = auth.getKey('coinbase');
  const API_SECRET = auth.getSecret('coinbase');

  if (state.isLoggedIn || !API_KEY || !API_SECRET) return;

  const client = new Client({
    apiKey: API_KEY,
    apiSecret: API_SECRET,
  });

  state.client = client;
  state.getAccount = promisify(client.getAccount.bind(client));
  state.getAccounts = promisify(client.getAccounts.bind(client));
  state.isLoggedIn = true;
}

interface CoinbaseBalance {
  amount: string;
  currency: string;
}

const toBalances = R.pipe(
  R.map(R.prop('balance')),
  R.reduce((acc, b: CoinbaseBalance) => {
    const total = acc[b.amount] || 0;
    acc[b.currency] = total + parseFloat(b.amount);
    return acc;
  }, {}),
);

async function balances(): Promise<Balances> {
  const accountData = await state.getAccounts({});
  return toBalances(accountData) as Balances;
}

const toTotal = R.pipe<Coinbase.Transaction[], Coinbase.Transaction[], number[], number>(
  (txs: Coinbase.Transaction[]) => R.filter(R.eqProps('type', { type: 'buy' }), txs),
  R.map(R.pipe(R.prop('native_amount'), R.prop('amount'), parseFloat)),
  R.sum,
);

interface TransactionResponse {
  txns: {}[];
  pagination?: {
    next_uri: string;
  };
}

function getTransactions(account, pagination = null): Promise<TransactionResponse> {
  let resolve;
  let reject;

  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  account.getTransactions(pagination, (err, txns, pagination) => {
    if (err) return reject(err);
    resolve({
      txns,
      pagination,
    });
  });

  return promise as Promise<TransactionResponse>;
}

async function getAllTransactionsForAccount(account) {
  let txns = [];
  let pagination;

  const response = await getTransactions(account);
  txns = txns.concat(response.txns);
  pagination = response.pagination;

  while (pagination && pagination.next_uri) {
    const response = await getTransactions(account, pagination);
    txns = txns.concat(response.txns);
    pagination = response.pagination;
  }

  return txns;
}

async function getAllTransactions(): Promise<Coinbase.Transaction[]> {
  const accountData = await state.getAccounts({});

  let txs = [];
  for (const accountD of accountData) {
    const account = await state.getAccount(accountD.id);
    const transactions: Coinbase.Transaction[] = await getAllTransactionsForAccount(account);
    txs = txs.concat(transactions);
  }

  return txs;
}

async function totalSpent(): Promise<number> {
  const txs = await getAllTransactions();
  return toTotal(txs);
}

async function buy(options: TradeOptions): Promise<number> {
  throw new Error('Buy not implemented');

  // getAccount(await accounts)
}

async function sell(options: TradeOptions): Promise<number> {
  throw new Error('Sell not implemented');
}

async function tickers(): Promise<Tickers> {
  const getSpotPrice = promisify(
    state.client.getBuyPrice.bind(state.client),
  );

  const data = await Promise.all([
    getSpotPrice({ currencyPair: 'BTC-USD' }),
    getSpotPrice({ currencyPair: 'LTC-USD' }),
    getSpotPrice({ currencyPair: 'ETH-USD' }),
  ]);

  const [btc, ltc, eth] = data.map(x => x.data);

  return {
    USDT_BTC: {
      currencyPair: 'USDT_BTC',
      last: btc.amount,
      lowestAsk: btc.amount,
      highestBid: btc.amount,
      percentChange: 0,
      baseVolume: 0,
      quoteVolume: 0,
      isFrozen: false,
      '24hrHigh': btc.amount,
      '24hrLow': btc.amount,
    },
    USDT_LTC: {
      currencyPair: 'USDT_LTC',
      last: ltc.amount,
      lowestAsk: ltc.amount,
      highestBid: ltc.amount,
      percentChange: 0,
      baseVolume: 0,
      quoteVolume: 0,
      isFrozen: false,
      '24hrHigh': ltc.amount,
      '24hrLow': ltc.amount,
    },
    USDT_ETH: {
      currencyPair: 'USDT_ETH',
      last: eth.amount,
      lowestAsk: eth.amount,
      highestBid: eth.amount,
      percentChange: 0,
      baseVolume: 0,
      quoteVolume: 0,
      isFrozen: false,
      '24hrHigh': eth.amount,
      '24hrLow': eth.amount,
    },
  };
}

const toCurrency = (x: string) => {
  if (x.toUpperCase() === 'USD') return 'USDT';
  return x.toUpperCase();
};

const toCurrencyPair = (x: Coinbase.Transaction) => {
  return [
    toCurrency(x.native_amount.currency),
    toCurrency(x.amount.currency),
  ].join('_');
};

function toTrade(x: Coinbase.Transaction): Trade {
  const amount = parseFloat(x.amount.amount);
  const total = parseFloat(x.native_amount.amount);
  return {
    currencyPair: toCurrencyPair(x),
    date: moment(x.updated_at),
    type: (x.type) as 'buy' | 'sell',
    amount,
    total,
    rate: (total / amount),
  };
}

function toTrades(xs: Coinbase.Transaction[]): Trade[] {
  return R.pipe<Coinbase.Transaction[], Coinbase.Transaction[], Trade[]>(
    R.filter(R.either(x => x.type === 'buy', x => x.type === 'sell')),
    R.map(toTrade),
  )(xs);
}

async function trades(): Promise<TradeHistory> {
  const txs = await getAllTransactions();
  const trades = toTrades(txs);
  return R.groupBy((x: Trade) => x.currencyPair, trades);
}

function toDeposit(x: Coinbase.Transaction): Deposit {
  if (x.type !== 'buy') throw new Error('We consider BUY transaction to be deposits');

  return {
    date: moment(x.created_at),
    amount: parseFloat(x.native_amount.amount),
    currency: toCurrency(x.native_amount.currency),
  };
}

const toDeposits = R.pipe<Coinbase.Transaction[], Coinbase.Transaction[], Deposit[]>(
  R.filter((x: Coinbase.Transaction) => x.type === 'buy'),
  R.map(toDeposit),
);

function toWithdrawal(x: Coinbase.Transaction): Withdrawal {
  if (x.type !== 'send') throw new Error('We consider SEND transactions to be withdrawals');

  return {
    date: moment(x.created_at),
    amount: Math.abs(parseFloat(x.amount.amount)),
    currency: x.amount.currency,
  };
}

const toWithdrawals = R.pipe<Coinbase.Transaction[], Coinbase.Transaction[], Withdrawal[]>(
  R.filter((x: Coinbase.Transaction) => x.type === 'send'),
  R.map(toWithdrawal),
);

async function depositsAndWithdrawals(): Promise<DepositsAndWithdrawals> {
  const txs = await getAllTransactions();

  return {
    deposits: toDeposits(txs),
    withdrawals: toWithdrawals(txs),
  };
}

export interface CoinbaseApi extends Api {
  totalSpent(): Promise<number>;
}

const api: CoinbaseApi = {
  name: 'coinbase',
  init,
  balances: withLogin(balances),
  totalSpent: withLogin(totalSpent),
  tickers: withLogin(tickers),
  sell: withLogin(sell),
  buy: withLogin(buy),
  trades: withLogin(trades),
  addresses: () => {
    throw new Error('not implemented');
  },
  buyRate: () => {
    throw new Error('not implemented');
  },
  sellRate: () => {
    throw new Error('not implemented');
  },
  depositsAndWithdrawals: withLogin(depositsAndWithdrawals),
};

export default api;
