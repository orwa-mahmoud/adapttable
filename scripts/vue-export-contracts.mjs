/** Source ownership and built identities for the canonical Vue entries. */
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
import { checkBuiltFeatureOwnership } from "./vue-feature-contracts.mjs";
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
/** Public binding barrels name their exports explicitly at their canonical role. */
export function checkExportSources(repository) {
  const binding = join(repository, "packages/vue/vue/src");
  const native = join(repository, "packages/vue/adapter-vue-unstyled/src");
  const manifest = JSON.parse(
    readFileSync(join(binding, "../package.json"), "utf8")
  );
  for (const entry of Object.keys(manifest.exports)) {
    if (entry === "./package.json") continue;
    const file = `${entry === "." ? "index" : entry.slice(2)}.ts`;
    const edges = sourceExports(readFileSync(join(binding, file), "utf8"));
    assert.ok(
      edges.every((edge) => edge.names !== "*"),
      `${file}: canonical entries cannot forward wildcard closures`
    );
    assert.ok(
      edges.every((edge) =>
        edge.names.every(
          (name) =>
            name.name !== "requireScope" && name.original !== "requireScope"
        )
      ),
      `${file}: requireScope is internal to the binding`
    );
  }
  const queryHandler = sourceExports(
    readFileSync(join(binding, "index.ts"), "utf8")
  ).flatMap((edge) =>
    edge.names
      .filter((name) => name.name === "TableQueryHandler")
      .map((name) => ({ from: edge.from, ...name }))
  );
  assert.deepEqual(queryHandler, [
    {
      from: "./source/useServerData",
      name: "TableQueryHandler",
      original: "TableQueryHandler",
      typeOnly: true,
    },
  ]);
  const features = sourceExports(
    readFileSync(join(binding, "features.ts"), "utf8")
  );
  for (const [entry, factory] of [
    ["density", "densityChooser"],
    ["fullscreen", "fullscreen"],
  ]) {
    assert.deepEqual(
      features.filter((edge) =>
        edge.names.some((name) => name.name === factory)
      ),
      [named(`./features/${entry}`, [factory])],
      `${factory}: retain the original factory declaration`
    );
  }
  for (const kind of ["pdf", "xlsx"]) {
    const canonical = `@adapttable/core/${kind}`;
    const route = `@adapttable/vue/${kind}`;
    const contracts =
      kind === "pdf"
        ? [
            "PdfWriterOptions",
            "PrintLayoutOptions",
            "PrintPageBreak",
            "PrintPageSize",
          ]
        : [];
    const expected = [
      named(`./export-${kind}`, [OPTIONS[kind]], true),
      named(`./export-${kind}`, [FACTORIES[kind]]),
      ...(contracts.length ? [named(canonical, contracts, true)] : []),
      named(canonical, WRITERS[kind]),
    ];
    const normalize = (edges) =>
      edges
        .flatMap((edge) =>
          edge.names.map((name) => ({ from: edge.from, ...name }))
        )
        .sort((a, b) => a.name.localeCompare(b.name));
    const pinned = new Set(
      expected.flatMap((edge) => edge.names.map((name) => name.name))
    );
    const actual = normalize(
      sourceExports(readFileSync(join(binding, `${kind}.ts`), "utf8"))
    );
    assert.deepEqual(
      actual.filter((name) => pinned.has(name.name)),
      normalize(expected),
      `${kind}: binding source export origin or type-only mode changed`
    );
    assert.deepEqual(
      actual.filter((name) => !pinned.has(name.name) && !name.typeOnly),
      [],
      `${kind}: names beyond the pinned contract only route returned types`
    );
    assert.deepEqual(
      normalize(
        sourceExports(readFileSync(join(native, `export-${kind}.ts`), "utf8"))
      ),
      normalize([
        named(route, [OPTIONS[kind]], true),
        named(route, WRITERS[kind]),
      ]),
      `${kind}: native source export origin or type-only mode changed`
    );
  }
}

/** Source declarations distinguish runtime exports from named type contracts. */
export function runtimeSourceNames(text) {
  const source = ts.createSourceFile(
    "entry.ts",
    text,
    ts.ScriptTarget.Latest,
    true
  );
  const names = new Set(source.statements.flatMap(runtimeStatementNames));
  return [...names].sort();
}

/** Runtime names one top-level statement exports; type-only exports carry none. */
function runtimeStatementNames(statement) {
  if (ts.isExportDeclaration(statement)) {
    assert.ok(
      statement.exportClause && ts.isNamedExports(statement.exportClause)
    );
    if (statement.isTypeOnly) return [];
    return statement.exportClause.elements
      .filter((item) => !item.isTypeOnly)
      .map((item) => item.name.text);
  }
  const exported = statement.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
  );
  if (!exported) return [];
  if (
    ts.isFunctionDeclaration(statement) ||
    ts.isClassDeclaration(statement) ||
    ts.isEnumDeclaration(statement)
  ) {
    return [statement.name.text];
  }
  if (!ts.isVariableStatement(statement)) return [];
  return statement.declarationList.declarations.map((declaration) => {
    assert.ok(ts.isIdentifier(declaration.name));
    return declaration.name.text;
  });
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

