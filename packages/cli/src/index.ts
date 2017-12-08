import { forEachObjIndexed } from 'ramda';
import * as apis from '@coincurry/api';

import { run } from './cli';
import * as auth from '@coincurry/auth';

require('util.promisify/shim')();

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
    if (err) return login();

    try {
      auth.load(result.password);
    } catch (e) {
      if (e.message === 'BAD_PASSWORD') {
        console.log('Bad password, please try again');
        return login();
      } else {
        throw e;
      }
    }

    forEachObjIndexed((api: any) => api && api.init && api.init(), apis);

    run();
  });
}

login();
