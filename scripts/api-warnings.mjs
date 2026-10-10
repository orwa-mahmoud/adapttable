/**
 * What a forgotten-export warning IS, decided on evidence rather than shape.
 *
 * `ae-forgotten-export` says a public signature named a type the entry point
 * does not export. Most of those are real. Some are artifacts of the
 * declaration bundler, and each has to prove itself — a rule that defers
 * anything ending in `$1` defers real findings too, because the bundler uses
 * the same suffix for a name it invented and for a name it merely renamed.
 *
 * The structurally proved classes:
 *
 * **published** — a suffixed copy of a name the SAME entry point exports
 *    under its own spelling. `print_2` is not a leaked API when consumers
 *    import `print`: the type is nameable from that route, and the copy is
 *    private to the bundle. The proof is read out of the emitted declaration
 *    for that entry, never from a list — so it stops applying by itself the
 *    day the duplication does.
 *
 * **published-value-alias** — a local runtime declaration reached through
 * an exact `typeof` chain from an exported runtime value. Its complete type is
 * already nameable as `typeof PublicName`. This proof never traverses parameter,
 * result or member types. Reports retain the underlying declaration so a change
 * to its generic signature cannot disappear behind the alias.
 *
 * **published-property-normalizer** — the exact closed generic property map
 *    emitted beside a proved public value alias. It may only copy its argument's
 *    keys and indexed values without modifiers or domain fields. Its definition
 *    stays in the report. This is not a general compiler-helper exemption.
 *
 * Everything else is a finding, including a suffixed symbol whose base name
 * nothing exports.
 */
import { readFileSync } from "node:fs";

import ts from "typescript";

import { exportedNames } from "./packed-names.mjs";

/**
 * The exact places a public type is derived from a runtime value.
 *
 * `FilterType` is `(typeof FILTER_TYPES)[number]`, and `FormulaErrorCode` is
 * the same shape over `FORMULA_ERRORS`. Naming the type from a subpath means
 * re-exporting the const, and a value re-export ships bytes: measured
 * 2026-08-29, adding these to the entry barrels cost 0.1–0.2 KB gzipped on
 * every one of the eight adapters, took `unstyled` from 0.2 KB of headroom to
 * 0.0, and moved `core/pivot` from 1.5 KB to 1.6 — a published figure. The
 * entries whose whole promise is that they are small do not pay that for a
 * name a consumer can already reach from `@adapttable/core`.
 *
 * Frozen, and exact: report and symbol both. Anything not on this list is a
 * finding, including a different symbol on one of these same reports.
 */
export const VALUE_BACKED = [
  ["core-formula.api.md", "FILTER_TYPES"],
  ["core-pdf.api.md", "FILTER_TYPES"],
  ["core-pivot.api.md", "FILTER_TYPES"],
  ["core-query.api.md", "FORMULA_ERRORS"],
  ["core-xlsx.api.md", "FILTER_TYPES"],
];

const VALUE_BACKED_KEYS = new Set(
  VALUE_BACKED.map(([r, s]) => `${r}\u0000${s}`)
);

/** The suffix shapes the declaration bundler assigns to a duplicate. */
const GENERATED = /^(?<base>[A-Za-z_$][\w$]*?)(?<suffix>[$_]\d+)$/;

/**
 * Read an entry point's emitted declaration once, for the `published` test.
 *
 * Returns an empty set when the file cannot be read: a missing declaration is
 * a reason to report the warning, never a reason to defer it.
 */
export function entryExports(entryDtsPath) {
  try {
    return exportedNames(readFileSync(entryDtsPath, "utf8"));
  } catch {
    return new Set();
  }
}

/** Runtime declarations only; an interface or a type alias cannot prove a value. */
function declaredValues(statement) {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations
      .filter((declaration) => ts.isIdentifier(declaration.name))
      .map((declaration) => ({
        name: declaration.name.text,
        type: declaration.type,
      }));
  }
  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name
  ) {
    return [{ name: statement.name.text, type: undefined }];
  }
  return [];
}

