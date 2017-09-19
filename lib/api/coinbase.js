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
const coinbase_1 = require("coinbase");
const util_1 = require("util");
const R = require("ramda");
const auth = require("../auth");
const utils_1 = require("../utils");
const state = {
    exchangeName: 'coinbase',
    isLoggedIn: false,
    client: null,
    getAccount: null,
    getAccounts: null,
};
const withLogin = utils_1.withLoginFactory(state);
function init() {
    const API_KEY = auth.getKey('coinbase');
    const API_SECRET = auth.getSecret('coinbase');
    if (state.isLoggedIn || !API_KEY || !API_SECRET)
        return;
    const client = new coinbase_1.Client({
        apiKey: API_KEY,
        apiSecret: API_SECRET,
    });
    state.client = client;
    state.getAccount = util_1.promisify(client.getAccount.bind(client));
    state.getAccounts = util_1.promisify(client.getAccounts.bind(client));
    state.isLoggedIn = true;
}
const toBalances = R.pipe(R.map(R.prop('balance')), R.reduce((acc, b) => {
    const total = acc[b.amount] || 0;
    acc[b.currency] = total + parseFloat(b.amount);
    return acc;
}, {}));
function balances() {
    return __awaiter(this, void 0, void 0, function* () {
        const accountData = yield state.getAccounts({});
        return toBalances(accountData);
    });
}
const toTotal = R.pipe((txs) => R.filter(R.eqProps('type', { type: 'buy' }), txs), R.map(R.pipe(R.prop('native_amount'), R.prop('amount'), parseFloat)), R.sum);
function totalSpent() {
    return __awaiter(this, void 0, void 0, function* () {
        const accountData = yield state.getAccounts({});
        let txs = [];
        for (const accountD of accountData) {
            const account = yield state.getAccount(accountD.id);
            const getTransactions = util_1.promisify(account.getTransactions.bind(account));
            const transactions = yield getTransactions(null);
            txs = txs.concat(transactions);
        }
        return toTotal(txs);
    });
}
function buy(options) {
    return __awaiter(this, void 0, void 0, function* () {
        throw new Error('Not implemented');
        // getAccount(await accounts)
    });
}
function sell(options) {
    return __awaiter(this, void 0, void 0, function* () {
        throw new Error('Not implemented');
    });
}
function tickers() {
    return __awaiter(this, void 0, void 0, function* () {
        throw new Error('Not implemented');
    });
}
const api = {
    name: 'coinbase',
    init,
    balances: withLogin(balances),
    totalSpent: withLogin(totalSpent),
    tickers: withLogin(tickers),
    sell: withLogin(sell),
    buy: withLogin(buy),
    trades: () => {
        throw new Error('not implemented');
    },
    addresses: () => {
        throw new Error('not implemented');
    },
    buyRate: () => {
        throw new Error('not implemented');
    },
    sellRate: () => {
        throw new Error('not implemented');
    },
};
exports.default = api;
//# sourceMappingURL=coinbase.js.map