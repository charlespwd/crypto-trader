import { run } from './cli';
import * as auth from './auth';
import * as apis from './api';
import { forEachObjIndexed } from 'ramda';

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

    forEachObjIndexed(api => api.init && api.init(), apis);

    run();
  });
}

login();
