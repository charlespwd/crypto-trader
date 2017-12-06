import * as R from 'ramda';

export const toTradeAction = (trade: Trade): TradeAction => ({
  type: 'TRADE',
  date: trade.date,
  trade,
});

export const toDepositAction = (deposit: Deposit): DepositAction => ({
  type: 'DEPOSIT',
  date: deposit.date,
  deposit,
});

export const toWithdrawalAction = (withdrawal: Withdrawal): WithdrawalAction => ({
  type: 'WITHDRAWAL',
  date: withdrawal.date,
  withdrawal,
});

export const toActions = (tradeHistory: TradeHistory, depositsAndWithdrawals: DepositsAndWithdrawals): CurrencyAction[] => {
  const trades: TradeAction[] = R.pipe(
    R.values,
    R.flatten,
    R.map(toTradeAction),
  )(tradeHistory);

  const deposits: DepositAction[] = R.pipe(
    (x: DepositsAndWithdrawals) => x.deposits,
    R.map(toDepositAction),
  )(depositsAndWithdrawals);

  const withdrawals: WithdrawalAction[] = R.pipe(
    (x: DepositsAndWithdrawals) => x.withdrawals,
    R.map(toWithdrawalAction),
  )(depositsAndWithdrawals);

  return [].concat(trades, withdrawals, deposits) as CurrencyAction[];
};
