import '../types/api'
import stream from './ticker-stream'

let tickers: Tickers

stream.subscribe('ticker', function logTicker(args, kwargs) {
  console.log('ticker', args)
})

stream.subscribe('BTC_ETH', function(args, kwargs) {
  console.log('BTC_ETH', args)
})

export function getTickers(getInitialValue): () => Promise<Tickers> {
  return async () => {
    if (!tickers) {
      tickers = await getInitialValue()
    }

    return tickers
  }
}

export function setTickers(newTickers: Tickers) {
  tickers = newTickers
}

export function openTickerStream() {
  stream.open();
}

export function closeTickerStream() {
  stream.close();
}
