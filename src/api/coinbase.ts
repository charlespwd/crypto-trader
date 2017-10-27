import * as request from 'request-promise-native';
import { Client } from 'coinbase';
import { promisify } from 'util';
import * as R from 'ramda';
import * as auth from '../auth';
import { withLoginFactory } from '../utils';

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

const toTotal = R.pipe(
  (txs: {}[]) => R.filter(R.eqProps('type', { type: 'buy' }), txs),
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

async function getAllTransactions(account) {
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

async function totalSpent(): Promise<number> {
  const accountData = await state.getAccounts({});

  let txs = [];
  for (const accountD of accountData) {
    const account = await state.getAccount(accountD.id);
    const transactions = await getAllTransactions(account);
    txs = txs.concat(transactions);
  }

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
  throw new Error('Tickers not implemented');
}

interface CoinbaseApi extends Api {
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
  trades: () => {
    throw new Error('not implemented');
  },
  addresses: () => {
    throw new Error('not implemented');
  },
  buyRate: () => {
    throw new Error('not implemented');
  },
  sellRate: () => {
    throw new Error('not implemented');
  },
};

export default api;
