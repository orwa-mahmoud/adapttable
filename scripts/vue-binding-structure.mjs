/** Follow the binding components a Vue kit actually renders and the APIs it calls. */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import ts from "typescript";
import { parseForESLint } from "vue-eslint-parser";

import { bindingDir, packageNameAt } from "./kits.mjs";
import { createAttributeFlow } from "./vue-attribute-flow.mjs";

const printer = ts.createPrinter({ removeComments: true });

/** Read SFC block boundaries and rendered elements from Vue's markup AST. */
function scriptSource(file) {
  const text = readFileSync(file, "utf8");
  if (!file.endsWith(".vue"))
    return {
      source: ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true),
      template: undefined,
    };
  // TypeScript is parsed below. Skipping the script parser here keeps valid TS
  // and generic SFC macros intact while Vue owns all markup boundaries.
  const parsed = parseForESLint(text, {
    filePath: file,
    parser: false,
    sourceType: "module",
    ecmaVersion: "latest",
  });
  const document = parsed.services.getDocumentFragment();
  const script = document.children
    .filter((node) => node.type === "VElement" && node.name === "script")
    .map((node) =>
      text.slice(node.startTag.range[1], node.endTag?.range[0] ?? node.range[1])
    )
    .join("\n");
  return {
    source: ts.createSourceFile(file, script, ts.ScriptTarget.Latest, true),
    template: parsed.ast.templateBody,
  };
}

function relativeSource(file, specifier) {
  if (!specifier.startsWith(".")) return undefined;
  const path = join(dirname(file), specifier);
  return [path, `${path}.ts`, join(path, "index.ts")].find(
    (candidate) => candidate.endsWith(".ts") && existsSync(candidate)
  );
}

function namedImports(source) {
  const imports = new Map();
  for (const node of source.statements) {
    if (
      !ts.isImportDeclaration(node) ||
      !ts.isStringLiteral(node.moduleSpecifier) ||
      node.importClause?.isTypeOnly
    )
      continue;
    const named = node.importClause?.namedBindings;
    if (!named || !ts.isNamedImports(named)) continue;
    for (const entry of named.elements) {
      if (!entry.isTypeOnly)
        imports.set(entry.name.text, {
          name: entry.propertyName?.text ?? entry.name.text,
          module: node.moduleSpecifier.text,
        });
    }
  }
  function shadowed(node) {
    if (ts.isImportDeclaration(node)) return;
    if (
      ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isBindingElement(node)
    ) {
      if (node.name && ts.isIdentifier(node.name))
        imports.delete(node.name.text);
    }
    ts.forEachChild(node, shadowed);
  }
  shadowed(source);
  return imports;
}

function declarationName(node) {
  return node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
}

function declarationsIn(source) {
  const declarations = new Map();
  for (const statement of source.statements) {
    const entries = ts.isVariableStatement(statement)
      ? statement.declarationList.declarations
      : [statement];
    for (const node of entries) {
      if (
        ts.isVariableDeclaration(node) ||
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node)
      ) {
        const name = declarationName(node);
        if (name) declarations.set(name, node);
      }
    }
  }
  return declarations;
}

/** Runtime references exclude comments, import declarations and type positions. */
/**
 * `Component<TRow>` in expression position is an instantiation expression:
 * TypeScript files it as a type node, but it names the component value.
 */
function instantiatedValue(node) {
  return ts.isExpressionWithTypeArguments(node) &&
    !ts.isHeritageClause(node.parent)
    ? node.expression
    : undefined;
}

function referencesIn(node) {
  const names = new Set();
  function visit(child) {
    const value = instantiatedValue(child);
    if (value) return visit(value);
    if (ts.isTypeNode(child) || ts.isImportDeclaration(child)) return;
    if (ts.isIdentifier(child)) names.add(child.text);
    ts.forEachChild(child, visit);
  }
  visit(node);
  return names;
}

