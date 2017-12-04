import { Moment } from 'moment';

declare global {
  type ExchangeName = 'poloniex' | 'bittrex' | 'coinbase' | 'bitfinex';

  interface Ticker {
    currencyPair: string;
    last: number;
    lowestAsk: number;
    highestBid: number;
    percentChange: number;
    baseVolume: number;
    quoteVolume: number;
    isFrozen: boolean;
    '24hrHigh': number;
    '24hrLow': number;
  }

  interface Tickers {
    [currencyPair: string]: Ticker;
  }

  interface Balances {
    [currency: string]: number;
  }

  type TradeOptions = {
    rate: string;
    amount: string;
    currencyPair: string;
  };

  type DepositAddress = string;

  interface DepositAddresses {
    [currency: string]: DepositAddress;
  }

  type TradeType = 'buy' | 'sell';

  interface Trade {
    currencyPair: string;
    date: Moment;
    type: TradeType;
    amount: number;
    total: number;
    rate: number;
  }

  interface TradeHistory {
    [currencyPair: string]: Trade[];
  }

  interface Loan {
    id: number;
    currency: string;
    amount: number;
    duration: number;
    interest: number;
    fee: number;
    earned: number;
    open: string;
    close: string;
  }

  interface LoanOrder {
    amount: number;
    currency: string;
    rangeMax: number;
    rangeMin: number;
    rate: number;
  }

  interface LoanOffer {
    id: number;
    amount: number;
    currency: string;
    duration: number;
    rate: number;
    autoRenew: boolean;
  }

  interface Withdrawal {
    amount: number;
    currency: string;
    date: Moment;
  }

  interface Deposit {
    amount: number;
    currency: string;
    date: Moment;
  }

  interface DepositsAndWithdrawals {
    deposits: Deposit[];
    withdrawals: Withdrawal[];
  }

  interface Api {
    name: string;
    init(): void;
    tickers(): Promise<Tickers>;
    addresses(): Promise<DepositAddresses>;
    balances(): Promise<Balances>;
    sell(options: TradeOptions): Promise<number>;
    buy(options: TradeOptions): Promise<number>;
    buyRate(currencyPair: string, tickers: Tickers): number;
    sellRate(currencyPair: string, tickers: Tickers): number;
    trades(): Promise<TradeHistory>;
    depositsAndWithdrawals(): Promise<DepositsAndWithdrawals>;
  }

  interface TimestampedAction {
    date: Moment;
  }

  interface TradeAction extends TimestampedAction {
    type: 'TRADE';
    trade: Trade;
  }

  interface DepositAction extends TimestampedAction {
    type: 'DEPOSIT';
    deposit: Deposit;
  }

  interface WithdrawalAction extends TimestampedAction {
    type: 'WITHDRAWAL';
    withdrawal: Withdrawal;
  }

  export type CurrencyAction = TradeAction | DepositAction | WithdrawalAction;

  namespace Operations {
    export type Performance = {
      currencyPair: string;
      estimatedValue: number;
      percentProfit: number;
      profit: number;
      ratio: number;
      totalSpent: number;
    };

    export interface PerformanceByExchange {
      [currencyPair: string]: Performance;
    }

    export type SuccessfulTrade = {
      status: 'success';
      toCoin: string;
      toAmount: number;
      fromAmount: number;
      fromCoin: string;
    };

    export type FailedTrade = {
      status: 'failure';
      toCoin: string;
      fromAmount: number;
      currencyPair: string;
      tradeType: 'buy' | 'sell';
      reason: Error;
    };

    export type TradeResult = SuccessfulTrade | FailedTrade;
    export type TradeResults = {
      successfulTrades: SuccessfulTrade[];
      failedTrades: FailedTrade[];
    };
  }
}
