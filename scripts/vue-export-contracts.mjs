/** Source provenance and built identities behind the mixed Vue export policies. */
import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

import { packageDir, REPO_ROOT } from "./packages.mjs";
import {
  checkBuiltFeatureOwnership,
  FOCUSED_FACTORIES,
  VIEW_CONTROL_VALUES,
} from "./vue-feature-contracts.mjs";
import { prepareVueCell } from "./vue-peer-consumers.mjs";

const WRITERS = {
  pdf: [
    "buildPrintDocument",
    "buildPrintTableHtml",
    "buildTablePdf",
    "openPrintLayout",
    "pdfWriter",
    "printStyles",
    "printTable",
  ],
  xlsx: ["buildTableXlsx", "xlsxWriter"],
};
const FACTORIES = { pdf: "exportPdf", xlsx: "exportXlsx" };
const OPTIONS = { pdf: "ExportPdfOptions", xlsx: "ExportXlsxOptions" };

/** Keep source export mode: reports and flattened .d.ts stars cannot prove it. */
export function sourceExports(text) {
  const file = ts.createSourceFile(
    "entry.ts",
    text,
    ts.ScriptTarget.Latest,
    true
  );
  return file.statements.filter(ts.isExportDeclaration).map((statement) => ({
    from: statement.moduleSpecifier?.text,
    typeOnly: statement.isTypeOnly,
    names:
      statement.exportClause && ts.isNamedExports(statement.exportClause)
        ? statement.exportClause.elements.map((element) => ({
            name: element.name.text,
            original: element.propertyName?.text ?? element.name.text,
            typeOnly: statement.isTypeOnly || element.isTypeOnly,
          }))
        : "*",
  }));
}

function named(from, names, typeOnly = false) {
  return {
    from,
    typeOnly,
    names: names.map((name) => ({ name, original: name, typeOnly })),
  };
}
const star = (from, typeOnly) => ({ from, typeOnly, names: "*" });

/** Exact four boundary barrels, plus every edge of the extra core type-star path. */
export function checkExportSources(repository) {
  const binding = join(repository, "packages/vue/vue/src");
  const native = join(repository, "packages/vue/adapter-vue-unstyled/src");
  for (const [entry, factory] of Object.entries(FOCUSED_FACTORIES)) {
    assert.deepEqual(
      sourceExports(readFileSync(join(binding, `${entry}.ts`), "utf8")),
      [
        named(`./features/${entry}`, [factory]),
        named("./viewControls/contracts", [
          "DENSITY_CONTROL",
          "FULLSCREEN_CONTROL",
          "FULLSCREEN_MODEL",
          "SAVED_VIEWS_CONTROL",
          "SAVED_VIEWS_MODEL",
        ]),
        named("./viewControls/viewControlsChrome", [
          "DensityChooserChrome",
          "FullscreenButtonChrome",
        ]),
      ],
      `${entry}: retain named values without forwarding shared type ownership`
    );
  }
  for (const kind of ["pdf", "xlsx"]) {
    const canonical = `@adapttable/core/${kind}`;
    const route = `@adapttable/vue/export-${kind}`;
    const expected = [
      star("./export-csv", true),
      named(canonical, ["Aggregator"], true),
      star(canonical, false),
    ];
    if (kind === "xlsx") expected.push(named(canonical, WRITERS.xlsx));
    expected.push(star("@adapttable/core", true));
    assert.deepEqual(
      sourceExports(readFileSync(join(binding, `export-${kind}.ts`), "utf8")),
      expected,
      `${kind}: binding source export origin or type-only mode changed`
    );
    assert.deepEqual(
      sourceExports(readFileSync(join(native, `export-${kind}.ts`), "utf8")),
      [
        star(route, true),
        named(route, [OPTIONS[kind]], true),
        named(route, WRITERS[kind]),
      ],
      `${kind}: native source export origin or type-only mode changed`
    );
  }
  for (const [file, target] of [
    ["export-csv.ts", "./index"],
    ["index.ts", "@adapttable/core"],
  ]) {
    const edges = sourceExports(
      readFileSync(join(binding, file), "utf8")
    ).filter((edge) => edge.from === target && edge.names === "*");
    assert.deepEqual(
      edges,
      [star(target, true)],
      `${file}: extra core wildcard must remain type-only`
    );
  }
}

/** TypeScript symbol flags are a bitmask, including possible composite flags. */
function isAliasSymbol(symbol) {
  return (symbol.flags & ts.SymbolFlags.Alias) !== 0;
}

function finalAlias(checker, symbol) {
  const seen = new Set();
  let current = symbol;
  while (current && isAliasSymbol(current) && !seen.has(current)) {
    seen.add(current);
    current = checker.getAliasedSymbol(current);
  }
  return current;
}

