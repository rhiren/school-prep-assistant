import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Question = { id: string; questionText: string; correctAnswer: string; options: string[] };
const slugs = ["understand-functions", "functions-tables-mapping-diagrams"];
const bank = (slug: string, kind: string): Question[] => JSON.parse(readFileSync(`public/content/math/course3/test-sets/course3-${slug}-${kind}.json`, "utf8")).questions;

describe("Unit 5 function foundations", () => {
  it("rejects repeated answer-position blocks and reused review prompts", () => {
    for (const slug of slugs) {
      const core = bank(slug, "core");
      const review = bank(slug, "review");
      expect(review.every(q => !core.some(c => c.questionText === q.questionText))).toBe(true);
      for (const questions of [core, review]) {
        expect(new Set(questions.map(q => q.questionText)).size).toBe(questions.length);
        const positions = questions.map(q => q.options.indexOf(q.correctAnswer));
        expect(positions).not.toContain(-1);
        for (let size = 2; size <= 4; size++) for (let i = 0; i + 2 * size <= positions.length; i++) {
          expect(positions.slice(i, i + size)).not.toEqual(positions.slice(i + size, i + 2 * size));
        }
      }
    }
  });

  it("independently verifies numeric answers using the stated rules", () => {
    let checked = 0;
    for (const slug of slugs) for (const kind of ["core", "review"]) for (const q of bank(slug, kind)) {
      const text = q.questionText;
      const numbers = text.match(/\d+/g)?.map(Number) ?? [];
      if (text.startsWith("The function rule is:")) {
        expect(Number(q.correctAnswer)).toBe(numbers[1] + numbers[0]);
      } else if (text.startsWith("A function doubles")) {
        expect(2 * Number(q.correctAnswer) - 3).toBe(numbers[1]);
      } else if (text.startsWith("The table follows")) {
        expect(Number(q.correctAnswer)).toBe(2 * numbers[4] + 1);
      } else if (text.startsWith("A rule sends")) {
        expect(Number(q.correctAnswer)).toBe(numbers[0]);
      } else continue;
      checked++;
    }
    expect(checked).toBeGreaterThan(20);
  });

  it("checks function conflicts from complete pairs rather than answer positions", () => {
    for (const kind of ["core", "review"]) for (const q of bank(slugs[0], kind)) {
      if (!q.questionText.startsWith("The complete relation") && !q.questionText.startsWith("A relation records")) continue;
      const pairs = [...q.questionText.matchAll(/\((\d+), (\d+)\)/g)].map(m => [Number(m[1]), Number(m[2])]);
      const outputs = new Map<number, Set<number>>();
      for (const [x, y] of pairs) outputs.set(x, new Set([...(outputs.get(x) ?? []), y]));
      expect([...outputs.values()].every(values => values.size === 1)).toBe(true);
      expect(q.correctAnswer).toBe(q.questionText.startsWith("The complete")
        ? "Yes; each input has one output."
        : "No; the repeated input still has only one distinct output.");
    }
  });

  it("preserves challenge reasoning about inverse relations, missing rules, and domain coverage", () => {
    const functions = bank(slugs[0], "core");
    const tables = bank(slugs[1], "core");
    expect(functions[36].correctAnswer).toBe("No; input 4 now has two different outputs.");
    expect(functions[37].correctAnswer).toBe("Both y = 11 and y = -11 are allowed.");
    expect(functions[38].correctAnswer).toBe("Yes; the output is 22, using the odd-input rule.");
    expect(tables[35].correctAnswer).toBe("Delete (11, 9).");
    expect(tables[37].correctAnswer).toBe("No; many function rules can agree with the shown rows and differ at the new input.");
    expect(tables[38].correctAnswer).toBe("11");
    expect(tables[39].correctAnswer).toBe("14 distinct outputs; yes.");
  });
});
