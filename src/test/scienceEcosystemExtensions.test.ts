import { describe, expect, it } from "vitest";
import { createDefaultContentRepository } from "../services/contentRepository";
import { compareQuestionAnswer } from "../utils/answerNormalization";

// Add future complete packs here so the stricter authoring checks follow rollout.
const PACKS = ["decomposers-matter-cycling", "ecosystem-disturbance-recovery"];

describe("science ecosystem extensions", () => {
  it("loads distinct core and review scenarios with valid, balanced answer choices", async () => {
    const repository = await createDefaultContentRepository();
    const allPrompts = new Set<string>();
    const allIds = new Set<string>();
    for (const slug of PACKS) {
      const tutorial = await repository.getTutorialContent(`concept-${slug}`);
      expect(tutorial).toContain("## Try At Home");
      expect(tutorial).toContain("|");
      for (const kind of ["core", "review"]) {
        const questions = await repository.getQuestionsForTestSet(`science7-${slug}-${kind}`);
        expect(questions).toHaveLength(kind === "core" ? 30 : 15);
        const positions: number[] = [];
        const ranks = { scaffold: 0, standard: 1, challenge: 2 };
        let previousRank = -1;
        for (const question of questions) {
          expect(allIds.has(question.id)).toBe(false);
          allIds.add(question.id);
          const prompt = question.prompt.trim().toLowerCase().replace(/\s+/g, " ");
          expect(allPrompts.has(prompt), question.id).toBe(false);
          allPrompts.add(prompt);
          const values = question.choices?.map((choice) => choice.value) ?? [];
          expect(values).toHaveLength(4);
          expect(new Set(values).size).toBe(4);
          expect(values.filter((value) => value === question.correctAnswer)).toHaveLength(1);
          for (const value of values) {
            expect(compareQuestionAnswer(question, value).isCorrect).toBe(value === question.correctAnswer);
          }
          positions.push(values.indexOf(question.correctAnswer));
          const rank = ranks[question.difficulty as keyof typeof ranks];
          expect(rank).toBeGreaterThanOrEqual(previousRank);
          previousRank = rank;
        }
        const counts = [0, 1, 2, 3].map((position) => positions.filter((p) => p === position).length);
        expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
        for (let i = 2; i < positions.length; i += 1) {
          expect(new Set(positions.slice(i - 2, i + 1)).size).toBeGreaterThan(1);
          const steps = [
            (positions[i - 1] - positions[i - 2] + 4) % 4,
            (positions[i] - positions[i - 1] + 4) % 4,
          ];
          expect(steps.every((step) => step === 1 || step === 3) && steps[0] === steps[1]).toBe(false);
        }
        for (let size = 2; size <= 4; size += 1) {
          for (let start = 0; start + size * 2 <= positions.length; start += 1) {
            expect(positions.slice(start, start + size)).not.toEqual(
              positions.slice(start + size, start + size * 2),
            );
          }
        }
      }
    }
  });

  it("preserves independently checked conservation and comparison answers", async () => {
    const repository = await createDefaultContentRepository();
    const checks = [
      ["decomposers-matter-cycling", "core", 7, "The moist-site samples lost 6 g more dry mass."],
      ["decomposers-matter-cycling", "core", 21, "40 units."],
      ["decomposers-matter-cycling", "review", 8, "15 units."],
      ["ecosystem-disturbance-recovery", "core", 21, "B retained more plants initially; A gained more plants during the following year."],
      ["ecosystem-disturbance-recovery", "review", 8, "5 plants."],
    ] as const;
    for (const [slug, kind, number, expected] of checks) {
      const id = `science7-${slug}-${kind}`;
      const questions = await repository.getQuestionsForTestSet(id);
      const question = questions.find((candidate) => candidate.id === `${id}-q${number}`);
      expect(question?.correctAnswer).toBe(expected);
      expect(compareQuestionAnswer(question!, expected).isCorrect).toBe(true);
    }
  });
});