/** Same structure is insufficient: every old name must resolve to its old symbol. */
export function canonicalAliasErrors(program, consumer, pairs) {
  const checker = program.getTypeChecker();
  const modules = new Map();
  for (const statement of consumer.statements) {
    if (ts.isImportDeclaration(statement)) {
      const symbol = checker.getSymbolAtLocation(statement.moduleSpecifier);
      if (symbol) {
        modules.set(
          statement.moduleSpecifier.text,
          new Map(
            checker
              .getExportsOfModule(symbol)
              .map((item) => [item.name, finalAlias(checker, item)])
          )
        );
      }
    }
  }
  const errors = [];
  for (const { canonical, route, names } of pairs) {
    for (const name of names) {
      const expected = modules.get(canonical)?.get(name);
      const actual = modules.get(route)?.get(name);
      if (!expected || !actual || actual !== expected) {
        errors.push(
          `${route}: ${name} no longer resolves to its canonical ${canonical} declaration`
        );
      }
    }
  }
  return errors;
}

function consumerInputs(manifest) {
  const pairs = [];
  const modules = new Map();
  for (const kind of ["pdf", "xlsx"]) {
    const canonical = `@adapttable/core/${kind}`;
    const names = manifest.surfaces[`vue-export-${kind}`];
    assert.ok(
      Array.isArray(names) && names.length > 0,
      `Missing canonical ${kind} surface`
    );
    modules.set(canonical, names);
    for (const binding of ["vue", "vue-unstyled"]) {
      const route = `@adapttable/${binding}/export-${kind}`;
      modules.set(route, names);
      pairs.push({ canonical, route, names });
    }
  }
  const text = [...modules]
    .map(([module, names], index) => {
      const imports = names
        .map((name) => `${name} as entry${index}_${name}`)
        .join(", ");
      return `import type { ${imports} } from ${JSON.stringify(module)};`;
    })
    .join("\n");
  return { pairs, text };
}

