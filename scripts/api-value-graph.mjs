import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import ts from "typescript";

import {
  canonicalPath,
  declarationOrigins,
  inside,
  originKey,
} from "./api-declaration-origins.mjs";
import { publishedPropertyNormalizers } from "./api-warnings.mjs";

function add(map, name, item) {
  const entries = map.get(name) ?? [];
  entries.push(item);
  map.set(name, entries);
}

function modifier(node, kind) {
  return node.modifiers?.some((item) => item.kind === kind);
}

function declaration(module, node) {
  const name = node.name?.text;
  if (!name) return undefined;
  const value = {
    module,
    node,
    name,
    id: `${module.file}:${node.getStart()}:${node.end}`,
  };
  add(module.declarations, name, value);
  return value;
}

function recordImport(module, statement) {
  const clause = statement.importClause;
  if (!clause) return;
  const record = (node, imported, typeOnly) => {
    declaration(module, node);
    add(module.locals, node.name.text, {
      module,
      node,
      imported,
      specifier: statement.moduleSpecifier.text,
      typeOnly,
    });
  };
  if (clause.name) record(clause, "default", clause.isTypeOnly);
  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    for (const item of clause.namedBindings.elements)
      record(
        item,
        (item.propertyName ?? item.name).text,
        clause.isTypeOnly || item.isTypeOnly
      );
  }
}

function recordExports(module, statement) {
  if (ts.isExportDeclaration(statement)) {
    if (!statement.exportClause || !ts.isNamedExports(statement.exportClause))
      return;
    for (const item of statement.exportClause.elements)
      add(module.exports, item.name.text, {
        local: (item.propertyName ?? item.name).text,
        node: item,
        specifier: statement.moduleSpecifier?.text,
        typeOnly: statement.isTypeOnly || item.isTypeOnly,
      });
  } else if (
    ts.isExportAssignment(statement) &&
    !statement.isExportEquals &&
    ts.isIdentifier(statement.expression)
  ) {
    add(module.exports, "default", {
      local: statement.expression.text,
      node: statement,
    });
  }
}

function recordDeclarations(module, statement) {
  const nodes = ts.isVariableStatement(statement)
    ? statement.declarationList.declarations
    : [statement];
  for (const node of nodes) {
    const value = declaration(module, node);
    if (!value) continue;
    const runtime =
      ts.isVariableDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isEnumDeclaration(node);
    if (runtime) add(module.locals, value.name, value);
    if (modifier(statement, ts.SyntaxKind.ExportKeyword))
      add(
        module.exports,
        modifier(statement, ts.SyntaxKind.DefaultKeyword)
          ? "default"
          : value.name,
        { local: value.name, typeOnly: !runtime, node }
      );
  }
}

function parsedSource(file, text) {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );
  const program = ts.createProgram({
    rootNames: [file],
    options: {
      noLib: true,
      noResolve: true,
      types: [],
      target: ts.ScriptTarget.Latest,
    },
    // Syntactic diagnostics only. No package, library or referenced source is
    // read by this bounded program; module edges are resolved separately.
    host: {
      getSourceFile: (name) => (name === file ? source : undefined),
      getDefaultLibFileName: () => "",
      writeFile() {
        throw new Error("The syntax-only host never emits files");
      },
      getCurrentDirectory: () => dirname(file),
      getCanonicalFileName: (name) => name,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => "\n",
      fileExists: (name) => name === file,
      readFile: (name) => (name === file ? text : undefined),
    },
  });
  return program.getSyntacticDiagnostics(source).length ? undefined : source;
}

function model(file, text) {
  file = resolve(file);
  const source = parsedSource(file, text);
  if (!source) return undefined;
  const module = {
    file,
    source,
    declarations: new Map(),
    locals: new Map(),
    exports: new Map(),
  };
  for (const statement of source.statements) {
    if (ts.isImportDeclaration(statement)) {
      recordImport(module, statement);
      continue;
    }
    recordExports(module, statement);
    recordDeclarations(module, statement);
  }
  return module;
}

function unique(map, name) {
  const entries = map.get(name);
  return entries?.length === 1 ? entries[0] : undefined;
}

