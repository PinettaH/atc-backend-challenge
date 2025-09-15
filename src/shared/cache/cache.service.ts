// src/shared/cache/cache.service.ts
import { Injectable } from '@nestjs/common';

type CacheEntry<T> = { value: T; expiresAt: number };

@Injectable()
export class CacheService {
  private store = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, value: T, ttlSeconds: number) {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  delete(key: string) {
    this.store.delete(key);
  }
}
