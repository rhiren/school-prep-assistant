import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { latestNewCheckId, TestSetDates } from "../components/TestSetDates";
import type { TestSet } from "../domain/models";
import history from "../../public/content/test-set-history.json";

const check: TestSet = {
  id: "check", conceptId: "concept", title: "Check", description: "",
  questionCount: 8, type: "understanding-check", addedOn: "2026-11-07", updatedOn: "2026-11-08",
};

describe("test content dates", () => {
  it("shows added and updated dates without timezone shifts", () => {
    render(<TestSetDates testSet={check} />);
    expect(screen.getByText("Nov 7, 2026")).toHaveAttribute("datetime", "2026-11-07");
    expect(screen.getByText("Nov 8, 2026")).toHaveAttribute("datetime", "2026-11-08");
  });
  it("does not invent missing dates or duplicate an unchanged date", () => {
    const { container, rerender } = render(<TestSetDates testSet={{ ...check, addedOn: undefined }} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<TestSetDates testSet={{ ...check, updatedOn: check.addedOn }} />);
    expect(container.querySelectorAll("time")).toHaveLength(1);
  });
  it("highlights only the most recently added check for thirty days, not updated old checks", () => {
    const now = Date.parse("2026-11-08T12:00:00Z");
    const old = { ...check, id: "old", addedOn: "2026-09-01" };
    const earlier = { ...check, id: "earlier", addedOn: "2026-11-01" };
    expect(latestNewCheckId([old, earlier, check], now)).toBe("check");
    expect(latestNewCheckId([old], now)).toBeUndefined();
    expect(latestNewCheckId([check], Date.parse("2026-12-07T00:00:00Z"))).toBeUndefined();
    expect(latestNewCheckId([check], Date.parse("2026-11-06T00:00:00Z"))).toBeUndefined();
    expect(latestNewCheckId([{ ...check, type: "review" }], now)).toBeUndefined();
  });
  it("records valid ordered dates for every authored bank, including mixed reviews", () => {
    const banks = Object.values(import.meta.glob<{ testId?: string; id?: string }>(
      "../../public/content/**/test-sets/*.json", { eager: true, import: "default" },
    ));
    for (const bank of banks) {
      const id = (bank.testId ?? bank.id)!;
      const dates = (history as Record<string, { addedOn: string; updatedOn: string }>)[id];
      expect(dates, id).toBeDefined();
      for (const date of [dates.addedOn, dates.updatedOn]) {
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(new Date(date).toISOString().slice(0, 10)).toBe(date);
      }
      expect(dates.updatedOn >= dates.addedOn, id).toBe(true);
    }
  });
});
