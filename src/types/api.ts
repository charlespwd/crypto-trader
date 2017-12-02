declare type ExchangeName = 'poloniex' | 'bittrex' | 'coinbase' | 'bitfinex';

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

declare interface Api {
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
}
