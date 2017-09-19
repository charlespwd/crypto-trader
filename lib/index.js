"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli_1 = require("./cli");
const auth = require("./auth");
const apis = require("./api");
const ramda_1 = require("ramda");
const prompt = require('prompt');
const schema = {
    properties: {
        password: {
            message: ':',
            hidden: true,
        },
    },
};
prompt.start();
prompt.message = 'Welcome to crypto-trader, please enter your password';
prompt.delimiter = '';
function login() {
    prompt.get(schema, (err, result) => {
        if (err)
            return login();
        try {
            auth.load(result.password);
        }
        catch (e) {
            if (e.message === 'BAD_PASSWORD') {
                console.log('Bad password, please try again');
                return login();
            }
            else {
                throw e;
            }
        }
        ramda_1.forEachObjIndexed(api => api.init && api.init(), apis);
        cli_1.run();
    });
}
login();
//# sourceMappingURL=index.js.map