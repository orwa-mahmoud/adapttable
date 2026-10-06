/** Strict opt-in package/report scoping and supported declaration retention. */
export function selectApiReports(entries, args = []) {
  let local = false;
  let includeForgottenExports = false;
  const packages = new Set();
  const reports = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--local") {
      local = true;
    } else if (argument === "--include-forgotten-exports") {
      includeForgottenExports = true;
    } else if (argument === "--report") {
      const name = args[index + 1];
      if (!name || name.startsWith("--")) {
        throw new Error("--report requires an exact report filename");
      }
      reports.add(name);
      index += 1;
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
  const packageTargets =
    packages.size === 0
      ? entries
      : entries.filter((entry) => packages.has(entry.dir));
  const availableReports = new Set(packageTargets.map((entry) => entry.report));
  for (const report of reports) {
    if (!availableReports.has(report)) {
      throw new Error(`No API report in selected packages: ${report}`);
    }
  }
  return {
    local,
    includeForgottenExports,
    packages: [...packages],
    reports: [...reports],
    targets:
      reports.size === 0
        ? packageTargets
        : packageTargets.filter((entry) => reports.has(entry.report)),
  };
}
