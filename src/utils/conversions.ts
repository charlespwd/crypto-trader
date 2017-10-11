import {
  filter,
  mapObjIndexed,
  merge,
  path,
  toPairs,
} from 'ramda';
import * as bfs from './bfs';

export const nonZeroBalances = filter(x => x > 0);

export const btcToUSD = (value: number, tickers: Tickers) => {
  return estimate(value, 'BTC', 'USDT', tickers);
};

export const toUSDBalances = (balances: Balances, tickers: Tickers): Balances => {
  const graph = tickersToGraph(tickers);
  const convert = (value, currency) => estimateFromGraph(value, currency, 'USDT', graph);
  return mapObjIndexed(
    convert,
    nonZeroBalances(balances),
  );
};

export const toCADBalances = (balances: Balances, tickers: Tickers, usdPerCad: number) => {
  const graph = tickersToGraph(merge(tickers, {
    USDT_CAD: {
      last: usdPerCad,
    },
  }));
  const convert = (value, currency) => estimateFromGraph(value, currency, 'CAD', graph);
  return mapObjIndexed(convert, nonZeroBalances(balances));
};

function setEdgeValue(edges, start, end, value) {
  if (!edges[start]) edges[start] = {};
  edges[start][end] = value;
}

type RateFromAtoB = number; // 1 a = RateFromAtoB b
export function tickersToGraph(tickers: Tickers): bfs.Graph<RateFromAtoB> {
  const nodes = new Set();
  const edges = {};

  for (const [currencyPair, ticker] of toPairs<string, Ticker>(tickers)) {
    const [base, token] = currencyPair.split('_');
    nodes.add(base);
    nodes.add(token);
    setEdgeValue(edges, base, token, 1 / ticker.last);
    setEdgeValue(edges, token, base, ticker.last);
  }

  return {
    nodes,
    edges,
  };
}

export function estimate(fromAmount: number, fromCoin: string, toCoin: string, tickers: Tickers): number {
  const graph = tickersToGraph(tickers);
  return estimateFromGraph(fromAmount, fromCoin, toCoin, graph);
}

function estimateFromGraph(fromAmount: number, fromCoin: string, toCoin: string, graph: bfs.Graph<RateFromAtoB>): number {
  if (fromCoin === toCoin) return fromAmount;
  const rates = bfs.bfs(graph, fromCoin, toCoin);
  if (!rates) throw new Error(`Cannot convert ${fromCoin} to ${toCoin}.`);
  const rate = rates.reduce((a, b) => a * b, 1);
  return fromAmount * rate;
}
