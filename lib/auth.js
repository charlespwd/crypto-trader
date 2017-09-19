"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const algorithm = 'aes-256-ctr';
const home = process.env.CRYPTO_TRADER_HOME || process.env.HOME;
const secretsFilePath = path.join(home, '.crypto_trader_secrets');
let secrets = new Map();
let apiKeys = new Map();
let pass;
function getKey(exchange) {
    return apiKeys.get(exchange);
}
exports.getKey = getKey;
function getSecret(exchange) {
    return secrets.get(exchange);
}
exports.getSecret = getSecret;
function setKey(exchange, key) {
    apiKeys.set(exchange, key);
}
exports.setKey = setKey;
function setSecret(exchange, key) {
    secrets.set(exchange, key);
}
exports.setSecret = setSecret;
function mapToJson(map) {
    return JSON.stringify([...map]);
}
function jsonToMap(jsonStr) {
    return new Map(JSON.parse(jsonStr));
}
function encrypt(password, map) {
    const cipher = crypto.createCipher(algorithm, password);
    let crypted = cipher.update(mapToJson(map), 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}
function decrypt(password, text) {
    const decipher = crypto.createDecipher(algorithm, password);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    try {
        return jsonToMap(dec);
    }
    catch (e) {
        throw new Error('BAD_PASSWORD');
    }
}
function save() {
    const state = {
        secrets: encrypt(pass, secrets),
        apiKeys: encrypt(pass, apiKeys),
    };
    fs.writeFileSync(secretsFilePath, JSON.stringify(state, null, 2));
}
exports.save = save;
function load(password) {
    try {
        const text = fs.readFileSync(secretsFilePath, { encoding: 'utf8' });
        const state = JSON.parse(text);
        state.secrets = decrypt(password, state.secrets);
        state.apiKeys = decrypt(password, state.apiKeys);
        secrets = state.secrets;
        apiKeys = state.apiKeys;
        pass = password;
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            pass = password;
            save();
            return load(password);
        }
        throw e;
    }
}
exports.load = load;
//# sourceMappingURL=auth.js.map