function directCalls(source, imports) {
  const names = new Set();
  const hNames = new Set(
    [...imports]
      .filter(([, value]) => value.module === "vue" && value.name === "h")
      .map(([local]) => local)
  );
  function visit(node) {
    const value = instantiatedValue(node);
    if (value) return visit(value);
    if (ts.isTypeNode(node) || ts.isImportDeclaration(node)) return;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      names.add(node.expression.text);
      const component =
        node.arguments[0] &&
        (instantiatedValue(node.arguments[0]) ?? node.arguments[0]);
      if (
        hNames.has(node.expression.text) &&
        component &&
        ts.isIdentifier(component)
      )
        names.add(component.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return names;
}

function renderedNames(template, imports) {
  const tags = new Set();
  function visit(node) {
    if (node?.type !== "VElement") return;
    tags.add(node.rawName);
    for (const child of node.children) visit(child);
  }
  visit(template);
  return [...imports.keys()].filter((name) => {
    const kebab = name.replace(/\B([A-Z])/g, "-$1").toLowerCase();
    return tags.has(name) || tags.has(kebab);
  });
}

function directExport(statement, name, info) {
  if (
    !statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
    )
  )
    return undefined;
  const node = info.declarations.get(name);
  return node && (node === statement || node.parent?.parent === statement)
    ? node
    : undefined;
}

function reExport(statement, file, name, cache, seen) {
  if (!ts.isExportDeclaration(statement) || statement.isTypeOnly)
    return undefined;
  const clause = statement.exportClause;
  const entry =
    clause && ts.isNamedExports(clause)
      ? clause.elements.find(
          (item) => item.name.text === name && !item.isTypeOnly
        )
      : undefined;
  if (clause && !entry) return undefined;
  const exported = entry?.propertyName?.text ?? name;
  const target = statement.moduleSpecifier;
  if (!target) {
    const node = moduleInfo(file, cache).declarations.get(exported);
    return node ? { file, node } : undefined;
  }
  if (!ts.isStringLiteral(target)) return undefined;
  const next = relativeSource(file, target.text);
  return next ? exportNode(next, exported, cache, seen) : undefined;
}

/** Resolve a named runtime export, including aliases and relative barrels. */
function exportNode(file, name, cache, seen = new Set()) {
  const key = `${file}:${name}`;
  if (!existsSync(file) || seen.has(key)) return undefined;
  seen.add(key);
  const info = moduleInfo(file, cache);
  for (const statement of info.source.statements) {
    const node = directExport(statement, name, info);
    if (node) return { file, node };
    const found = reExport(statement, file, name, cache, seen);
    if (found) return found;
  }
  return undefined;
}

function moduleInfo(file, cache) {
  if (!cache.has(file)) {
    const info = scriptSource(file);
    cache.set(file, {
      ...info,
      imports: namedImports(info.source),
      declarations: declarationsIn(info.source),
    });
  }
  return cache.get(file);
}

function entrySource(module, binding, packageName) {
  if (module !== packageName && !module.startsWith(`${packageName}/`))
    return undefined;
  const subpath =
    module === packageName ? "index" : module.slice(packageName.length + 1);
  const manifest = JSON.parse(
    readFileSync(join(binding, "package.json"), "utf8")
  );
  // Do not invent an entry the binding does not publish. Minimal fixtures may
  // omit exports, in which case the source entry remains authoritative.
  const key = subpath === "index" ? "." : `./${subpath}`;
  if (manifest.exports && !(key in manifest.exports)) return undefined;
  const file = join(binding, "src", `${subpath}.ts`);
  return existsSync(file) ? file : undefined;
}

/**
 * A declaration's dependency closure, never its whole module. Importing a
 * component without rendering it, or rendering a sibling export in its file,
 * cannot claim the component's structure. Local import cycles are bounded.
 */
export function vueBindingSources(files, root) {
  const binding = bindingDir("vue", root);
  if (!existsSync(binding)) return [];
  const packageName = packageNameAt(binding);
  const cache = new Map();
  const found = new Map();
  function follow(file, node) {
    const key = `${file}:${node.pos}`;
    if (found.has(key)) return;
    const info = moduleInfo(file, cache);
    found.set(key, {
      file,
      node,
      sourceFile: info.source,
      source: printer.printNode(ts.EmitHint.Unspecified, node, info.source),
    });
    for (const name of referencesIn(node)) {
      const local = info.declarations.get(name);
      if (local) follow(file, local);
      const imported = info.imports.get(name);
      if (!imported) continue;
      const target = relativeSource(file, imported.module);
      const dependency = target && exportNode(target, imported.name, cache);
      if (dependency) follow(dependency.file, dependency.node);
    }
  }
  for (const file of files) {
    const info = moduleInfo(file, cache);
    const used = new Set([
      ...directCalls(info.source, info.imports),
      ...renderedNames(info.template, info.imports),
    ]);
    for (const local of used) {
      const imported = info.imports.get(local);
      if (!imported) continue;
      const entry = entrySource(imported.module, binding, packageName);
      const exported = entry && exportNode(entry, imported.name, cache);
      if (exported) follow(exported.file, exported.node);
    }
  }
  // The binding's location travels with its sources so attribute flow can
  // follow a kit's package-entry imports (`@adapttable/vue/adapter`) as well.
  return Object.assign([...found.values()], { binding, packageName });
}

function attributeFlow(sources) {
  const cache = new Map();
  return createAttributeFlow(sources, (identifier) => {
    const file = identifier.getSourceFile().fileName;
    const imported = moduleInfo(file, cache).imports.get(identifier.text);
    if (!imported) return undefined;
    const target =
      relativeSource(file, imported.module) ??
      (sources.binding &&
        entrySource(imported.module, sources.binding, sources.packageName));
    const found = target && exportNode(target, imported.name, cache);
    return found?.node;
  });
}

function renderedProps(sources, element) {
  const found = [];
  for (const { file, node } of sources) {
    const imports = namedImports(scriptSource(file).source);
    function visit(child) {
      if (ts.isCallExpression(child) && ts.isIdentifier(child.expression)) {
        const imported = imports.get(child.expression.text);
        const tag = child.arguments[0];
        if (
          imported?.module === "vue" &&
          imported.name === "h" &&
          tag &&
          ts.isStringLiteral(tag) &&
          (!element || tag.text === element)
        )
          found.push(child.arguments[1]);
      }
      ts.forEachChild(child, visit);
    }
    visit(node);
  }
  return found;
}

/**
 * A kit's own modules together with the binding sources they reach. A kit that
 * renders its own rows forwards the binding's row attrs from its own files, so
 * an analysis of that forwarding has to read both.
 */
export function vueKitWithBindingSources(files, root) {
  const binding = vueBindingSources(files, root);
  const cache = new Map();
  const own = files.map((file) => {
    const { source } = moduleInfo(file, cache);
    return { file, node: source, sourceFile: source, source: source.text };
  });
  return Object.assign([...own, ...binding], {
    binding: binding.binding,
    packageName: binding.packageName,
  });
}

/**
 * The bounded shared-model route must retain the getter's returned record in
 * rows/headers.attrs; the semantic renderer must preserve that attrs record.
 * Calling and discarding a getter or returning a replacement merger record
 * cannot satisfy either half. Runtime composition remains covered by SSR tests.
 */
export function vueForwardsAttributeApi(sources, element, api) {
  const flow = attributeFlow(sources);
  const collection = element === "tr" ? "rows" : "headers";
  return (
    flow.modelRetains(collection, api) &&
    renderedProps(sources, element).some((props) =>
      flow.carries(props, (value) =>
        flow.attrsFromCollection(value, collection)
      )
    )
  );
}

/** Only part attributes actually retained in Vue h() props count as rendered. */
export function vueRenderedParts(sources) {
  const flow = attributeFlow(sources);
  const found = new Set();
  const names = new Set();
  for (const { node } of sources) {
    function visit(child) {
      if (
        ts.isPropertyAssignment(child) &&
        ts.isStringLiteral(child.name) &&
        child.name.text === "data-adapttable-part" &&
        ts.isStringLiteral(child.initializer)
      )
        names.add(child.initializer.text);
      ts.forEachChild(child, visit);
    }
    visit(node);
  }
  for (const props of renderedProps(sources)) {
    for (const part of names) {
      if (
        flow.carries(
          props,
          (value) =>
            ts.isObjectLiteralExpression(value) &&
            value.properties.some(
              (property) =>
                ts.isPropertyAssignment(property) &&
                ts.isStringLiteral(property.name) &&
                property.name.text === "data-adapttable-part" &&
                ts.isStringLiteral(property.initializer) &&
                property.initializer.text === part
            )
        )
      )
        found.add(part);
    }
  }
  return found;
}
