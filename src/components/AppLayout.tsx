import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { APP_VERSION } from "../app/version";
import {
  useAppServices,
  useRemoteDiagnostics,
  useStudentProfiles,
  useSyncDiagnostics,
} from "../state/AppServicesProvider";
import type {
  DailyParentReport,
  WeeklyParentReport,
} from "../services/weeklyParentReport";
import {
  buildDailyParentReport,
  buildWeeklyParentReport,
} from "../services/weeklyParentReport";
import { useTestMode } from "../state/TestModeProvider";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/subjects", label: "Subjects" },
  { to: "/progress", label: "Progress" },
];

export function AppLayout() {
  const { contentRepository, dataTransferService } = useAppServices();
  const { isTestMode } = useTestMode();
  const syncDiagnostics = useSyncDiagnostics();
  const remoteDiagnostics = useRemoteDiagnostics();
  const {
    activeProfile,
    convertStudentProfileToTest,
    createStudentProfile,
    deleteStudentProfile,
    getStudentProfileDeletionSummary,
    profiles,
    setTestStudentFeatureFlag,
    setActiveStudent,
  } = useStudentProfiles();
  const [titleTapCount, setTitleTapCount] = useState(0);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [dailyReport, setDailyReport] = useState<DailyParentReport | null>(null);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyParentReport | null>(null);
  const [isParentReportLoading, setIsParentReportLoading] = useState(false);

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

  useEffect(() => {
    if (!isAdminOpen || !activeProfile) {
      return;
    }

    let isMounted = true;
    setIsParentReportLoading(true);

    void Promise.all([
      dataTransferService.exportProgress(),
      contentRepository.listCourses(),
    ]).then(([snapshot, courses]) => {
      if (!isMounted) {
        return;
      }

      setDailyReport(buildDailyParentReport(activeProfile, snapshot, courses));
      setWeeklyReport(buildWeeklyParentReport(activeProfile, snapshot, courses));
      setIsParentReportLoading(false);
    }).catch(() => {
      if (!isMounted) {
        return;
      }

      setDailyReport(null);
      setWeeklyReport(null);
      setIsParentReportLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [
    activeProfile,
    contentRepository,
    dataTransferService,
    isAdminOpen,
  ]);

  const handleTitleTap = () => {
    setTitleTapCount((currentCount) => currentCount + 1);
  };

  const formatDuration = (durationMs: number | null) => {
    if (durationMs === null) {
      return "—";
    }

    const totalMinutes = Math.max(1, Math.round(durationMs / (1000 * 60)));
    return `${totalMinutes} min`;
  };

  const handleDeleteProfile = async (studentId: string) => {
    const summary = await getStudentProfileDeletionSummary(studentId);
    const workSummary = summary.hasSavedWork
      ? `This profile has saved work: ${summary.submittedAttemptCount} submitted attempt(s), ${summary.progressRecordCount} progress record(s), and ${summary.inProgressSessionCount} in-progress session(s).`
      : "No saved work was found for this profile.";
    const activeSummary = summary.isActive
      ? " This is currently the active profile on this device."
      : "";

    if (
      window.confirm(
        `Delete profile ${summary.displayName} (${summary.studentId})?\n\n${workSummary}${activeSummary}\n\nThis will remove the profile and its synced progress data. Choose OK to confirm or Cancel to keep it.`,
      )
    ) {
      await deleteStudentProfile(studentId);
    }
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
                    Minimal operational controls for version visibility and profile maintenance.
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
                              void handleDeleteProfile(profile.studentId);
                            }}
                            type="button"
                          >
                            Delete profile
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Daily Parent Summary
                </div>
                <div className="mt-3 space-y-3">
                  {isParentReportLoading ? (
                    <p className="text-sm text-stone-600">Loading daily summary...</p>
                  ) : dailyReport && dailyReport.subjects.length > 0 ? (
                    <>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                        <div className="text-sm font-medium text-ink">
                          {dailyReport.studentDisplayName}
                        </div>
                        <p className="mt-1 text-sm text-stone-600">
                          Today: {dailyReport.totalCompletedAttempts} completed attempt(s),{" "}
                          {dailyReport.totalConceptsWorked} concept(s) worked,{" "}
                          {formatDuration(dailyReport.totalCompletedTimeMs)} of completed time,{" "}
                          {dailyReport.totalInProgressSessions} in-progress session(s).
                        </p>
                      </div>
                      {dailyReport.subjects.map((subject) => (
                        <div
                          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                          key={subject.subjectId}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-ink">{subject.subjectTitle}</h3>
                              <p className="mt-1 text-sm text-stone-600">
                                {subject.completedAttempts} completed attempt(s),{" "}
                                {subject.conceptsWorked} concept(s) worked,{" "}
                                {subject.inProgressSessionCount} in-progress session(s).
                              </p>
                            </div>
                            <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-3">
                              <div>
                                <div className="font-semibold text-ink">Average score</div>
                                <div>{subject.averageScore ?? "—"}%</div>
                              </div>
                              <div>
                                <div className="font-semibold text-ink">Time today</div>
                                <div>{formatDuration(subject.totalDurationMs)}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-ink">Smart Retry</div>
                                <div>{subject.smartRetryCount}</div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                              Today's Concept Activity
                            </div>
                            <div className="mt-3 space-y-3">
                              {subject.conceptSummaries.length === 0 ? (
                                <p className="text-sm text-stone-600">
                                  No completed concept attempts today yet.
                                </p>
                              ) : (
                                subject.conceptSummaries.map((concept) => (
                                  <div
                                    className="flex flex-wrap items-start justify-between gap-3"
                                    key={concept.conceptId}
                                  >
                                    <div className="max-w-2xl">
                                      <div className="font-medium text-ink">{concept.conceptTitle}</div>
                                      <p className="mt-1 text-sm text-stone-600">{concept.explanation}</p>
                                    </div>
                                    <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-4 sm:text-right">
                                      <div>
                                        <div className="font-semibold text-ink">Latest</div>
                                        <div>{concept.latestScore ?? "—"}%</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-ink">Best</div>
                                        <div>{concept.bestScore ?? "—"}%</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-ink">Attempts</div>
                                        <div>{concept.attemptsToday}</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-ink">Time</div>
                                        <div>{formatDuration(concept.totalDurationMs)}</div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-stone-600">
                      No activity has been captured for this student today yet.
                    </p>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:col-span-2">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Weekly Parent Report
                </div>
                <div className="mt-3 space-y-3">
                  {isParentReportLoading ? (
                    <p className="text-sm text-stone-600">Loading weekly report...</p>
                  ) : weeklyReport && weeklyReport.subjects.length > 0 ? (
                    <>
                      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-3">
                        <div className="text-sm font-medium text-ink">
                          {weeklyReport.studentDisplayName}
                        </div>
                        <p className="mt-1 text-sm text-stone-600">
                          Reviewing the last 7 days of completed attempts and in-progress work.
                        </p>
                      </div>
                      {weeklyReport.subjects.map((subject) => (
                        <div
                          className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                          key={subject.subjectId}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-semibold text-ink">{subject.subjectTitle}</h3>
                              <p className="mt-1 text-sm text-stone-600">
                                {subject.completedAttempts} completed attempt(s),{" "}
                                {subject.conceptsPracticed} concept(s) practiced,{" "}
                                {subject.inProgressSessionCount} in-progress session(s).
                              </p>
                            </div>
                            <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-3">
                              <div>
                                <div className="font-semibold text-ink">Average score</div>
                                <div>{subject.averageScore ?? "—"}%</div>
                              </div>
                              <div>
                                <div className="font-semibold text-ink">Average time</div>
                                <div>{formatDuration(subject.averageDurationMs)}</div>
                              </div>
                              <div>
                                <div className="font-semibold text-ink">Smart Retry</div>
                                <div>{subject.smartRetryCount}</div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <div className="rounded-2xl border border-stone-200 bg-white p-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                                Strongest Concepts
                              </div>
                              <div className="mt-3 space-y-3">
                                {subject.strongestConcepts.length === 0 ? (
                                  <p className="text-sm text-stone-600">
                                    No strong concept signal yet this week.
                                  </p>
                                ) : (
                                  subject.strongestConcepts.map((concept) => (
                                    <div key={concept.conceptId}>
                                      <div className="font-medium text-ink">{concept.conceptTitle}</div>
                                      <p className="mt-1 text-sm text-stone-600">{concept.explanation}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-white p-3">
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                                Concepts Needing Support
                              </div>
                              <div className="mt-3 space-y-3">
                                {subject.conceptsNeedingSupport.length === 0 ? (
                                  <p className="text-sm text-stone-600">
                                    Nothing looks urgent right now.
                                  </p>
                                ) : (
                                  subject.conceptsNeedingSupport.map((concept) => (
                                    <div key={concept.conceptId}>
                                      <div className="font-medium text-ink">{concept.conceptTitle}</div>
                                      <p className="mt-1 text-sm text-stone-600">{concept.explanation}</p>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-3">
                            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                              Recent Concept Signals
                            </div>
                            <div className="mt-3 space-y-3">
                              {subject.conceptSummaries.length === 0 ? (
                                <p className="text-sm text-stone-600">
                                  No completed concept attempts this week yet.
                                </p>
                              ) : (
                                subject.conceptSummaries.map((concept) => (
                                  <div
                                    className="flex flex-wrap items-start justify-between gap-3"
                                    key={concept.conceptId}
                                  >
                                    <div className="max-w-2xl">
                                      <div className="font-medium text-ink">{concept.conceptTitle}</div>
                                      <p className="mt-1 text-sm text-stone-600">{concept.explanation}</p>
                                    </div>
                                    <div className="grid gap-2 text-sm text-stone-600 sm:grid-cols-4 sm:text-right">
                                      <div>
                                        <div className="font-semibold text-ink">Latest</div>
                                        <div>{concept.latestScore ?? "—"}%</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-ink">Best</div>
                                        <div>{concept.bestScore ?? "—"}%</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-ink">Attempts</div>
                                        <div>{concept.attemptsThisWeek}</div>
                                      </div>
                                      <div>
                                        <div className="font-semibold text-ink">Avg time</div>
                                        <div>{formatDuration(concept.averageDurationMs)}</div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-sm text-stone-600">
                      No weekly activity has been captured for this student yet.
                    </p>
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
                              {profile.studentId}
                            </div>
                            <div className="mt-1 text-xs uppercase tracking-[0.16em] text-stone-500">
                              {profile.profileType ?? "production"} profile
                            </div>
                          </div>
                          {profile.profileType === "test" ? (
                            <div className="flex items-center gap-3 text-xs text-stone-500">
                              <span>Test profile controls</span>
                              <button
                                className="secondary-link text-red-700"
                                onClick={() => {
                                  void handleDeleteProfile(profile.studentId);
                                }}
                                type="button"
                              >
                                Delete profile
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
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
                              <button
                                className="secondary-link text-red-700"
                                onClick={() => {
                                  void handleDeleteProfile(profile.studentId);
                                }}
                                type="button"
                              >
                                Delete profile
                              </button>
                            </div>
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
