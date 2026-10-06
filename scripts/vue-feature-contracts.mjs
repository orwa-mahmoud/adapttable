/** Canonical ownership proof for Vue feature and adapter entries. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";

export const VIEW_CONTROL_VALUES = [
  "DENSITY_CONTROL",
  "DensityChooserChrome",
  "FULLSCREEN_CONTROL",
  "FULLSCREEN_MODEL",
  "FullscreenButtonChrome",
  "SAVED_VIEWS_CONTROL",
  "SAVED_VIEWS_MODEL",
];
export const FOCUSED_FACTORIES = {
  density: "densityChooser",
  fullscreen: "fullscreen",
};

function unalias(checker, symbol) {
  const seen = new Set();
  while (symbol?.flags & ts.SymbolFlags.Alias) {
    if (seen.has(symbol)) return undefined;
    seen.add(symbol);
    symbol = checker.getAliasedSymbol(symbol);
  }
  return symbol?.declarations?.length ? symbol : undefined;
}

/**
 * A reference must actually import the named contract from its public owner.
 * Structural compatibility, a private sibling, or a renamed other export
 * cannot prove ownership. TypeScript's resolver supplies the target identity.
 */
export function canonicalImportError(checker, reference, owner, name) {
  if (!reference || !ts.isIdentifier(reference))
    return "missing named reference";
  const local = checker.getSymbolAtLocation(reference);
  const declaration = local?.declarations?.find(ts.isImportSpecifier);
  const statement = declaration?.parent.parent.parent;
  if (
    !statement ||
    !ts.isImportDeclaration(statement) ||
    statement.moduleSpecifier.text !== owner ||
    (declaration.propertyName ?? declaration.name).text !== name
  )
    return `${name} must be imported from ${owner}`;
  const module = checker.getSymbolAtLocation(statement.moduleSpecifier);
  const expected =
    module &&
    checker.getExportsOfModule(module).find((symbol) => symbol.name === name);
  const target = unalias(checker, local);
  if (!target || target !== unalias(checker, expected))
    return `${owner} does not publish the exact ${name} declaration`;
  return undefined;
}

function importedModules(checker, consumer) {
  const modules = new Map();
  for (const statement of consumer.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    const symbol = checker.getSymbolAtLocation(statement.moduleSpecifier);
    if (!symbol) continue;
    modules.set(
      statement.moduleSpecifier.text,
      new Map(
        checker
          .getExportsOfModule(symbol)
          .map((item) => [item.name, unalias(checker, item)])
      )
    );
  }
  return modules;
}

/** Follow the factory declaration, including shared emitted chunks. */
export function canonicalFactoryErrors(
  program,
  consumer,
  {
    route,
    owner,
    factory,
    contractOwner = owner,
    contract = "StaticTableFeature",
  }
) {
  const checker = program.getTypeChecker();
  const modules = importedModules(checker, consumer);
  const publicFactory = modules.get(route)?.get(factory);
  const canonicalFactory = modules.get(owner)?.get(factory);
  const canonicalType = modules.get(contractOwner)?.get(contract);
  const errors = [];
  if (!publicFactory || !canonicalFactory || publicFactory !== canonicalFactory)
    errors.push(`${route}: ${factory} lost canonical declaration identity`);
  const declaration = publicFactory?.declarations?.find(
    ts.isFunctionDeclaration
  );
  if (!declaration?.type || !ts.isTypeReferenceNode(declaration.type))
    return [
      ...errors,
      `${route}: ${factory} must retain its named function result`,
    ];
  const problem = canonicalImportError(
    checker,
    declaration.type.typeName,
    contractOwner,
    contract
  );
  if (problem) errors.push(`${route}: ${problem}`);
  const signature = checker.getSignatureFromDeclaration(declaration);
  const result = signature && checker.getReturnTypeOfSignature(signature);
  if (!canonicalType || result?.getSymbol() !== canonicalType)
    errors.push(`${route}: factory result is not the canonical ${contract}`);
  return errors;
}

function unparenthesized(type) {
  while (type && ts.isParenthesizedTypeNode(type)) type = type.type;
  return type;
}

function intersectionParts(type) {
  type = unparenthesized(type);
  return type && ts.isIntersectionTypeNode(type) ? type.types : [type];
}

/** Match the actual parameter position, not an unrelated reference in its file. */
function parameterReference(type) {
  const parts = intersectionParts(type);
  const references = parts.filter(
    (part) => part && ts.isTypeReferenceNode(part)
  );
  const fields = parts.filter((part) => part && ts.isTypeLiteralNode(part));
  return parts.length === 2 && references.length === 1 && fields.length === 1
    ? references[0]
    : undefined;
}

function propertyType(type, name) {
  const members = intersectionParts(type)
    .filter((part) => part && ts.isTypeLiteralNode(part))
    .flatMap((part) => part.members)
    .filter(
      (member) => ts.isPropertySignature(member) && member.name?.text === name
    );
  return members.length === 1 ? unparenthesized(members[0].type) : undefined;
}

function chromeParameter(symbol) {
  const declaration = symbol?.declarations?.find(ts.isFunctionDeclaration);
  return declaration?.parameters.length === 1
    ? declaration.parameters[0].type
    : undefined;
}

