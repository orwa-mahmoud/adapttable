/**
 * One props contract across the bindings: every core `TableOptions` key, and
 * every prop a binding's table takes, reaches a table in React, Vue and
 * Angular — as a prop or input, or through the feature that carries it — or
 * is listed with the reason it does not.
 */
import { join } from "node:path";

import ts from "typescript";

import { surfaceType } from "./binding-capabilities.mjs";

/** Where each binding's table props, and core's options, are declared. */
export const PROPS_SURFACES = Object.freeze([
  {
    framework: "react",
    directory: "packages/react/react",
    file: "src/shell/shellContract.ts",
    typeName: "DataTableShellProps",
    inputsOnly: false,
  },
  {
    framework: "vue",
    directory: "packages/vue/vue",
    file: "src/tableAdapterContracts.ts",
    typeName: "DataTableProps",
    inputsOnly: false,
  },
  {
    framework: "angular",
    directory: "packages/angular/angular",
    file: "src/layout/dataTableShell.ts",
    typeName: "AdaptDataTableShell",
    inputsOnly: true,
  },
]);

const CORE_OPTIONS = {
  directory: "packages/shared/core",
  file: "src/tableOptions.ts",
  typeName: "TableOptions",
  inputsOnly: false,
};

const INPUTS = new Set([
  "InputSignal",
  "ModelSignal",
  "InputSignalWithTransform",
]);

function program(root, directory) {
  const config = join(root, directory, "tsconfig.json");
  const read = ts.readConfigFile(config, ts.sys.readFile);
  if (read.error !== undefined) throw new Error(`cannot read ${config}`);
  const parsed = ts.parseJsonConfigFileContent(
    read.config,
    ts.sys,
    join(root, directory)
  );
  const core = join(root, "packages/shared/core/src");
  return ts.createProgram({
    rootNames: parsed.fileNames,
    options: {
      ...parsed.options,
      paths: {
        ...parsed.options.paths,
        "@adapttable/core": [join(core, "index.ts")],
        "@adapttable/core/*": [join(core, "*.ts")],
      },
    },
  });
}

/**
 * The property names of a declared type: a binding's props, or an Angular
 * component's inputs.
 *
 * @param {string} root - The repository root.
 * @param {{ directory: string, file: string, typeName: string, inputsOnly: boolean }} surface - Where the type is.
 * @returns {string[]} The names, sorted.
 */
export function declaredProps(root, surface) {
  const built = program(root, surface.directory);
  const checker = built.getTypeChecker();
  const source = built.getSourceFile(
    join(root, surface.directory, surface.file)
  );
  if (source === undefined)
    throw new Error(`missing ${surface.directory}/${surface.file}`);
  const type = surfaceType(checker, source, surface.typeName);
  if (type === undefined)
    throw new Error(`no ${surface.typeName} in ${surface.file}`);
  return checker
    .getPropertiesOfType(type)
    .filter((symbol) => {
      if (!surface.inputsOnly) return true;
      const declared = checker.getTypeOfSymbol(symbol);
      const name = (declared.aliasSymbol ?? declared.getSymbol())?.getName();
      return name !== undefined && INPUTS.has(name);
    })
    .map((symbol) => symbol.getName())
    .sort();
}

/**
 * Core's table options.
 *
 * @param {string} root - The repository root.
 * @returns {string[]} The option names, sorted.
 */
export function coreOptions(root) {
  return declaredProps(root, CORE_OPTIONS);
}

/** One name's problems: it reaches every binding, or it does not. */
function nameProblems(name, frameworks, reach, allow, divergent) {
  const missing = frameworks.filter((fw) => !reach[fw].has(name));
  if (missing.length === 0)
    return frameworks
      .filter((fw) => name in (allow[fw] ?? {}))
      .map(
        (fw) =>
          `${fw}: ${name} now reaches every binding; remove it from the allow-list`
      );
  const reached =
    frameworks.filter((other) => !missing.includes(other)).join(" and ") ||
    "core";
  const problems = [];
  for (const fw of missing) {
    divergent[fw].push(name);
    if (!(name in (allow[fw] ?? {})))
      problems.push(
        `${fw}: ${name} reaches ${reached} but not ${fw}, and is not allow-listed`
      );
  }
  return problems;
}

/**
 * What does not reach every binding's table, against an allow-list.
 *
 * @param {{ core: readonly string[], props: Record<string, readonly string[]>, featureProps: readonly string[], allow: Record<string, Record<string, string>> }} input -
 *   Core's options, each binding's props, the props features carry, and the
 *   allow-list (framework → name → reason).
 * @returns {{ problems: string[], divergent: Record<string, string[]> }} Problems, and every divergent name found.
 */
export function propsProblems({ core, props, featureProps, allow }) {
  const frameworks = Object.keys(props);
  const reach = Object.fromEntries(
    frameworks.map((fw) => [fw, new Set([...props[fw], ...featureProps])])
  );
  const names = new Set([...core, ...frameworks.flatMap((fw) => props[fw])]);
  const divergent = Object.fromEntries(frameworks.map((fw) => [fw, []]));
  const problems = [...names]
    .sort()
    .flatMap((name) => nameProblems(name, frameworks, reach, allow, divergent));
  for (const fw of frameworks)
    for (const name of Object.keys(allow[fw] ?? {}))
      if (!names.has(name))
        problems.push(
          `${fw}: ${name} is allow-listed but no binding or core names it`
        );
  return { problems, divergent };
}
