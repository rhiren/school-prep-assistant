import type { StorageService, StoreName } from "./storageService";

export class MemoryStorageService implements StorageService {
  private readonly stores: Record<StoreName, Map<string, unknown>> = {
    sessions: new Map<string, unknown>(),
    attempts: new Map<string, unknown>(),
    progress: new Map<string, unknown>(),
    students: new Map<string, unknown>(),
  };
  private version: string | null = null;

  async get<T>(storeName: StoreName, key: string): Promise<T | null> {
    return (this.stores[storeName].get(key) as T | undefined) ?? null;
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    return Array.from(this.stores[storeName].values()) as T[];
  }

  async set<T>(storeName: StoreName, key: string, value: T): Promise<void> {
    this.stores[storeName].set(key, value);
  }

  async delete(storeName: StoreName, key: string): Promise<void> {
    this.stores[storeName].delete(key);
  }

  async clear(storeName: StoreName): Promise<void> {
    this.stores[storeName].clear();
  }

  async getVersion(): Promise<string | null> {
    return this.version;
  }

  async setVersion(version: string): Promise<void> {
    this.version = version;
  }
}
