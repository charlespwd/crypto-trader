import poloniex from './poloniex';
import coinbase from './coinbase';
import bittrex from './bittrex';
import { MockApi } from './mock';

const mockapi = new MockApi();

export {
  coinbase,
  poloniex,
  bittrex,
  mockapi,
};