/** Local runtime exports, including `export { local as Public }`. */
function exportedValues(statement) {
  if (ts.isExportDeclaration(statement)) {
    if (
      statement.moduleSpecifier ||
      statement.isTypeOnly ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      return [];
    }
    return statement.exportClause.elements
      .filter((element) => !element.isTypeOnly)
      .map((element) => [
        (element.propertyName ?? element.name).text,
        element.name.text,
      ]);
  }
  if (
    ts.isExportAssignment(statement) &&
    !statement.isExportEquals &&
    ts.isIdentifier(statement.expression)
  ) {
    return [[statement.expression.text, "default"]];
  }
  const exported = statement.modifiers?.some(
    (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
  );
  return exported
    ? declaredValues(statement).map(({ name }) => [name, name])
    : [];
}

/** Follow only whole-value typeof edges, and discard incomplete or cyclic paths. */
function exactValueChain(values, root) {
  const reached = [];
  const seen = new Set([root]);
  let current = root;
  while (values.has(current)) {
    const { type } = values.get(current);
    if (!type || !ts.isTypeQueryNode(type)) return reached;
    if (!ts.isIdentifier(type.exprName) || type.typeArguments?.length)
      return [];
    current = type.exprName.text;
    if (seen.has(current) || !values.has(current)) return [];
    seen.add(current);
    reached.push(current);
  }
  return [];
}

/**
 * Prove the names reachable through exported local runtime-value aliases.
 * The returned map gives each reached value's actual public export name.
 * No identifier spelling or compiler-specific prefix participates in the proof.
 */
export function publishedValueAliases(sourceText) {
  const source = ts.createSourceFile(
    "entry.d.ts",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  if (source.parseDiagnostics.length) return new Map();
  const values = new Map();
  const exported = [];
  for (const statement of source.statements) {
    for (const declaration of declaredValues(statement)) {
      values.set(declaration.name, declaration);
    }
    exported.push(...exportedValues(statement));
  }
  const aliases = new Map();
  for (const [local, publicName] of exported) {
    for (const target of exactValueChain(values, local)) {
      if (!aliases.has(target)) aliases.set(target, publicName);
    }
  }
  return aliases;
}

/** Missing or unreadable declarations cannot justify a forgotten-export deferral. */
export function entryValueAliases(entryDtsPath) {
  try {
    return publishedValueAliases(readFileSync(entryDtsPath, "utf8"));
  } catch {
    return new Map();
  }
}

/** Parentheses cannot add fields or dependencies. */
function unparenthesized(type) {
  while (type && ts.isParenthesizedTypeNode(type)) type = type.type;
  return type;
}

/** A reference to exactly one locally bound type parameter, without arguments. */
function parameterReference(type, name) {
  type = unparenthesized(type);
  return Boolean(
    type &&
    ts.isTypeReferenceNode(type) &&
    ts.isIdentifier(type.typeName) &&
    type.typeName.text === name &&
    !type.typeArguments?.length
  );
}

/** Exact key-preserving map: no named fields, modifiers, filtering or free names. */
function ownPropertyMap(type, parameter, remapped) {
  type = unparenthesized(type);
  if (
    !type ||
    !ts.isMappedTypeNode(type) ||
    type.readonlyToken ||
    type.questionToken ||
    type.members?.length
  )
    return false;
  const key = type.typeParameter;
  if (key.name.text === parameter || key.default || key.modifiers?.length)
    return false;
  const constraint = unparenthesized(key.constraint);
  if (
    !constraint ||
    !ts.isTypeOperatorNode(constraint) ||
    constraint.operator !== ts.SyntaxKind.KeyOfKeyword ||
    !parameterReference(constraint.type, parameter)
  )
    return false;
  if (
    remapped
      ? !parameterReference(type.nameType, key.name.text)
      : type.nameType !== undefined
  )
    return false;
  const value = unparenthesized(type.type);
  return Boolean(
    value &&
    ts.isIndexedAccessTypeNode(value) &&
    parameterReference(value.objectType, parameter) &&
    parameterReference(value.indexType, key.name.text)
  );
}

/**
 * Prove only the emitted distributive property normalizer's complete AST.
 * No compiler name is special. Every identifier is bound by this declaration;
 * every property comes from its argument unchanged. A callable object, primitive
 * or nullable argument is not claimed to be identical to its normalization.
 */
export function isClosedPropertyNormalizer(statement) {
  if (
    !ts.isTypeAliasDeclaration(statement) ||
    statement.typeParameters?.length !== 1
  )
    return false;
  const parameter = statement.typeParameters[0];
  if (parameter.constraint || parameter.default || parameter.modifiers?.length)
    return false;
  const type = unparenthesized(statement.type);
  if (!ts.isIntersectionTypeNode(type) || type.types.length !== 2) return false;
  const empty = unparenthesized(type.types[1]);
  if (!ts.isTypeLiteralNode(empty) || empty.members.length !== 0) return false;
  const conditional = unparenthesized(type.types[0]);
  return (
    ts.isConditionalTypeNode(conditional) &&
    parameterReference(conditional.checkType, parameter.name.text) &&
    unparenthesized(conditional.extendsType).kind ===
      ts.SyntaxKind.AnyKeyword &&
    ownPropertyMap(conditional.trueType, parameter.name.text, false) &&
    ownPropertyMap(conditional.falseType, parameter.name.text, true)
  );
}

/**
 * Closed property normalizers directly referenced by a proved public value alias.
 * A helper beside an unrelated export is not evidence. Only these exact roots
 * receive includeForgottenExports, so the helper and its full use stay reviewed.
 * The optional aliases map supplies values already proved through local module edges.
 */
export function publishedPropertyNormalizers(
  sourceText,
  aliases = publishedValueAliases(sourceText)
) {
  if (aliases.size === 0) return new Map();
  const source = ts.createSourceFile(
    "entry.d.ts",
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  if (source.parseDiagnostics.length) return new Map();
  const declarations = new Map();
  for (const statement of source.statements) {
    if (
      !(
        ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isEnumDeclaration(statement)
      ) ||
      !statement.name
    )
      continue;
    const list = declarations.get(statement.name.text) ?? [];
    list.push(statement);
    declarations.set(statement.name.text, list);
  }
  const helpers = new Map(
    [...declarations].filter(
      ([, list]) => list.length === 1 && isClosedPropertyNormalizer(list[0])
    )
  );
  const found = new Map();
  for (const statement of source.statements) {
    for (const value of declaredValues(statement)) {
      const exportedAs = aliases.get(value.name);
      if (!exportedAs || !value.type) continue;
      const shadowed = new Set();
      const bindings = (node) => {
        if (ts.isTypeParameterDeclaration(node)) shadowed.add(node.name.text);
        ts.forEachChild(node, bindings);
      };
      bindings(value.type);
      const visit = (node) => {
        if (
          ts.isTypeReferenceNode(node) &&
          ts.isIdentifier(node.typeName) &&
          node.typeArguments?.length === 1 &&
          helpers.has(node.typeName.text) &&
          !shadowed.has(node.typeName.text)
        ) {
          found.set(node.typeName.text, {
            exportedAs,
            referencedBy: value.name,
          });
        }
        ts.forEachChild(node, visit);
      };
      visit(value.type);
    }
  }
  return found;
}

/** Missing declarations never prove a closed helper. */
export function entryPropertyNormalizers(entryDtsPath) {
  try {
    return publishedPropertyNormalizers(readFileSync(entryDtsPath, "utf8"));
  } catch {
    return new Map();
  }
}

/**
 * Classify one `ae-forgotten-export`.
 *
 * Returns `{ kind, base, suffix }` where `kind` is `"published"`,
 * `"published-value-alias"`, `"published-property-normalizer"`, `"value-backed"`,
 * `"front-door"` or `"subpath"`.
 * The proved classes carry the evidence that made them so; the last two are findings, split
 * by whether the entry point is one an application imports.
 */
export function classifyForgottenExport({
  symbol,
  report,
  isMainEntry,
  exports: entryExported,
  valueAliases = new Map(),
  propertyNormalizers = new Map(),
}) {
  const match = GENERATED.exec(symbol);
  const base = match?.groups.base ?? symbol;
  const suffix = match?.groups.suffix ?? "";

  if (suffix && entryExported.has(base)) {
    return { kind: "published", base, suffix };
  }
  if (valueAliases.has(symbol)) {
    return {
      kind: "published-value-alias",
      base,
      suffix,
      exportedAs: valueAliases.get(symbol),
    };
  }
  if (propertyNormalizers.has(symbol)) {
    return {
      kind: "published-property-normalizer",
      base,
      suffix,
      ...propertyNormalizers.get(symbol),
    };
  }
  if (VALUE_BACKED_KEYS.has(`${report}\u0000${symbol}`)) {
    return { kind: "value-backed", base, suffix };
  }
  return { kind: isMainEntry ? "front-door" : "subpath", base, suffix };
}

/**
 * The closing summary, as one line per class that occurred.
 *
 * Every class this run met is named with its count — a run that says nothing
 * about a class it silenced is a run that reports zero warnings while holding
 * some.
 */
export function summarize(counts) {
  const said = [];
  if (counts.published) said.push(`${counts.published} published-name copy(s)`);
  if (counts.publishedValueAlias)
    said.push(`${counts.publishedValueAlias} published-value-alias(es)`);
  if (counts.publishedPropertyNormalizer)
    said.push(
      `${counts.publishedPropertyNormalizer} published property normalizer(s)`
    );
  if (counts.valueBacked)
    said.push(`${counts.valueBacked} value-backed type(s)`);
  if (counts.subpath) said.push(`${counts.subpath} on a subpath entry`);
  if (counts.frontDoor) said.push(`${counts.frontDoor} at a front door`);
  if (counts.unresolvedLink)
    said.push(`${counts.unresolvedLink} unresolved @link(s)`);
  if (counts.missingReleaseTag)
    said.push(`${counts.missingReleaseTag} missing release tag(s)`);
  if (counts.other) said.push(`${counts.other} other warning(s)`);
  return said.length === 0
    ? "api-reports: no warnings of any class."
    : `api-reports: ${said.join(", ")}.`;
}
