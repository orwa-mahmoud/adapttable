/**
 * Semantic DataTable capabilities, read from TypeScript types.
 *
 * Names are normalized across hooks, signals and refs. A capability is
 * present when the public prop type matches the expected shape, not when
 * the source text contains the word. Framework differences are an exact
 * list: a missing capability without one fails, and a listed difference
 * whose prop is actually present fails too.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

import { REPO_ROOT } from "./packages.mjs";

const ROOT = REPO_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "..");

/** @type {readonly { id: string, names: readonly string[], shape: "string" | "number" | "boolean" | "callback", params?: number, param?: "text" | "row" }[]} */
export const BINDING_CAPABILITIES = Object.freeze([
  { id: "locale", names: ["locale"], shape: "string" },
  { id: "sticky-header", names: ["stickyHeader"], shape: "boolean" },
  { id: "mobile-breakpoint", names: ["mobileBreakpoint"], shape: "number" },
  { id: "debounce", names: ["searchDebounceMs"], shape: "number" },
  { id: "row-click", names: ["onRowClick"], shape: "callback", params: 1, param: "row" },
  {
    id: "cell-flash",
    names: ["isCellFlashing"],
    shape: "callback",
    params: 2,
    param: "text",
  },
  { id: "search-placeholder", names: ["searchPlaceholder"], shape: "string" },
  {
    id: "server-query",
    names: ["onQueryChange"],
    shape: "callback",
    params: 2,
    param: "row",
  },
]);

const WRAPPERS = new Set([
  "InputSignal",
  "ModelSignal",
  "InputSignalWithTransform",
  "Signal",
  "WritableSignal",
  "MaybeRef",
  "MaybeRefOrGetter",
  "MaybeRefOrGetterOptional",
  "Ref",
  "ComputedRef",
]);

/**
 * @param {import("typescript").TypeChecker} checker
 * @param {import("typescript").Type} type
 * @param {number} [depth]
 */
function unwrap(checker, type, depth = 0) {
  if (type === undefined || depth > 8) return type;
  if (type.isUnion()) {
    const parts = type.types.filter(
      (part) =>
        (part.flags &
          (ts.TypeFlags.Undefined |
            ts.TypeFlags.Null |
            ts.TypeFlags.Void |
            ts.TypeFlags.Never)) ===
        0
    );
    if (parts.length === 1) return unwrap(checker, parts[0], depth + 1);
  }
  const alias = type.aliasSymbol?.name ?? type.getSymbol()?.name;
  const args =
    type.aliasTypeArguments ??
    (type.target !== undefined ? checker.getTypeArguments(type) : undefined);
  if (alias !== undefined && WRAPPERS.has(alias) && args?.[0] !== undefined) {
    return unwrap(checker, args[0], depth + 1);
  }
  return type;
}

/**
 * @param {import("typescript").TypeChecker} checker
 * @param {import("typescript").Type} type
 */
function isText(checker, type) {
  const inner = unwrap(checker, type);
  if (inner.isUnion()) return inner.types.every((part) => isText(checker, part));
  return (
    (inner.flags & (ts.TypeFlags.String | ts.TypeFlags.StringLiteral)) !== 0
  );
}

/**
 * @param {import("typescript").TypeChecker} checker
 * @param {import("typescript").Type} type
 */
function isBoolean(type) {
  if (type.isUnion()) {
    const parts = type.types.filter(
      (part) =>
        (part.flags &
          (ts.TypeFlags.Undefined | ts.TypeFlags.Null | ts.TypeFlags.Void)) ===
        0
    );
    return parts.length > 0 && parts.every((part) => isBoolean(part));
  }
  return (
    (type.flags & (ts.TypeFlags.Boolean | ts.TypeFlags.BooleanLiteral)) !== 0
  );
}

function isNumber(checker, type) {
  const inner = unwrap(checker, type);
  return (inner.flags & (ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral)) !== 0;
}

/**
 * @param {import("typescript").TypeChecker} checker
 * @param {import("typescript").SourceFile} source
 * @param {string} typeName
 */
export function surfaceType(checker, source, typeName) {
  /** @type {import("typescript").Node | undefined} */
  let declaration;
  /** @param {import("typescript").Node} node */
  const visit = (node) => {
    if (
      (ts.isTypeAliasDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isClassDeclaration(node)) &&
      node.name?.text === typeName
    ) {
      declaration = node;
    }
    if (declaration === undefined) ts.forEachChild(node, visit);
  };
  visit(source);
  if (declaration === undefined) return undefined;
  if (ts.isTypeAliasDeclaration(declaration)) {
    return checker.getTypeFromTypeNode(declaration.type);
  }
  const symbol = checker.getSymbolAtLocation(declaration.name);
  return symbol === undefined
    ? undefined
    : checker.getApparentType(checker.getDeclaredTypeOfSymbol(symbol));
}

