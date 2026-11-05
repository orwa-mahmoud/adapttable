#!/usr/bin/env node
/**
 * Core layer direction, on top of the framework-boundary check.
 *
 * The framework check already rejects engine modules and shipped neutral
 * graphs that reach React. This one classifies core source into the layers
 * in `core-export-ownership.json` and rejects three other things: a low
 * layer importing presentation, a runtime import of the incremental cache
 * from outside its owners, and a runtime import cycle. Type-only edges are
 * reported on their own and are not counted as JavaScript. The current
 * violation set is an exact list — a new edge fails, and so does a listed
 * edge that the source no longer has. There is no wildcard.
 *
 *   node scripts/check-core-dependencies.mjs
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OWNERSHIP_FILE = join(ROOT, "scripts", "core-export-ownership.json");

const FRAMEWORK = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "vue",
  "@angular/core",
  "@angular/common",
  "@angular/forms",
];

/** @param {string} spec */
function isFramework(spec) {
  return FRAMEWORK.some(
    (name) => spec === name || spec.startsWith(`${name}/`)
  );
}

/**
 * @param {string} dir
 * @param {string[]} out
 */
function sourceFiles(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) sourceFiles(path, out);
    else if (name.name.endsWith(".ts") && !name.name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

/**
 * @param {string} fromFile
 * @param {string} spec
 */
function resolveRelative(fromFile, spec) {
  if (!spec.startsWith(".")) return undefined;
  const base = resolve(dirname(fromFile), spec);
  const candidates = spec.endsWith(".ts")
    ? [base]
    : [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find((candidate) => existsSync(candidate));
}

/**
 * @param {import("typescript").SourceFile} source
 */
function edgesOf(source) {
  /** @type {{ spec: string, kind: "runtime" | "type" }[]} */
  const edges = [];
  /** @param {import("typescript").Node} node */
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier !== undefined &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const spec = node.moduleSpecifier.text;
      const typeOnly =
        node.isTypeOnly === true || node.importClause?.isTypeOnly === true;
      if (typeOnly) edges.push({ spec, kind: "type" });
      else if (
        node.importClause?.namedBindings !== undefined &&
        ts.isNamedImports(node.importClause.namedBindings)
      ) {
        const named = node.importClause.namedBindings.elements;
        if (named.some((element) => !element.isTypeOnly) || node.importClause.name) {
          edges.push({ spec, kind: "runtime" });
        }
        if (named.some((element) => element.isTypeOnly)) {
          edges.push({ spec, kind: "type" });
        }
      } else edges.push({ spec, kind: "runtime" });
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] !== undefined &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      edges.push({ spec: node.arguments[0].text, kind: "runtime" });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return edges;
}

/**
 * @param {string} srcDir
 */
export function readCoreEdges(srcDir) {
  /** @type {{ from: string, to: string, kind: "runtime" | "type", spec: string }[]} */
  const edges = [];
  for (const file of sourceFiles(srcDir)) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true
    );
    const from = relative(srcDir, file);
    for (const edge of edgesOf(source)) {
      if (isFramework(edge.spec)) {
        edges.push({ from, to: edge.spec, kind: edge.kind, spec: edge.spec });
        continue;
      }
      const resolved = resolveRelative(file, edge.spec);
      if (resolved === undefined || !resolved.startsWith(srcDir)) continue;
      edges.push({
        from,
        to: relative(srcDir, resolved),
        kind: edge.kind,
        spec: edge.spec,
      });
    }
  }
  return edges;
}

/**
 * @param {string} file
 * @param {{ id: string, rank: number, prefixes: string[] }[]} layers
 * @param {number} defaultRank
 */
function layerOf(file, layers, defaultRank) {
  if (!file.includes("/")) return { id: "entry", rank: defaultRank };
  let match = { id: "domain", rank: defaultRank };
  let length = -1;
  for (const layer of layers) {
    for (const prefix of layer.prefixes) {
      if (file.startsWith(prefix) && prefix.length > length) {
        match = layer;
        length = prefix.length;
      }
    }
  }
  return match;
}

/** @param {{ from: string, to: string, kind: string }} edge */
function edgeKey(edge) {
  return `${edge.kind} ${edge.from} -> ${edge.to}`;
}

/**
 * @param {ReturnType<typeof readCoreEdges>} edges
 * @param {object} ownership
 */
/**
 * @param {{ kind: string }} edge
 * @param {string} runtimeReason
 * @param {string} typeReason
 */
function reasoned(edge, runtimeReason, typeReason) {
  return {
    ...edge,
    reason: edge.kind === "type" ? typeReason : runtimeReason,
  };
}

/**
 * @param {ReturnType<typeof readCoreEdges>} edges
 * @param {object} ownership
 */
