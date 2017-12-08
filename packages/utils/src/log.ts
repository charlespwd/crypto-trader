let logger = console.log.bind(console);
export const setLogger = (fn) => { logger = fn; };
export const log = (...args) => logger(...args);
