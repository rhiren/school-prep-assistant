import { describe, expect, it } from "vitest";
import type { Course, StudentProfile, TestAttempt, TestSession } from "../domain/models";
import {
  buildDailyParentReport,
  buildWeeklyParentReport,
} from "../services/weeklyParentReport";

const student: StudentProfile = {
  studentId: "student-1",
  displayName: "Student 1",
  profileType: "production",
  createdAt: "2026-04-01T00:00:00.000Z",
  lastActiveAt: "2026-04-24T00:00:00.000Z",
  isActive: true,
};

const courses: Course[] = [
  {
    id: "course-2",
    subjectId: "math",
    subjectTitle: "Mathematics",
    courseId: "course-2",
    courseTitle: "Course 2",
    title: "Course 2",
    description: "Math course",
    order: 1,
    units: [
      {
        id: "unit-1",
        courseId: "course-2",
        title: "Unit 1",
        description: "Ratios",
        order: 1,
        concepts: [
          {
            id: "concept-ratios",
            courseId: "course-2",
            unitId: "unit-1",
            title: "Ratios",
            description: "Ratios",
            tags: [],
            order: 1,
            masteryStatus: "in_progress",
            hasTest: true,
          },
          {
            id: "concept-unit-rates",
            courseId: "course-2",
            unitId: "unit-1",
            title: "Unit Rates",
            description: "Unit rates",
            tags: [],
            order: 2,
            masteryStatus: "in_progress",
            hasTest: true,
          },
        ],
      },
    ],
  },
];

function buildAttempt(
  attemptId: string,
  conceptId: string,
  score: number,
  submittedAt: string,
  options?: {
    smartRetry?: boolean;
    durationMs?: number;
  },
): TestAttempt {
  return {
    attemptId,
    studentId: "student-1",
    sessionId: `session-${attemptId}`,
    mode: "concept",
    courseId: "course-2",
    conceptId,
    conceptIds: [conceptId],
    questionIds: ["q1", "q2", "q3", "q4", "q5"],
    answers: {},
    smartRetry: options?.smartRetry
      ? {
          kind: "targeted",
          cycle: 1,
        }
      : undefined,
    durationSignal:
      typeof options?.durationMs === "number"
        ? {
            startedAt: "2026-04-20T10:00:00.000Z",
            durationMs: options.durationMs,
          }
        : undefined,
    results: [],
    summary: {
      totalQuestions: 5,
      correctCount: Math.round((score / 100) * 5),
      incorrectCount: 5 - Math.round((score / 100) * 5),
      unansweredCount: 0,
      percentage: score,
    },
    submittedAt,
  };
}

describe("buildWeeklyParentReport", () => {
  it("groups the active student's weekly activity by subject with supportive concept signals", () => {
    const report = buildWeeklyParentReport(
      student,
      {
        student: {
          studentId: "student-1",
          displayName: "Student 1",
        },
        data: {
          sessions: [
            {
              id: "session-open",
              studentId: "student-1",
              mode: "concept",
              courseId: "course-2",
              conceptId: "concept-ratios",
              conceptIds: ["concept-ratios"],
              questionIds: ["q1"],
              answers: {},
              currentQuestionIndex: 1,
              status: "in_progress",
              createdAt: "2026-04-23T09:00:00.000Z",
              updatedAt: "2026-04-23T09:10:00.000Z",
            } satisfies TestSession,
          ],
          attempts: [
            buildAttempt("attempt-1", "concept-unit-rates", 96, "2026-04-23T10:00:00.000Z", {
              durationMs: 360000,
            }),
            buildAttempt("attempt-2", "concept-ratios", 62, "2026-04-22T10:00:00.000Z", {
              smartRetry: true,
              durationMs: 720000,
            }),
          ],
          progress: [
            {
              studentId: "student-1",
              conceptId: "concept-unit-rates",
              courseId: "course-2",
              attemptCount: 1,
              latestScore: 96,
              bestScore: 96,
              masteryStatus: "practiced",
              lastAttemptedAt: "2026-04-23T10:00:00.000Z",
              lastModified: "2026-04-23T10:00:00.000Z",
            },
            {
              studentId: "student-1",
              conceptId: "concept-ratios",
              courseId: "course-2",
              attemptCount: 1,
              latestScore: 62,
              bestScore: 62,
              masteryStatus: "needs_review",
              lastAttemptedAt: "2026-04-22T10:00:00.000Z",
              lastModified: "2026-04-22T10:00:00.000Z",
            },
          ],
        },
      },
      courses,
      {
        now: "2026-04-24T12:00:00.000Z",
      },
    );

    expect(report.subjects).toHaveLength(1);
    expect(report.subjects[0]).toMatchObject({
      subjectId: "math",
      subjectTitle: "Mathematics",
      completedAttempts: 2,
      conceptsPracticed: 2,
      smartRetryCount: 1,
      inProgressSessionCount: 1,
      averageScore: 79,
      averageDurationMs: 540000,
    });
    expect(report.subjects[0]?.strongestConcepts[0]).toMatchObject({
      conceptId: "concept-unit-rates",
      status: "going_well",
    });
    expect(report.subjects[0]?.conceptsNeedingSupport[0]).toMatchObject({
      conceptId: "concept-ratios",
      status: "needs_support",
    });
    expect(report.subjects[0]?.conceptSummaries[0]?.explanation).toBeTruthy();
  });

  it("returns no subject sections when there is no activity in the weekly window", () => {
    const report = buildWeeklyParentReport(
      student,
      {
        data: {
          sessions: [],
          attempts: [
            buildAttempt("attempt-old", "concept-unit-rates", 100, "2026-03-01T10:00:00.000Z"),
          ],
          progress: [],
        },
      },
      courses,
      {
        now: "2026-04-24T12:00:00.000Z",
      },
    );

    expect(report.subjects).toEqual([]);
  });
});