function layerProblems(edges, ownership) {
  /** @type {{ from: string, to: string, kind: "runtime" | "type", reason: string }[]} */
  const found = [];
  for (const edge of edges) {
    if (isFramework(edge.to)) {
      found.push(
        reasoned(edge, "framework import", "type-only framework import")
      );
      continue;
    }
    const from = layerOf(edge.from, ownership.layers, ownership.defaultRank);
    const to = layerOf(edge.to, ownership.layers, ownership.defaultRank);
    if (
      from.rank <= ownership.lowMaxRank &&
      to.rank >= ownership.presentationMinRank
    ) {
      found.push(
        reasoned(
          edge,
          "low layer imports presentation",
          "type-only low layer imports presentation"
        )
      );
    }
  }
  return found;
}

/**
 * @param {ReturnType<typeof readCoreEdges>} runtime
 * @param {object} ownership
 */
function incrementalReaches(runtime, ownership) {
  const owners = new Set(ownership.incrementalOwners);
  return runtime
    .filter((edge) => edge.to === ownership.incrementalModule)
    .filter((edge) => {
      const ownedByRows = edge.from.startsWith("rows/");
      const ownedByEngine =
        edge.from.startsWith("engine/") && owners.has(edge.from);
      const publicEntry = !edge.from.includes("/");
      return !ownedByRows && !ownedByEngine && !publicEntry && !owners.has(edge.from);
    })
    .map((edge) => ({ ...edge, reason: "reaches the incremental cache" }));
}

/**
 * @param {ReturnType<typeof readCoreEdges>} runtime
 */
function runtimeCycles(runtime) {
  const pairs = new Set(runtime.map((edge) => `${edge.from}->${edge.to}`));
  /** @type {{ from: string, to: string, kind: "runtime", reason: string }[]} */
  const found = [];
  for (const edge of runtime) {
    if (edge.from >= edge.to) continue;
    if (!pairs.has(`${edge.to}->${edge.from}`)) continue;
    found.push(
      { ...edge, kind: "runtime", reason: "runtime import cycle" },
      {
        from: edge.to,
        to: edge.from,
        kind: "runtime",
        reason: "runtime import cycle",
      }
    );
  }
  return found;
}

/**
 * @param {ReturnType<typeof readCoreEdges>} edges
 * @param {object} ownership
 */
export function classifyCoreEdges(edges, ownership) {
  const known = new Set(
    ownership.knownViolations.flatMap((entry) =>
      entry.edges.map((edge) => edgeKey(edge))
    )
  );
  /** @type {Map<string, { id: string, cause: string, destinationItem: string }>} */
  const knownByKey = new Map();
  for (const entry of ownership.knownViolations) {
    for (const edge of entry.edges) {
      knownByKey.set(edgeKey(edge), entry);
    }
  }
  const runtime = edges.filter((edge) => edge.kind === "runtime");
  const found = [
    ...layerProblems(edges, ownership),
    ...incrementalReaches(runtime, ownership),
    ...runtimeCycles(runtime),
  ];
  const unexpected = found.filter((edge) => !known.has(edgeKey(edge)));
  const present = new Set(found.map((edge) => edgeKey(edge)));
  const stale = [...known].filter((key) => !present.has(key));
  const typeOnly = found.filter((edge) => edge.kind === "type");
  const javascript = found.filter((edge) => edge.kind === "runtime");
  return { found, unexpected, stale, typeOnly, javascript, knownByKey };
}

/**
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {string} [options.srcDir]
 * @param {object} [options.ownership]
 */
export function checkCoreDependencies({
  root = ROOT,
  srcDir = join(root, "packages/shared/core/src"),
  ownership = JSON.parse(readFileSync(join(root, "scripts/core-export-ownership.json"), "utf8")),
} = {}) {
  const edges = readCoreEdges(srcDir);
  const classified = classifyCoreEdges(edges, ownership);
  const problems = [
    ...classified.unexpected.map(
      (edge) =>
        `${edge.kind === "type" ? "type-only" : "runtime"}: ${edge.from} -> ${edge.to} (${edge.reason})`
    ),
    ...classified.stale.map((key) => `stale violation: ${key}`),
  ];
  return { ...classified, edges, problems, ownership };
}

/**
 * Public exports of one entry, resolved through TypeScript aliases.
 *
 * @param {import("typescript").TypeChecker} checker
 * @param {import("typescript").SourceFile | undefined} source
 * @param {string} subpath
 * @param {string} srcDir
 */
