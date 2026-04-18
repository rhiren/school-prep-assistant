import { describe, expect, it } from "vitest";
import { MixedTestEligibilityEngine } from "../engines/mixedTestEligibilityEngine";
import type { ProgressService } from "../services/contracts";
import { DEFAULT_STUDENT_ID } from "../services/studentProfileService";

describe("MixedTestEligibilityEngine", () => {
  it("unlocks after three completed concepts", async () => {
    const progressService: ProgressService = {
      getProgress: async () => [
        {
          studentId: DEFAULT_STUDENT_ID,
          conceptId: "concept-ratios",
          courseId: "course-2",
          attemptCount: 1,
          latestScore: 70,
          bestScore: 70,
          masteryStatus: "needs_review",
          lastAttemptedAt: "2026-04-12T12:00:00.000Z",
          lastModified: "2026-04-12T12:00:00.000Z",
        },
        {
          studentId: DEFAULT_STUDENT_ID,
          conceptId: "concept-unit-rates",
          courseId: "course-2",
          attemptCount: 2,
          latestScore: 85,
          bestScore: 90,
          masteryStatus: "mastered",
          lastAttemptedAt: "2026-04-12T11:00:00.000Z",
          lastModified: "2026-04-12T11:00:00.000Z",
        },
        {
          studentId: DEFAULT_STUDENT_ID,
          conceptId: "concept-integer-operations",
          courseId: "course-2",
          attemptCount: 1,
          latestScore: 80,
          bestScore: 80,
          masteryStatus: "practiced",
          lastAttemptedAt: "2026-04-12T10:00:00.000Z",
          lastModified: "2026-04-12T10:00:00.000Z",
        },
      ],
      getConceptProgress: async () => null,
      getConceptAttempts: async () => [],
      getAttempt: async () => null,
      updateFromAttempt: async () => {},
    };
    const mixedService = new MixedTestEligibilityEngine(progressService);

    const eligibility = await mixedService.getEligibility("course-2");

    expect(eligibility.unlocked).toBe(true);
    expect(eligibility.conceptIds).toHaveLength(3);
  });
});
