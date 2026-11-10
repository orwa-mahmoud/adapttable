/**
 * The three bindings' public surfaces, entry by entry: which names one binding
 * exports that the others do not, read through each framework's naming idiom.
 */

/** The frameworks whose bindings are compared. */
export const BINDINGS = ["react", "vue", "angular"];

/**
 * A name as the other bindings would spell it: Angular's `inject` functions
 * are React's and Vue's `use` hooks, and its `Adapt` component classes are
 * their components.
 *
 * @param {string} name - The exported name.
 * @param {string} framework - The binding that exports it.
 * @returns {string} The name to compare.
 */
export function comparableName(name, framework) {
  if (framework !== "angular") return name;
  return name
    .replace(/^Adapt(?=[A-Z])/, "")
    .replace(/^inject(?=[A-Z])/, "use")
    .replace(/^Inject(?=[A-Z])/, "Use")
    .replace(/InjectOptions$/, "Options");
}

/**
 * Each binding's entries and their names, from the API contract's surfaces
 * (`react`, `react-adapter`, `vue-pdf`, …).
 *
 * @param {Record<string, readonly string[]>} surfaces - The contract's surfaces.
 * @returns {Record<string, Record<string, readonly string[]>>} framework → entry → names.
 */
export function bindingEntries(surfaces) {
  const out = Object.fromEntries(BINDINGS.map((fw) => [fw, {}]));
  for (const [surface, names] of Object.entries(surfaces)) {
    for (const fw of BINDINGS) {
      if (surface === fw) out[fw]["."] = names;
      else if (surface.startsWith(`${fw}-`))
        out[fw][surface.slice(fw.length + 1)] = names;
    }
  }
  return out;
}

/** The entries at least one binding has, apart from framework-only ones. */
function sharedEntries(entries, onlyEntries) {
  const shared = new Set();
  for (const fw of BINDINGS)
    for (const entry of Object.keys(entries[fw] ?? {}))
      if (!(onlyEntries[fw] ?? []).includes(entry)) shared.add(entry);
  return [...shared].sort();
}

/** One binding's names on one entry, against the others and its list. */
function entryProblems(fw, entry, names, comparable, listed) {
  const problems = [];
  const own = [];
  for (const name of names) {
    const key = comparableName(name, fw);
    if (BINDINGS.every((other) => comparable[other].has(key))) {
      if (name in listed)
        problems.push(
          `${fw} ${entry}: ${name} is now in every binding; remove it from the allow-list`
        );
      continue;
    }
    own.push(name);
    if (!(name in listed))
      problems.push(
        `${fw} ${entry}: ${name} is not in every binding and not allow-listed`
      );
  }
  for (const name of Object.keys(listed))
    if (!names.includes(name))
      problems.push(
        `${fw} ${entry}: ${name} is allow-listed but no longer exported`
      );
  return { problems, own: own.sort() };
}

/**
 * What differs between the bindings, against an allow-list.
 *
 * @param {Record<string, Record<string, readonly string[]>>} entries - framework → entry → names.
 * @param {{ frameworkOnlyEntries: Record<string, readonly string[]>, names: Record<string, Record<string, Record<string, string>>> }} allow - The allow-list.
 * @returns {{ problems: string[], divergent: Record<string, Record<string, string[]>> }} Problems, and every divergent name found.
 */
export function parityProblems(entries, allow) {
  const problems = [];
  const divergent = Object.fromEntries(BINDINGS.map((fw) => [fw, {}]));
  for (const entry of sharedEntries(
    entries,
    allow.frameworkOnlyEntries ?? {}
  )) {
    const missing = BINDINGS.filter((fw) => !entries[fw]?.[entry]);
    for (const fw of missing)
      problems.push(`${fw}: no ./${entry === "." ? "" : entry} entry`);
    if (missing.length > 0) continue;
    const comparable = Object.fromEntries(
      BINDINGS.map((fw) => [
        fw,
        new Set(entries[fw][entry].map((n) => comparableName(n, fw))),
      ])
    );
    for (const fw of BINDINGS) {
      const found = entryProblems(
        fw,
        entry,
        entries[fw][entry],
        comparable,
        allow.names?.[fw]?.[entry] ?? {}
      );
      problems.push(...found.problems);
      if (found.own.length > 0) divergent[fw][entry] = found.own;
    }
  }
  return { problems, divergent };
}
