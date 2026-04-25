import type { Course, ProgressRecord, StudentProfile, TestAttempt, TestSession } from "../domain/models";

export interface WeeklyParentReportConceptSummary {
  conceptId: string;
  conceptTitle: string;
  latestScore: number | null;
  bestScore: number | null;
  attemptsThisWeek: number;
  averageScore: number | null;
  averageDurationMs: number | null;
  smartRetryCount: number;
  lastWorkedAt: string | null;
  status: "going_well" | "keep_practicing" | "needs_support";
  explanation: string;
}

export interface WeeklyParentReportSubjectSummary {
  subjectId: string;
  subjectTitle: string;
  completedAttempts: number;
  conceptsPracticed: number;
  averageScore: number | null;
  averageDurationMs: number | null;
  smartRetryCount: number;
  inProgressSessionCount: number;
  strongestConcepts: WeeklyParentReportConceptSummary[];
  conceptsNeedingSupport: WeeklyParentReportConceptSummary[];
  conceptSummaries: WeeklyParentReportConceptSummary[];
}

export interface WeeklyParentReport {
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  studentId: string;
  studentDisplayName: string;
  subjects: WeeklyParentReportSubjectSummary[];
}

export interface DailyParentReportConceptSummary {
  conceptId: string;
  conceptTitle: string;
  latestScore: number | null;
  bestScore: number | null;
  attemptsToday: number;
  totalDurationMs: number | null;
  smartRetryCount: number;
  lastWorkedAt: string | null;
  status: "going_well" | "keep_practicing" | "needs_support";
  explanation: string;
}

export interface DailyParentReportSubjectSummary {
  subjectId: string;
  subjectTitle: string;
  completedAttempts: number;
  conceptsWorked: number;
  averageScore: number | null;
  totalDurationMs: number | null;
  smartRetryCount: number;
  inProgressSessionCount: number;
  conceptSummaries: DailyParentReportConceptSummary[];
}

export interface DailyParentReport {
  generatedAt: string;
  windowStart: string;
  windowEnd: string;
  studentId: string;
  studentDisplayName: string;
  totalCompletedAttempts: number;
  totalConceptsWorked: number;
  totalCompletedTimeMs: number | null;
  totalInProgressSessions: number;
  subjects: DailyParentReportSubjectSummary[];
}

interface ProgressSnapshotLike {
  student?: {
    studentId: string;
    displayName: string;
  };
  data: {
    sessions: TestSession[];
    attempts: TestAttempt[];
    progress: ProgressRecord[];
  };
}

interface ConceptMetadata {
  conceptId: string;
  conceptTitle: string;
  courseId: string;
  subjectId: string;
  subjectTitle: string;
}

const WEEK_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function isPresent<T>(value: T | null | undefined): value is T {
  return value !== null && typeof value !== "undefined";
}

