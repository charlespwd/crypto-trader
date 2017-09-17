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
  [currencyPair: string]: Ticker;
}

declare interface Balances {
  [currency: string]: number;
}

declare type TradeOptions = {
  rate: string;
  amount: string;
  currencyPair: string;
};

declare type DepositAddress = string;

declare interface DepositAddresses {
  [currency: string]: DepositAddress;
}

declare type TradeType = 'buy' | 'sell';

declare interface Trade {
  currencyPair: string;
  type: TradeType;
  amount: number;
  total: number;
  rate: number;
}

declare interface TradeHistory {
  [currencyPair: string]: Trade[];
}

declare interface Api {
  name: string;
  tickers(): Promise<Tickers>;
  addresses(): Promise<DepositAddresses>;
  balances(): Promise<Balances>;
  sell(options: TradeOptions): Promise<number>;
  buy(options: TradeOptions): Promise<number>;
  buyRate(currencyPair: string, tickers: Tickers): number;
  sellRate(currencyPair: string, tickers: Tickers): number;
  trades(): Promise<TradeHistory>;
}
