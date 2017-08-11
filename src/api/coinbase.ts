import '../types/api';
import { Client } from 'coinbase';
import { promisify } from 'util';
import * as R from 'ramda';

const API_KEY = process.env.COINBASE_API_KEY;
const API_SECRET = process.env.COINBASE_API_SECRET;
const client = new Client({
  apiKey: API_KEY,
  apiSecret: API_SECRET,
});

const getAccount = promisify(client.getAccount.bind(client));
const getAccounts = promisify(client.getAccounts.bind(client));

interface CoinbaseBalance {
  amount: string,
  currency: string,
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
  const accountData = await getAccounts({});
  return toBalances(accountData) as Balances;
}

const toTotal = R.pipe(
  R.filter(R.eqProps('type', { type: 'buy' })),
  R.map(R.pipe(R.prop('native_amount'), R.prop('amount'), parseFloat)),
  R.sum
)

async function totalSpent(): Promise<number> {
  const accountData = await getAccounts({});
  console.log(accountData[0].getTransactions);

  let txs = [];
  for (const accountD of accountData) {
    const account = await getAccount(accountD.id);
    const getTransactions = promisify(account.getTransactions.bind(account))
    const transactions = await getTransactions(null);
    txs = txs.concat(transactions)
  }

  return toTotal(txs);
}

interface CoinbaseApi {
  balances(): Promise<Balances>,
  totalSpent(): Promise<number>,
  // transactions: Promise<Transactions>
}

const api: CoinbaseApi = {
  balances,
  totalSpent,
}

export default api;
