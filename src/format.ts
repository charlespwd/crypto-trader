import * as Table from 'cli-table'
import * as R from 'ramda'
const { sum, values, toPairs, pipe, sortBy, prop, negate } = R

interface Balances {
  [currency: string]: string,
}

export function formatBalances(balances: Object, usdBalances: Object) {
  const table = new Table({
    head: ['Currency', 'Value'],
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
    table.push([currency, `${amount} ${currency}`, `${usdBalances[currency]} USD`])
  }

  table.push(['Total', '-', sum(values(usdBalances) as number[]) + ' USD'])

  return table.toString()
}
