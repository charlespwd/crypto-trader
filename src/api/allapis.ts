import poloniex from './poloniex';
import coinbase from './coinbase';
import bittrex from './bittrex';
import { add, merge, mergeWith, reduce } from 'ramda';

const apis = [
  poloniex,
  coinbase,
  bittrex,
];

const allApis: Api = {
  name: 'all',

  init: () => {},
  tickers: async () => {
    const tickers = await Promise.all(apis.filter(x => x.name !== 'coinbase').map(x => x.tickers()));
    return tickers.reduce(merge);
  },
  addresses: () => { throw new Error('This makes no sense'); },
  balances: async () => {
    const balances = await Promise.all(apis.map(x => x.balances()));
    return balances.reduce(mergeWith(add));
  },
  buy: () => { throw new Error('This makes no sense'); },
  sell: () => { throw new Error('This makes no sense'); },
  buyRate: () => { throw new Error('This makes no sense'); },
  sellRate: () => { throw new Error('This makes no sense'); },
  trades: () => { throw new Error('This makes no sense'); },
};

export default allApis;
