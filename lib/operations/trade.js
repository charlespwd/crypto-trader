"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const R = require("ramda");
const utils_1 = require("../utils");
const constants_1 = require("../constants");
// Some definitons, for a currencyPair BTC_ETH
// amount = (price in ETH)
// total = (price in BTC)
// rate = X BTC / ETH
const isBuyOrder = (fromCoin, toCoin, currencyPair) => {
    if ([fromCoin, toCoin].join('_') === currencyPair) {
        return true;
    }
    else if ([toCoin, fromCoin].join('_') === currencyPair) {
        return false;
    }
    else {
        throw new Error(`${fromCoin} and ${toCoin} do not form ${currencyPair}`);
    }
};
function getRate(api, isBuyOrder, currencyPair, tickers) {
    return isBuyOrder
        ? api.buyRate(currencyPair, tickers)
        : api.sellRate(currencyPair, tickers);
}
function getAmount(isBuyOrder, amount, rate) {
    return isBuyOrder
        ? amount / rate
        : amount;
}
function getTotal(isBuyOrder, amount, rate) {
    return isBuyOrder
        ? amount
        : amount * rate;
}
function successfulResponse(isBuying, amount, total, rate) {
    return __awaiter(this, void 0, void 0, function* () {
        return isBuying ? amount : total;
    });
}
// Scenarios
// | fromCoin | toCoin | Trade Type | return value
// | ------   | ----   | ---------- | ----------
// | BTC      | ETH    | buy        | ETH (amount)
// | ETH      | BTC    | sell       | BTC (total)
function trade(api, fromAmount, fromCoin, toCoin, currencyPair, n = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        if (fromCoin === toCoin)
            return fromAmount;
        const isBuying = isBuyOrder(fromCoin, toCoin, currencyPair);
        const tradeFn = isBuying ? api.buy : api.sell;
        try {
            const tickers = yield api.tickers();
            const rate = getRate(api, isBuying, currencyPair, tickers);
            const amount = getAmount(isBuying, fromAmount, rate);
            const total = getTotal(isBuying, fromAmount, rate);
            utils_1.log(`TRADING: ${fromAmount} ${fromCoin} => ${isBuying ? amount : total} ${toCoin}`);
            if (amount < 0.001 || n > 5)
                return 0;
            return constants_1.PROD
                ? yield tradeFn({ amount: amount.toString(), currencyPair, rate: rate.toString() })
                : yield utils_1.enqueue(R.partial(successfulResponse, [isBuying, amount, total, rate]));
        }
        catch (e) {
            utils_1.log(`Failed to ${isBuying ? 'buy' : 'sell'} ${toCoin}, retry count: ${n}, retrying in 2s`);
            console.error(e);
            yield utils_1.sleep(2000);
            return trade(api, fromAmount, fromCoin, toCoin, currencyPair, n + 1);
        }
    });
}
exports.default = trade;
//# sourceMappingURL=trade.js.map