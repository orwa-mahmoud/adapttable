#!/usr/bin/env node
/**
 * Require each invalid Vue consumer to fail for its intended type error.
 * Run after the package's positive `vue-tsc --noEmit` check, from that package:
 *
 *   node ../../../scripts/check-vue-types.mjs
 *
 * The invalid fixtures have their own tsconfig so they remain visible to
 * ESLint without entering the positive typecheck. A nonzero compiler exit
 * alone proves nothing: missing imports, unrelated source failures and a
 * fixture that unexpectedly starts compiling must all fail this harness.
 */
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Every fixture's diagnostic identity, separate from the invalid source. */
export const VUE_TYPE_EXPECTATIONS = {
  "@adapttable/vue": {
    "MissingHeaderFilterControls.ts": [
      { code: 2741, message: /Property 'Multi' is missing/ },
      { code: 2741, message: /Property 'Control' is missing/ },
    ],
    "UnsupportedFeatureEnabled.ts": [
      {
        code: 2353,
        message: /'enabled' does not exist in type/,
        count: 4,
      },
    ],
    "MissingFilterControls.ts": [
      {
        code: 2741,
        message: /Property 'Select' is missing/,
      },
    ],
    "WrongEditing.ts": [
      {
        code: 2322,
        message: /TableFeature<\{ number: number; \}>.*TableFeature<Row>/,
        count: 2,
      },
      {
        code: 2741,
        message: /Property 'Button' is missing/,
      },
    ],
    "WrongFilterRow.ts": [
      {
        code: 2322,
        message: /TableFeature<\{ other: number; \}>.*TableFeature<Row>/,
      },
    ],
    "WrongHeadlessFeatures.ts": [
      {
        code: 2322,
        message: /TableFeature<Wrong>.*TableFeature<Row>/,
        count: 4,
      },
      {
        code: 2322,
        message: /ColumnDef<Row, string>.*ColumnDef<Row, number>/,
      },
      {
        code: 2322,
        message: /Type '\(\) => Date' is not assignable/,
      },
    ],
    "WrongHierarchyIds.ts": [
      {
        code: 2322,
        message: /Type 'number' is not assignable to type 'string'/,
        count: 2,
      },
    ],
    "WrongHierarchyRow.ts": [
      {
        code: 2322,
        message: /TableFeature<Invoice>.*ComposedFeature<NoInfer<Person>>/,
      },
    ],
    "WrongSelectionControl.vue": [
      {
        code: 2322,
        message: /Type 'boolean' is not assignable to type 'number'/,
      },
      {
        code: 2554,
        message: /Expected 0 arguments, but got 1/,
      },
    ],
    "WrongRenderer.vue": [
      {
        code: 2322,
        message: /Type 'string' is not assignable to type 'number'/,
      },
    ],
    "WrongRows.vue": [
      {
        code: 2322,
        message:
          /Type 'TableFeature<Invoice>' is not assignable to type 'ComposedFeature<NoInfer<Person>>'/,
      },
    ],
    "MissingNavigationControls.ts": [
      {
        code: 2741,
        message: /Property 'Button' is missing/,
      },
      {
        code: 2741,
        message: /Property 'Checkbox' is missing/,
      },
    ],
    "WrongNavigationCallback.ts": [
      {
        code: 2322,
        message: /range: number.*CellRange/,
      },
      {
        code: 2322,
        message: /different: boolean.*row: Row/,
      },
    ],
    "MissingColumnMenuControls.ts": [
      {
        code: 2741,
        message: /Property 'Choice' is missing/,
      },
    ],
    "WrongColumnMenuRows.ts": [
      {
        code: 2322,
        message:
          /ColumnMenuSlotProps(?:\$\d+)?<Person>.*ColumnMenuSlotProps(?:\$\d+)?<Invoice>/,
      },
    ],
    "actions/MissingActionSlots.ts": [
      {
        code: 2741,
        message: /Property 'Input' is missing/,
      },
      {
        code: 2741,
        message: /Property 'Item' is missing/,
      },
      {
        code: 2741,
        message: /Property 'Close' is missing/,
      },
      {
        code: 2741,
        message: /Property 'Button' is missing/,
      },
    ],
  },
  "@adapttable/vue-unstyled": {
    "filter-editing/InvalidInlineHeaderRows.ts": [
      { code: 2322, message: /FilterHeaderControlOptions<Invoice>.*Person/s },
      {
        code: 2322,
        message:
          /Types of property 'columns' are incompatible.*Type '\(row: Invoice\) => unknown' is not assignable to type '\(row: Person\) => unknown'/s,
      },
    ],
    "export-preset/WrongBarrelRows.ts": [
      {
        code: 2345,
        message: /ExportPdfOptions<Invoice>.*ExportPdfOptions<Person>/s,
      },
      {
        code: 2345,
        message: /ExportXlsxOptions<Invoice>.*ExportXlsxOptions<Person>/s,
      },
    ],
    "export-preset/WrongPresetRows.ts": [
      {
        code: 2322,
        message: /TableFeature<Invoice>\[\].*TableFeature<Person>\[\]/,
      },
    ],
    "export-preset/FixedFormatWriter.ts": [
      { code: 2353, message: /'writer' does not exist in type/, count: 2 },
    ],
    "filter-editing/InvalidNativeGenericRows.ts": [
      { code: 2322, message: /VueEditableCellProps<Invoice>.*Person/s },
      { code: 2322, message: /RowEditActionsProps<Invoice>.*Person/s },
      { code: 2322, message: /BatchEditBarProps<Invoice>.*Person/s },
      { code: 2322, message: /FilterFieldOptions<Invoice>.*Person/s },
      { code: 2322, message: /ChecklistFilterProps<Invoice>.*Person/s },
      { code: 2322, message: /FilterTreeBuilderProps<Invoice>.*Person/s },
      { code: 2322, message: /HeaderFilterOptions<Invoice>.*Person/s },
    ],
    "footers/WrongSummary.vue": [
      { code: 2322, message: /missing.*SummaryRowFn<Row>/ },
    ],
    "footers/WrongFooterSlot.vue": [
      {
        code: 2339,
        message:
          /Property 'row' does not exist on type 'FooterContext<Row, unknown>'/,
      },
    ],
    "footers/WrongSummaryValue.ts": [
      { code: 2322, message: /Date.*VNodeChild/ },
    ],
    "hierarchy/UnsupportedFeatureEnabled.ts": [
      {
        code: 2353,
        message: /'enabled' does not exist in type/,
        count: 4,
      },
    ],
    "filter-editing/UnsupportedHistoryClassNames.ts": [
      {
        code: 2561,
        message:
          /'editHistoryUndo' does not exist in type 'DataTableClassNames'/,
      },
      {
        code: 2561,
        message:
          /'editHistoryRedo' does not exist in type 'DataTableClassNames'/,
      },
    ],
    "InvalidSelectionEvent.vue": [
      {
        code: 2322,
        message: /Type '\(ids: number\[\]\) => number' is not assignable/,
      },
    ],
    "InvalidRow.vue": [
      {
        code: 2322,
        message: /is not assignable to type 'readonly number\[\]'/,
      },
    ],
    "InvalidSelection.vue": [
      {
        code: 2322,
        message:
          /Type 'number\[\]' is not assignable to type 'readonly string\[\]'/,
      },
      {
        code: 2322,
        message: /Type 'string\[\]' is not assignable to type 'number\[\]'/,
      },
    ],
    "InvalidSlot.vue": [
      {
        code: 2339,
        message: /Property 'missing' does not exist on type/,
      },
    ],
    "InvalidValue.vue": [
      {
        code: 2339,
        message: /Property 'toUpperCase' does not exist on type 'number'/,
      },
    ],
    "hierarchy/InvalidNativeFeatureRow.vue": [
      {
        code: 2322,
        message: /TableFeature<Invoice>\[\].*ComposedFeature<NoInfer<Person>>/,
      },
    ],
    "hierarchy/InvalidNativeRowAction.ts": [
      {
        code: 2322,
        message: /amount: number.*row: Person/,
      },
    ],
    "hierarchy/InvalidNativeTreeIds.ts": [
      {
        code: 2322,
        message: /Type 'number' is not assignable to type 'string'/,
      },
    ],
    "filter-editing/InvalidEditingCallbacks.ts": [
      {
        code: 2345,
        message: /CellEditHandler<Person>/,
      },
      {
        code: 2345,
        message: /row: Person, patch:/,
      },
      {
        code: 2345,
        message: /readonly BatchRowEdit<Person>\[\]/,
      },
      {
        code: 2322,
        message: /floating.*popover.*drawer/,
      },
      {
        code: 2322,
        message: /Type 'string' is not assignable to type 'number'/,
      },
    ],
    "filter-editing/InvalidEditingRows.vue": [
      {
        code: 2322,
        message: /TableFeature<number>\[\].*ComposedFeature<NoInfer<Person>>/,
      },
    ],
    "view-controls/InvalidDensity.vue": [
      {
        code: 2322,
        message: /Type '"dense"' is not assignable to type 'TableDensity/,
      },
      {
        code: 2322,
        message: /Type '"tiny"' is not assignable to type 'TableDensity/,
      },
    ],
    "view-controls/InvalidDensityEvent.vue": [
      {
        code: 2322,
        message: /number\) => void.*\(density: TableDensity\) =>/,
        count: 2,
      },
    ],
    "view-controls/InvalidFeatureOptions.ts": [
      {
        code: 2554,
        message: /Expected 0 arguments, but got 1/,
        count: 2,
      },
      {
        code: 2322,
        message: /Type 'number' is not assignable to type 'string'/,
        count: 2,
      },
      {
        code: 2739,
        message:
          /missing the following properties from type 'SavedViewsPanelProps': onApply, onRename, onMove, onSetDefault, onRemove/,
      },
    ],
    "view-controls/InvalidSavedViewCallbacks.vue": [
      {
        code: 2322,
        message: /Type '\(_value: number\) => void' is not assignable/,
        count: 5,
      },
    ],
    "WrongNavigationRow.vue": [
      {
        code: 2322,
        message: /CellEdit<\{ other: string; \}>.*CellEdit<Row>/,
      },
    ],
    "WrongColumnMenuRename.vue": [
      {
        code: 2322,
        message: /key: number.*key: string/,
      },
    ],
    "actions/WrongActionCallbacks.ts": [
      {
        code: 2322,
        message: /Type '\(ids: number\[\]\) => void' is not assignable/,
      },
      {
        code: 2339,
        message: /Property 'amount' does not exist on type 'Person'/,
      },
      {
        code: 2322,
        message: /Type '\(_key: number\) => undefined' is not assignable/,
      },
    ],
    "actions/WrongActionRows.vue": [
      {
        code: 2322,
        message: /TableFeature<Invoice>\[\].*ComposedFeature<NoInfer<Person>>/,
      },
    ],
    "specialized/InvalidSpecialized.vue": [
      {
        code: 2322,
        message:
          /Type 'TableFeature<\{ id: number; \}>' is not assignable to type 'ComposedFeature<NoInfer<Row>>'/,
      },
    ],
  },
};

