import * as mock from './mock';

import poloniex from './poloniex';
import coinbase from './coinbase';
import bittrex from './bittrex';
import allapis from './allapis';
import * as fiat from './fiat';

const mockapi = new mock.MockApi();

export {
  allapis,
  bittrex,
  coinbase,
  fiat,
  mock,
  mockapi,
  poloniex,
};
