import * as R from 'ramda'
import api from './api'
import trade from './trade'
import { sleep } from './utils'
import * as ProgressBar from 'progress';

const BLACKLIST = [
  'BTC',
  'DOGE',
  'POT',
  'LTC',
  'ETC',
  'ETH',
]
const log = console.log.bind(console)

export async function execute(fromAmount, n = 30, fromCoin = 'ETH') {
  const fromAmountToBuyAsBTC = fromAmount * (n - 1) / n
  const btcAmount = fromCoin !== 'BTC'
    ? await trade(fromAmountToBuyAsBTC, fromCoin, 'BTC', `BTC_${fromCoin}`)
    : fromAmount

  if (btcAmount === 0) {
    log(`FAILURE: COULD NOT TURN ${fromCoin} INTO BTC`)
    return
  }

  if (fromCoin !== 'BTC') {
    log(`SUCCESS: SOLD ${fromAmountToBuyAsBTC} ${fromCoin} for ${btcAmount} BTC`)
  }

  const topCoins = (await getTopByVolume())
    .filter(x => !R.contains(x, BLACKLIST))
    .filter(x => x !== fromCoin)
  const coinsToBuy = R.take(n, topCoins);
  const N = coinsToBuy.length; // because it might be smaller than N

  const btcValueOfCoin = btcAmount / (N - 1)
  log(`SPLITTING ${btcAmount} BTC into ${N} currencies, COIN VALUE ${btcValueOfCoin} BTC`)

  const bar = new ProgressBar(':bar :current/:total eta: :etas\n', {
    total: N,
  });

  const unable = []
  const amounts = coinsToBuy.map(
    coin => [coin, trade(btcValueOfCoin, 'BTC', coin, `BTC_${coin}`)]
  );

  for (const coinAndAmountPromise of amounts) {
    const coin = coinAndAmountPromise[0];
    const amount = await coinAndAmountPromise[1];

    if (amount === 0) {
      log(`FAILURE: COULD NOT BUY ${coin} for ${btcValueOfCoin} BTC`)
      unable.push(coin)
    } else {
      log(`SUCCESS: BOUGHT ${amount} ${coin} for ${btcValueOfCoin} BTC`)
    }

    bar.tick();
  }

  if (unable.length > 0) {
    log(`COULD NOT buy [${unable.join(', ')}]`)
  }
}

export async function getTopByVolume() {
  const tickers = await api.tickers()
  return topByVolume(tickers)
}

const startsWith = s => x => x.startsWith(s)

const toBool = x => !!parseInt(x)
const sortByVolume = R.sortBy(R.pipe(R.path(['1', 'baseVolume']), parseFloat, R.negate))
const removeFrozen = R.filter(R.pipe(R.path(['1', 'isFrozen']), toBool, R.not))
const startsWithBTC = R.filter(R.pipe(R.prop('0'), startsWith('BTC')))

const topByVolume = R.pipe(
  R.toPairs,
  startsWithBTC,
  removeFrozen,
  sortByVolume,
  R.map(R.pipe(R.head, R.split('_'), R.last as (a: Array<string>) => string)),
);
