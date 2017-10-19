declare namespace Operations {
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
