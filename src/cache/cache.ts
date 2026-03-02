interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export class TTLCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTtl: number;

  constructor(defaultTtlMs: number) {
    this.defaultTtl = defaultTtlMs;
    // Cleanup expired entries every 60 seconds
    setInterval(() => this.cleanup(), 60_000).unref();
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiry: Date.now() + (ttlMs ?? this.defaultTtl),
    });
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }
  }
}
