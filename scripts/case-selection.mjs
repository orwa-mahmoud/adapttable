/** `--case <id>` selection shared by the measurement and harness entry points. */

/**
 * The `--case` IDs a run asked for, in order. A flag without a value is an
 * error, so a typo cannot quietly select everything.
 */
export function requestedCases(argv) {
  const ids = [];
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    let value;
    if (arg === "--case") value = argv[++index];
    else if (arg.startsWith("--case=")) value = arg.slice("--case=".length);
    else continue;
    if (!value || value.startsWith("--")) {
      throw new Error("--case needs a case ID");
    }
    ids.push(...value.split(","));
  }
  return ids;
}

/** Every case when no IDs were requested; otherwise exactly the named ones. */
export function selectCases(cases, ids) {
  if (!ids.length) return cases;
  const known = new Set(cases.map((entry) => entry.id));
  const unknown = ids.filter((id) => !known.has(id));
  if (unknown.length) {
    throw new Error(
      `Unknown --case ${unknown.join(", ")}. Known cases:\n  ${[...known].join("\n  ")}`
    );
  }
  return cases.filter((entry) => ids.includes(entry.id));
}
