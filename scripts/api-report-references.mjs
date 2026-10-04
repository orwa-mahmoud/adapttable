import ts from "typescript";

const GENERATED = /^(?<base>[A-Za-z_$][\w$]*?)(?:[$_]\d+)$/;
const REPORT_FILE = "/__adapttable_api_report__.d.ts";

function reportSource(text) {
  const code = /```(?:ts|typescript)\r?\n([\s\S]*?)\r?\n```/.exec(text)?.[1];
  if (!code) return undefined;
  const source = ts.createSourceFile(
    REPORT_FILE,
    code,
    ts.ScriptTarget.Latest,
    true
  );
  return source.parseDiagnostics.length ? undefined : source;
}

/** Bind only this report: imports are boundaries, never filesystem lookups. */
function reportChecker(source) {
  const options = { noLib: true, noResolve: true, types: [] };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (name) => (name === REPORT_FILE ? source : undefined);
  return ts.createProgram([REPORT_FILE], options, host).getTypeChecker();
}

/** The root name and namespace in which a reference must resolve. */
function reference(node) {
  let name;
  let meaning = ts.SymbolFlags.Type;
  if (ts.isTypeReferenceNode(node)) name = node.typeName;
  if (ts.isTypeQueryNode(node)) {
    name = node.exprName;
    meaning = ts.SymbolFlags.Value;
  }
  if (ts.isExpressionWithTypeArguments(node)) {
    name = node.expression;
    if (
      node.parent.token === ts.SyntaxKind.ExtendsKeyword &&
      ts.isClassDeclaration(node.parent.parent)
    )
      meaning = ts.SymbolFlags.Value;
  }
  return entityReference(name, meaning);
}

function entityReference(entity, meaning) {
  let name = entity;
  while (
    name &&
    (ts.isQualifiedName(name) || ts.isPropertyAccessExpression(name))
  ) {
    name = ts.isQualifiedName(name) ? name.left : name.expression;
    if (meaning === ts.SymbolFlags.Type) meaning = ts.SymbolFlags.Namespace;
  }
  return name && ts.isIdentifier(name) ? { name, entity, meaning } : undefined;
}

function aliasTarget(node) {
  if (!(ts.isTypeAliasDeclaration(node) || ts.isVariableDeclaration(node)))
    return undefined;
  let type = node.type;
  while (type && ts.isParenthesizedTypeNode(type)) type = type.type;
  return type && (ts.isTypeReferenceNode(type) || ts.isTypeQueryNode(type))
    ? reference(type)
    : undefined;
}

let languageGlobals;
function standardGlobals() {
  if (languageGlobals) return languageGlobals;
  const fileName = "/__adapttable_report_globals__.ts";
  const options = {
    target: ts.ScriptTarget.ES2022,
    lib: ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, ...rest) =>
    name === fileName
      ? ts.createSourceFile(name, "export {};", languageVersion, true)
      : getSourceFile(name, languageVersion, ...rest);
  const program = ts.createProgram([fileName], options, host);
  languageGlobals = new Map(
    program
      .getTypeChecker()
      .getSymbolsInScope(
        program.getSourceFile(fileName),
        ts.SymbolFlags.Type | ts.SymbolFlags.Value | ts.SymbolFlags.Namespace
      )
      .map((symbol) => [symbol.name, symbol.flags])
  );
  return languageGlobals;
}

function localImportTarget(symbol, meaning) {
  const declaration = symbol.declarations?.find(
    (candidate) =>
      ts.isImportEqualsDeclaration(candidate) &&
      !ts.isExternalModuleReference(candidate.moduleReference)
  );
  return declaration
    ? entityReference(declaration.moduleReference, meaning)
    : undefined;
}

function unresolved(target, checker, seen = new Set()) {
  const { name, meaning } = target;
  // TypeScript's binder handles generic, mapped, infer and parameter scopes.
  // Type parameters cannot stand in for a value referenced through `typeof`.
  let symbol = checker.resolveName(name.text, name, meaning, false);
  if (!symbol) {
    return standardGlobals().get(name.text) & meaning
      ? undefined
      : { symbol: name.text, reason: "missing import or declaration" };
  }
  if (!(symbol.flags & ts.SymbolFlags.Alias) && target.entity !== name) {
    symbol = checker.getSymbolAtLocation(target.entity);
    if (!symbol?.declarations?.length)
      return {
        symbol: target.entity.getText(),
        reason: "missing import or declaration",
      };
  }
  if (seen.has(symbol)) return { symbol: name.text, reason: "alias cycle" };
  const next = new Set(seen).add(symbol);
  // Imported bindings are present in the report. Resolving the external
  // module's members or validating assignability belongs to TypeScript.
  if (symbol.flags & ts.SymbolFlags.Alias) {
    const localAlias = localImportTarget(symbol, meaning);
    return localAlias ? unresolved(localAlias, checker, next) : undefined;
  }
  return unresolvedDeclarations(symbol.declarations ?? [], checker, next);
}

function unresolvedDeclarations(declarations, checker, seen) {
  for (const declaration of declarations) {
    const alias = aliasTarget(declaration);
    if (alias) {
      const problem = unresolved(alias, checker, seen);
      if (problem) return problem;
    }
  }
  return undefined;
}

/**
 * Check presence and exact alias chains for generated-name references whose
 * source warnings were deferred as published copies. Extractor can rename `$1`
 * to `_2`; a differently suffixed declaration never proves the referenced name.
 *
 * This bounded check is not a full typecheck: imports and structural definitions
 * end alias traversal, and ordinary extraction findings remain separate. It does
 * not prove external module resolution, generic arity or signature assignability.
 */
export function missingDeferredReportTargets(text, publishedBases) {
  if (publishedBases.size === 0) return [];
  const source = reportSource(text);
  if (!source)
    return [{ symbol: "API report", reason: "missing or invalid TypeScript" }];
  const checker = reportChecker(source);
  const problems = new Map();
  const visit = (node) => {
    const target = reference(node);
    const base = target && GENERATED.exec(target.name.text)?.groups.base;
    if (base && publishedBases.has(base)) {
      const problem = unresolved(target, checker);
      if (problem) problems.set(`${problem.symbol}:${problem.reason}`, problem);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return [...problems.values()];
}
