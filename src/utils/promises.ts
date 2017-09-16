const throwTimeout = reject => reject(new Error('Timeout error, too slow'));
export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
export const timeout = (ms: number) => new Promise((r, reject) => setTimeout(throwTimeout, ms, reject));