/** The root callback name must be the actual public option member contract. */
export function serverQueryHandlerErrors(program, consumer) {
  const checker = program.getTypeChecker();
  const statement = consumer.statements.find(
    (node) =>
      ts.isImportDeclaration(node) &&
      node.moduleSpecifier.text === "@adapttable/vue"
  );
  const owner =
    statement && checker.getSymbolAtLocation(statement.moduleSpecifier);
  const exports = new Map(
    owner
      ? checker
          .getExportsOfModule(owner)
          .map((symbol) => [symbol.name, finalAlias(checker, symbol)])
      : []
  );
  const handler = exports.get("TableQueryHandler");
  const options = exports.get("UseServerDataOptions");
  const member =
    options &&
    checker.getPropertyOfType(
      checker.getDeclaredTypeOfSymbol(options),
      "onQueryChange"
    );
  const reference = member?.declarations?.find(ts.isPropertySignature)?.type;
  return handler?.declarations?.length &&
    reference &&
    ts.isTypeReferenceNode(reference) &&
    finalAlias(checker, checker.getSymbolAtLocation(reference.typeName)) ===
      handler
    ? []
    : [
        "@adapttable/vue: TableQueryHandler must name the exact UseServerDataOptions.onQueryChange declaration",
      ];
}

function consumerInputs() {
  const pairs = [];
  const modules = new Map();
  for (const kind of ["pdf", "xlsx"]) {
    const canonical = `@adapttable/core/${kind}`;
    const names = WRITERS[kind];
    const contracts =
      kind === "pdf"
        ? [
            "PdfWriterOptions",
            "PrintLayoutOptions",
            "PrintPageBreak",
            "PrintPageSize",
          ]
        : [];
    const canonicalNames = [...names, ...contracts];
    modules.set(canonical, canonicalNames);
    for (const route of [
      `@adapttable/vue/${kind}`,
      `@adapttable/vue-unstyled/export-${kind}`,
    ]) {
      const retainedNames = route.startsWith("@adapttable/vue/")
        ? canonicalNames
        : names;
      modules.set(route, retainedNames);
      pairs.push({ canonical, route, names: retainedNames });
    }
    pairs.push({
      canonical: `@adapttable/vue/${kind}`,
      route: `@adapttable/vue-unstyled/export-${kind}`,
      names: [OPTIONS[kind]],
    });
  }
  const text = [...modules]
    .map(([module, names], index) => {
      const kind = module.endsWith("pdf") ? "pdf" : "xlsx";
      const imports = [
        ...names,
        ...(module.startsWith("@adapttable/core/") ? [] : [OPTIONS[kind]]),
      ]
        .map((name) => `${name} as entry${index}_${name}`)
        .join(", ");
      return `import type { ${imports} } from ${JSON.stringify(module)};`;
    })
    .join("\n");
  return {
    pairs,
    text: `${text}\nimport type { TableQueryHandler, UseServerDataOptions } from "@adapttable/vue";`,
  };
}

/** Named imports trigger ambiguity diagnostics in both package export conditions. */
export function checkBuiltExportTypes(cell) {
  const { pairs, text } = consumerInputs();
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
    assert.deepEqual(serverQueryHandlerErrors(program, consumer), []);
  }
}

/** Every advertised ESM/CJS entry must expose its exact reviewed public surface. */
export function checkBuiltEntrySurfaces(cell, manifest) {
  const entries = publishedBindingEntries(cell);
  for (const extension of ["ts", "cts"]) {
    const file = join(cell, `entry-surfaces.${extension}`);
    writeFileSync(
      file,
      entries
        .map(
          (entry, index) =>
            `import * as entry${index} from ${JSON.stringify(entry)};`
        )
        .join("\n")
    );
    const program = ts.createProgram([file], {
      strict: true,
      skipLibCheck: false,
      noEmit: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: [],
    });
    assert.deepEqual(
      ts
        .getPreEmitDiagnostics(program)
        .map((item) => ts.flattenDiagnosticMessageText(item.messageText, "\n")),
      [],
      `${extension}: complete advertised export inventory must compile`
    );
    const checker = program.getTypeChecker();
    for (const statement of program.getSourceFile(file).statements) {
      if (!ts.isImportDeclaration(statement)) continue;
      const entry = statement.moduleSpecifier.text;
      const surface =
        entry === "@adapttable/vue"
          ? "vue"
          : `vue-${entry.slice("@adapttable/vue/".length)}`;
      const expected = manifest.surfaces[surface];
      assert.ok(Array.isArray(expected), `${entry}: missing reviewed surface`);
      const symbol = checker.getSymbolAtLocation(statement.moduleSpecifier);
      assert.ok(symbol, `${entry}: missing module declaration`);
      assert.deepEqual(
        checker
          .getExportsOfModule(symbol)
          .map((item) => item.name)
          .sort(),
        [...expected].sort(),
        `${extension} ${entry}: complete public export inventory changed`
      );
    }
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

export async function checkBuiltExportRuntime(cell, repository = REPO_ROOT) {
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
    for (const kind of ["pdf", "xlsx"]) {
      const canonical = await load(`@adapttable/core/${kind}`);
      const modules = [];
      for (const binding of ["vue", "vue-unstyled"]) {
        const route =
          binding === "vue"
            ? `@adapttable/vue/${kind}`
            : `@adapttable/vue-unstyled/export-${kind}`;
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
      const stem =
        entry === "@adapttable/vue"
          ? "index"
          : entry.slice("@adapttable/vue/".length);
      const source = readFileSync(
        join(repository, "packages/vue/vue/src", `${stem}.ts`),
        "utf8"
      );
      assert.deepEqual(
        Object.keys(actual).sort(),
        runtimeSourceNames(source),
        `${mode} ${entry}: runtime export inventory differs from its explicit source declarations`
      );
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
  checkBuiltExportTypes(cell);
  checkBuiltEntrySurfaces(cell, manifest);
  checkBuiltFeatureOwnership(cell);
  checkBuiltTypeOnlyValues(cell);
  await checkBuiltExportRuntime(cell, repository);
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
