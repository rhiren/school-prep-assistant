import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { APP_VERSION } from "../app/version";
import {
  useRemoteDiagnostics,
  useStudentProfiles,
  useSyncDiagnostics,
} from "../state/AppServicesProvider";
import { useTestMode } from "../state/TestModeProvider";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/subjects", label: "Subjects" },
  { to: "/progress", label: "Progress" },
];

export function AppLayout() {
  const { isTestMode } = useTestMode();
  const syncDiagnostics = useSyncDiagnostics();
  const remoteDiagnostics = useRemoteDiagnostics();
  const {
    activeProfile,
    convertStudentProfileToTest,
    createStudentProfile,
    deleteTestStudentProfile,
    profiles,
    setTestStudentFeatureFlag,
    setActiveStudent,
  } = useStudentProfiles();
  const [titleTapCount, setTitleTapCount] = useState(0);
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  const handleCreateStudent = async () => {
    const displayName = window.prompt("Add a student name");
    if (!displayName) {
      return;
    }

    // Keep first-day setup light. Placement, pathway, and standards stay in system metadata.
    const homeGrade = window.prompt("Home grade (optional)") ?? undefined;
    const isTestProfile = window.confirm(
      "Create this as a test student profile for trying new features first?",
    );
    await createStudentProfile(displayName, homeGrade, undefined, {
      profileType: isTestProfile ? "test" : "production",
    });
  };

  useEffect(() => {
    if (titleTapCount === 0 || titleTapCount >= 5) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setTitleTapCount(0);
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [titleTapCount]);

  useEffect(() => {
    if (titleTapCount < 5) {
      return;
    }

    setIsAdminOpen(true);
    setTitleTapCount(0);
  }, [titleTapCount]);

  const handleTitleTap = () => {
    setTitleTapCount((currentCount) => currentCount + 1);
  };

  const testProfiles = profiles.filter((profile) => profile.profileType === "test");

  return (
    <div className="app-shell">
      {!isTestMode ? (
        <header className="panel mb-6 overflow-hidden">
          <div className="panel-padding flex flex-col gap-5 border-b border-stone-200 bg-[linear-gradient(135deg,#fffdf8_0%,#fff3d6_100%)] sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <h1>
                <button
                  aria-label="School Prep Assistant"
                  className="text-left text-3xl font-semibold text-ink"
                  onClick={handleTitleTap}
                  type="button"
                >
                  School Prep Assistant
                </button>
              </h1>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                A growing learning platform for structured subject practice, progress tracking,
                and steady confidence-building.
              </p>
            </div>
            <div className="flex flex-col gap-2 rounded-2xl border border-stone-200/80 bg-white/80 px-4 py-3 sm:min-w-[260px] sm:items-end">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Student
              </div>
              {profiles.length > 1 ? (
                <select
                  className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-ink"
                  onChange={(event) => void setActiveStudent(event.target.value)}
                  value={activeProfile?.studentId ?? ""}
                >
                  {profiles.map((profile) => (
                    <option key={profile.studentId} value={profile.studentId}>
                      {profile.displayName}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-ink">
                  {activeProfile?.displayName ?? "Student 1"}
                </div>
              )}
              <button className="text-sm font-medium text-accent" onClick={() => void handleCreateStudent()} type="button">
                Add student
              </button>
            </div>
          </div>
          <nav className="flex flex-wrap gap-2 px-5 py-4 sm:px-6">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) =>
                  isActive
                    ? "action-link"
                    : "secondary-link"
                }
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </header>
      ) : (
        <div className="mb-4 flex justify-end">
          <div className="rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            Focus Mode
          </div>
        </div>
      )}
      <main className="flex-1">
        <Outlet />
      </main>
      {isAdminOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4">
          <div className="panel max-h-[85vh] w-full max-w-3xl overflow-auto">
            <div className="panel-padding border-b border-stone-200">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                    Hidden Admin
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-ink">Admin Console</h2>
                  <p className="mt-2 text-sm text-stone-600">
                    Minimal operational controls for version visibility and test-profile maintenance.
                  </p>
                </div>
                <button
                  className="secondary-link"
                  onClick={() => setIsAdminOpen(false)}
                  type="button"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <section className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Platform
                </div>
                <div className="mt-3 text-sm text-stone-600">App version</div>
                <div className="mt-1 text-lg font-semibold text-ink">{APP_VERSION}</div>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Test Students
                </div>
                <div className="mt-3 space-y-3">
                  {testProfiles.length === 0 ? (
                    <p className="text-sm text-stone-600">No test student profiles available.</p>
                  ) : (
                    testProfiles.map((profile) => (
                      <div
                        className="rounded-2xl border border-stone-200 bg-stone-50 p-3"
                        key={profile.studentId}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium text-ink">{profile.displayName}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                              {profile.studentId}
                            </div>
                            {profile.isActive ? (
                              <div className="mt-2 text-xs font-medium text-accent">Active test profile</div>
                            ) : null}
                          </div>
                          <button
                            className="secondary-link text-red-700"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete test profile ${profile.displayName} and its local progress data?`,
                                )
                              ) {
                                void deleteTestStudentProfile(profile.studentId);
                              }
                            }}
                            type="button"
                          >
                            Delete test profile
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Remote Diagnostics
                </div>
                <div className="mt-3 space-y-3">
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                    <div className="text-sm font-medium text-ink">
                      {remoteDiagnostics.settings.deviceLabel}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                      {remoteDiagnostics.settings.deviceId}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        className="secondary-link"
                        onClick={() => {
                          const nextLabel = window.prompt(
                            "Set a label for this device in remote diagnostics",
                            remoteDiagnostics.settings.deviceLabel,
                          );
                          if (nextLabel) {
                            void remoteDiagnostics.setDeviceLabel(nextLabel);
                          }
                        }}
                        type="button"
                      >
                        Rename device
                      </button>
                      <button
                        className="secondary-link"
                        onClick={() => void remoteDiagnostics.setEnabled(!remoteDiagnostics.settings.enabled)}
                        type="button"
                      >
                        {remoteDiagnostics.settings.enabled
                          ? "Disable remote diagnostics"
                          : "Enable remote diagnostics"}
                      </button>
                      <button
                        className="secondary-link"
                        disabled={!remoteDiagnostics.settings.enabled}
                        onClick={() => void remoteDiagnostics.uploadNow()}
                        type="button"
                      >
                        Upload now
                      </button>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-stone-600">
                      <p>Status: {remoteDiagnostics.settings.status}</p>
                      <p>
                        Last uploaded:{" "}
                        {remoteDiagnostics.settings.lastUploadedAt
                          ? new Date(remoteDiagnostics.settings.lastUploadedAt).toLocaleString()
                          : "Not yet uploaded"}
                      </p>
                      {remoteDiagnostics.settings.lastError ? (
                        <p className="text-red-700">
                          Last upload error: {remoteDiagnostics.settings.lastError}
                        </p>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-stone-500">
                      Hidden admin only. Uploads recent sync diagnostics for this device to Firebase
                      so issues can be triaged remotely.
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Sync Diagnostics
                </div>
                <div className="mt-3 space-y-3">
                  {syncDiagnostics.length === 0 ? (
                    <p className="text-sm text-stone-600">No sync diagnostics captured yet.</p>
                  ) : (
                    syncDiagnostics.slice(0, 8).map((entry) => (
                      <div
                        className="rounded-2xl border border-stone-200 bg-stone-50 p-3"
                        key={entry.id}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
                                entry.severity === "error"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-stone-200 text-stone-700"
                              }`}
                            >
                              {entry.severity}
                            </span>
                            <span className="text-xs uppercase tracking-[0.16em] text-stone-500">
                              {entry.source}
                            </span>
                          </div>
                          <span className="text-xs text-stone-500">
                            {new Date(entry.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-3 text-sm font-medium text-ink">{entry.message}</p>
                        {entry.details ? (
                          <pre className="mt-3 overflow-auto rounded-xl bg-white p-3 text-xs text-stone-600">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Feature Flags
                </div>
                <div className="mt-3 space-y-3">
                  {profiles.map((profile) => {
                    const featureFlags = Object.entries(profile.featureFlags ?? {});

                    return (
                      <div
                        className="rounded-2xl border border-stone-200 bg-stone-50 p-3"
                        key={profile.studentId}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-medium text-ink">{profile.displayName}</div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                              {profile.profileType ?? "production"} profile
                            </div>
                          </div>
                          {profile.profileType === "test" ? (
                            <div className="text-xs text-stone-500">Test profile controls</div>
                          ) : (
                            <button
                              className="secondary-link"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Convert ${profile.displayName} into a test profile for feature rollout and maintenance?`,
                                  )
                                ) {
                                  void convertStudentProfileToTest(profile.studentId);
                                }
                              }}
                              type="button"
                            >
                              Convert to test
                            </button>
                          )}
                        </div>
                        <div className="mt-3">
                          {profile.profileType === "test" ? (
                            <div className="space-y-3">
                              <label className="flex items-center justify-between gap-3 text-sm text-ink">
                                <span>smartRetry</span>
                                <input
                                  checked={Boolean(profile.featureFlags?.smartRetry)}
                                  className="h-4 w-4 accent-accent"
                                  onChange={(event) => {
                                    void setTestStudentFeatureFlag(
                                      profile.studentId,
                                      "smartRetry",
                                      event.target.checked,
                                    );
                                  }}
                                  type="checkbox"
                                />
                              </label>
                              <p className="text-xs text-stone-500">
                                Hidden admin only. Enables Smart Retry for this test profile.
                              </p>
                              {featureFlags.length === 0 ? (
                                <p className="text-sm text-stone-600">No feature flags enabled.</p>
                              ) : (
                                <ul className="space-y-2 text-sm text-ink">
                                  {featureFlags.map(([flagName, isEnabled]) => (
                                    <li className="flex items-center justify-between gap-3" key={flagName}>
                                      <span>{flagName}</span>
                                      <span className="text-stone-500">{isEnabled ? "enabled" : "disabled"}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-stone-600">
                              Feature flags are read only for production profiles.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
