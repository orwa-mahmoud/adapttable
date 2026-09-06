/**
 * Which steps a root script actually reaches.
 *
 * The gate is a graph, not a string: `check` delegates to `check:static`,
 * which fans its steps out through `run-parallel.mjs`. A test that greps the
 * `check` line for a step name would go red the moment a step moves one level
 * down, and — worse — would stay green if a step were moved into a script
 * nothing runs. Resolving the graph asks the question that matters: starting
 * from this entry point, does the step run at all?
 */

/**
 * The names a single script line hands on to other scripts.
 *
 * Two spellings reach a sibling script: `pnpm run <name>`, and the parallel
 * runner, which takes its task names as bare arguments.
 */
function delegatedNames(line) {
  const names = [];
  for (const match of line.matchAll(/pnpm run ([\w:-]+)/g))
    names.push(match[1]);
  for (const match of line.matchAll(/run-parallel\.mjs ([\w:\- ]+)/g)) {
    names.push(...match[1].trim().split(/\s+/));
  }
  return names;
}

/** Every script reachable from `entry`, including `entry` itself. */
export function gateSteps(scripts, entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const name = queue.shift();
    if (seen.has(name)) continue;
    seen.add(name);
    const line = scripts[name];
    if (typeof line === "string") queue.push(...delegatedNames(line));
  }
  return seen;
}
