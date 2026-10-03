import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import { basename, join } from "node:path";

/** Preserve only freshly extracted reports on failure, then clean scratch output. */
export function finishApiReportOutput({
  output,
  diagnosticsDirectory,
  reports,
  success,
}) {
  try {
    if (success || !diagnosticsDirectory || reports.length === 0) return;
    mkdirSync(diagnosticsDirectory, { recursive: true });
    for (const report of reports) {
      if (basename(report) !== report || !report.endsWith(".api.md")) {
        throw new Error(`Unexpected API report filename: ${report}`);
      }
      copyFileSync(join(output, report), join(diagnosticsDirectory, report));
    }
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}
