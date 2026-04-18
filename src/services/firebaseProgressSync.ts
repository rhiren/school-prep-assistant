import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import type { DataTransferServiceContract, ProgressService } from "./contracts";
import {
  getProgressSnapshotLastModified,
  type ProgressSnapshot,
  validateProgressSnapshot,
} from "./dataTransferService";
import { db } from "./firebase";

export const DEFAULT_PROGRESS_SYNC_USER_ID = "daughter-1";

export type ProgressSyncStatus = "offline" | "syncing" | "synced";

export interface CloudProgressDocument {
  appVersion: string;
  lastModified: string;
  syncedAt: string;
  snapshot: ProgressSnapshot;
}

export interface ProgressSyncClient {
  isReady(): boolean;
  saveProgressToCloud(userId: string, progressData: ProgressSnapshot): Promise<void>;
  loadProgressFromCloud(userId: string): Promise<CloudProgressDocument | null>;
}

type ProgressSyncListener = (status: ProgressSyncStatus) => void;

function hasSnapshotData(snapshot: ProgressSnapshot): boolean {
  return (
    snapshot.data.sessions.length > 0 ||
    snapshot.data.attempts.length > 0 ||
    snapshot.data.progress.length > 0
  );
}

function isCloudProgressDocument(value: unknown): value is CloudProgressDocument {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.appVersion === "string" &&
    typeof candidate.lastModified === "string" &&
    typeof candidate.syncedAt === "string" &&
    typeof candidate.snapshot === "object" &&
    candidate.snapshot !== null
  );
}

export class FirestoreProgressSyncClient implements ProgressSyncClient {
  constructor(private readonly firestore: Firestore | null = db) {}

  isReady(): boolean {
    return this.firestore !== null;
  }

  async saveProgressToCloud(userId: string, progressData: ProgressSnapshot): Promise<void> {
    if (!this.firestore) {
      throw new Error("Firebase sync is not configured.");
    }

    const documentRef = doc(this.firestore, "progress", userId);
    await setDoc(
      documentRef,
      {
        appVersion: progressData.appVersion,
        lastModified: getProgressSnapshotLastModified(progressData),
        syncedAt: new Date().toISOString(),
        snapshot: progressData,
        serverUpdatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  async loadProgressFromCloud(userId: string): Promise<CloudProgressDocument | null> {
    if (!this.firestore) {
      throw new Error("Firebase sync is not configured.");
    }

    const documentRef = doc(this.firestore, "progress", userId);
    const snapshot = await getDoc(documentRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    if (!isCloudProgressDocument(data)) {
      throw new Error("Cloud progress data is invalid.");
    }

    return {
      ...data,
      snapshot: validateProgressSnapshot(data.snapshot),
    };
  }
}

export class ProgressSyncManager {
  private readonly listeners = new Set<ProgressSyncListener>();
  private queuedSync: Promise<void> = Promise.resolve();
  private status: ProgressSyncStatus = "offline";

  constructor(
    private readonly client: ProgressSyncClient,
    private readonly dataTransferService: DataTransferServiceContract,
    private readonly userId: string = DEFAULT_PROGRESS_SYNC_USER_ID,
  ) {}

  getStatus(): ProgressSyncStatus {
    return this.status;
  }

  subscribe(listener: ProgressSyncListener): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async initialize(): Promise<void> {
    if (!this.client.isReady()) {
      this.setStatus("offline");
      return;
    }

    await this.runSync();
  }

  syncInBackground(): void {
    if (!this.client.isReady()) {
      this.setStatus("offline");
      return;
    }

    this.queuedSync = this.queuedSync
      .catch(() => undefined)
      .then(async () => {
        await this.runSync();
      });
  }

  waitForIdle(): Promise<void> {
    return this.queuedSync.catch(() => undefined);
  }

  private async runSync(): Promise<void> {
    this.setStatus("syncing");

    try {
      const localSnapshot = await this.dataTransferService.exportProgress();
      const localLastModified = getProgressSnapshotLastModified(localSnapshot);
      const cloudDocument = await this.client.loadProgressFromCloud(this.userId);

      if (cloudDocument) {
        const cloudLastModified = cloudDocument.lastModified;
        if (Date.parse(cloudLastModified) > Date.parse(localLastModified)) {
          await this.dataTransferService.importProgress(cloudDocument.snapshot);
          this.setStatus("synced");
          return;
        }
      }

      if (hasSnapshotData(localSnapshot) || cloudDocument !== null) {
        await this.client.saveProgressToCloud(this.userId, localSnapshot);
      }

      this.setStatus("synced");
    } catch {
      this.setStatus("offline");
    }
  }

  private setStatus(status: ProgressSyncStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }
}

export class SyncingProgressService implements ProgressService {
  constructor(
    private readonly delegate: ProgressService,
    private readonly syncManager: ProgressSyncManager,
  ) {}

  getProgress() {
    return this.delegate.getProgress();
  }

  getConceptProgress(conceptId: string) {
    return this.delegate.getConceptProgress(conceptId);
  }

  getConceptAttempts(conceptId: string) {
    return this.delegate.getConceptAttempts(conceptId);
  }

  getAttempt(attemptId: string) {
    return this.delegate.getAttempt(attemptId);
  }

  async updateFromAttempt(attempt: Parameters<ProgressService["updateFromAttempt"]>[0]): Promise<void> {
    await this.delegate.updateFromAttempt(attempt);
    this.syncManager.syncInBackground();
  }
}

export class SyncingDataTransferService implements DataTransferServiceContract {
  constructor(
    private readonly delegate: DataTransferServiceContract,
    private readonly syncManager: ProgressSyncManager,
  ) {}

  exportProgress() {
    return this.delegate.exportProgress();
  }

  async importProgress(value: unknown) {
    const snapshot = await this.delegate.importProgress(value);
    this.syncManager.syncInBackground();
    return snapshot;
  }
}
