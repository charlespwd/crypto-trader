import { poloniex, coinbase, bittrex, mockapi } from '../api';
import { IS_DRY_RUN_DEFAULT } from '../constants';

const defaultExchange = IS_DRY_RUN_DEFAULT ? 'mockapi' : 'poloniex';

export default function exchange(exchange: string = defaultExchange): Api {
  switch (exchange) {
    case 'pl':
    case 'pn':
    case 'polo':
    case 'poloniex': return poloniex;

    case 'cb':
    case 'coinbase': return coinbase;

    case 'br':
    case 'bittrex': return bittrex;

    case 'mo':
    case 'mock':
    case 'mockapi': return mockapi;

    default: throw new Error('Unsupported exchange');
  }
}
