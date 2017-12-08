import * as Table from 'cli-table';
import * as R from 'ramda';
import { btcToUSD, estimate, estimatePercentChange } from '@coincurry/utils';
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
    head: ['Currency', 'Value', 'CAD', '%'],
    colAligns: ['left', 'right', 'right', 'right'],
  });

  const pairs = pipe(
    toPairs,
    sortBy(pipe(
      prop('0'),
      x => cadBalances[x as string],
    ) as any),
  )(balances);

  const total = sum(valuesIn(cadBalances));
  for (const [currency, amount] of pairs as any) {
    const cadAmount = cadBalances[currency];
    table.push([
      currency,
      `${amount} ${currency}`,
      `${cadAmount.toFixed(2) || '??'} CAD`,
      `${(cadAmount / total * 100).toFixed(2)}%`,
    ]);
  }

  table.push(['Total', '-', total.toFixed(2) + ' CAD', '100.00%']);

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

export type SortByMethod = 'profit' | 'usd' | 'percent';
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

const pp = x => x.toFixed(8);
const aToB = x => `${pp(x.fromAmount)} ${x.fromCoin} => ${pp(x.toAmount)} ${x.toCoin}`;
const successMsg = colors.green('SUCCESS');
const failureMsg = colors.red('FAILURE');

export function formatTradeResults(tradeResults: Operations.TradeResults) {
  const successSummary = tradeResults.successfulTrades.map(aToB).join('\n');
  const failedSummary = tradeResults.failedTrades
    .map(x => `${x.tradeType} ${x.fromAmount} on ${x.currencyPair} failed. Reason: ${x.reason.message}`)
    .join('\n');
  const successMessage = successSummary && (
`${successMsg}:
${successSummary}`
  );
  const failedMessage = failedSummary && (
`${failureMsg}:
${failedSummary}`
  );
  return [successMessage, failedMessage].filter(x => !!x).join('\n');
}

export function formatTradeSuccess(data) {
  return `${successMsg}: (Dest: ${data.destinationCoin}) Progress: ${(data.progress * 100).toFixed(0)}% Data: ${aToB(data)}`;
}

export function formatTradeFailure(data) {
  return `${failureMsg}: (Dest: ${data.destinationCoin}) Reason: ${data.reason.message}`;
}

function percentChange(a, b) {
  if (a === 0) return 0;
  return (b - a) / a * 100;
}

export function prettyChange(x, n = 2) {
  if (x >= 0) {
    return colors.green(x.toFixed(n));
  } else {
    return colors.red(x.toFixed(n));
  }
}

export function prettyPercentChange(x) {
  if (x >= 0) {
    return colors.green(x.toFixed(2) + ' %');
  } else {
    return colors.red(x.toFixed(2) + ' %');
  }
}

export interface TickersByDelta {
  [s: string]: Tickers;
  day: Tickers;
  month: Tickers;
  three: Tickers;
  six: Tickers;
  week: Tickers;
}

function tryToEstimate(amount, fromCoin, toCoin, tickers) {
  try {
    return estimate(amount, fromCoin, toCoin, tickers);
  } catch (e) {
    return 0;
  }
}

export function formatQuotes(currencies, tickers: TickersByDelta) {
  const table = new Table({
    head: ['Coin', '$ USD', '$ CAD', '24H %', '7D %', '1M %', '3M %', '6M %', '1Y %'],
    colAligns: ['right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'],
  });

  for (const currency of currencies) {
    const cad = R.map(x => tryToEstimate(1, currency, 'CAD', x), tickers);
    const usd = estimate(1, currency, 'USDT', tickers.day);
    const percent = estimatePercentChange(currency, 'CAD', tickers.day);
    table.push([
      `1 ${currency} =`,
      `${usd.toFixed(2)} USD`,
      `${cad.day.toFixed(2)} CAD`,
      prettyPercentChange(percent),
      prettyPercentChange(percentChange(cad.week, cad.day)),
      prettyPercentChange(percentChange(cad.month, cad.day)),
      prettyPercentChange(percentChange(cad.three, cad.day)),
      prettyPercentChange(percentChange(cad.six, cad.day)),
      prettyPercentChange(percentChange(cad.year, cad.day)),
    ]);
  }

  return table.toString();
}

