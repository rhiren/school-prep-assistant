import { describe, expect, it } from "vitest";
import { BasicScoringEngine } from "../engines/basicScoringEngine";
import type { TestSession } from "../domain/models";
import { createDefaultContentRepository } from "../services/contentRepository";
import { DEFAULT_STUDENT_ID } from "../services/studentProfileService";

describe("BasicScoringEngine", () => {
  it("scores correct, incorrect, and unanswered responses with normalization", async () => {
    const repository = await createDefaultContentRepository();
    const engine = new BasicScoringEngine(repository);
    const session: TestSession = {
      id: "session-1",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
      questionIds: [
        "concept-unit-rates-core-001",
        "concept-unit-rates-core-002",
        "concept-unit-rates-core-003",
      ],
      answers: {
        "concept-unit-rates-core-001": {
          questionId: "concept-unit-rates-core-001",
          response: "8.0",
          answeredAt: "2026-04-12T12:00:00.000Z",
        },
        "concept-unit-rates-core-002": {
          questionId: "concept-unit-rates-core-002",
          response: "6",
          answeredAt: "2026-04-12T12:00:00.000Z",
        },
        "concept-unit-rates-core-003": {
          questionId: "concept-unit-rates-core-003",
          response: "   ",
          answeredAt: "2026-04-12T12:00:00.000Z",
        },
      },
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-12T12:00:00.000Z",
      updatedAt: "2026-04-12T12:00:00.000Z",
    };

    const attempt = await engine.scoreSession(session);

    expect(attempt.summary.correctCount).toBe(1);
    expect(attempt.summary.incorrectCount).toBe(1);
    expect(attempt.summary.unansweredCount).toBe(1);
    expect(attempt.summary.percentage).toBe(33);
  });

  it("marks equivalent numeric formatting as correct", async () => {
    const repository = await createDefaultContentRepository();
    const engine = new BasicScoringEngine(repository);
    const session: TestSession = {
      id: "session-2",
      studentId: DEFAULT_STUDENT_ID,
      mode: "concept",
      courseId: "course-2",
      conceptId: "concept-unit-rates",
      conceptIds: ["concept-unit-rates"],
      questionIds: ["concept-unit-rates-core-017"],
      answers: {
        "concept-unit-rates-core-017": {
          questionId: "concept-unit-rates-core-017",
          response: "6.50",
          answeredAt: "2026-04-12T12:00:00.000Z",
        },
      },
      currentQuestionIndex: 0,
      status: "in_progress",
      createdAt: "2026-04-12T12:00:00.000Z",
      updatedAt: "2026-04-12T12:00:00.000Z",
    };

    const attempt = await engine.scoreSession(session);

    expect(attempt.summary.correctCount).toBe(1);
    expect(attempt.results[0]?.feedbackTip).toBeNull();
  });
});
