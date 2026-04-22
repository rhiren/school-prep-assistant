import { doc, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";
import { APP_VERSION } from "../app/version";
import type { StudentProfile } from "../domain/models";
import { db } from "./firebase";
import { syncDiagnosticsStore, type SyncDiagnosticEntry } from "./syncDiagnostics";

const REMOTE_DIAGNOSTICS_DEVICE_ID_KEY = "school-prep-assistant:remote-diagnostics:device-id";
const REMOTE_DIAGNOSTICS_DEVICE_LABEL_KEY =
  "school-prep-assistant:remote-diagnostics:device-label";
const REMOTE_DIAGNOSTICS_ENABLED_KEY = "school-prep-assistant:remote-diagnostics:enabled";
const REMOTE_DIAGNOSTICS_COLLECTION = "sync_diagnostics";
const MAX_UPLOADED_DIAGNOSTICS = 25;

export type RemoteDiagnosticsStatus =
  | "disabled"
  | "idle"
  | "uploading"
  | "uploaded"
  | "error"
  | "unavailable";

export interface RemoteDiagnosticsSettings {
  deviceId: string;
  deviceLabel: string;
  enabled: boolean;
  status: RemoteDiagnosticsStatus;
  lastUploadedAt: string | null;
  lastError: string | null;
}

export interface CloudRemoteDiagnosticsDocument {
  deviceId: string;
  deviceLabel: string;
  appVersion: string;
  activeStudentId: string | null;
  activeStudentName: string | null;
  enabled: boolean;
  updatedAt: string;
  platform?: string;
  language?: string;
  userAgent?: string;
  entries: SyncDiagnosticEntry[];
}

type RemoteDiagnosticsListener = (settings: RemoteDiagnosticsSettings) => void;

export interface RemoteDiagnosticsClient {
  isReady(): boolean;
  uploadDiagnostics(document: CloudRemoteDiagnosticsDocument): Promise<void>;
}

function readLocalSetting(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeLocalSetting(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}

function generateDeviceId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `device-${crypto.randomUUID()}`;
  }

  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getOrCreateDeviceId(): string {
  const existing = readLocalSetting(REMOTE_DIAGNOSTICS_DEVICE_ID_KEY);
  if (existing) {
    return existing;
  }

  const created = generateDeviceId();
  writeLocalSetting(REMOTE_DIAGNOSTICS_DEVICE_ID_KEY, created);
  return created;
}

function getDefaultDeviceLabel(): string {
  if (typeof navigator === "undefined") {
    return "This device";
  }

  const navigatorWithDeviceData = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  const platform =
    navigatorWithDeviceData.userAgentData?.platform ??
    navigator.platform ??
    "Unknown device";
  return platform || "This device";
}

function getOrCreateDeviceLabel(): string {
  const existing = readLocalSetting(REMOTE_DIAGNOSTICS_DEVICE_LABEL_KEY);
  if (existing) {
    return existing;
  }

  const created = getDefaultDeviceLabel();
  writeLocalSetting(REMOTE_DIAGNOSTICS_DEVICE_LABEL_KEY, created);
  return created;
}

function readRemoteDiagnosticsEnabled(): boolean {
  return readLocalSetting(REMOTE_DIAGNOSTICS_ENABLED_KEY) === "true";
}

function getNavigatorDetails(): Pick<
  CloudRemoteDiagnosticsDocument,
  "platform" | "language" | "userAgent"
> {
  if (typeof navigator === "undefined") {
    return {};
  }

  const navigatorWithDeviceData = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };
  return {
    platform: navigatorWithDeviceData.userAgentData?.platform ?? navigator.platform ?? undefined,
    language: navigator.language ?? undefined,
    userAgent: navigator.userAgent ?? undefined,
  };
}

export class FirestoreRemoteDiagnosticsClient implements RemoteDiagnosticsClient {
  constructor(private readonly firestore: Firestore | null = db) {}

  isReady(): boolean {
    return this.firestore !== null;
  }

