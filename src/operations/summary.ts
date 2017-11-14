import * as R from 'ramda';
import { poloniex, coinbase, bittrex } from '../api';
import { getRate } from '../fiat';
import {
  toUSDBalances,
} from '../utils';

export default async function summary(args) {
  const [pTickers, pBalances, bTickers, bBalances, totalSpent, currentRate] = await Promise.all([
    poloniex.tickers(),
    poloniex.balances(),
    bittrex.tickers(),
    bittrex.balances(),
    coinbase.totalSpent(),
    getRate('CAD', 'USD'),
  ]);
  const poloUsdBalances = toUSDBalances(pBalances, pTickers);
  const bittUsdBalances = toUSDBalances(bBalances, bTickers);
  const usdBalances = R.mergeWith(R.add, poloUsdBalances, bittUsdBalances);
  const estimatedUSDTotal = R.sum(R.values(usdBalances) as number[]);
  const { options } = args;
  const rate = options.rate || 0.79;
  const buyRate = options.buyRate || rate;
  const creditCardCashback = 0.020;
  const coinbaseFee = 0.0399 - creditCardCashback;
  const exchangeFee = 0.0025 * 4;
  const coinbaseFees = totalSpent * coinbaseFee;
  const exchangeFees = totalSpent * exchangeFee;
  const totalFees = coinbaseFees + exchangeFees;
  const totalAfterFees = totalSpent - totalFees;
  const roiAfterFees = ((estimatedUSDTotal / currentRate / totalAfterFees) - 1) * 100;
  const roiOnMoneySpent = ((estimatedUSDTotal / currentRate / totalSpent) - 1) * 100;
  const roiOnMoneySpentAmount = estimatedUSDTotal / currentRate - totalSpent;

  return {
    buyRate,
    coinbaseFee,
    currentRate,
    estimatedUSDTotal,
    exchangeFee,
    totalAfterFees,
    totalSpent,
    roiAfterFees,
    roiOnMoneySpent,
    roiOnMoneySpentAmount,
    coinbaseFees,
    exchangeFees,
    totalFees,
  };
}
