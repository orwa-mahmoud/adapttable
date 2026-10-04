/** Strict opt-in package scoping for the ordinary API report generator. */
export function selectApiReports(entries, args = []) {
  let local = false;
  const packages = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--local") {
      local = true;
    } else if (argument === "--package") {
      const name = args[index + 1];
      if (!name || name.startsWith("--")) {
        throw new Error("--package requires a package folder name");
      }
      packages.add(name);
      index += 1;
    } else {
      throw new Error(`Unknown API report argument: ${argument}`);
    }
  }
  const available = new Set(entries.map((entry) => entry.dir));
  for (const name of packages) {
    if (!available.has(name)) {
      throw new Error(`No API report entries for package folder: ${name}`);
    }
  }
  return {
    local,
    packages: [...packages],
    targets:
      packages.size === 0
        ? entries
        : entries.filter((entry) => packages.has(entry.dir)),
  };
}
