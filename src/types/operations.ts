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
}
