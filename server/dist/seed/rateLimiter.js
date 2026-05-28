"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.limiter = void 0;
exports.createLimiter = createLimiter;
exports.fetchWithRetry = fetchWithRetry;
// Simple semaphore-based concurrency limiter (no ESM-only deps)
function createLimiter(concurrency) {
    let running = 0;
    const queue = [];
    function next() {
        if (running >= concurrency || queue.length === 0)
            return;
        running++;
        const fn = queue.shift();
        fn();
    }
    return function limit(fn) {
        return new Promise((resolve, reject) => {
            queue.push(async () => {
                try {
                    resolve(await fn());
                }
                catch (err) {
                    reject(err);
                }
                finally {
                    running--;
                    next();
                }
            });
            next();
        });
    };
}
exports.limiter = createLimiter(20);
async function fetchWithRetry(url, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url);
            if (res.status === 429 || res.status >= 500) {
                if (attempt < retries) {
                    await sleep(2000 * (attempt + 1));
                    continue;
                }
                throw new Error(`HTTP ${res.status} from ${url}`);
            }
            if (!res.ok)
                throw new Error(`HTTP ${res.status} from ${url}`);
            return await res.json();
        }
        catch (err) {
            if (attempt === retries)
                throw err;
            await sleep(1000 * (attempt + 1));
        }
    }
    throw new Error("unreachable");
}
function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}
