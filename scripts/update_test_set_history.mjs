import { execFileSync } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";

const root = "public/content";
const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
if (git("rev-parse", "--is-shallow-repository") === "true") {
  throw new Error("Full Git history is required to date test content accurately.");
}

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) result.push(...await files(path));
    else if (directory.endsWith("/test-sets") && path.endsWith(".json")) result.push(path);
  }
  return result;
}

const history = {};
for (const path of (await files(root)).sort()) {
  const bank = JSON.parse(await readFile(path, "utf8"));
  const id = bank.testId ?? bank.id;
  if (!id || history[id]) throw new Error(`Missing or duplicate test ID: ${path}`);
  // Follow moves so a content-folder migration does not reset the added date.
  const dates = git("log", "--follow", "--format=%aI", "--", path).split("\n").filter(Boolean);
  const dirty = Boolean(git("status", "--porcelain", "--", path));
  const today = new Date().toISOString().slice(0, 10);
  history[id] = {
    addedOn: dates.at(-1)?.slice(0, 10) ?? today,
    updatedOn: dirty ? today : dates[0]?.slice(0, 10) ?? today,
  };
}
await writeFile(`${root}/test-set-history.json`, `${JSON.stringify(history, null, 2)}\n`);
console.log(`Recorded content dates for ${Object.keys(history).length} test sets.`);