function average(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function isWithinWindow(value: string | null | undefined, windowStartMs: number, windowEndMs: number): boolean {
  if (!value) {
    return false;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && parsed >= windowStartMs && parsed <= windowEndMs;
}

function buildConceptMetadata(courses: Course[]): Record<string, ConceptMetadata> {
  const entries: Array<[string, ConceptMetadata]> = [];

  for (const course of courses) {
    for (const unit of course.units) {
      for (const concept of unit.concepts) {
        entries.push([
          concept.id,
          {
            conceptId: concept.id,
            conceptTitle: concept.title,
            courseId: course.id,
            subjectId: course.subjectId,
            subjectTitle: course.subjectTitle,
          },
        ]);
      }
    }
  }

  return Object.fromEntries(entries);
}

function buildConceptStatus(
  averageScore: number | null,
  latestScore: number | null,
  smartRetryCount: number,
  attemptsThisWeek: number,
): Pick<WeeklyParentReportConceptSummary, "status" | "explanation"> {
  if (smartRetryCount > 0) {
    return {
      status: "needs_support",
      explanation: "Smart Retry was triggered this week, so a little extra review may help.",
    };
  }

  if (averageScore !== null && averageScore < 70) {
    return {
      status: "needs_support",
      explanation: "Scores this week were below the target range, so this concept likely needs more support.",
    };
  }

  if (latestScore !== null && latestScore >= 90 && attemptsThisWeek >= 1) {
    return {
      status: "going_well",
      explanation: "High scores this week suggest this concept is feeling steady right now.",
    };
  }

  return {
    status: "keep_practicing",
    explanation: "Practice is moving forward, with room to keep strengthening accuracy and confidence.",
  };
}

function buildDailyConceptStatus(
  averageScore: number | null,
  latestScore: number | null,
  smartRetryCount: number,
  attemptsToday: number,
): Pick<DailyParentReportConceptSummary, "status" | "explanation"> {
  if (smartRetryCount > 0) {
    return {
      status: "needs_support",
      explanation: "Smart Retry was triggered today, so this concept may need extra support.",
    };
  }

  if (averageScore !== null && averageScore < 70) {
    return {
      status: "needs_support",
      explanation: "Scores today were below the target range, so this concept looks harder right now.",
    };
  }

  if (latestScore !== null && latestScore >= 90 && attemptsToday >= 1) {
    return {
      status: "going_well",
      explanation: "Today’s work suggests this concept is feeling steady and accurate.",
    };
  }

  return {
    status: "keep_practicing",
    explanation: "Today’s work shows progress, with room to keep strengthening understanding.",
  };
}

function getStartOfDayIso(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed.toISOString();
}

export function buildWeeklyParentReport(
  student: StudentProfile,
  snapshot: ProgressSnapshotLike,
  courses: Course[],
  options?: {
    now?: string;
  },
): WeeklyParentReport {
  const windowEnd = options?.now ?? new Date().toISOString();
  const windowEndMs = Date.parse(windowEnd);
  const safeWindowEndMs = Number.isFinite(windowEndMs) ? windowEndMs : Date.now();
  const windowStartMs = safeWindowEndMs - WEEK_WINDOW_MS;
  const windowStart = new Date(windowStartMs).toISOString();
  const conceptMetadata = buildConceptMetadata(courses);
  const progressByConceptId = Object.fromEntries(
    snapshot.data.progress.map((record) => [record.conceptId, record] as const),
  );

  const attemptsThisWeek = snapshot.data.attempts.filter((attempt) =>
    isWithinWindow(attempt.submittedAt, windowStartMs, safeWindowEndMs),
  );
  const inProgressSessionsThisWeek = snapshot.data.sessions.filter(
    (session) =>
      session.status === "in_progress" &&
      isWithinWindow(session.updatedAt ?? session.createdAt, windowStartMs, safeWindowEndMs),
  );

  const attemptsBySubject = new Map<string, TestAttempt[]>();
  for (const attempt of attemptsThisWeek) {
    const metadata = attempt.conceptId ? conceptMetadata[attempt.conceptId] : undefined;
    if (!metadata) {
      continue;
    }

    attemptsBySubject.set(metadata.subjectId, [
      ...(attemptsBySubject.get(metadata.subjectId) ?? []),
      attempt,
    ]);
  }

  const sessionsBySubject = new Map<string, TestSession[]>();
  for (const session of inProgressSessionsThisWeek) {
    const metadata = session.conceptId ? conceptMetadata[session.conceptId] : undefined;
    if (!metadata) {
      continue;
    }

    sessionsBySubject.set(metadata.subjectId, [
      ...(sessionsBySubject.get(metadata.subjectId) ?? []),
      session,
    ]);
  }

  const subjectIds = new Set<string>([
    ...attemptsBySubject.keys(),
    ...sessionsBySubject.keys(),
  ]);

  const subjects = Array.from(subjectIds)
    .map((subjectId) => {
      const subjectAttempts = attemptsBySubject.get(subjectId) ?? [];
      const subjectSessions = sessionsBySubject.get(subjectId) ?? [];
      const subjectMetadata =
        subjectAttempts
          .map((attempt) => (attempt.conceptId ? conceptMetadata[attempt.conceptId] : undefined))
          .find((metadata): metadata is ConceptMetadata => Boolean(metadata)) ??
        subjectSessions
          .map((session) => (session.conceptId ? conceptMetadata[session.conceptId] : undefined))
          .find((metadata): metadata is ConceptMetadata => Boolean(metadata));

      if (!subjectMetadata) {
        return null;
      }

      const attemptsByConcept = new Map<string, TestAttempt[]>();
      for (const attempt of subjectAttempts) {
        if (!attempt.conceptId) {
          continue;
        }

        attemptsByConcept.set(attempt.conceptId, [
          ...(attemptsByConcept.get(attempt.conceptId) ?? []),
          attempt,
        ]);
      }

      const conceptSummaries = Array.from(attemptsByConcept.entries())
        .map<WeeklyParentReportConceptSummary | null>(([conceptId, attempts]) => {
          const metadata = conceptMetadata[conceptId];
          if (!metadata) {
            return null;
          }

          const sortedAttempts = [...attempts].sort((left, right) =>
            right.submittedAt.localeCompare(left.submittedAt),
          );
          const latestAttempt = sortedAttempts[0];
          const scores = sortedAttempts.map((attempt) => attempt.summary.percentage);
          const durations = sortedAttempts
            .map((attempt) => attempt.durationSignal?.durationMs)
            .filter((value): value is number => typeof value === "number");
          const smartRetryCount = sortedAttempts.filter((attempt) => attempt.smartRetry?.kind === "targeted").length;
          const progressRecord = progressByConceptId[conceptId];
          const averageScore = average(scores);
          const averageDurationMs = average(durations);
          const latestScore = latestAttempt?.summary.percentage ?? progressRecord?.latestScore ?? null;
          const bestScore =
            progressRecord?.bestScore ??
            (scores.length > 0 ? Math.max(...scores) : null);
          const status = buildConceptStatus(
            averageScore,
            latestScore,
            smartRetryCount,
            sortedAttempts.length,
          );

          return {
            conceptId,
            conceptTitle: metadata.conceptTitle,
            latestScore,
            bestScore,
            attemptsThisWeek: sortedAttempts.length,
            averageScore,
            averageDurationMs,
            smartRetryCount,
            lastWorkedAt: latestAttempt?.submittedAt ?? progressRecord?.lastAttemptedAt ?? null,
            status: status.status,
            explanation: status.explanation,
          } satisfies WeeklyParentReportConceptSummary;
        })
        .filter(isPresent)
        .sort((left, right) => {
          const rightWorked = Date.parse(right.lastWorkedAt ?? "");
          const leftWorked = Date.parse(left.lastWorkedAt ?? "");
          return (Number.isFinite(rightWorked) ? rightWorked : 0) - (Number.isFinite(leftWorked) ? leftWorked : 0);
        });

      const practicedConceptIds = new Set<string>([
        ...subjectAttempts.map((attempt) => attempt.conceptId).filter((value): value is string => Boolean(value)),
        ...subjectSessions.map((session) => session.conceptId).filter((value): value is string => Boolean(value)),
      ]);

      return {
        subjectId: subjectMetadata.subjectId,
        subjectTitle: subjectMetadata.subjectTitle,
        completedAttempts: subjectAttempts.length,
        conceptsPracticed: practicedConceptIds.size,
        averageScore: average(subjectAttempts.map((attempt) => attempt.summary.percentage)),
        averageDurationMs: average(
          subjectAttempts
            .map((attempt) => attempt.durationSignal?.durationMs)
            .filter((value): value is number => typeof value === "number"),
        ),
        smartRetryCount: subjectAttempts.filter((attempt) => attempt.smartRetry?.kind === "targeted").length,
        inProgressSessionCount: subjectSessions.length,
        strongestConcepts: [...conceptSummaries]
          .filter((summary) => summary.status === "going_well")
          .sort((left, right) => {
            const scoreDelta = (right.averageScore ?? 0) - (left.averageScore ?? 0);
            if (scoreDelta !== 0) {
              return scoreDelta;
            }

            return right.attemptsThisWeek - left.attemptsThisWeek;
          })
          .slice(0, 3),
        conceptsNeedingSupport: [...conceptSummaries]
          .filter((summary) => summary.status === "needs_support")
          .sort((left, right) => {
            const retryDelta = right.smartRetryCount - left.smartRetryCount;
            if (retryDelta !== 0) {
              return retryDelta;
            }

            return (left.averageScore ?? Number.POSITIVE_INFINITY) - (right.averageScore ?? Number.POSITIVE_INFINITY);
          })
          .slice(0, 3),
        conceptSummaries,
      } satisfies WeeklyParentReportSubjectSummary;
    })
    .filter(isPresent)
    .sort((left, right) => left.subjectTitle.localeCompare(right.subjectTitle));

  return {
    generatedAt: windowEnd,
    windowStart,
    windowEnd,
    studentId: snapshot.student?.studentId ?? student.studentId,
    studentDisplayName: snapshot.student?.displayName ?? student.displayName,
    subjects,
  };
}

export function buildDailyParentReport(
  student: StudentProfile,
  snapshot: ProgressSnapshotLike,
  courses: Course[],
  options?: {
    now?: string;
  },
): DailyParentReport {
  const windowEnd = options?.now ?? new Date().toISOString();
  const windowEndMs = Date.parse(windowEnd);
  const safeWindowEndMs = Number.isFinite(windowEndMs) ? windowEndMs : Date.now();
  const windowStart = getStartOfDayIso(windowEnd);
  const windowStartMs = Date.parse(windowStart);
  const safeWindowStartMs = Number.isFinite(windowStartMs) ? windowStartMs : safeWindowEndMs;
  const conceptMetadata = buildConceptMetadata(courses);
  const progressByConceptId = Object.fromEntries(
    snapshot.data.progress.map((record) => [record.conceptId, record] as const),
  );

  const attemptsToday = snapshot.data.attempts.filter((attempt) =>
    isWithinWindow(attempt.submittedAt, safeWindowStartMs, safeWindowEndMs),
  );
  const inProgressSessionsToday = snapshot.data.sessions.filter(
    (session) =>
      session.status === "in_progress" &&
      isWithinWindow(session.updatedAt ?? session.createdAt, safeWindowStartMs, safeWindowEndMs),
  );

  const attemptsBySubject = new Map<string, TestAttempt[]>();
  for (const attempt of attemptsToday) {
    const metadata = attempt.conceptId ? conceptMetadata[attempt.conceptId] : undefined;
    if (!metadata) {
      continue;
    }

    attemptsBySubject.set(metadata.subjectId, [
      ...(attemptsBySubject.get(metadata.subjectId) ?? []),
      attempt,
    ]);
  }

  const sessionsBySubject = new Map<string, TestSession[]>();
  for (const session of inProgressSessionsToday) {
    const metadata = session.conceptId ? conceptMetadata[session.conceptId] : undefined;
    if (!metadata) {
      continue;
    }

    sessionsBySubject.set(metadata.subjectId, [
      ...(sessionsBySubject.get(metadata.subjectId) ?? []),
      session,
    ]);
  }

  const subjectIds = new Set<string>([
    ...attemptsBySubject.keys(),
    ...sessionsBySubject.keys(),
  ]);

  const subjects = Array.from(subjectIds)
    .map((subjectId) => {
      const subjectAttempts = attemptsBySubject.get(subjectId) ?? [];
      const subjectSessions = sessionsBySubject.get(subjectId) ?? [];
      const subjectMetadata =
        subjectAttempts
          .map((attempt) => (attempt.conceptId ? conceptMetadata[attempt.conceptId] : undefined))
          .find((metadata): metadata is ConceptMetadata => Boolean(metadata)) ??
        subjectSessions
          .map((session) => (session.conceptId ? conceptMetadata[session.conceptId] : undefined))
          .find((metadata): metadata is ConceptMetadata => Boolean(metadata));

      if (!subjectMetadata) {
        return null;
      }

      const attemptsByConcept = new Map<string, TestAttempt[]>();
      for (const attempt of subjectAttempts) {
        if (!attempt.conceptId) {
          continue;
        }

        attemptsByConcept.set(attempt.conceptId, [
          ...(attemptsByConcept.get(attempt.conceptId) ?? []),
          attempt,
        ]);
      }

      const conceptSummaries = Array.from(attemptsByConcept.entries())
        .map<DailyParentReportConceptSummary | null>(([conceptId, attempts]) => {
          const metadata = conceptMetadata[conceptId];
          if (!metadata) {
            return null;
          }

          const sortedAttempts = [...attempts].sort((left, right) =>
            right.submittedAt.localeCompare(left.submittedAt),
          );
          const latestAttempt = sortedAttempts[0];
          const scores = sortedAttempts.map((attempt) => attempt.summary.percentage);
          const durations = sortedAttempts
            .map((attempt) => attempt.durationSignal?.durationMs)
            .filter((value): value is number => typeof value === "number");
          const smartRetryCount = sortedAttempts.filter(
            (attempt) => attempt.smartRetry?.kind === "targeted",
          ).length;
          const progressRecord = progressByConceptId[conceptId];
          const latestScore = latestAttempt?.summary.percentage ?? progressRecord?.latestScore ?? null;
          const bestScore =
            progressRecord?.bestScore ??
            (scores.length > 0 ? Math.max(...scores) : null);
          const totalDurationMs =
            durations.length > 0 ? durations.reduce((sum, value) => sum + value, 0) : null;
          const status = buildDailyConceptStatus(
            average(scores),
            latestScore,
            smartRetryCount,
            sortedAttempts.length,
          );

          return {
            conceptId,
            conceptTitle: metadata.conceptTitle,
            latestScore,
            bestScore,
            attemptsToday: sortedAttempts.length,
            totalDurationMs,
            smartRetryCount,
            lastWorkedAt: latestAttempt?.submittedAt ?? progressRecord?.lastAttemptedAt ?? null,
            status: status.status,
            explanation: status.explanation,
          } satisfies DailyParentReportConceptSummary;
        })
        .filter(isPresent)
        .sort((left, right) => {
          const rightWorked = Date.parse(right.lastWorkedAt ?? "");
          const leftWorked = Date.parse(left.lastWorkedAt ?? "");
          return (Number.isFinite(rightWorked) ? rightWorked : 0) - (Number.isFinite(leftWorked) ? leftWorked : 0);
        });

      const practicedConceptIds = new Set<string>([
        ...subjectAttempts.map((attempt) => attempt.conceptId).filter((value): value is string => Boolean(value)),
        ...subjectSessions.map((session) => session.conceptId).filter((value): value is string => Boolean(value)),
      ]);

      const durationValues = subjectAttempts
        .map((attempt) => attempt.durationSignal?.durationMs)
        .filter((value): value is number => typeof value === "number");

      return {
        subjectId: subjectMetadata.subjectId,
        subjectTitle: subjectMetadata.subjectTitle,
        completedAttempts: subjectAttempts.length,
        conceptsWorked: practicedConceptIds.size,
        averageScore: average(subjectAttempts.map((attempt) => attempt.summary.percentage)),
        totalDurationMs:
          durationValues.length > 0 ? durationValues.reduce((sum, value) => sum + value, 0) : null,
        smartRetryCount: subjectAttempts.filter((attempt) => attempt.smartRetry?.kind === "targeted").length,
        inProgressSessionCount: subjectSessions.length,
        conceptSummaries,
      } satisfies DailyParentReportSubjectSummary;
    })
    .filter(isPresent)
    .sort((left, right) => left.subjectTitle.localeCompare(right.subjectTitle));

  const allDurationValues = attemptsToday
    .map((attempt) => attempt.durationSignal?.durationMs)
    .filter((value): value is number => typeof value === "number");
  const practicedConceptIds = new Set<string>([
    ...attemptsToday.map((attempt) => attempt.conceptId).filter((value): value is string => Boolean(value)),
    ...inProgressSessionsToday
      .map((session) => session.conceptId)
      .filter((value): value is string => Boolean(value)),
  ]);

  return {
    generatedAt: windowEnd,
    windowStart,
    windowEnd,
    studentId: snapshot.student?.studentId ?? student.studentId,
    studentDisplayName: snapshot.student?.displayName ?? student.displayName,
    totalCompletedAttempts: attemptsToday.length,
    totalConceptsWorked: practicedConceptIds.size,
    totalCompletedTimeMs:
      allDurationValues.length > 0 ? allDurationValues.reduce((sum, value) => sum + value, 0) : null,
    totalInProgressSessions: inProgressSessionsToday.length,
    subjects,
  };
}