/** Parse plain vue-tsc diagnostics; retain unexpected output as a failure. */
export function parseDiagnostics(output) {
  const diagnostics = [];
  const unexpected = [];
  let current;
  for (const line of output.split(/\r?\n/)) {
    const match = /^(.*)\((\d+),(\d+)\): error TS(\d+): (.*)$/.exec(line);
    if (match) {
      current = {
        file: match[1].replaceAll("\\", "/"),
        code: Number(match[4]),
        message: match[5],
      };
      diagnostics.push(current);
    } else if (current && /^\s+\S/.test(line)) {
      current.message += `\n${line}`;
    } else if (line.trim()) {
      unexpected.push(line);
      current = undefined;
    }
  }
  return { diagnostics, unexpected };
}

/** Keep the registered expectations and on-disk negative fixtures in sync. */
function fixtureProblems(files, expectations) {
  const problems = [];
  const expectedFiles = Object.keys(expectations);
  if (files.length === 0) problems.push("No invalid Vue fixtures found");
  for (const file of files) {
    if (!expectations[file]?.length) {
      problems.push(`${file}: no expected diagnostic registered`);
    }
  }
  for (const file of expectedFiles) {
    if (!files.includes(file)) problems.push(`${file}: fixture is missing`);
  }
  return problems;
}

