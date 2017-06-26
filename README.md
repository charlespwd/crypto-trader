# Crypto Trader

Crypto Trader is a command line tool for diversifying your cryptocurrency portfolio on exchanges. 

This is very much alpha material. But it works and I've been able to diversify my own portfolio. You should only use it if you trust me.

## Demo

* TODO (include gif)

## Usage

```bash
$ crypto-trader
```

## Commands

* `help [command...]`, prints the available commands and their signatures

  Examples:

  ```
  crypto-trader $ help
  crypto-trader $ help balances
  crypto-trader $ help split
  ```

* `balances [coins...]`, prints your non zero balances in a table

  * `coins` (optional) space separated list of short currency names

  Examples:

  ```
  crypto-trader $ balances
  crypto-trader $ balances eth
  crypto-trader $ balances eth btc ltc 
  ```

* `split [options] <amount> <fromCoin>`, splits your coin into `n` top coins by volume

  * `amount`, (required) how much of your coin you want to split
  * `fromCoin`, (required) the currency of the coin you want to split
  * `-n, --into [n]`, (optional, default=30) into how many of the top coins you want 

  Examples:

  ```
  crypto-trader $ split 10 eth
  crypto-trader $ split 10 eth -n 50
  crypto-trader $ split 10 eth --into 50
  ```

* `trade <amount> <fromCoin> <toCoin> <currencyPair>`

  * `amount`, (required) how much of your fromCoin you want to trade 
  * `fromCoin`, (required) the currency of the coin you want to trade
  * `toCoin`, (required) the currency of the coin you want instead
  * `currencyPair`, (required) the currency pair as listed on the exchange (e.g. BTC_ETH, BTC_DASH, BTC_LTC, ETH_DASH, etc.)

  Examples:

  ```
  # turn 10 ETH into BTC at the latest highest ask on the exchange
  crypto-trader $ trade 10 eth btc BTC_ETH
  ```
