import * as R from 'ramda';
import { sleep, log } from './utils';
import { PROD } from './constants';
import { enqueue } from './queue';
import './types/api';

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
    throw new Error(`${fromCoin} and ${toCoin} do not form ${currencyPair}`);
  }
};

function getRate(api: Api, isBuyOrder: boolean, currencyPair: string, tickers: Tickers): number {
  return isBuyOrder
    ? api.buyRate(currencyPair, tickers)
    : api.sellRate(currencyPair, tickers);
}

function getAmount(isBuyOrder: boolean, amount: number, rate: number): number {
  return isBuyOrder
    ? amount / rate
    : amount;
}

function getTotal(isBuyOrder: boolean, amount: number, rate: number): number {
  return isBuyOrder
    ? amount
    : amount * rate;
}

async function successfulResponse(isBuying, amount, total, rate) {
  return isBuying ? amount : total;
}

// Scenarios
// | fromCoin | toCoin | Trade Type | return value
// | ------   | ----   | ---------- | ----------
// | BTC      | ETH    | buy        | ETH (amount)
// | ETH      | BTC    | sell       | BTC (total)
export default async function trade(api: Api, fromAmount: number, fromCoin: string, toCoin: string, currencyPair: string, n = 0): Promise<number> {
  const isBuying = isBuyOrder(fromCoin, toCoin, currencyPair);
  const tradeFn = isBuying ? api.buy : api.sell;

  try {
    const tickers = await api.tickers();
    const rate = getRate(api, isBuying, currencyPair, tickers);
    const amount = getAmount(isBuying, fromAmount, rate);
    const total = getTotal(isBuying, fromAmount, rate);
    log(`TRADING: ${fromAmount} ${fromCoin} => ${isBuying ? amount : total} ${toCoin}`);

    if (amount < 0.001 || n > 5) return 0;

    return PROD
      ? await tradeFn({ amount: amount.toString(), currencyPair, rate: rate.toString() })
      : await enqueue(R.partial(successfulResponse, [isBuying, amount, total, rate])) as number;
  } catch (e) {
    log(`Failed to ${isBuying ? 'buy' : 'sell'} ${toCoin}, retry count: ${n}, retrying in 2s`);
    console.error(e);
    await sleep(2000);
    return trade(api, fromAmount, fromCoin, toCoin, currencyPair, n + 1);
  }
}
