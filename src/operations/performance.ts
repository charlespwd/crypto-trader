import '../types/api';
import '../types/operations';
import * as R from 'ramda';

const toTotal = x => x.total;
const toAmount = x => x.amount;

function toPerformance(trades: Trade[], currentRate: number, pair): Operations.Performance {
  const buys = R.filter(x => x.type === 'buy', trades);
  const sells = R.filter(x => x.type === 'sell', trades);
  const buyTotals = R.sum(R.map(toTotal, buys));
  const sellTotals = R.sum(R.map(toTotal, sells));
  const buyAmounts = R.sum(R.map(toAmount, buys));
  const sellAmounts = R.sum(R.map(toAmount, sells));

  const totalSpent = buyTotals - sellTotals;
  const amountBalance = buyAmounts - sellAmounts;
  const amountBalanceValue = currentRate * amountBalance;
  const ratio = amountBalanceValue / totalSpent;

  return {
    currencyPair: pair,
    estimatedValue: amountBalanceValue,
    percentProfit: (ratio - 1) * 100,
    profit: amountBalanceValue - totalSpent,
    ratio,
    totalSpent,
  };
}

export function performanceByExchange(
  tradeHistory: TradeHistory,
  tickers: Tickers,
): Operations.PerformanceByExchange {
  return R.mapObjIndexed((trades: Trade[], pair) => {
    return toPerformance(trades, tickers[pair].last, pair);
  }, tradeHistory);
}
