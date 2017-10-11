import * as R from 'ramda';
import trade, { isDryRunDefault } from './trade';
import * as fiat from '../fiat';
import { sleep, log, estimate } from '../utils';

const BLACKLIST = [
  'DOGE',
  'POT',
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

export async function execute(
  api: Api,
  fromAmount: number,
  strategy: Strategy,
  fromCoin = 'ETH',
  isDryRun = isDryRunDefault,
) {
  if (isDryRun) {
    log('\nThis is a dry run. These are not real trades.');
  }

  const [fiatTickers, cryptoTickers] = await Promise.all([
    fiat.tickers(),
    api.tickers(),
  ]);
  const tickers = R.merge(cryptoTickers, fiatTickers);

  log(`SPLITTING ${fromAmount} ${fromCoin} (approx ${estimate(fromAmount, fromCoin, 'CAD', tickers).toFixed(2)} CAD)`);

  const coinsToBuy = await getCoinsToBuy(strategy, api, fromCoin);
  const N = coinsToBuy.length;
  const fromAmountToBuyAsBTC = fromAmount * N / (N + 1);
  const btcAmount = fromCoin !== 'BTC'
    ? await trade({
      api,
      fromAmount: fromAmountToBuyAsBTC,
      fromCoin,
      toCoin: 'BTC',
      currencyPair: `BTC_${fromCoin}`,
      isDryRun,
    })
    : fromAmountToBuyAsBTC;

  if (btcAmount === 0) {
    log(`FAILURE: COULD NOT TURN ${fromCoin} INTO BTC`);
    return;
  }

  if (fromCoin !== 'BTC') {
    log(`SUCCESS: SOLD ${fromAmountToBuyAsBTC} ${fromCoin} for ${btcAmount} BTC`);
  }

  const btcValueOfCoin = btcAmount / N;
  log(`SPLITTING ${btcAmount} BTC into ${N} currencies, COIN VALUE ${btcValueOfCoin} BTC`);

  if (btcValueOfCoin < 0.00050000) {
    throw new Error(`50K SAT minimum per trade try splitting ${fromAmount} ${fromCoin} into ${Math.floor(btcAmount / 0.0005) + 1} coins`);
  }

  const unable = [];
  const amounts = coinsToBuy.map(
    coin => [
      coin,
      trade({
        api,
        fromAmount: btcValueOfCoin,
        fromCoin: 'BTC',
        toCoin: coin,
        currencyPair: `BTC_${coin}`,
        isDryRun,
      }),
    ],
  ) as [string, Promise<number>][];

  for (const coinAndAmountPromise of amounts) {
    const coin = coinAndAmountPromise[0];
    const amount = await coinAndAmountPromise[1];

    if (amount === 0) {
      log(`FAILURE: COULD NOT BUY ${coin} for ${btcValueOfCoin} BTC`);
      unable.push(coin);
    } else {
      const estimatedCadValue = estimate(amount, coin, 'CAD', tickers);
      log(`SUCCESS: BOUGHT ${amount} ${coin} for ${btcValueOfCoin} BTC (approx ${estimatedCadValue.toFixed(2)} CAD)`);
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