function bindingResolver(load) {
  function exported(module, name, seen = new Set()) {
    const key = `${module.file}:export:${name}`;
    if (seen.has(key)) return undefined;
    const edge = unique(module.exports, name);
    if (!edge || edge.typeOnly) return undefined;
    const next = new Set(seen).add(key);
    const target = edge.specifier ? load(module, edge.specifier) : module;
    if (!target) return undefined;
    const value = edge.specifier
      ? exported(target, edge.local, next)
      : local(module, edge.local, next);
    return value
      ? {
          ...value,
          route: [
            {
              kind: edge.specifier ? "re-export" : "export",
              file: module.file,
              exportedAs: name,
              local: edge.local,
              specifier: edge.specifier,
              start: edge.node?.getStart(),
            },
            ...value.route,
          ],
        }
      : undefined;
  }
  function local(module, name, seen = new Set()) {
    const key = `${module.file}:local:${name}`;
    if (seen.has(key) || !unique(module.declarations, name)) return undefined;
    const edge = unique(module.locals, name);
    if (!edge || edge.typeOnly) return undefined;
    if (!edge.specifier) return { ...edge, route: [] };
    const target = load(module, edge.specifier);
    const value = target
      ? exported(target, edge.imported, new Set(seen).add(key))
      : undefined;
    return value
      ? {
          ...value,
          route: [
            {
              kind: "import",
              file: module.file,
              local: name,
              imported: edge.imported,
              specifier: edge.specifier,
              start: edge.node.getStart(),
            },
            ...value.route,
          ],
        }
      : undefined;
  }
  return { exported, local };
}

/** Imports/re-exports locate a value; only whole-value typeof adds an alias edge. */
function valuePath(value, resolver, seen = new Set()) {
  if (!value || seen.has(value.id)) return undefined;
  const type = value.node.type;
  if (!type || !ts.isTypeQueryNode(type)) return { value, edges: [] };
  if (!ts.isIdentifier(type.exprName) || type.typeArguments?.length)
    return undefined;
  const target = resolver.local(value.module, type.exprName.text);
  const rest = valuePath(target, resolver, new Set(seen).add(value.id));
  return rest
    ? { value, edges: [{ from: value, to: target }, ...rest.edges] }
    : undefined;
}

/**
 * Preserve generic syntax and members while allowing named-reference renames.
 * This is a bounded syntax check, not a proof of TypeScript assignability.
 */
function typeShape(node) {
  if (!node) return null;
  if (ts.isTypeReferenceNode(node) || ts.isImportTypeNode(node))
    return [
      ts.isImportTypeNode(node) && node.isTypeOf ? "query" : "reference",
      node.typeArguments?.map(typeShape) ?? [],
    ];
  if (ts.isTypeQueryNode(node))
    return ["query", node.typeArguments?.map(typeShape) ?? []];
  const children = [];
  ts.forEachChild(node, (child) => {
    children.push(typeShape(child));
  });
  return [
    node.kind,
    node.operator,
    typeof node.text === "string" ? node.text : undefined,
    children,
  ];
}

function valueShape({ node }) {
  return [
    node.kind,
    typeShape(node.type),
    node.typeParameters?.map(typeShape),
    node.parameters?.map(typeShape),
    node.heritageClauses?.map(typeShape),
    node.members?.map(typeShape),
  ];
}

function sameValueShape(source, report) {
  return (
    JSON.stringify(valueShape(source)) === JSON.stringify(valueShape(report))
  );
}

/** Match all helper use positions, with the same named-reference normalization as typeShape. */
function referencePositions(type, name) {
  const positions = [];
  function visit(node, path) {
    if (
      ts.isTypeReferenceNode(node) &&
      ts.isIdentifier(node.typeName) &&
      node.typeName.text === name
    )
      positions.push(path);
    let children;
    if (
      ts.isTypeReferenceNode(node) ||
      ts.isImportTypeNode(node) ||
      ts.isTypeQueryNode(node)
    ) {
      children = node.typeArguments ?? [];
    } else {
      children = [];
      ts.forEachChild(node, (child) => {
        children.push(child);
      });
    }
    children.forEach((child, index) => visit(child, `${path}/${index}`));
  }
  if (type) visit(type, "type");
  return JSON.stringify(positions);
}

function normalizers(value, exportedAs) {
  const found = publishedPropertyNormalizers(
    value.module.source.text,
    new Map([[value.name, exportedAs]])
  );
  return [...found].flatMap(([name, evidence]) => {
    const helper = unique(value.module.declarations, name);
    return helper
      ? [
          {
            ...evidence,
            helper,
            value,
            positions: referencePositions(value.node.type, name),
          },
        ]
      : [];
  });
}

