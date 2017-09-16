import * as Table from 'cli-table';
import * as R from 'ramda';
const {
  F,
  contains,
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
