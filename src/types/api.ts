declare interface Ticker {
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

declare interface Tickers {
  [currencyPair: string]: Ticker
}

declare interface Balances {
  [currency: string]: number
}

declare type TradeOptions = {
  rate: string;
  amount: string;
  currencyPair: string;
}

declare interface Api {
  tickers(): Promise<Tickers>;
  balances(): Promise<Balances>;
  sell(options: TradeOptions): Promise<number>;
  buy(options: TradeOptions): Promise<number>;
}
