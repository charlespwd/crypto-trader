import { Moment } from 'moment';
import * as R from 'ramda';
import {
  extractFromAndTo,
  extractFromAmount,
  extractToAmount,
} from '../utils';

interface Withdrawal {
  amount: number;
  currency: string;
}

interface Deposit {
  amount: number;
  currency: string;
}

interface TimestampedAction {
  date: Moment;
}

export interface TradeAction extends TimestampedAction {
  type: 'TRADE';
  trade: Trade;
}

export interface DepositAction extends TimestampedAction {
  type: 'DEPOSIT';
  deposit: Deposit;
}

export interface WithdrawalAction extends TimestampedAction {
  type: 'WITHDRAWAL';
  withdrawal: Withdrawal;
}

export type CurrencyAction = TradeAction | DepositAction | WithdrawalAction;

const sortActions = R.sortBy(action => action.date.format('X'));

export function balances(actions: CurrencyAction[]) {
  const sortedActions = sortActions(actions);
  return actions.reduce(balancesReducer, {} as Balances);
}

export function runningBalances(actions: CurrencyAction[]): [Moment, Balances][] {
  const sortedActions = sortActions(actions);
  return R.mapAccum(
    (balances, action): [Balances, [Moment, Balances]] => [
      balancesReducer(balances, action),
      [action.date, balancesReducer(balances, action)],
    ],
    {},
    sortedActions,
  )[1];
}

const lensPropOr = (defaultValue, prop) => R.lens(
  R.propOr(defaultValue, prop),
  R.assoc(prop),
);

const lensPropOr0 = R.partial(lensPropOr, [0]);

const subtractBy = a => b => b - a;

export function balancesReducer(state: Balances, action: CurrencyAction): Balances {
  switch (action.type) {
    case 'TRADE': {
      const trade = action.trade;
      const { fromCoin, toCoin } = extractFromAndTo(trade.type, trade.currencyPair);
      const withdrawalLens = lensPropOr0(fromCoin);
      const depositLens = lensPropOr0(toCoin);
      const fromAmount = extractFromAmount(trade.type, trade.amount, trade.total);
      const toAmount = extractToAmount(trade.type, trade.amount, trade.total);

      return R.pipe(
        R.over(withdrawalLens, subtractBy(fromAmount)),
        R.over(depositLens, R.add(toAmount)),
      )(state) as Balances;
    }

    case 'DEPOSIT': {
      const currency = action.deposit.currency;
      const amount = action.deposit.amount;
      const lens = lensPropOr0(currency);
      return R.over(lens, R.add(amount), state);
    }

    case 'WITHDRAWAL': {
      const currency = action.withdrawal.currency;
      const amount = action.withdrawal.amount;
      const lens = lensPropOr0(currency);
      return R.over(lens, subtractBy(amount), state);
    }

    default: return state;
  }
}