function normalizerOrigins(candidate, origin) {
  const found = new Set();
  const visit = (node) => {
    if (
      ts.isTypeReferenceNode(node) &&
      ts.isIdentifier(node.typeName) &&
      node.typeName.text === candidate.helper.name
    ) {
      for (
        let parent = node;
        parent && parent !== candidate.value.node.parent;
        parent = parent.parent
      ) {
        if (
          ts.isVariableDeclaration(parent) ||
          ts.isParameter(parent) ||
          ts.isPropertySignature(parent) ||
          ts.isTypeParameterDeclaration(parent)
        ) {
          const position = origin(parent);
          if (position) found.add(originKey(position));
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  if (candidate.value.node.type) visit(candidate.value.node.type);
  return found;
}

function reportModel(text) {
  const code = /```(?:ts|typescript)\r?\n([\s\S]*?)\r?\n```/.exec(text)?.[1];
  return code ? model("report.d.ts", code) : undefined;
}

function warningOrigin(message) {
  const file = message.sourceFilePath && canonicalPath(message.sourceFilePath);
  return file && message.sourceFileLine && message.sourceFileColumn
    ? originKey({
        file,
        line: message.sourceFileLine,
        column: message.sourceFileColumn,
      })
    : undefined;
}

function reportEvidence(paths, text) {
  const report = reportModel(text);
  if (!report) return [];
  const resolver = bindingResolver(() => undefined);
  const evidence = [];
  for (const path of paths) {
    const reported = valuePath(
      resolver.exported(report, path.exportedAs),
      resolver
    );
    if (!reported || reported.edges.length !== path.edges.length) continue;
    if (
      !path.edges.every((edge, index) =>
        sameValueShape(edge.to, reported.edges[index].to)
      )
    )
      continue;
    for (const [index, edge] of path.edges.entries()) {
      const target = reported.edges[index].to;
      evidence.push({
        kind: "published-value-alias",
        symbol: target.name,
        exportedAs: path.exportedAs,
        identity: edge.to.id,
        origins: edge.origins,
      });
      for (const reportHelper of normalizers(target, path.exportedAs)) {
        const sourceHelpers = edge.normalizers.filter(
          (item) => item.positions === reportHelper.positions
        );
        if (sourceHelpers.length !== 1) continue;
        const sourceHelper = sourceHelpers[0];
        evidence.push({
          kind: "published-property-normalizer",
          symbol: reportHelper.helper.name,
          exportedAs: path.exportedAs,
          referencedBy: target.name,
          identity: sourceHelper.helper.id,
          origins: sourceHelper.origins,
        });
      }
    }
  }
  return evidence;
}

/**
 * Bounded module graph over emitted local declarations. Named runtime imports,
 * named re-exports and exact typeof edges are the only traversed edges. A type
 * reference in a parameter, result or member is never a runtime alias edge.
 */
export function entryValueGraph(entry, projectFolder = dirname(entry)) {
  const root = canonicalPath(projectFolder);
  const modules = new Map();
  function read(file) {
    const path = canonicalPath(file);
    if (
      !root ||
      !path ||
      !inside(root, path) ||
      !/\.d\.(?:ts|mts|cts)$/.test(path)
    )
      return undefined;
    if (!modules.has(path)) {
      try {
        modules.set(path, model(path, readFileSync(path, "utf8")));
      } catch {
        modules.set(path, undefined);
      }
    }
    return modules.get(path);
  }
  const resolver = bindingResolver((from, specifier) => {
    if (!specifier.startsWith("./") && !specifier.startsWith("../"))
      return undefined;
    const resolved = ts.resolveModuleName(
      specifier,
      from.file,
      {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
      },
      ts.sys
    ).resolvedModule;
    return resolved ? read(resolved.resolvedFileName) : undefined;
  });
  const entryModule = read(entry);
  const origin = declarationOrigins(root ?? projectFolder);
  const paths = [];
  for (const exportedAs of entryModule?.exports.keys() ?? []) {
    const path = valuePath(
      resolver.exported(entryModule, exportedAs),
      resolver
    );
    if (!path?.edges.length) continue;
    for (const edge of path.edges) {
      const position = origin(edge.from.node);
      edge.origins = new Set(position ? [originKey(position)] : []);
      edge.normalizers = normalizers(edge.to, exportedAs).map((helper) => ({
        ...helper,
        origins: normalizerOrigins(helper, origin),
      }));
    }
    paths.push({ ...path, exportedAs });
  }
  return {
    size: new Set(paths.flatMap((path) => path.edges.map((edge) => edge.to.id)))
      .size,
    paths,
    forReport(text) {
      const evidence = reportEvidence(paths, text);
      return (
        message,
        symbol = /"([A-Za-z_$][\w$]*)"/.exec(message.text)?.[1]
      ) => {
        const position = warningOrigin(message);
        if (!position) return undefined;
        const matches = evidence.filter(
          (item) => item.symbol === symbol && item.origins.has(position)
        );
        const identities = new Set(
          matches.map((item) => `${item.kind}:${item.identity}`)
        );
        return identities.size === 1 ? matches[0] : undefined;
      };
    },
  };
}
