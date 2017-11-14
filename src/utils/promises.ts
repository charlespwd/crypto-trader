const throwTimeout = (reject, source) => reject(new Error(`Timeout error, too slow [source: ${source}]`));
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const timeout = (ms: number, source) => new Promise((r, reject) => setTimeout(throwTimeout, ms, reject, source));
