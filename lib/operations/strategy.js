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
const trade_1 = require("./trade");
const utils_1 = require("../utils");
const BLACKLIST = [
    'DOGE',
    'POT',
    'ETC',
];
function topByVolumeStrategy(n = 30) {
    return {
        type: 'top-by-volume',
        n,
    };
}
exports.topByVolumeStrategy = topByVolumeStrategy;
function namedListStrategy(list) {
    return {
        type: 'named-list',
        value: R.map(R.toUpper, list),
    };
}
exports.namedListStrategy = namedListStrategy;
function getCoinsToBuy(s, api, fromCoin) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (s.type) {
            case 'top-by-volume': {
                return R.take(s.n, (yield getTopByVolume(api))
                    .filter(x => !R.contains(x, BLACKLIST))
                    .filter(x => x !== fromCoin));
            }
            case 'named-list': {
                return s.value
                    .filter(x => !R.contains(x, BLACKLIST))
                    .filter(x => x !== fromCoin);
            }
        }
    });
}
function execute(api, fromAmount, strategy, fromCoin = 'ETH') {
    return __awaiter(this, void 0, void 0, function* () {
        const coinsToBuy = yield getCoinsToBuy(strategy, api, fromCoin);
        const N = coinsToBuy.length;
        const fromAmountToBuyAsBTC = fromAmount * N / (N + 1);
        const btcAmount = fromCoin !== 'BTC'
            ? yield trade_1.default(api, fromAmountToBuyAsBTC, fromCoin, 'BTC', `BTC_${fromCoin}`)
            : fromAmountToBuyAsBTC;
        if (btcAmount === 0) {
            utils_1.log(`FAILURE: COULD NOT TURN ${fromCoin} INTO BTC`);
            return;
        }
        if (fromCoin !== 'BTC') {
            utils_1.log(`SUCCESS: SOLD ${fromAmountToBuyAsBTC} ${fromCoin} for ${btcAmount} BTC`);
        }
        const btcValueOfCoin = btcAmount / N;
        utils_1.log(`SPLITTING ${btcAmount} BTC into ${N} currencies, COIN VALUE ${btcValueOfCoin} BTC`);
        if (btcValueOfCoin < 0.00050000) {
            // 0.0005 = from / (N + 1) => N = from / 0.0005 - 1
            throw new Error(`50K SAT minimum per trade try splitting ${fromAmount} BTC into ${Math.floor(btcAmount / 0.0005) - 1} coins`);
        }
        const unable = [];
        const amounts = coinsToBuy.map(coin => [coin, trade_1.default(api, btcValueOfCoin, 'BTC', coin, `BTC_${coin}`)]);
        for (const coinAndAmountPromise of amounts) {
            const coin = coinAndAmountPromise[0];
            const amount = yield coinAndAmountPromise[1];
            if (amount === 0) {
                utils_1.log(`FAILURE: COULD NOT BUY ${coin} for ${btcValueOfCoin} BTC`);
                unable.push(coin);
            }
            else {
                utils_1.log(`SUCCESS: BOUGHT ${amount} ${coin} for ${btcValueOfCoin} BTC`);
            }
        }
        if (unable.length > 0) {
            utils_1.log(`COULD NOT buy [${unable.join(', ')}]`);
        }
    });
}
exports.execute = execute;
function getTopByVolume(api) {
    return __awaiter(this, void 0, void 0, function* () {
        const tickers = yield api.tickers();
        return topByVolume(tickers);
    });
}
exports.getTopByVolume = getTopByVolume;
const toBool = (x) => !!parseInt(x, 10);
const sortByVolume = R.sortBy(R.pipe(R.path(['1', 'baseVolume']), parseFloat, R.negate));
const removeFrozen = R.filter(R.pipe(R.path(['1', 'isFrozen']), toBool, R.not));
const startsWithBTC = R.filter(R.pipe(R.prop('0'), R.startsWith('BTC')));
const topByVolume = R.pipe(R.toPairs, startsWithBTC, removeFrozen, sortByVolume, R.map(R.pipe(R.head, R.split('_'), R.last)));
//# sourceMappingURL=strategy.js.map