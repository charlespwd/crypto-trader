import '../types/api';
import '../types/operations';
import * as EventEmitter from 'events';
import {
  all,
  map,
  prop,
  sum,
} from 'ramda';
import {
  tradePath,
  sleep,
} from '../utils';
import {
  getRate,
  getAmount,
  getTotal,
} from './trade';

export interface DiversificationSpec {
  toCoin: string;
  ratio: number; // [0, 1]
}

async function withRetry(fn, ms = 250, n = 5) {
  try {
    return await fn();
  } catch (e) {
    await sleep(ms);
    if (n > 0) {
      return withRetry(fn, ms, n - 1);
    } else {
      throw e;
    }
  }
}

export class DiversificationStrategy extends EventEmitter {
  static EVENTS = {
    TRADE_SUCCESS: 'trade:success',
    TRADE_FAILURE: 'trade:failure',
  };
  private api: Api;
  private ms: number;

  constructor({ api, ms = 250 }) {
    super();
    this.api = api;
    this.ms = ms;
  }

  execute(fromAmount: number, fromCoin: string, specs: DiversificationSpec[]) {
    this.checkRatios(specs);
    return this.performTrades(fromAmount, fromCoin, specs);
  }

  private async performTrades(fromAmount: number, fromCoin: string, specs: DiversificationSpec[]): Promise<Operations.TradeResults> {
    this.checkPaths(fromCoin, specs, await this.api.tickers());

    const results = await Promise.all(specs.map(({ toCoin, ratio }) => (
      this.makeTrades(fromAmount, fromCoin, ratio, toCoin)
    )));

    return {
      failedTrades: results.filter(x => x.status === 'failure') as Operations.FailedTrade[],
      successfulTrades: results.filter(x => x.status === 'success') as Operations.SuccessfulTrade[],
    };
  }

  private async makeTrades(fromAmount, fromCoin, ratio, toCoin): Promise<Operations.TradeResult> {
    const tickers = await this.api.tickers();
    const path = tradePath(fromCoin, toCoin, tickers);
    let amount = fromAmount * ratio;
    for (const { currencyPair, tradeType } of path) {
      try {
        amount = await this.trade(amount, currencyPair, tradeType, tickers);
      } catch (e) {
        return {
          status: 'failure',
          toCoin,
          fromAmount: amount,
          currencyPair,
          tradeType,
          reason: e,
        };
      }
    }

    return {
      status: 'success',
      toCoin,
      toAmount: amount,
      fromAmount: fromAmount * ratio,
      fromCoin,
    };
  }

  private trade(fromAmount, currencyPair, tradeType, tickers) {
    const isBuying = tradeType === 'buy';
    const rate = getRate(this.api, isBuying, currencyPair, tickers);
    const amount = getAmount(isBuying, fromAmount, rate);
    const total = getTotal(isBuying, fromAmount, rate);
    const tradeFn = isBuying ? this.buy.bind(this) : this.sell.bind(this);

    return tradeFn({
      currencyPair,
      amount: amount.toString(),
      rate: rate.toString(),
    });
  }

  private buy(options) {
    return withRetry(() => this.api.buy(options), this.ms);
  }

  private sell(options) {
    return withRetry(() => this.api.sell(options), this.ms);
  }

  private checkPaths(fromCoin, specs: DiversificationSpec[], tickers) {
    return all(({ toCoin }) => !!tradePath(fromCoin, toCoin, tickers), specs);
  }

  private checkRatios(specs: DiversificationSpec[]) {
    if (!all(x => x.ratio > 0, specs)) {
      throw new Error('Negative or zero ratios not allowed');
    }

    const ratioSum = sum(map(x => x.ratio, specs)) || 0;
    if (ratioSum > 1 || ratioSum < 0) {
      throw new Error('Ratio sum should be in [0, 1]');
    }
  }
}
