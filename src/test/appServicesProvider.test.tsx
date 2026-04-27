import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AppServices } from "../state/AppServicesProvider";
import {
  AppServicesProvider,
  useStudentProfiles,
} from "../state/AppServicesProvider";
import type { StudentProfile } from "../domain/models";

function buildProfile(overrides: Partial<StudentProfile>): StudentProfile {
  return {
    studentId: "student-1",
    displayName: "Student 1",
    createdAt: "2026-04-22T17:00:00.000Z",
    lastActiveAt: "2026-04-22T17:00:00.000Z",
    isActive: true,
    profileType: "production",
    ...overrides,
  };
}

function TestHarness() {
  const { activeProfile, setActiveStudent } = useStudentProfiles();

  return (
    <div>
      <div>Active profile: {activeProfile?.displayName ?? "none"}</div>
      <button onClick={() => void setActiveStudent("student-2")} type="button">
        Switch
      </button>
    </div>
  );
}

describe("AppServicesProvider", () => {
  it("waits for cloud sync initialization before publishing the new active student", async () => {
    const user = userEvent.setup();
    let initializeSync!: () => void;

    const profiles = [
      buildProfile({
        studentId: "student-1",
        displayName: "Student 1",
        isActive: true,
      }),
      buildProfile({
        studentId: "student-2",
        displayName: "HK",
        isActive: false,
        createdAt: "2026-04-22T17:05:00.000Z",
        lastActiveAt: "2026-04-22T17:05:00.000Z",
      }),
    ];

    const studentProfileService: AppServices["studentProfileService"] = {
      listProfiles: vi.fn(async () => profiles.map((profile) => ({ ...profile }))),
      getActiveProfile: vi.fn(async () => profiles.find((profile) => profile.isActive) ?? profiles[0]),
      getActiveStudentId: vi.fn(async () => profiles.find((profile) => profile.isActive)?.studentId ?? "student-1"),
      setActiveStudent: vi.fn(async (studentId: string) => {
        for (const profile of profiles) {
          profile.isActive = profile.studentId === studentId;
        }
        return profiles.find((profile) => profile.studentId === studentId)!;
      }),
      createProfile: vi.fn(),
      isFeatureEnabled: vi.fn(async () => false),
      convertProfileToTest: vi.fn(),
      setTestProfileFeatureFlag: vi.fn(),
      getProfileDeletionSummary: vi.fn(),
      deleteProfile: vi.fn(),
      deleteTestProfile: vi.fn(),
    };

    const services: AppServices = {
      contentRepository: {} as AppServices["contentRepository"],
      testGenerationService: {} as AppServices["testGenerationService"],
      sessionService: {} as AppServices["sessionService"],
      progressService: {} as AppServices["progressService"],
      mixedTestService: {} as AppServices["mixedTestService"],
      dataTransferService: {} as AppServices["dataTransferService"],
      studentProfileService,
      progressSyncManager: {
        getStatus: () => "synced",
        subscribe: () => () => undefined,
        initialize: vi.fn(
          () =>
            new Promise<void>((resolve) => {
              initializeSync = resolve;
            }),
        ),
      } as unknown as AppServices["progressSyncManager"],
      remoteDiagnosticsManager: {
        getSettings: () => ({
          deviceId: "device-1",
          deviceLabel: "This device",
          enabled: false,
          status: "disabled",
          lastUploadedAt: null,
          lastError: null,
        }),
        subscribe: () => () => undefined,
        setEnabled: async () => undefined,
        setDeviceLabel: async () => undefined,
        uploadNow: async () => undefined,
      } as unknown as AppServices["remoteDiagnosticsManager"],
    };

    render(
      <AppServicesProvider services={services}>
        <TestHarness />
      </AppServicesProvider>,
    );

    expect(await screen.findByText("Active profile: Student 1")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Switch" }));

    expect(screen.getByText("Active profile: Student 1")).toBeInTheDocument();

    initializeSync();

    await waitFor(() => {
      expect(screen.getByText("Active profile: HK")).toBeInTheDocument();
    });
  });
});
