import * as R from 'ramda'
import api from './api'
import trade from './trade'
import { sleep } from './utils'

const BLACKLIST = [
  'BTC',
  'DOGE',
  'POT',
  'LTC',
  'ETC',
  'ETH',
]

export async function execute(fromAmount, n = 30, fromCoin = 'ETH') {
  const fromAmountToBuyAsBTC = fromAmount * (n - 1) / n;
  const btcAmount = fromCoin !== 'BTC'
    ? await trade(fromAmountToBuyAsBTC, fromCoin, 'BTC', `BTC_${fromCoin}`)
    : fromAmount;

  if (btcAmount === 0) {
    console.log(`FAILURE: COULD NOT TURN ${fromCoin} INTO BTC`);
    return
  }

  if (fromCoin !== 'BTC') {
    console.log(`SUCCESS: SOLD ${fromAmountToBuyAsBTC} ${fromCoin} for ${btcAmount} BTC`);
  }

  const btcValueOfCoin = btcAmount / (n - 1);
  console.log(`SPLITTING ${btcAmount} BTC into ${n} currencies, COIN VALUE ${btcValueOfCoin} BTC`);

  const topCoins = await getTopNthByVolume(n)
  const coinsToBuy = topCoins
    .filter(x => !R.contains(x, BLACKLIST))
    .filter(x => x !== fromCoin)

  const unable = [];
  for (const coin of coinsToBuy) {
    const amount = await trade(btcValueOfCoin, 'BTC', coin, `BTC_${coin}`);

    if (amount === 0) {
      console.log(`FAILURE: COULD NOT BUY ${coin} for ${btcValueOfCoin} BTC`)
      unable.push(coin)
    } else {
      console.log(`SUCCESS: BOUGHT ${amount} ${coin} for ${btcValueOfCoin} BTC`);
    }

    await sleep(250)
  }

  if (unable.length > 0) {
    console.log(`COULD NOT buy [${unable.join(', ')}]`)
  }
}

export async function getTopNthByVolume(n) {
  const tickers = await api.tickers()
  return topNthByVolume(n)(tickers);
}

const startsWith = s => x => x.startsWith(s)

const toBool = x => !!parseInt(x)
const sortByVolume = R.sortBy(R.pipe(R.path(['1', 'baseVolume']), parseFloat, R.negate))
const removeFrozen = R.filter(R.pipe(R.path(['1', 'isFrozen']), toBool, R.not))
const startsWithBTC = R.filter(R.pipe(R.prop('0'), startsWith('BTC')))

const topNthByVolume = n => R.pipe(
  R.toPairs,
  startsWithBTC,
  removeFrozen,
  sortByVolume,
  R.take(n),
  R.map(R.pipe(R.head, R.split('_'), R.last as (a: Array<string>) => string)),
)
