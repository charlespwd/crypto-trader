import poloniex from './poloniex';
import coinbase from './coinbase';
import bittrex from './bittrex';
import { MockApi } from './mock';
import allapis from './allapis';

const mockapi = new MockApi();

export {
  allapis,
  coinbase,
  poloniex,
  bittrex,
  mockapi,
};
