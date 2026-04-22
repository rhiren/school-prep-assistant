import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getSyncDiagnosticErrorDetails,
  syncDiagnosticsStore,
} from "../services/syncDiagnostics";

describe("sync diagnostics", () => {
  beforeEach(() => {
    syncDiagnosticsStore.clear();
    vi.restoreAllMocks();
  });

  it("records diagnostics and keeps the newest entries first", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);

    syncDiagnosticsStore.record({
      severity: "info",
      source: "profile-sync",
      message: "First diagnostic",
    });
    syncDiagnosticsStore.record({
      severity: "info",
      source: "progress-sync",
      message: "Second diagnostic",
    });

    expect(syncDiagnosticsStore.getEntries().map((entry) => entry.message)).toEqual([
      "Second diagnostic",
      "First diagnostic",
    ]);
    expect(infoSpy).toHaveBeenCalledTimes(2);
  });

  it("extracts error details safely", () => {
    const error = new Error("permission denied") as Error & { code?: string };
    error.code = "permission-denied";

    expect(getSyncDiagnosticErrorDetails(error)).toEqual({
      code: "permission-denied",
      message: "permission denied",
      name: "Error",
    });
  });
});
