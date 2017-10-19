import '../types/api';
import '../types/operations';
import * as Table from 'cli-table';
import * as R from 'ramda';
import { btcToUSD } from './conversions';
import * as colors from 'colors/safe';
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
  any,
} = R;
interface Balances {
  [currency: string]: string;
}

export function formatBalances(balances: Object, cadBalances: Object) {
  const table = new Table({
    head: ['Currency', 'Value', 'CAD'],
    colAligns: ['left', 'right', 'right'],
  });

  const pairs = pipe(
    toPairs,
    sortBy(pipe(
      prop('0'),
      x => cadBalances[x as string],
    ) as any),
  )(balances);

  for (const [currency, amount] of pairs as any) {
    table.push([currency, `${amount} ${currency}`, `${cadBalances[currency].toFixed(2) || '??'} CAD`]);
  }

  table.push(['Total', '-', sum(valuesIn(cadBalances)).toFixed(2) + ' CAD']);

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
  currencies: string[],
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
    filter((x: Operations.Performance) => isEmpty(currencies) || any(currency => x.currencyPair.includes(currency), currencies)),
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

export function formatTradeResults(tradeResults: Operations.TradeResults) {
  const successSummary = tradeResults.successfulTrades
    .map(x => `${x.fromAmount.toFixed(8)} ${x.fromCoin} => ${x.toAmount.toFixed(8)} ${x.toCoin}`)
    .join('\n');
  const failedSummary = tradeResults.failedTrades
    .map(x => `${x.tradeType} ${x.fromAmount} on ${x.currencyPair} failed. Reason: ${x.reason.message}`)
    .join('\n');
  return (
`${colors.green('SUCCESS')}:
${successSummary}
${colors.red('FAILED')}:
${failedSummary || 'Nothing.'}`
  );
}
