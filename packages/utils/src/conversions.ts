import {
  filter,
  mapObjIndexed,
  merge,
  path,
  toPairs,
} from 'ramda';
import { log } from './log';
import * as bfs from './bfs';
export const nonZeroBalances = filter(x => x > 0);

export function extractFromAndTo(tradeType: TradeType, currencyPair) {
  const parts = currencyPair.split('_');
  if (tradeType === 'buy') {
    return {
      fromCoin: parts[0],
      toCoin: parts[1],
    };
  } else {
    return {
      fromCoin: parts[1],
      toCoin: parts[0],
    };
  }
}

export function extractFromAmount(tradeType: TradeType, amount, total) {
  switch (tradeType) {
    case 'buy': return total;
    case 'sell': return amount;
  }
}

export function extractToAmount(tradeType: TradeType, amount, total) {
  switch (tradeType) {
    case 'buy': return amount;
    case 'sell': return total;
  }
}

export const btcToUSD = (value: number, tickers: Tickers) => {
  return estimate(value, 'BTC', 'USDT', tickers);
};

function makeConvert(toCoin, graph) {
  return function convert(value, currency) {
    try {
      return estimateFromGraph(value, currency, toCoin, graph);
    } catch (e) {
      if (/Cannot convert/.test(e.message)) {
        log(e.message);
        return 0;
      } else {
        throw e;
      }
    }
  };
}

export const toUSDBalances = (balances: Balances, tickers: Tickers): Balances => {
  const graph = tickersToRateGraph(tickers);
  const convert = makeConvert('USDT', graph);
  return mapObjIndexed(
    convert,
    nonZeroBalances(balances),
  );
};

export const toCADBalances = (balances: Balances, tickers: Tickers, usdPerCad: number) => {
  const graph = tickersToRateGraph(merge(tickers, {
    USDT_CAD: {
      last: usdPerCad,
    },
  }));
  const convert = makeConvert('CAD', graph);
  return mapObjIndexed(convert, nonZeroBalances(balances));
};

function setEdgeValue(edges, start, end, value) {
  if (!edges[start]) edges[start] = {};
  edges[start][end] = value;
}

type tickerToT<T> = (x: Ticker) => T;

function tickersToGraphFactory<T>(
  baseToTokenAction: tickerToT<T>,
  tokenToBaseAction: tickerToT<T>,
) {
  return function (tickers: Tickers): bfs.Graph<T> {
    const nodes = new Set();
    const edges = {};

    for (const [currencyPair, ticker] of toPairs<string, Ticker>(tickers)) {
      const [base, token] = currencyPair.split('_');
      nodes.add(base);
      nodes.add(token);
      setEdgeValue(edges, base, token, baseToTokenAction(ticker));
      setEdgeValue(edges, token, base, tokenToBaseAction(ticker));
    }

    return {
      nodes,
      edges,
    };
  };
}

type RateFromAtoB = number; // 1 a = RateFromAtoB b
const tickersToRateGraph = tickersToGraphFactory(
  ticker => 1 / ticker.last,
  ticker => ticker.last,
);

export function estimatePercentChange(fromCoin: string, toCoin: string, tickers: Tickers): number {
  const graph = tickersToGraphFactory(
    ticker => 1 / (1 + ticker.percentChange) - 1,
    ticker => ticker.percentChange,
  )(tickers);
  const percentChanges = bfs.shortestPath(graph, fromCoin, toCoin);
  if (!percentChanges) throw new Error(`Cannot convert ${fromCoin} to ${toCoin}`);
  return percentChanges.reduce((a, b) => a * (1 + b), 1) * 100 - 100;
}

export function estimate(fromAmount: number, fromCoin: string, toCoin: string, tickers: Tickers): number {
  const graph = tickersToRateGraph(tickers);
  return estimateFromGraph(fromAmount, fromCoin, toCoin, graph);
}

function estimateFromGraph(fromAmount: number, fromCoin: string, toCoin: string, graph: bfs.Graph<RateFromAtoB>): number {
  if (fromCoin === toCoin) return fromAmount;
  const rates = bfs.shortestPath(graph, fromCoin, toCoin);
  if (!rates) throw new Error(`Cannot convert ${fromCoin} to ${toCoin}.`);
  const rate = rates.reduce((a, b) => a * b, 1);
  return fromAmount * rate;
}

// trade conversions
export type BuyOrSell = 'buy' | 'sell';
export type Conversion = {
  currencyPair: string,
  tradeType: BuyOrSell,
};
const conversion = (tradeType, currencyPair) => ({ tradeType, currencyPair });
const tickersToConversionGraph = tickersToGraphFactory(
  ticker => conversion('buy', ticker.currencyPair),
  ticker => conversion('sell', ticker.currencyPair),
);

function tradePathFromConversionGraph(
  fromCoin: string,
  toCoin: string,
  graph: bfs.Graph<Conversion>,
): Conversion[] {
  if (fromCoin === toCoin) return [];
  const conversions = bfs.shortestPath(graph, fromCoin, toCoin);
  if (!conversions) throw new Error(`Cannot convert ${fromCoin} to ${toCoin}.`);
  return conversions;
}

export function tradePath(
  fromCoin: string,
  toCoin: string,
  tickers: Tickers,
): Conversion[] {
  const graph = tickersToConversionGraph(tickers);
  return tradePathFromConversionGraph(fromCoin, toCoin, graph);
}