function slotProps(symbol) {
  const declaration = symbol?.declarations?.find(ts.isVariableDeclaration);
  const type = unparenthesized(declaration?.type);
  return type &&
    (ts.isTypeReferenceNode(type) || ts.isImportTypeNode(type)) &&
    type.typeArguments?.length === 1
    ? unparenthesized(type.typeArguments[0])
    : undefined;
}

/**
 * Check the emitted Chrome props and nested slot callback independently of
 * value identity: a same-shaped private type must not replace an owner import.
 */
export function canonicalChromeErrors(
  program,
  consumer,
  { route, owner = "@adapttable/vue/adapter" }
) {
  const checker = program.getTypeChecker();
  const modules = importedModules(checker, consumer);
  const routeExports = modules.get(route);
  const density = chromeParameter(routeExports?.get("DensityChooserChrome"));
  const fullscreen = chromeParameter(
    routeExports?.get("FullscreenButtonChrome")
  );
  const button = propertyType(propertyType(fullscreen, "slots"), "Button");
  const buttonProps =
    button && ts.isFunctionTypeNode(button) && button.parameters.length === 1
      ? unparenthesized(button.parameters[0].type)
      : undefined;
  const references = [
    [
      "DensityControlProps",
      parameterReference(density),
      "DensityChooserChrome props",
    ],
    [
      "FullscreenControlProps",
      parameterReference(fullscreen),
      "FullscreenButtonChrome props",
    ],
    [
      "DensityChooserSlots",
      propertyType(density, "slots"),
      "DensityChooserChrome slots",
    ],
    [
      "ViewControlButtonProps",
      buttonProps,
      "FullscreenButtonChrome Button callback",
    ],
    [
      "DensityControlProps",
      slotProps(routeExports?.get("DENSITY_CONTROL")),
      "DENSITY_CONTROL slot",
    ],
    [
      "FullscreenControlProps",
      slotProps(routeExports?.get("FULLSCREEN_CONTROL")),
      "FULLSCREEN_CONTROL slot",
    ],
  ];
  const errors = [];
  for (const [name, reference, position] of references) {
    const label = `${route} ${position}`;
    if (!reference || !ts.isTypeReferenceNode(reference)) {
      errors.push(`${label}: ${name} must retain its named parameter contract`);
      continue;
    }
    const problem = canonicalImportError(
      checker,
      reference.typeName,
      owner,
      name
    );
    if (problem) errors.push(`${label}: ${problem}`);
    const expected = modules.get(owner)?.get(name);
    if (
      !expected ||
      checker.getTypeFromTypeNode(reference).getSymbol() !== expected
    )
      errors.push(`${label}: parameter is not the canonical ${name}`);
  }
  return errors;
}

/** Strict consumers use only copied package exports; no source path aliases. */
export function checkBuiltFeatureOwnership(cell) {
  for (const extension of ["ts", "cts"]) {
    const file = join(cell, `feature-ownership.${extension}`);
    writeFileSync(
      file,
      [
        'import type { FeatureMountContext, StaticTableFeature, TableSource, UseDataTableResult } from "@adapttable/vue";',
        'import * as features from "@adapttable/vue/features";',
        'import * as adapter from "@adapttable/vue/adapter";',
        'import * as nativeDensity from "@adapttable/vue-unstyled/density";',
        'import * as nativeFullscreen from "@adapttable/vue-unstyled/fullscreen";',
        "type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;",
        "type Assert<T extends true> = T;",
        "const densityResult: Assert<Equal<ReturnType<typeof features.densityChooser>, StaticTableFeature>> = true;",
        "const fullscreenResult: Assert<Equal<ReturnType<typeof features.fullscreen>, StaticTableFeature>> = true;",
        "function verifyMembers<TRow>(context: FeatureMountContext<TRow>): void {",
        "  const table: UseDataTableResult<TRow> = context.table;",
        "  const source: TableSource<TRow> = context.source.value;",
        "  const result: number = context.flush(() => 42);",
        "  void [table, source, result];",
        "}",
        "void [densityResult, fullscreenResult, verifyMembers];",
        "const nativeDensityResult: Assert<Equal<ReturnType<typeof nativeDensity.densityChooser>, StaticTableFeature>> = true;",
        "const nativeFullscreenResult: Assert<Equal<ReturnType<typeof nativeFullscreen.fullscreen>, StaticTableFeature>> = true;",
        "void [features, adapter, nativeDensityResult, nativeFullscreenResult];",
      ].join("\n")
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
        .map((diagnostic) =>
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
        ),
      [],
      `${extension}: canonical feature declarations must compile strictly`
    );
    const consumer = program.getSourceFile(file);
    assert.ok(consumer);
    for (const [entry, factory] of Object.entries(FOCUSED_FACTORIES)) {
      for (const route of [
        "@adapttable/vue/features",
        `@adapttable/vue-unstyled/${entry}`,
      ]) {
        assert.deepEqual(
          canonicalFactoryErrors(program, consumer, {
            route,
            owner: route,
            contractOwner: "@adapttable/vue",
            factory,
          }),
          []
        );
      }
    }
    assert.deepEqual(
      canonicalChromeErrors(program, consumer, {
        route: "@adapttable/vue/adapter",
      }),
      []
    );
  }
}
