import { readFileSync, existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

type Question = { id: string; questionText: string; correctAnswer: string; options: string[] };
const root = "public/content/math/course3";
const bank = (slug: string, kind: string): Question[] => JSON.parse(readFileSync(`${root}/test-sets/course3-${slug}-${kind}.json`, "utf8")).questions;
const pairs = (text: string) => [...text.matchAll(/\((-?\d+), (-?\d+)\)/g)].map(m => [Number(m[1]), Number(m[2])]);
const slope = ([x1, y1]: number[], [x2, y2]: number[]) => (y2 - y1) / (x2 - x1);

describe("Unit 5 graph and comparison release", () => {
  it("verifies graph coordinates, interpolation, domains, and repairs independently", () => {
    let checked = 0;
    for (const kind of ["core", "review"]) for (const q of bank("functions-on-graphs", kind)) {
      const p = pairs(q.questionText);
      if (q.questionText.startsWith("A plotted point")) {
        expect(Number(q.correctAnswer)).toBe(p[0][1]);
      } else if (q.questionText.startsWith("A function graph is a straight")) {
        expect(Number(q.correctAnswer)).toBe(p[0][1] + slope(p[0], p[1]));
      } else if (q.questionText.startsWith("A line segment has solid")) {
        expect(Number(q.correctAnswer)).toBe(Math.max(...p.map(([x]) => x)));
      } else if (q.questionText.startsWith("A graph contains only")) {
        const removed = pairs(q.correctAnswer)[0];
        const kept = p.filter(([x,y]) => x !== removed[0] || y !== removed[1]);
        expect(new Set(kept.map(([x]) => x))).toEqual(new Set(p.map(([x]) => x)));
        expect(kept.every(([x,y]) => kept.every(([a,b]) => a !== x || b === y))).toBe(true);
      } else continue;
      checked++;
    }
    expect(checked).toBe(22);
  });

  it("checks every comparison answer against rates, intercepts, and costs", () => {
    let checked = 0;
    for (const kind of ["core", "review"]) for (const q of bank("compare-functions-representations", kind)) {
      const t = q.questionText;
      const nums = (t.match(/-?\d+/g) ?? []).map(Number);
      const p = pairs(t);
      let expected: string;
      if (t.startsWith("Function A has")) {
        expected = nums[0] > nums[2] ? "A" : "B";
      } else if (t.startsWith("A linear table contains")) {
        expected = String(slope(p[0],p[1]));
      } else if (t.startsWith("A graph crosses")) {
        expected = p[0][1] > nums[3] ? "A" : "B";
      } else if (t.startsWith("A rental charges")) {
        expected = String(nums[1]);
      } else if (t.startsWith("A is a straight graph")) {
        expect(slope(p[0],p[1])).toBe(slope(p[2],p[3]));
        expected = `Equal; both rates are ${slope(p[0],p[1])}.`;
      } else if (t.startsWith("A has equation")) {
        const m = slope(p[0],p[1]);
        expect(m).toBeGreaterThan(nums[0]);
        if (t.includes("For nonnegative inputs")) {
          const interceptB = p[0][1] - m * p[0][0];
          expected = `When x > ${(nums[1]-interceptB)/(m-nums[0])}.`;
        } else expected = `B; its rate is ${m}, compared with ${nums[0]} for A.`;
      } else if (t.startsWith("A linear table has")) {
        expected = String(p[0][1] - p[0][0] * slope(p[0],p[1]));
      } else if (t.startsWith("A starts with")) {
        expect(slope(p[0],p[1])).toBe(-2);
        expect(-nums[1]).toBe(-3);
        expected = "B; -2 is greater than -3.";
      } else if (t.startsWith("A charges")) {
        const [fee, rate, bRate, bFee, visits] = nums;
        const difference = bRate * visits + bFee - (rate * visits + fee);
        expect(difference).toBeGreaterThan(0);
        expected = `A; it costs $${difference} less.`;
      } else if (t.startsWith("A is a straight line")) {
        const m = slope(p[0],p[1]);
        expect(m).toBe(nums[4]);
        expect(p[0][1]).toBe(nums[5]);
        expected = "Yes; both the rate and initial value match.";
      } else if (t.startsWith("Plan A costs")) {
        expected = String(nums[2] / (nums[0] - nums[1]));
      } else if (t.startsWith("A rises")) {
        expect(nums[0]/nums[1]).toBe(nums[2]/nums[3]);
        expected = `Equal rates of $${nums[0]/nums[1]} per hour.`;
      } else if (t.startsWith("A is y =")) {
        expected = "They agree at the two listed inputs; agreement elsewhere is not guaranteed.";
      } else if (t.startsWith("A bike rental")) {
        const [aFee,aRate,bFee,bRate] = nums;
        expected = String(Math.floor((aFee-bFee)/(bRate-aRate))+1);
      } else throw new Error(`Unverified question: ${q.id}`);
      expect(q.correctAnswer, q.id).toBe(expected);
      checked++;
    }
    expect(checked).toBe(70);
  });

  it("preserves endpoint and vertical-line reasoning, not just vocabulary", () => {
    const questions = bank("functions-on-graphs", "core");
    const expected = [
      [2,"The vertical line x = 2 meets two different points."],
      [3,"Yes; every vertical line meets it once."],
      [4,"No; one x has many y-values."],
      [11,"No; only inputs 1, 3, and 5 are shown as part of this graph."],
      [12,"Yes; the open circle is excluded, leaving one output at that input."],
      [13,"Yes; the vertical-line test passes."],
      [36,"No; the reflected points share an input but have different outputs."],
      [37,"Only output 4 is included at x = 2, so there is no conflict."],
      [38,"At x = 0, the circle has outputs 2 and -2."],
      [39,"Their outputs at the shared input must be equal."],
    ] as const;
    for (const [index, answer] of expected) expect(questions[index].correctAnswer).toBe(answer);
  });

  it("keeps all tutorial diagrams local, present, and distinct", () => {
    const images: string[] = [];
    for (const slug of ["functions-on-graphs", "compare-functions-representations"]) {
      const tutorial = readFileSync(`${root}/tutorials/concept-${slug}.md`, "utf8");
      for (const match of tutorial.matchAll(/!\[([^\]]+)\]\((content\/[^)]+)\)/g)) {
        expect(match[1].length).toBeGreaterThan(30);
        expect(existsSync(`public/${match[2]}`)).toBe(true);
        images.push(readFileSync(`public/${match[2]}`, "utf8"));
      }
    }
    expect(new Set(images).size).toBe(3);
  });
});
