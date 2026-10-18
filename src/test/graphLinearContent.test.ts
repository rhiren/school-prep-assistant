import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const number = (value: string) => {
  const [n,d = "1"] = value.split("/");
  return Number(n)/Number(d);
};

describe("graphing practice answer clarity", () => {
  it("has exactly one mathematically valid point for each requested movement", () => {
    let checked = 0;
    for (const kind of ["core", "review"]) {
      const bank = JSON.parse(readFileSync(`public/content/math/course3/test-sets/course3-graph-linear-equations-${kind}.json`, "utf8"));
      for (const q of bank.questions) {
        if (!q.correctAnswer.startsWith("(") || /y-axis|first point|crosses the y-axis/.test(q.questionText)) continue;
        const run = q.questionText.match(/move right (\d+) units/i);
        expect(run, q.id).not.toBeNull();
        const slopeForm = q.questionText.match(/slope ([-\d/]+) from y-intercept (-?\d+)/);
        const equation = q.questionText.match(/y = (-?(?:\d+(?:\/\d+)?)?)x(?: ([+-]) (\d+))?/);
        const horizontal = q.questionText.match(/y = (-?\d+)\./);
        let m: number, b: number;
        if (slopeForm) { m = number(slopeForm[1]); b = Number(slopeForm[2]); }
        else if (equation) {
          m = equation[1] === "" ? 1 : equation[1] === "-" ? -1 : number(equation[1]);
          b = Number(equation[3] ?? 0) * (equation[2] === "-" ? -1 : 1);
        } else { expect(horizontal, q.id).not.toBeNull(); m = 0; b = Number(horizontal![1]); }
        const valid = q.options.filter((option: string) => {
          const point = option.match(/^\(([^,]+), ([^)]+)\)$/)!;
          const x = number(point[1]), y = number(point[2]);
          return x === Number(run![1]) && Math.abs(y - (m*x+b)) < 1e-10;
        });
        expect(valid, q.id).toEqual([q.correctAnswer]);
        checked++;
      }
    }
    expect(checked).toBe(24);
  });
});