describe("buildDailyParentReport", () => {
  it("builds a today summary with completed time, concepts worked, and in-progress sessions", () => {
    const report = buildDailyParentReport(
      student,
      {
        student: {
          studentId: "student-1",
          displayName: "Student 1",
        },
        data: {
          sessions: [
            {
              id: "session-open",
              studentId: "student-1",
              mode: "concept",
              courseId: "course-2",
              conceptId: "concept-ratios",
              conceptIds: ["concept-ratios"],
              questionIds: ["q1"],
              answers: {},
              currentQuestionIndex: 1,
              status: "in_progress",
              createdAt: "2026-04-24T08:00:00.000Z",
              updatedAt: "2026-04-24T08:20:00.000Z",
            } satisfies TestSession,
          ],
          attempts: [
            buildAttempt("attempt-today-1", "concept-unit-rates", 95, "2026-04-24T10:00:00.000Z", {
              durationMs: 420000,
            }),
            buildAttempt("attempt-today-2", "concept-ratios", 68, "2026-04-24T11:00:00.000Z", {
              smartRetry: true,
              durationMs: 900000,
            }),
            buildAttempt("attempt-yesterday", "concept-unit-rates", 100, "2026-04-23T11:00:00.000Z", {
              durationMs: 300000,
            }),
          ],
          progress: [
            {
              studentId: "student-1",
              conceptId: "concept-unit-rates",
              courseId: "course-2",
              attemptCount: 2,
              latestScore: 95,
              bestScore: 100,
              masteryStatus: "practiced",
              lastAttemptedAt: "2026-04-24T10:00:00.000Z",
              lastModified: "2026-04-24T10:00:00.000Z",
            },
            {
              studentId: "student-1",
              conceptId: "concept-ratios",
              courseId: "course-2",
              attemptCount: 1,
              latestScore: 68,
              bestScore: 68,
              masteryStatus: "needs_review",
              lastAttemptedAt: "2026-04-24T11:00:00.000Z",
              lastModified: "2026-04-24T11:00:00.000Z",
            },
          ],
        },
      },
      courses,
      {
        now: "2026-04-24T18:00:00.000Z",
      },
    );

    expect(report).toMatchObject({
      totalCompletedAttempts: 2,
      totalConceptsWorked: 2,
      totalCompletedTimeMs: 1320000,
      totalInProgressSessions: 1,
    });
    expect(report.subjects[0]).toMatchObject({
      subjectId: "math",
      subjectTitle: "Mathematics",
      completedAttempts: 2,
      conceptsWorked: 2,
      averageScore: 82,
      totalDurationMs: 1320000,
      smartRetryCount: 1,
      inProgressSessionCount: 1,
    });
    expect(report.subjects[0]?.conceptSummaries[0]?.conceptId).toBe("concept-ratios");
    expect(report.subjects[0]?.conceptSummaries[0]?.status).toBe("needs_support");
    expect(report.subjects[0]?.conceptSummaries[1]?.conceptId).toBe("concept-unit-rates");
    expect(report.subjects[0]?.conceptSummaries[1]?.status).toBe("going_well");
  });

  it("returns no subject sections when there is no activity today", () => {
    const report = buildDailyParentReport(
      student,
      {
        data: {
          sessions: [],
          attempts: [
            buildAttempt("attempt-old", "concept-unit-rates", 100, "2026-04-23T10:00:00.000Z"),
          ],
          progress: [],
        },
      },
      courses,
      {
        now: "2026-04-24T18:00:00.000Z",
      },
    );

    expect(report.subjects).toEqual([]);
    expect(report.totalCompletedAttempts).toBe(0);
    expect(report.totalCompletedTimeMs).toBeNull();
  });
});
