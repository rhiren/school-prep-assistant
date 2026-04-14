import { describe, expect, it, vi } from "vitest";
import { DeterministicConceptTestEngine } from "../engines/deterministicConceptTestEngine";
import { StableSelectionStrategy, type QuestionSelectionStrategy } from "../engines/questionSelectionStrategy";
import { createDefaultContentRepository } from "../services/contentRepository";
import { MemoryStorageService } from "../storage/memoryStorageService";
import { SessionRepository } from "../storage/repositories";

describe("DeterministicConceptTestEngine", () => {
  it("uses the injected selection strategy hook", async () => {
    const repository = createDefaultContentRepository();
    const sessionRepository = new SessionRepository(new MemoryStorageService());
    const selectQuestions = vi.fn((questions, _context) => questions.slice(0, 1));
    const strategy: QuestionSelectionStrategy = {
      selectQuestions,
    };
    const engine = new DeterministicConceptTestEngine(
      repository,
      sessionRepository,
      strategy,
    );

    const session = await engine.createConceptSession("concept-unit-rates");

    expect(selectQuestions).toHaveBeenCalledOnce();
    expect(session.questionIds).toHaveLength(1);
    expect(selectQuestions.mock.calls[0]?.[1]?.targetCount).toBe(50);
  });

  it("keeps deterministic stable ordering by default", async () => {
    const repository = createDefaultContentRepository();
    const sessionRepository = new SessionRepository(new MemoryStorageService());
    const engine = new DeterministicConceptTestEngine(
      repository,
      sessionRepository,
      new StableSelectionStrategy(),
    );

    const session = await engine.createConceptSession("concept-unit-rates");

    expect(session.questionIds).toHaveLength(50);
    expect(session.questionIds.slice(0, 4)).toEqual([
      "concept-unit-rates-core-001",
      "concept-unit-rates-core-002",
      "concept-unit-rates-core-003",
      "concept-unit-rates-core-004",
    ]);
  });
});
