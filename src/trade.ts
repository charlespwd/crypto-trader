import * as R from 'ramda'
import { buyRate, sellRate } from './utils'
import api from './api'
import { sleep } from './utils'
import { PROD } from './constants'

// Some definitons, for a currencyPair BTC_ETH
// amount = (price in ETH)
// total = (price in BTC)
// rate = X BTC / ETH
const isBuyOrder = (fromCoin, toCoin, currencyPair) => {
  if ([fromCoin, toCoin].join('_') === currencyPair) {
    return true;
  } else if ([toCoin, fromCoin].join('_') === currencyPair) {
    return false;
  } else {
    throw new Error(`${fromCoin} and ${toCoin} do not form ${currencyPair}`)
  }
}

const parseResponseOrder = (isBuyOrder) => R.pipe(
  R.prop('resultingTrades'),
  R.map(R.pipe(
    R.prop(isBuyOrder ? 'amount' : 'total'),
    parseFloat,
  )),
  R.sum
);

function getRate(isBuyOrder, currencyPair, tickers): any {
  return isBuyOrder
    ? buyRate(currencyPair)(tickers)
    : sellRate(currencyPair)(tickers)
}

function getAmount(isBuyOrder, amount: number, rate: any) {
  return isBuyOrder
    ? amount / parseFloat(rate)
    : amount
}

function getTotal(isBuyOrder, amount: number, rate: any) {
  return isBuyOrder
    ? amount
    : amount * parseFloat(rate)
}

function successfulResponse(isBuying, amount, total, rate) {
  return {
    orderNumber: 31226040,
    resultingTrades: [
      {
        amount: amount.toString(),
        date: "2014-10-18 23:03:21",
        rate: amount.toString(),
        total: total.toString(),
        "tradeID": "16164",
        "type": isBuying ? "buy" : 'sell',
      }
    ]
  }
}

// Scenarios
// | fromCoin | toCoin | Trade Type | return value
// | ------   | ----   | ---------- | ----------
// | BTC      | ETH    | buy        | ETH (amount)
// | ETH      | BTC    | sell       | BTC (total)
export default async function trade(fromAmount, fromCoin, toCoin, currencyPair, n = 0) {
  const isBuying = isBuyOrder(fromCoin, toCoin, currencyPair);
  const parseResponse = parseResponseOrder(isBuying);
  const tradeFn = isBuying ? api.buy : api.sell;

  try {
    const tickers = await api.tickers()
    const rate = getRate(isBuying, currencyPair, tickers)
    const amount = getAmount(isBuying, fromAmount, rate)
    const total = getTotal(isBuying, fromAmount, rate)
    console.log(`TRADING: ${fromAmount} ${fromCoin} => ${isBuying ? amount : total} ${toCoin}`);

    if (amount < 0.001 || n > 5) return 0;

    const response = PROD
      ? await tradeFn({ amount, currencyPair, rate })
      : successfulResponse(isBuying, amount, total, rate)

    return parseResponse(response);
  } catch(e) {
    console.log(`Failed to ${isBuying ? 'buy' : 'sell'} ${toCoin}, retry count: ${n}, retrying in 2s`);
    console.error(e);
    await sleep(2000);
    return trade(fromAmount, fromCoin, toCoin, currencyPair, n + 1);
  }
}
