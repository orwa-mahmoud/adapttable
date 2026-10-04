/** Compare all unmerged work so a superseded checkpoint cannot skip its checks. */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { gitBinary } from "./git-binary.mjs";

/** @param {string} [cwd] Repository whose integration branch is checked out. */
export function integrationFiles(cwd = process.cwd()) {
  return execFileSync(
    gitBinary(),
    ["diff", "--name-only", "origin/main...HEAD"],
    { cwd, encoding: "utf8" }
  )
    .split("\n")
    .filter(Boolean);
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const files = integrationFiles();
  if (files.length > 0) process.stdout.write(`${files.join("\n")}\n`);
}