const formatCurrency = (x: number, currency = 'USD') =>
  new Intl.NumberFormat('en-CA', { style: 'currency', currency }).format(x);

const formatDecimal = (x: number, n = 2) =>
  new Intl.NumberFormat(
    'en-CA',
    {
      style: 'decimal',
      minimumFractionDigits: n,
      maximumFractionDigits: n,
    },
  ).format(x);

export const prettyPercent = (x, n = 4) => (x * 100).toFixed(n);
export const apr = x => (1 + x) ** 365 - 1;

interface Summary {
  interest: number;
  fee: number;
  earned: number;
}

function toLoanSummaries(loans: any): any {
  return R.pipe(
    R.groupBy((loan: any) => loan.currency),
    (y: { [s: string]: Loan[] }) => R.map((group: Loan[]) => group.reduce(
      (acc: any, x: any): any => ({
        interest: acc.interest + x.interest,
        fee: acc.fee + x.fee,
        earned: acc.earned + x.earned,
      }),
    ), y),
    R.toPairs,
  )(loans) as [string, Summary][];
}

export function formatLendingHistory(loans: Loan[], tickers: Tickers) {
  const table = new Table({
    head: ['currency', 'interest', 'fee', 'earned', 'earned (CAD)'],
    colAligns: R.times(R.always('right'), 4),
  });

  const summaries = toLoanSummaries(loans);

  for (const [currency, summary] of summaries) {
    table.push([
      currency,
      prettyChange(summary.interest, 8),
      prettyChange(summary.fee, 8),
      prettyChange(summary.earned, 8),
      prettyChange(estimate(summary.earned, currency, 'CAD', tickers), 2),
    ]);
  }

  return table.toString();
}

export function formatActiveLoans(loans: LoanOffer[]) {
  const table = new Table({
    head: ['currency', 'amount', 'rate'],
    colAligns: R.times(R.always('right'), 3),
  });

  for (const loan of loans) {
    table.push([
      loan.currency,
      formatDecimal(loan.amount, 8),
      prettyPercent(loan.rate, 8) + '%',
    ]);
  }

  return table.toString();
}

export function formatLoans(currency: string, loans: LoanOrder[], tickers: Tickers, n = 5) {
  const table = new Table({
    head: ['Depth CAD', `Depth ${currency}`, 'Rate %', 'APR %'],
    colAligns: ['right', 'right', 'right', 'right'],
  });

  const [depth, summaries] = R.mapAccum(
    (acc, x) => [
      acc + x.amount,
      {
        amount: acc + x.amount,
        rate: x.rate,
      },
    ],
    0,
    loans,
  );

  let lastDepth;
  const multiplier = 1.25;
  for (const loan of summaries) {
    if (!lastDepth || loan.amount / lastDepth > multiplier) {
      const value = estimate(loan.amount, currency, 'CAD', tickers);
      table.push([
        formatDecimal(value, 2),
        loan.amount.toFixed(8),
        prettyPercent(loan.rate, n),
        prettyPercent(apr(loan.rate), n),
      ]);
      lastDepth = loan.amount;
    }
  }

  table.concat(summaries[1]);

  return table.toString();
}

export function formatOpenOffers(offers: LoanOffer[]) {
  const table = new Table({
    head: ['id', 'amount', 'currency', 'rate', 'duration', 'autorenew'],
    colAligns: ['right', 'right', 'right', 'right', 'right', 'right'],
  });

  for (const loan of offers) {
    table.push([
      loan.id,
      loan.amount,
      loan.currency,
      prettyPercent(loan.rate) + '%',
      loan.duration,
      loan.autoRenew.toString(),
    ]);
  }

  return table.toString();
}
