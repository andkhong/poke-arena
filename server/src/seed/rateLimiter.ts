// Simple semaphore-based concurrency limiter (no ESM-only deps)
export function createLimiter(concurrency: number) {
  let running = 0;
  const queue: Array<() => void> = [];

  function next() {
    if (running >= concurrency || queue.length === 0) return;
    running++;
    const fn = queue.shift()!;
    fn();
  }

  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(err);
        } finally {
          running--;
          next();
        }
      });
      next();
    });
  };
}

export const limiter = createLimiter(20);

export async function fetchWithRetry(url: string, retries = 3): Promise<unknown> {
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
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw new Error("unreachable");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