/** Require every expected diagnostic and reject every unexpected diagnostic. */
export function diagnosticProblems({
  files,
  expectations,
  output,
  status,
  cwd,
  fixtureDir,
}) {
  const problems = [];
  if (status !== 2) {
    problems.push(`vue-tsc exited ${status}; expected diagnostic exit 2`);
  }
  problems.push(...fixtureProblems(files, expectations));
  const { diagnostics, unexpected } = parseDiagnostics(output);
  problems.push(
    ...unexpected.map((line) => `Unexpected compiler output: ${line}`)
  );
  const byFile = new Map();
  for (const diagnostic of diagnostics) {
    const file = relative(fixtureDir, resolve(cwd, diagnostic.file)).replaceAll(
      "\\",
      "/"
    );
    const found = byFile.get(file) ?? [];
    found.push(diagnostic);
    byFile.set(file, found);
    if (
      !expectations[file]?.some(
        (expected) =>
          expected.code === diagnostic.code &&
          expected.message.test(diagnostic.message)
      )
    ) {
      problems.push(
        `${diagnostic.file}: unexpected TS${diagnostic.code}: ${diagnostic.message}`
      );
    }
  }
  for (const [file, expected] of Object.entries(expectations)) {
    for (const diagnostic of expected) {
      const actual = (byFile.get(file) ?? []).filter(
        (found) =>
          found.code === diagnostic.code &&
          diagnostic.message.test(found.message)
      ).length;
      const expectedCount = diagnostic.count ?? 1;
      if (actual !== expectedCount) {
        problems.push(
          actual === 0
            ? `${file}: missing expected TS${diagnostic.code} ${diagnostic.message}`
            : `${file}: expected ${expectedCount} occurrence(s) of TS${diagnostic.code} ${diagnostic.message}; got ${actual}`
        );
      }
    }
  }
  return problems;
}