  async uploadDiagnostics(documentPayload: CloudRemoteDiagnosticsDocument): Promise<void> {
    if (!this.firestore) {
      throw new Error("Firebase diagnostics upload is not configured.");
    }

    await setDoc(doc(this.firestore, REMOTE_DIAGNOSTICS_COLLECTION, documentPayload.deviceId), {
      ...documentPayload,
      serverUpdatedAt: serverTimestamp(),
    });
  }
}

export class RemoteDiagnosticsManager {
  private readonly listeners = new Set<RemoteDiagnosticsListener>();
  private queuedUpload: Promise<void> = Promise.resolve();
  private readonly unsubscribeDiagnostics: () => void;
  private settings: RemoteDiagnosticsSettings;

  constructor(
    private readonly client: RemoteDiagnosticsClient,
    private readonly getActiveProfile: () => Promise<StudentProfile | null>,
  ) {
    this.settings = {
      deviceId: getOrCreateDeviceId(),
      deviceLabel: getOrCreateDeviceLabel(),
      enabled: readRemoteDiagnosticsEnabled(),
      status: client.isReady()
        ? (readRemoteDiagnosticsEnabled() ? "idle" : "disabled")
        : "unavailable",
      lastUploadedAt: null,
      lastError: null,
    };

    this.unsubscribeDiagnostics = syncDiagnosticsStore.subscribe(() => {
      this.uploadInBackground();
    });
  }

  getSettings(): RemoteDiagnosticsSettings {
    return { ...this.settings };
  }

  subscribe(listener: RemoteDiagnosticsListener): () => void {
    this.listeners.add(listener);
    listener(this.getSettings());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async setEnabled(enabled: boolean): Promise<void> {
    writeLocalSetting(REMOTE_DIAGNOSTICS_ENABLED_KEY, enabled ? "true" : "false");
    this.settings = {
      ...this.settings,
      enabled,
      status: !this.client.isReady() ? "unavailable" : enabled ? "idle" : "disabled",
      lastError: null,
    };
    this.notify();

    if (enabled) {
      await this.uploadNow();
    }
  }

  async setDeviceLabel(deviceLabel: string): Promise<void> {
    const trimmed = deviceLabel.trim();
    if (!trimmed) {
      return;
    }

    writeLocalSetting(REMOTE_DIAGNOSTICS_DEVICE_LABEL_KEY, trimmed);
    this.settings = {
      ...this.settings,
      deviceLabel: trimmed,
    };
    this.notify();

    if (this.settings.enabled) {
      await this.uploadNow();
    }
  }

  async uploadNow(): Promise<void> {
    if (!this.settings.enabled || !this.client.isReady()) {
      return;
    }

    this.queuedUpload = this.queuedUpload
      .catch(() => undefined)
      .then(async () => {
        this.settings = {
          ...this.settings,
          status: "uploading",
          lastError: null,
        };
        this.notify();

        try {
          const activeProfile = await this.getActiveProfile();
          await this.client.uploadDiagnostics({
            deviceId: this.settings.deviceId,
            deviceLabel: this.settings.deviceLabel,
            appVersion: APP_VERSION,
            activeStudentId: activeProfile?.studentId ?? null,
            activeStudentName: activeProfile?.displayName ?? null,
            enabled: this.settings.enabled,
            updatedAt: new Date().toISOString(),
            entries: syncDiagnosticsStore.getEntries().slice(0, MAX_UPLOADED_DIAGNOSTICS),
            ...getNavigatorDetails(),
          });
          this.settings = {
            ...this.settings,
            status: "uploaded",
            lastUploadedAt: new Date().toISOString(),
            lastError: null,
          };
        } catch (error) {
          this.settings = {
            ...this.settings,
            status: "error",
            lastError: error instanceof Error ? error.message : String(error),
          };
          console.error("[remote-diagnostics] Upload failed.", error);
        }

        this.notify();
      });

    await this.queuedUpload;
  }

  dispose(): void {
    this.unsubscribeDiagnostics();
  }

  private uploadInBackground(): void {
    if (!this.settings.enabled || !this.client.isReady()) {
      return;
    }

    void this.uploadNow();
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.getSettings()));
  }
}