/**
 * @param {import("typescript").TypeChecker} checker
 * @param {import("typescript").Type} type
 * @param {(typeof BINDING_CAPABILITIES)[number]} capability
 */
function shapeMatches(checker, type, capability) {
  const inner = unwrap(checker, type);
  if (capability.shape === "string") return isText(checker, inner);
  if (capability.shape === "number") return isNumber(checker, inner);
  if (capability.shape === "boolean") return isBoolean(inner);
  const signatures = checker.getSignaturesOfType(inner, ts.SignatureKind.Call);
  const signature = signatures[0];
  if (signature === undefined) return false;
  const parameters = signature.getParameters();
  if (parameters.length < (capability.params ?? 1)) return false;
  if (capability.param === undefined) return true;
  const first = parameters[0];
  const declaration = first?.valueDeclaration ?? first?.declarations?.[0];
  if (first === undefined || declaration === undefined) return false;
  const param = checker.getTypeOfSymbolAtLocation(first, declaration);
  if (capability.param === "text") {
    return parameters.every((parameter) => {
      const at = parameter.valueDeclaration ?? parameter.declarations?.[0];
      return (
        at !== undefined &&
        isText(checker, checker.getTypeOfSymbolAtLocation(parameter, at))
      );
    });
  }
  return !isText(checker, param) && !isNumber(checker, param);
}

/**
 * @param {object} options
 * @param {import("typescript").TypeChecker} options.checker
 * @param {Map<string, import("typescript").Symbol>} options.properties
 * @param {(typeof BINDING_CAPABILITIES)[number]} options.capability
 * @param {string} options.framework
 * @param {string} options.typeName
 * @param {readonly { capability: string, framework: string, reason: string, disposition: string }[]} options.differences
 */
function capabilityResult({
  checker,
  properties,
  capability,
  framework,
  typeName,
  differences,
}) {
  const name = capability.names.find((candidate) => properties.has(candidate));
  const allowed = differences.find(
    (difference) =>
      difference.capability === capability.id &&
      difference.framework === framework
  );
  if (name === undefined) {
    return {
      problems: missingCapability(allowed, framework, capability, typeName),
      found: undefined,
    };
  }
  const property = properties.get(name);
  const declaration = property?.valueDeclaration ?? property?.declarations?.[0];
  const propertyType =
    property === undefined || declaration === undefined
      ? undefined
      : checker.getTypeOfSymbolAtLocation(property, declaration);
  const matches =
    propertyType !== undefined && shapeMatches(checker, propertyType, capability);
  if (!matches) {
    return {
      problems: [
        `${framework}: ${capability.id} (${name}) is not a ${capability.shape}`,
      ],
      found: undefined,
    };
  }
  if (allowed !== undefined) {
    return {
      problems: [
        `${framework}: stale difference for ${capability.id}; ${name} is present`,
      ],
      found: undefined,
    };
  }
  return { problems: [], found: { id: capability.id, name } };
}

/**
 * @param {{ reason: string, disposition: string } | undefined} allowed
 * @param {string} framework
 * @param {{ id: string }} capability
 * @param {string} typeName
 */
function missingCapability(allowed, framework, capability, typeName) {
  if (allowed === undefined) {
    return [`${framework}: missing ${capability.id} on ${typeName}`];
  }
  if (allowed.reason.trim() === "" || allowed.disposition.trim() === "") {
    return [
      `${framework}: ${capability.id} difference has no reason or disposition`,
    ];
  }
  return [];
}

/**
 * @param {object} options
 * @param {import("typescript").TypeChecker} options.checker
 * @param {import("typescript").SourceFile} options.source
 * @param {string} options.typeName
 * @param {string} options.framework
 * @param {readonly (typeof BINDING_CAPABILITIES)[number]} [options.capabilities]
 * @param {readonly { capability: string, framework: string, reason: string, disposition: string }[]} [options.differences]
 */
export function checkCapabilitySurface({
  checker,
  source,
  typeName,
  framework,
  capabilities = BINDING_CAPABILITIES,
  differences = [],
}) {
  const type = surfaceType(checker, source, typeName);
  /** @type {string[]} */
  const problems = [];
  if (type === undefined) {
    return { problems: [`${framework}: missing ${typeName}`], found: [] };
  }
  const properties = new Map(
    checker.getPropertiesOfType(type).map((property) => [property.name, property])
  );
  /** @type {{ id: string, name: string }[]} */
  const found = [];
  for (const capability of capabilities) {
    const result = capabilityResult({
      checker,
      properties,
      capability,
      framework,
      typeName,
      differences,
    });
    problems.push(...result.problems);
    if (result.found !== undefined) found.push(result.found);
  }
  for (const difference of differences) {
    if (difference.framework !== framework) continue;
    if (!capabilities.some((capability) => capability.id === difference.capability)) {
      problems.push(
        `${framework}: unknown capability difference ${difference.capability}`
      );
    }
  }
  return { problems, found };
}

/**
 * @param {string} configPath
 */