function exportsOf(checker, source, subpath, srcDir) {
  if (source?.symbol === undefined) return [];
  /** @type {object[]} */
  const rows = [];
  for (const symbol of checker.getExportsOfModule(source.symbol)) {
    const aliased =
      symbol.flags & ts.SymbolFlags.Alias
        ? checker.getAliasedSymbol(symbol)
        : symbol;
    const declaration =
      aliased.valueDeclaration ?? aliased.declarations?.[0];
    const modulePath =
      declaration === undefined
        ? undefined
        : relative(srcDir, declaration.getSourceFile().fileName);
    const typeOnly = (aliased.flags & ts.SymbolFlags.Value) === 0;
    const tags = symbol.getJsDocTags();
    rows.push({
      name: symbol.name,
      kind: typeOnly ? "type" : "runtime",
      module: modulePath,
      subpath,
      deprecated: tags.some((tag) => tag.name === "deprecated"),
      internal: tags.some((tag) => tag.name === "internal"),
      forward: (symbol.flags & ts.SymbolFlags.Alias) !== 0,
      identity: `${modulePath ?? "unknown"}#${aliased.name}`,
    });
  }
  return rows;
}

const ENTRY_SOURCES = {
  ".": "index.ts",
  "./binding": "binding.ts",
  "./xlsx": "xlsx.ts",
  "./pdf": "pdf.ts",
  "./formula": "formula.ts",
  "./pivot": "pivot.ts",
  "./query": "query.ts",
  "./stream": "stream.ts",
  "./conformance": "conformance.ts",
};

/**
 * @param {string} srcDir
 */
export function enumerateCoreExports(srcDir) {
  const configPath = join(srcDir, "../tsconfig.json");
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    dirname(configPath)
  );
  const program = ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });
  const checker = program.getTypeChecker();
  /** @type {object[]} */
  const rows = [];
  for (const [subpath, file] of Object.entries(ENTRY_SOURCES)) {
    rows.push(
      ...exportsOf(
        checker,
        program.getSourceFile(join(srcDir, file)),
        subpath,
        srcDir
      )
    );
  }
  const byIdentity = new Map();
  for (const row of rows) {
    const list = byIdentity.get(row.identity) ?? [];
    list.push(row);
    byIdentity.set(row.identity, list);
  }
  return rows
    .filter((row, index, all) => {
      const key = `${row.identity}|${row.name}|${row.kind}`;
      return (
        all.findIndex(
          (other) => `${other.identity}|${other.name}|${other.kind}` === key
        ) === index
      );
    })
    .map((row) => {
      const homes = byIdentity.get(row.identity) ?? [row];
      const subpaths = [...new Set(homes.map((home) => home.subpath))].sort();
      const bindingOnly = subpaths.length === 1 && subpaths[0] === "./binding";
      const specific = subpaths.find(
        (subpath) => subpath !== "." && subpath !== "./binding"
      );
      return {
        name: row.name,
        kind: row.kind,
        module: row.module,
        audience: exportAudience(row, bindingOnly),
        path: preferredPath(specific, subpaths),
        forward: row.forward,
        deprecated: row.deprecated,
        identity: row.identity,
        subpaths,
      };
    })
    .sort(compareExports);
}

/**
 * @param {{ internal: boolean }} row
 * @param {boolean} bindingOnly
 */
function exportAudience(row, bindingOnly) {
  if (row.internal) return "internal";
  if (bindingOnly) return "binding-spi";
  return "app";
}

/**
 * @param {string | undefined} specific
 * @param {string[]} subpaths
 */
function preferredPath(specific, subpaths) {
  if (specific !== undefined) return specific;
  if (subpaths.includes(".")) return ".";
  return subpaths[0];
}

/**
 * @param {{ path: string, kind: string, name: string }} left
 * @param {{ path: string, kind: string, name: string }} right
 */
function compareExports(left, right) {
  if (left.path !== right.path) return left.path.localeCompare(right.path);
  if (left.kind !== right.kind) return left.kind.localeCompare(right.kind);
  return left.name.localeCompare(right.name);
}

function main() {
  const write = process.argv.includes("--write-inventory");
  const checked = checkCoreDependencies();
  if (checked.problems.length > 0) {
    console.error(
      `core dependencies: ${checked.problems.length} problem(s)\n`
    );
    for (const problem of checked.problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const srcDir = join(ROOT, "packages/shared/core/src");
  const exports = enumerateCoreExports(srcDir);
  const ownership = checked.ownership;
  const recorded = JSON.stringify(ownership.exports ?? []);
  const fresh = JSON.stringify(exports);
  if (write) {
    ownership.exports = exports;
    writeFileSync(OWNERSHIP_FILE, `${JSON.stringify(ownership, null, 2)}\n`);
    console.log(`core dependencies: wrote ${exports.length} exports`);
  } else if (recorded !== fresh) {
    console.error(
      "core dependencies: export inventory does not match TypeScript. Run with --write-inventory after an intentional surface change."
    );
    process.exit(1);
  }
  const runtime = checked.javascript.length;
  const typeOnly = checked.typeOnly.length;
  console.log(
    `core dependencies: ${runtime} recorded runtime violation(s), ${typeOnly} recorded type-only violation(s), ${exports.length} public exports`
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
