export type SyncDiagnosticSeverity = "info" | "error";
export type SyncDiagnosticSource =
  | "firebase-init"
  | "profile-sync"
  | "progress-sync";

export interface SyncDiagnosticEntry {
  id: string;
  timestamp: string;
  severity: SyncDiagnosticSeverity;
  source: SyncDiagnosticSource;
  message: string;
  details?: Record<string, unknown>;
}

type SyncDiagnosticListener = (entries: SyncDiagnosticEntry[]) => void;

const MAX_SYNC_DIAGNOSTICS = 30;

function sanitizeDetails(
  details: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!details) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(details).filter(([, value]) => typeof value !== "undefined"),
  );
}

export function getSyncDiagnosticErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: string };
    return sanitizeDetails({
      code: errorWithCode.code,
      message: error.message,
      name: error.name,
    }) ?? {};
  }

  return { message: String(error) };
}

class SyncDiagnosticsStore {
  private entries: SyncDiagnosticEntry[] = [];
  private listeners = new Set<SyncDiagnosticListener>();

  getEntries(): SyncDiagnosticEntry[] {
    return [...this.entries];
  }

  subscribe(listener: SyncDiagnosticListener): () => void {
    this.listeners.add(listener);
    listener(this.getEntries());
    return () => {
      this.listeners.delete(listener);
    };
  }

  record(entry: Omit<SyncDiagnosticEntry, "id" | "timestamp">): SyncDiagnosticEntry {
    const diagnosticEntry: SyncDiagnosticEntry = {
      ...entry,
      id: `sync-diagnostic-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      details: sanitizeDetails(entry.details),
    };

    if (diagnosticEntry.severity === "error") {
      console.error(`[sync] ${diagnosticEntry.source}: ${diagnosticEntry.message}`, diagnosticEntry.details ?? {});
    } else {
      console.info(`[sync] ${diagnosticEntry.source}: ${diagnosticEntry.message}`, diagnosticEntry.details ?? {});
    }

    this.entries = [diagnosticEntry, ...this.entries].slice(0, MAX_SYNC_DIAGNOSTICS);
    this.listeners.forEach((listener) => listener(this.getEntries()));
    return diagnosticEntry;
  }

  clear(): void {
    this.entries = [];
    this.listeners.forEach((listener) => listener(this.getEntries()));
  }
}

export const syncDiagnosticsStore = new SyncDiagnosticsStore();
