import * as R from 'ramda';
import trade from './trade';
import { sleep, log } from '../utils';

const BLACKLIST = [
  'BTC',
  'DOGE',
  'POT',
  'LTC',
  'ETC',
];

interface TopByVolume {
  type: 'top-by-volume';
  n: number;
}

interface NamedList {
  type: 'named-list';
  value: string[];
}

type Strategy = TopByVolume | NamedList;

export function topByVolumeStrategy(n = 30): TopByVolume {
  return {
    type: 'top-by-volume',
    n,
  };
}

export function namedListStrategy(list: string[]): NamedList {
  return {
    type: 'named-list',
    value: R.map(R.toUpper, list),
  };
}

const getN = (s: Strategy) => {
  switch (s.type) {
    case 'top-by-volume': return s.n;
    case 'named-list': return s.value.length;
    default: throw new Error('not supported!');
  }
};

async function getCoinsToBuy(s: Strategy, api: Api, fromCoin: string): Promise<string[]> {
  switch (s.type) {
    case 'top-by-volume': {
      return R.take(s.n, (await getTopByVolume(api))
        .filter(x => !R.contains(x, BLACKLIST))
        .filter(x => x !== fromCoin));
    }
    case 'named-list': {
      return s.value
        .filter(x => !R.contains(x, BLACKLIST))
        .filter(x => x !== fromCoin);
    }
  }
}

export async function execute(api: Api, fromAmount: number, strategy: Strategy, fromCoin = 'ETH') {
  const n = getN(strategy);

  // We keep some of fromCoin and we keep some bitcoin, therefore we have
  // a total of n+2 coins.
  const fromAmountToBuyAsBTC = fromAmount * (n + 1) / (n + 2);
  const btcAmount = fromCoin !== 'BTC'
    ? await trade(api, fromAmountToBuyAsBTC, fromCoin, 'BTC', `BTC_${fromCoin}`)
    : fromAmount;

  if (btcAmount === 0) {
    log(`FAILURE: COULD NOT TURN ${fromCoin} INTO BTC`);
    return;
  }

  if (fromCoin !== 'BTC') {
    log(`SUCCESS: SOLD ${fromAmountToBuyAsBTC} ${fromCoin} for ${btcAmount} BTC`);
  }

  const coinsToBuy = await getCoinsToBuy(strategy, api, fromCoin);
  const N = coinsToBuy.length; // because it might be smaller than N

  const btcValueOfCoin = btcAmount / (N + 1);
  log(`SPLITTING ${btcAmount} BTC into ${N + 1} currencies, COIN VALUE ${btcValueOfCoin} BTC`);

  if (btcValueOfCoin < 0.00050000) {
    // 0.0005 = from / (N + 1) => N = from / 0.0005 - 1
    throw new Error(`50K SAT minimum per trade try splitting ${fromAmount} BTC into ${Math.floor(btcAmount / 0.0005) - 1} coins`);
  }

  const unable = [];
  const amounts = coinsToBuy.map(
    coin => [coin, trade(api, btcValueOfCoin, 'BTC', coin, `BTC_${coin}`)],
  );

  for (const coinAndAmountPromise of amounts) {
    const coin = coinAndAmountPromise[0];
    const amount = await coinAndAmountPromise[1];

    if (amount === 0) {
      log(`FAILURE: COULD NOT BUY ${coin} for ${btcValueOfCoin} BTC`);
      unable.push(coin);
    } else {
      log(`SUCCESS: BOUGHT ${amount} ${coin} for ${btcValueOfCoin} BTC`);
    }
  }

  if (unable.length > 0) {
    log(`COULD NOT buy [${unable.join(', ')}]`);
  }
}

export async function getTopByVolume(api) {
  const tickers = await api.tickers();
  return topByVolume(tickers);
}

const toBool = (x: any) => !!parseInt(x, 10);
const sortByVolume = R.sortBy(R.pipe(R.path(['1', 'baseVolume']), parseFloat, R.negate));
const removeFrozen = R.filter(R.pipe(R.path(['1', 'isFrozen']), toBool, R.not));
const startsWithBTC = R.filter(R.pipe(R.prop('0'), R.startsWith('BTC')));

const topByVolume = R.pipe(
  R.toPairs,
  startsWithBTC,
  removeFrozen,
  sortByVolume,
  R.map(R.pipe(R.head, R.split('_'), R.last as (a: string[]) => string)),
);
