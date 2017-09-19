"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = require("crypto");
const fs = require("fs");
const ramda_1 = require("ramda");
const algorithm = 'aes-256-ctr';
const secretsFilePath = '.crypto-secrets';
const apiKeyFilePath = '.crypto-apikeys';
const test = 'crypto-trader!!';
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
    let crypted = cipher.update(test + mapToJson(map), 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}
function decrypt(password, text) {
    const decipher = crypto.createDecipher(algorithm, password);
    let dec = decipher.update(text, 'hex', 'utf8');
    dec += decipher.final('utf8');
    if (!ramda_1.startsWith(test, dec))
        throw new Error('BAD_PASSWORD');
    return jsonToMap(ramda_1.drop(test.length, dec));
}
function save() {
    fs.writeFileSync(secretsFilePath, encrypt(pass, secrets));
    fs.writeFileSync(apiKeyFilePath, encrypt(pass, apiKeys));
}
exports.save = save;
function load(password) {
    try {
        const secText = fs.readFileSync(secretsFilePath, { encoding: 'utf8' });
        const keyText = fs.readFileSync(apiKeyFilePath, { encoding: 'utf8' });
        const secretsAttempt = decrypt(password, secText);
        const apiKeysAttempt = decrypt(password, keyText);
        secrets = secretsAttempt;
        apiKeys = apiKeysAttempt;
        pass = password;
    }
    catch (e) {
        if (e.code === 'ENOENT') {
            save();
            return load(password);
        }
        throw e;
    }
}
exports.load = load;
//# sourceMappingURL=auth.js.map