/** Discover nested fixtures too, so an unregistered file cannot go unnoticed. */
export function invalidFixtures(dir, prefix = "") {
  return readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const file = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory())
        return invalidFixtures(join(dir, entry.name), file);
      return /\.(vue|ts)$/.test(entry.name) ? [file] : [];
    })
    .sort();
}

export function checkVueTypes(cwd = process.cwd()) {
  const { name } = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  const expectations = VUE_TYPE_EXPECTATIONS[name];
  if (!expectations)
    throw new Error(`${name}: no Vue type fixtures registered`);
  const fixtureDir = join(cwd, "test/types/invalid");
  const files = invalidFixtures(fixtureDir);
  const compiler = createRequire(import.meta.url).resolve(
    "vue-tsc/bin/vue-tsc.js"
  );
  const result = spawnSync(
    process.execPath,
    [
      compiler,
      "--noEmit",
      "--pretty",
      "false",
      "-p",
      join(fixtureDir, "tsconfig.json"),
    ],
    { cwd, encoding: "utf8" }
  );
  if (result.error) throw result.error;
  if (result.signal) throw new Error(`vue-tsc terminated by ${result.signal}`);
  const problems = diagnosticProblems({
    files,
    expectations,
    output: `${result.stdout}\n${result.stderr}`,
    status: result.status,
    cwd,
    fixtureDir,
  });
  if (problems.length) throw new Error(problems.join("\n"));
  return `${name}: ${files.length} invalid Vue consumers rejected as expected`;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    console.log(checkVueTypes());
  } catch (error) {
    console.error(`Vue type fixtures: ${error.message}`);
    process.exitCode = 1;
  }
}
