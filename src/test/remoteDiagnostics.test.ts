import { beforeEach, describe, expect, it, vi } from "vitest";
import { RemoteDiagnosticsManager, type RemoteDiagnosticsClient } from "../services/remoteDiagnostics";
import { syncDiagnosticsStore } from "../services/syncDiagnostics";

describe("remote diagnostics", () => {
  beforeEach(() => {
    syncDiagnosticsStore.clear();
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("stays off by default and uploads when explicitly enabled", async () => {
    const uploadDiagnostics = vi.fn().mockResolvedValue(undefined);
    const client: RemoteDiagnosticsClient = {
      isReady: () => true,
      uploadDiagnostics,
    };
    const manager = new RemoteDiagnosticsManager(client, async () => ({
      studentId: "student-remote",
      displayName: "Daughter",
      createdAt: "2026-04-22T12:00:00.000Z",
      lastActiveAt: "2026-04-22T12:00:00.000Z",
      isActive: true,
    }));

    expect(manager.getSettings().enabled).toBe(false);

    syncDiagnosticsStore.record({
      severity: "error",
      source: "profile-sync",
      message: "Profile sync failed",
    });
    await Promise.resolve();

    expect(uploadDiagnostics).not.toHaveBeenCalled();

    await manager.setDeviceLabel("Daughter iPad");
    await manager.setEnabled(true);

    expect(uploadDiagnostics).toHaveBeenCalledTimes(1);
    expect(uploadDiagnostics).toHaveBeenLastCalledWith(
      expect.objectContaining({
        deviceLabel: "Daughter iPad",
        activeStudentId: "student-remote",
        activeStudentName: "Daughter",
        entries: [
          expect.objectContaining({
            message: "Profile sync failed",
            source: "profile-sync",
          }),
        ],
      }),
    );

    manager.dispose();
  });

  it("captures upload failures in manager state without mutating diagnostics history", async () => {
    const client: RemoteDiagnosticsClient = {
      isReady: () => true,
      uploadDiagnostics: vi.fn().mockRejectedValue(new Error("permission-denied")),
    };
    const manager = new RemoteDiagnosticsManager(client, async () => null);

    await manager.setEnabled(true);

    expect(manager.getSettings().status).toBe("error");
    expect(manager.getSettings().lastError).toBe("permission-denied");
    manager.dispose();
  });
});