/** Named imports trigger ambiguity diagnostics in both package export conditions. */
export function checkBuiltExportTypes(cell, manifest) {
  const { pairs, text } = consumerInputs(manifest);
  for (const extension of ["ts", "cts"]) {
    const file = join(cell, `canonical-export-consumer.${extension}`);
    writeFileSync(file, text);
    const program = ts.createProgram([file], {
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: [],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.deepEqual(
      diagnostics.map((diagnostic) =>
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      ),
      [],
      `${extension}: produced declarations must compile strictly`
    );
    const consumer = program.getSourceFile(file);
    assert.ok(consumer, `Missing consumer ${file}`);
    assert.deepEqual(canonicalAliasErrors(program, consumer, pairs), []);
  }
}

/** Each generated value-position import must fail for its specific entry. */
export function typeOnlyValueErrors(program, file, entries) {
  const errors = [];
  const found = new Map(entries.map((entry) => [entry, 0]));
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    if (
      diagnostic.file?.fileName !== file ||
      ![1362, 2305].includes(diagnostic.code)
    ) {
      errors.push(
        ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
      );
      continue;
    }
    const line = diagnostic.file.getLineAndCharacterOfPosition(
      diagnostic.start
    ).line;
    const entry = entries[Math.floor(line / 2)];
    found.set(entry, (found.get(entry) ?? 0) + 1);
  }
  for (const entry of entries) {
    if (found.get(entry) !== 1) {
      errors.push(
        `${entry}: declarations must reject the core-only runtime value import`
      );
    }
  }
  return errors;
}

/** Derive coverage from the package contract, including future typed entries. */
export function publishedBindingEntries(cell) {
  const manifest = JSON.parse(
    readFileSync(
      join(cell, "node_modules/@adapttable/vue/package.json"),
      "utf8"
    )
  );
  return Object.keys(manifest.exports)
    .filter((key) => key !== "./package.json")
    .map((key) => "@adapttable/vue" + (key === "." ? "" : key.slice(1)));
}

/** Cover every published binding entry, including root as the healthy control. */
export function checkBuiltTypeOnlyValues(cell) {
  const entries = publishedBindingEntries(cell);
  const text = entries
    .map(
      (entry, index) =>
        `import { createExportController as controller${index} } from ${JSON.stringify(entry)};\nvoid controller${index};`
    )
    .join("\n");
  for (const extension of ["ts", "cts"]) {
    const file = join(cell, `type-only-value-consumer.${extension}`);
    writeFileSync(file, text);
    const program = ts.createProgram([file], {
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: [],
    });
    assert.deepEqual(typeOnlyValueErrors(program, file, entries), []);
  }
}

/** Exact values expose accidental runtime widening hidden by type-star reports. */
export function runtimeExportErrors(actual, canonical, expected, label) {
  const errors = [];
  const { writers, factory } = expected;
  if (
    JSON.stringify(Object.keys(actual).sort()) !==
    JSON.stringify([...writers, factory].sort())
  ) {
    errors.push(
      `${label}: runtime exports differ from the canonical writers plus ${factory}`
    );
  }
  for (const name of writers) {
    if (actual[name] !== canonical[name])
      errors.push(`${label}: ${name} lost canonical runtime identity`);
  }
  return errors;
}

export async function checkBuiltExportRuntime(cell) {
  const require = createRequire(join(cell, "consumer.cjs"));
  for (const mode of ["import", "require"]) {
    const load = async (specifier) => {
      if (mode === "require") return require(specifier);
      const [scope, name, subpath] = specifier.split("/");
      const root = join(cell, "node_modules", scope, name);
      const manifest = JSON.parse(
        readFileSync(join(root, "package.json"), "utf8")
      );
      const target =
        manifest.exports[subpath ? `./${subpath}` : "."].import.default;
      return import(pathToFileURL(join(root, target)).href);
    };
    const featureOwner = await load("@adapttable/vue/features");
    const adapterOwner = await load("@adapttable/vue/adapter");
    for (const [entry, factory] of Object.entries(FOCUSED_FACTORIES)) {
      const route = `@adapttable/vue/${entry}`;
      const actual = await load(route);
      assert.deepEqual(
        Object.keys(actual).sort(),
        [...VIEW_CONTROL_VALUES, factory].sort(),
        `${mode} ${route}: the focused runtime surface changed`
      );
      assert.equal(actual[factory], featureOwner[factory]);
      for (const name of VIEW_CONTROL_VALUES)
        assert.equal(
          actual[name],
          adapterOwner[name],
          `${mode} ${route}: ${name} lost canonical runtime identity`
        );
    }
    for (const kind of ["pdf", "xlsx"]) {
      const canonical = await load(`@adapttable/core/${kind}`);
      const modules = [];
      for (const binding of ["vue", "vue-unstyled"]) {
        const route = `@adapttable/${binding}/export-${kind}`;
        const actual = await load(route);
        modules.push(actual);
        assert.deepEqual(
          runtimeExportErrors(
            actual,
            canonical,
            { writers: WRITERS[kind], factory: FACTORIES[kind] },
            `${mode} ${route}`
          ),
          []
        );
      }
      assert.notEqual(
        modules[0][FACTORIES[kind]],
        modules[1][FACTORIES[kind]],
        "Native export factory must retain its control-wiring wrapper"
      );
    }
    for (const entry of publishedBindingEntries(cell)) {
      const actual = await load(entry);
      assert.equal(
        Object.hasOwn(actual, "createExportController"),
        false,
        `${mode} ${entry}: a core-only value leaked into runtime exports`
      );
    }
  }
}

/** Run the same ownership proof against either peer's existing built-only cell. */
export async function checkVueCellExportContracts(
  cell,
  repository = REPO_ROOT,
  manifestFile = join(repository, "etc/api-contract.json")
) {
  checkExportSources(repository);
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  checkBuiltExportTypes(cell, manifest);
  checkBuiltFeatureOwnership(cell);
  checkBuiltTypeOnlyValues(cell);
  await checkBuiltExportRuntime(cell);
}

/** Standalone post-build proof; writes only an isolated temporary consumer cell. */
export async function checkVueExportContracts(
  repository = REPO_ROOT,
  manifestFile = join(repository, "etc/api-contract.json")
) {
  const cell = mkdtempSync(join(tmpdir(), "vue-export-contracts-"));
  try {
    const vueRoot = realpathSync(
      join(packageDir("vue", repository), "node_modules/vue")
    );
    prepareVueCell(cell, vueRoot, repository);
    await checkVueCellExportContracts(cell, repository, manifestFile);
  } finally {
    rmSync(cell, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  if (args[0] === "--cell") {
    assert.equal(
      args.length,
      2,
      "Usage: vue-export-contracts.mjs --cell /path/to/cell"
    );
    await checkVueCellExportContracts(resolve(args[1]));
  } else {
    assert.ok(
      args.length <= 2,
      "Usage: vue-export-contracts.mjs [repository] [manifest]"
    );
    const [repository, manifest] = args;
    await checkVueExportContracts(
      repository ? resolve(repository) : REPO_ROOT,
      manifest && resolve(manifest)
    );
  }
  console.log(
    "Vue export contracts: source type-only provenance, strict ESM/CJS canonical declarations, all-entry type-only value negatives and exact runtime identities passed."
  );
}
