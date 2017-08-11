import * as Table from 'cli-table'
import * as R from 'ramda'
const {
  sum,
  values,
  toPairs,
  pipe,
  sortBy,
  prop,
  negate,
  map,
} = R

interface Balances {
  [currency: string]: string,
}

export function formatBalances(balances: Object, usdBalances: Object) {
  const table = new Table({
    head: ['Currency', 'Value', 'USD'],
  })

  const pairs = pipe(
    toPairs,
    sortBy(pipe(
      prop('0'),
      x => usdBalances[x as string],
      negate,
    ) as any)
  )(balances)

  for (const [currency, amount] of pairs as any) {
    table.push([currency, `${amount} ${currency}`, `${usdBalances[currency] || '??'} USD`])
  }

  table.push(['Total', '-', sum(values(usdBalances) as number[]) + ' USD'])

  return table.toString()
}

export function formatPairs(tickers: object) {
  const head = ['currencyPair', 'last', 'lowestAsk', 'highestBid', 'percentChange', 'baseVolume']
  const table = new Table({ head })

  const pairs = pipe(
    toPairs,
    map(([currencyPair, props]) => ({
      ...props,
      currencyPair,
    })),
    sortBy(prop('currencyPair')),
  )(tickers)

  for (const pair of pairs) {
    table.push(head.map(k => pair[k]))
  }

  return table.toString()
}
