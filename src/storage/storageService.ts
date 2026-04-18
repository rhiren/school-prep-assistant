export type StoreName = "sessions" | "attempts" | "progress" | "students";

export interface StorageService {
  get<T>(storeName: StoreName, key: string): Promise<T | null>;
  getAll<T>(storeName: StoreName): Promise<T[]>;
  set<T>(storeName: StoreName, key: string, value: T): Promise<void>;
  delete(storeName: StoreName, key: string): Promise<void>;
  clear(storeName: StoreName): Promise<void>;
  getVersion(): Promise<string | null>;
  setVersion(version: string): Promise<void>;
}
