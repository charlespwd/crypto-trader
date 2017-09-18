import '../types/api';
import '../types/operations';
import * as Table from 'cli-table';
import * as R from 'ramda';
import { btcToUSD } from './conversions';
const {
  F,
  contains,
  filter,
  flatten,
  intersection,
  isEmpty,
  isNil,
  map,
  negate,
  pipe,
  prop,
  reject,
  sortBy,
  sum,
  toPairs,
  toUpper,
  values,
  valuesIn,
  startsWith,
} = R;

interface Balances {
  [currency: string]: string;
}

export function formatBalances(balances: Object, usdBalances: Object) {
  const table = new Table({
    head: ['Currency', 'Value', 'USD'],
    colAligns: ['left', 'right', 'right'],
  });

  const pairs = pipe(
    toPairs,
    sortBy(pipe(
      prop('0'),
      x => usdBalances[x as string],
    ) as any),
  )(balances);

  for (const [currency, amount] of pairs as any) {
    table.push([currency, `${amount} ${currency}`, `${usdBalances[currency].toFixed(2) || '??'} USD`]);
  }

  table.push(['Total', '-', sum(valuesIn(usdBalances)).toFixed(2) + ' USD']);

  return table.toString();
}

export function formatAddresses(addresses: DepositAddresses) {
  const table = new Table({
    head: ['Currency', 'Address'],
  });

  const pairs = toPairs(addresses);

  for (const pair of pairs as any) {
    table.push(pair);
  }

  return table.toString();
}

export function formatPairs(tickers: object, currencies: string[]) {
  const head = ['currencyPair', 'last', 'lowestAsk', 'highestBid', 'percentChange', 'baseVolume'];
  const table = new Table({ head });
  const toBeRejected = isNil(currencies)
    ? F
    : pipe(
      prop('0'),
      (pair: string) => intersection((currencies || []).map(toUpper), pair.split('_').concat(pair)),
      isEmpty,
    );

  const pairs = pipe(
    toPairs,
    (x: any[]) => reject(toBeRejected, x),
    map(([currencyPair, props]) => ({
      ...props,
      currencyPair,
    })),
    sortBy(prop('currencyPair')),
  )(tickers);

  for (const pair of pairs) {
    table.push(head.map(k => pair[k]));
  }

  return table.toString();
}

type SortByMethod = 'profit' | 'usd' | 'percent';
function sortByMethod(method: SortByMethod, tickers: Tickers) {
  switch (method) {
    case 'profit': return pair => pair[1].profit;
    case 'usd': return pair => btcToUSD(pair[1].profit, tickers);
    case 'percent': return pair => pair[1].percentProfit;
    default: throw new Error('Sorting method not supported');
  }
}

export function formatPerformances(
  performances: Operations.PerformanceByExchange,
  tickers: Tickers,
  method: SortByMethod = 'usd',
) {
  const table = new Table({
    head: [
      'Pair',
      'Total spent',
      'Estimated Value',
      'Base Profit',
      'USD Profit',
      '%',
    ],
    colAligns: [
      'left',
      'right',
      'right',
      'right',
      'right',
      'right',
    ],
  });

  const transform = pipe(
    filter((x: Operations.Performance) => startsWith('BTC', x.currencyPair)),
    (x: Operations.PerformanceByExchange) => toPairs(x),
    sortBy(sortByMethod(method, tickers)),
  );

  const pairs = transform(performances);

  for (const [pair, performance] of pairs) {
    table.push([
      pair,
      performance.totalSpent.toFixed(8),
      performance.estimatedValue.toFixed(8),
      performance.profit.toFixed(8),
      btcToUSD(performance.profit, tickers).toFixed(8),
      performance.percentProfit.toFixed(2) + '%',
    ]);
  }

  return table.toString();
}
