import cacache from 'cacache';
import isPromise from 'is-promise';

export interface Serializer<T> {
  stringify(target: T): string | NodeJS.ReadableStream | Buffer;
  parse(value: string | NodeJS.ReadableStream | Buffer): T;
}

class CacheStatics {
  cacheDir?: string;
  setCacheDir(cacheDir?: string) {
    this.cacheDir = cacheDir;
  }
}
const globalCache = new CacheStatics();

export function setCacheDir(dir?: string) {
  globalCache.setCacheDir(dir);
}

export class Cache<T = NodeJS.ReadableStream> {
  private memCache = new Map<string, T>();
  constructor(name: string, fetch: (key: string) => NodeJS.ReadableStream | Promise<NodeJS.ReadableStream>);
  constructor(name: string, fetch: (key: string) => T | Promise<T>, serializer?: Serializer<T>);
  constructor(
    private name: string,
    private fetch: (key: string) => T | Promise<T>,
    private serializer?: Serializer<T>
  ) {}

  async get(key: string, cachedOnly?: boolean): Promise<T>;
  async get(key: string, cachedOnly: true): Promise<T | undefined>;
  async get(key: string, cachedOnly?: boolean): Promise<T | undefined> {
    const contentKey = `${this.name}\0${key}`;
    try {
      if (globalCache.cacheDir) {
        const result = (await cacache.get(globalCache.cacheDir, contentKey)).data;
        if (this.serializer) {
          const parsed = this.serializer.parse(result);
          return parsed;
        }
        return result as unknown as T;
      }
    } catch {}

    const cachedResult = this.memCache.get(contentKey);
    if (cachedResult) {
      return cachedResult;
    }

    if (cachedOnly) {
      return undefined;
    }

    let result = this.fetch(key);
    if (isPromise(result)) {
      result = await result;
    }

    try {
      if (globalCache.cacheDir) {
        if (this.serializer) {
          const stream = this.serializer.stringify(result);
          cacache.put(globalCache.cacheDir, contentKey, stream, { memoize: true });
        } else {
          cacache.put(globalCache.cacheDir, contentKey, result, { memoize: true });
        }
        return result;
      }
    } catch {}

    this.memCache.set(key, result);

    return result;
  }
}