function programFrom(configPath) {
  const read = ts.readConfigFile(configPath, ts.sys.readFile);
  if (read.error !== undefined) {
    throw new Error(`cannot read ${configPath}`);
  }
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    dirname(configPath)
  );
  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: parsed.options,
  });
}

/**
 * @param {import("typescript").TypeChecker} checker
 * @param {import("typescript").Symbol} symbol
 */
function callableExport(checker, symbol) {
  const resolved =
    symbol.flags & ts.SymbolFlags.Alias
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  if ((resolved.flags & ts.SymbolFlags.Value) === 0) return false;
  const declaration = resolved.valueDeclaration ?? resolved.declarations?.[0];
  if (declaration === undefined) return false;
  const type = checker.getTypeOfSymbolAtLocation(resolved, declaration);
  return checker.getSignaturesOfType(type, ts.SignatureKind.Call).length > 0;
}

/**
 * @param {import("typescript").TypeChecker} checker
 * @param {readonly (import("typescript").SourceFile | undefined)[]} sources
 */
export function callableNames(checker, sources) {
  /** @type {Set<string>} */
  const names = new Set();
  for (const source of sources) {
    if (source?.symbol === undefined) continue;
    for (const symbol of checker.getExportsOfModule(source.symbol)) {
      if (callableExport(checker, symbol)) names.add(symbol.name);
    }
  }
  return names;
}

/**
 * @param {Set<string>} names
 * @param {readonly string[]} expected
 * @param {string} framework
 */
export function factoryProblems(names, expected, framework) {
  return expected
    .filter((name) => !names.has(name))
    .map((name) => `${framework}: feature factory ${name} is missing`);
}

const SURFACES = [
  {
    framework: "react",
    directory: "packages/react/react",
    props: "src/useDataTableShell.tsx",
    propsType: "DataTableShellProps",
    features: "src/features.ts",
    kit: "packages/react/adapter-unstyled",
  },
  {
    framework: "angular",
    directory: "packages/angular/angular",
    props: "src/layout/dataTableShell.ts",
    propsType: "AdaptDataTableShell",
    features: "src/features.ts",
    kit: "packages/angular/adapter-angular-unstyled",
  },
  {
    framework: "vue",
    directory: "packages/vue/vue",
    props: "src/tableAdapterContracts.ts",
    propsType: "DataTableProps",
    features: "src/features.ts",
    kit: "packages/vue/adapter-vue-unstyled",
  },
];

/**
 * @param {object} [options]
 * @param {string} [options.root]
 * @param {readonly { capability: string, framework: string, reason: string, disposition: string }[]} [options.differences]
 * @param {boolean} [options.factories]
 */
export function checkBindingCapabilities({
  root = ROOT,
  differences = [],
  factories = true,
} = {}) {
  const manifest = JSON.parse(
    readFileSync(join(root, "scripts/feature-classification.json"), "utf8")
  );
  const factoryNames = Object.keys(manifest.features);
  /** @type {string[]} */
  const problems = [];
  /** @type {Record<string, { id: string, name: string }[]>} */
  const found = {};
  for (const surface of SURFACES) {
    const directory = join(root, surface.directory);
    const program = programFrom(join(directory, "tsconfig.json"));
    const checker = program.getTypeChecker();
    const props = program.getSourceFile(join(directory, surface.props));
    if (props === undefined) {
      problems.push(`${surface.framework}: missing ${surface.props}`);
      continue;
    }
    const checked = checkCapabilitySurface({
      checker,
      source: props,
      typeName: surface.propsType,
      framework: surface.framework,
      differences,
    });
    problems.push(...checked.problems);
    found[surface.framework] = checked.found;
    if (!factories) continue;
    const kitDir = join(root, surface.kit);
    const kitProgram = programFrom(join(kitDir, "tsconfig.json"));
    const kitChecker = kitProgram.getTypeChecker();
    const sources = [
      program.getSourceFile(join(directory, surface.features)),
      ...kitProgram
        .getSourceFiles()
        .filter(
          (source) =>
            source.fileName.startsWith(kitDir) &&
            !source.fileName.endsWith(".test.ts") &&
            !source.fileName.includes(".test.")
        ),
    ];
    const names = callableNames(checker, sources.slice(0, 1));
    for (const name of callableNames(kitChecker, sources.slice(1))) {
      names.add(name);
    }
    problems.push(...factoryProblems(names, factoryNames, surface.framework));
  }
  const seen = new Set(SURFACES.map((surface) => surface.framework));
  if (seen.size !== 3) problems.push("binding capabilities: a framework was not checked");
  return { problems, found };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { problems, found } = checkBindingCapabilities();
  if (problems.length > 0) {
    console.error(`binding capabilities: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  const counts = Object.entries(found)
    .map(([framework, rows]) => `${framework} ${rows.length}`)
    .join(", ");
  console.log(`binding capabilities: ${counts}`);
}
