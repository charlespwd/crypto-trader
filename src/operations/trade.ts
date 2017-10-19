import * as R from 'ramda';
import { sleep, log, enqueue } from '../utils';
import { IS_DRY_RUN_DEFAULT } from '../constants';

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

export function getRate(api: Api, isBuyOrder: boolean, currencyPair: string, tickers: Tickers): number {
  return isBuyOrder
    ? api.buyRate(currencyPair, tickers)
    : api.sellRate(currencyPair, tickers);
}

export function getAmount(isBuyOrder: boolean, amount: number, rate: number): number {
  return isBuyOrder
    ? amount / rate
    : amount;
}

export function getTotal(isBuyOrder: boolean, amount: number, rate: number): number {
  return isBuyOrder
    ? amount
    : amount * rate;
}

async function successfulResponse(isBuying, amount, total, rate) {
  return isBuying ? amount : total;
}

interface MakeTradeOptions {
  api: Api;
  fromAmount: number;
  fromCoin: string;
  toCoin: string;
  currencyPair: string;
  retryCount?: number;
  isDryRun?: boolean;
}

export default async function trade({
  api,
  fromAmount,
  fromCoin,
  toCoin,
  currencyPair,
  retryCount = 0,
  isDryRun = IS_DRY_RUN_DEFAULT,
}: MakeTradeOptions): Promise<number> {
  if (toCoin === fromCoin) return fromAmount;
  const isBuying = isBuyOrder(fromCoin, toCoin, currencyPair);
  const tradeFn = isBuying ? api.buy : api.sell;

  try {
    const tickers = await api.tickers();
    const rate = getRate(api, isBuying, currencyPair, tickers);
    const amount = getAmount(isBuying, fromAmount, rate);
    const total = getTotal(isBuying, fromAmount, rate);
    log(`TRADING${isDryRun ? ' [dry run]' : ''}: ${fromAmount} ${fromCoin} => ${isBuying ? amount : total} ${toCoin}`);

    if (amount < 0.001 || retryCount > 5) return 0;

    return !isDryRun
      ? await tradeFn({ amount: amount.toString(), currencyPair, rate: rate.toString() })
      : await enqueue(R.partial(successfulResponse, [isBuying, amount, total, rate])) as number;
  } catch (e) {
    if (retryCount > 5) return 0;
    log(`Failed to ${isBuying ? 'buy' : 'sell'} ${toCoin}, retry count: ${retryCount}, retrying in 2s`);
    console.error(e);
    await sleep(2000);
    return trade({
      api,
      fromAmount,
      fromCoin,
      toCoin,
      currencyPair,
      retryCount: retryCount + 1,
      isDryRun,
    });
  }
}
