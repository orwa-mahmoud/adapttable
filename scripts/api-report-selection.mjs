/** The value after a flag, which must be present and not another flag. */
function flagValue(args, index, message) {
  const name = args[index + 1];
  if (!name || name.startsWith("--")) throw new Error(message);
  return name;
}

/** Parses the API report command line into its flags and named scopes. */
function parseApiReportArgs(args) {
  const options = {
    local: false,
    includeForgottenExports: false,
    packages: new Set(),
    reports: new Set(),
  };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--local") {
      options.local = true;
    } else if (argument === "--include-forgotten-exports") {
      options.includeForgottenExports = true;
    } else if (argument === "--report") {
      options.reports.add(
        flagValue(args, index, "--report requires an exact report filename")
      );
      index += 1;
    } else if (argument === "--package") {
      options.packages.add(
        flagValue(args, index, "--package requires a package folder name")
      );
      index += 1;
    } else {
      throw new Error(`Unknown API report argument: ${argument}`);
    }
  }
  return options;
}

/** Strict opt-in package/report scoping and supported declaration retention. */
export function selectApiReports(entries, args = []) {
  const { local, includeForgottenExports, packages, reports } =
    parseApiReportArgs(args);
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
