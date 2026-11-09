import type { Cache } from 'swr';
import type { PreparedResource } from '../core/contracts.js';
import { DEFAULT_CACHE_INACTIVE_ENTRIES, positiveInteger } from '../core/constants.js';
type Value = Parameters<Cache<PreparedResource>['set']>[1];
/** LRU bound applies to inactive records; mounted consumers are pinned. */
export class ResourceCache implements Cache<PreparedResource> {
  private readonly values = new Map<string, Value>();
  private readonly pins = new Map<string, number>();
  private readonly capacity: number;
  private scheduled = false;
  constructor(capacity = DEFAULT_CACHE_INACTIVE_ENTRIES) {
    this.capacity = positiveInteger(capacity, 'cache capacity');
  }
  get(key: string): Value | undefined {
    const value = this.values.get(key);
    if (value !== undefined) {
      this.values.delete(key);
      this.values.set(key, value);
    }
    return value;
  }
  set(key: string, value: Value): void {
    this.values.delete(key);
    this.values.set(key, value);
    this.scheduleTrim();
  }
  delete(key: string): void {
    this.values.delete(key);
  }
  keys(): IterableIterator<string> {
    return this.values.keys();
  }
  retain(key: string): () => void {
    this.pins.set(key, (this.pins.get(key) ?? 0) + 1);
    return () => {
      const count = (this.pins.get(key) ?? 1) - 1;
      if (count) this.pins.set(key, count);
      else this.pins.delete(key);
      this.scheduleTrim();
    };
  }
  private scheduleTrim(): void {
    if (this.scheduled) return;
    this.scheduled = true;
    queueMicrotask(() => {
      this.scheduled = false;
      this.trim();
    });
  }
  private trim(): void {
    let inactive = [...this.values.keys()].filter((key) => !this.pins.has(key)).length;
    for (const key of this.values.keys()) {
      if (inactive <= this.capacity) break;
      if (!this.pins.has(key)) {
        this.values.delete(key);
        inactive--;
      }
    }
  }
}
