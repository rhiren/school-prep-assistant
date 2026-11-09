import type { TestSet } from "../domain/models";

export function latestNewCheckId(testSets: TestSet[], now = Date.now()): string | undefined {
  return testSets.filter((test) => {
    if (test.type !== "understanding-check" || !test.addedOn) return false;
    const age = now - Date.parse(`${test.addedOn}T00:00:00Z`);
    return age >= 0 && age < 30 * 86400000;
  }).sort((a, b) => b.addedOn!.localeCompare(a.addedOn!))[0]?.id;
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function TestSetDates({ testSet }: { testSet: TestSet }) {
  if (!testSet.addedOn) return null;
  return <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600">
    <span>Added <time dateTime={testSet.addedOn}>{dateLabel(testSet.addedOn)}</time></span>
    {testSet.updatedOn && testSet.updatedOn !== testSet.addedOn ?
      <span>Updated <time dateTime={testSet.updatedOn}>{dateLabel(testSet.updatedOn)}</time></span> : null}
  </div>;
}
