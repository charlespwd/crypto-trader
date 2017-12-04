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
