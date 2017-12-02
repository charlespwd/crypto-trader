import { expect } from 'chai';
import * as moment from 'moment';
import {
  balances,
  runningBalances,
  CurrencyAction,
  DepositAction,
  TradeAction,
  WithdrawalAction,
} from './balances';

const depositAction = (amount, currency, date): DepositAction => ({
  type: 'DEPOSIT',
  deposit: {
    amount,
    currency,
  },
  date: moment(date, 'YYYY-MM-DD'),
});

const withdrawalAction = (amount, currency, date): WithdrawalAction => ({
  type: 'WITHDRAWAL',
  withdrawal: {
    amount,
    currency,
  },
  date: moment(date, 'YYYY-MM-DD'),
});

const tradeAction = (currencyPair, type, amount, total, date): TradeAction => ({
  type: 'TRADE',
  date: moment(date, 'YYYY-MM-DD'),
  trade: {
    currencyPair,
    amount,
    type,
    total,
    rate: 0,
    date: moment(date, 'YYYY-MM-DD'),
  },
});

describe('Module: balances', () => {
  it('should balance out!', () => {
    const actions: CurrencyAction[] = [
      depositAction(10, 'CAD', '2017-01-01'),
      depositAction(20, 'CAD', '2017-01-02'),
      depositAction(5, 'BTC', '2017-01-01'),
      withdrawalAction(20, 'CAD', '2017-01-02'),
    ];

    expect(balances(actions)).to.deep.equal({
      CAD: 10,
      BTC: 5,
    });
  });

  it('should balance trades!', () => {
    const actions: CurrencyAction[] = [
      depositAction(30, 'CAD', '2017-01-01'),
      tradeAction('CAD_BTC', 'buy', 0.005, 25, '2017-01-01'),
    ];

    expect(balances(actions)).to.deep.equal({
      CAD: 5,
      BTC: 0.005,
    });
  });
});
