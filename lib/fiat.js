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
const request = require("request-promise-native");
const API_URL = 'http://api.fixer.io/latest';
const rateUrl = base => `${API_URL}?base=${base}`;
function getRates(from) {
    return __awaiter(this, void 0, void 0, function* () {
        const fromCurrency = from.toUpperCase();
        const response = yield request({
            method: 'GET',
            url: rateUrl(fromCurrency),
        });
        return JSON.parse(response).rates;
    });
}
exports.getRates = getRates;
function getRate(from, to) {
    return __awaiter(this, void 0, void 0, function* () {
        const toCurrency = to.toUpperCase();
        const rates = yield getRates(from);
        return rates[toCurrency];
    });
}
exports.getRate = getRate;
function getUsdPerCad() {
    return getRate('CAD', 'USD');
}
exports.getUsdPerCad = getUsdPerCad;
//# sourceMappingURL=fiat.js.map