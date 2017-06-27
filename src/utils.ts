import './types/api';
import * as R from 'ramda'

export const sellRate = (currencyPair, tickers: Tickers) => tickers[currencyPair].highestBid
export const buyRate = (currencyPair, tickers: Tickers) => tickers[currencyPair].lowestAsk
export const sleep = ms => new Promise(r => setTimeout(r, ms))
export const nonZeroBalances = R.pipe(
  R.map(parseFloat),
  R.filter(x => x > 0)
)

export const toBTC = (value, currency, tickers) => {
  if (currency === 'BTC') return value
  return value * parseFloat(R.path([`BTC_${currency}`, 'last'], tickers) as string)
}

export const btcToUSD = (value, tickers) => {
  return value * parseFloat(tickers.USDT_BTC.last)
}

export const toUSD = (balances, tickers) => {
  const convert = (value, currency) => {
    const btc = toBTC(value, currency, tickers)
    return btcToUSD(btc, tickers)
  }
  return R.mapObjIndexed(convert, nonZeroBalances(balances))
}

export const toCAD = (balances, tickers, btcToCad) => {
  const convert = (value, currency) => {
    const btc = toBTC(value, currency, tickers)
    return btcToCad * btc
  }
  return R.mapObjIndexed(convert, nonZeroBalances(balances))
}
