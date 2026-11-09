/**
 * What a typed table costs the developer's compiler.
 *
 * One compact example per framework, written the way the kit READMEs teach:
 * a row type, typed columns, one feature from its own entry, the table. Each
 * compiles on its own against the packed tarballs with the repository's
 * TypeScript and `--extendedDiagnostics`, so types, instantiations, memory and
 * check time are those of an install, not of the workspace source. The
 * settings are a consumer's: strict, `skipLibCheck`, bundler resolution.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

import { packedConsumer } from "./packed-consumers.mjs";

const require = createRequire(import.meta.url);
const TSC = require.resolve("typescript/bin/tsc");
const TYPESCRIPT_VERSION = JSON.parse(
  readFileSync(join(dirname(TSC), "..", "package.json"), "utf8")
).version;

const CONSUMER_OPTIONS = {
  target: "ES2022",
  lib: ["ES2022", "DOM", "DOM.Iterable"],
  module: "ESNext",
  moduleResolution: "Bundler",
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  types: [],
};

export const TYPING_EXAMPLES = [
  {
    id: "react",
    packages: ["adapter-unstyled"],
    extra: ["@types/react"],
    compilerOptions: { jsx: "react-jsx" },
    file: "people.tsx",
    code: `import { type ColumnDef, DataTable } from "@adapttable/unstyled";
import { cellNavigation } from "@adapttable/unstyled/cell-navigation";

interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [{ id: "ada", name: "Ada", age: 36 }];
const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "age", sortable: true },
];
const features = [cellNavigation()];

export function PeopleTable() {
  return (
    <DataTable
      data={people}
      columns={columns}
      rowKey={(row) => row.id}
      features={features}
      tableLabel="People"
    />
  );
}
`,
  },
  {
    id: "angular",
    packages: ["adapter-angular-unstyled"],
    extra: [],
    // Angular CLI projects compile components with legacy decorators.
    compilerOptions: { experimentalDecorators: true },
    file: "people.ts",
    code: `import { Component } from "@angular/core";
import { AdaptCellTemplate, type ColumnDef } from "@adapttable/angular";
import { AdaptDataTable } from "@adapttable/angular-unstyled";
import { cellNavigation } from "@adapttable/angular-unstyled/cell-navigation";

interface Person {
  id: string;
  name: string;
  age: number;
}

@Component({
  selector: "people-table",
  imports: [AdaptDataTable, AdaptCellTemplate],
  template: \`
    <adapt-data-table
      [data]="people"
      [columns]="columns"
      [rowKey]="rowKey"
      [features]="features"
      tableLabel="People"
    />
  \`,
})
export class PeopleTable {
  readonly people: Person[] = [{ id: "ada", name: "Ada", age: 36 }];
  readonly columns: ColumnDef<Person>[] = [
    { key: "name", sortable: true },
    { key: "age", sortable: true },
  ];
  readonly rowKey = (row: Person) => row.id;
  readonly features = [cellNavigation()];
}
`,
  },
  {
    id: "vue",
    packages: ["adapter-vue-unstyled"],
    extra: [],
    compilerOptions: {},
    file: "people.ts",
    code: `import { type ColumnDef, DataTable } from "@adapttable/vue-unstyled";
import { cellNavigation } from "@adapttable/vue-unstyled/cell-navigation";
import { defineComponent, h } from "vue";

interface Person {
  id: string;
  name: string;
  age: number;
}

const people: Person[] = [{ id: "ada", name: "Ada", age: 36 }];
const columns: ColumnDef<Person>[] = [
  { key: "name", sortable: true },
  { key: "age", sortable: true },
];
const features = [cellNavigation()];

export const PeopleTable = defineComponent({
  setup() {
    return () =>
      h(DataTable<Person>, {
        data: people,
        columns,
        rowKey: (row) => row.id,
        features,
        tableLabel: "People",
      });
  },
});
`,
  },
];

const DIAGNOSTICS = {
  Files: "files",
  "Lines of Library": "libraryLines",
  "Lines of Definitions": "definitionLines",
  "Lines of TypeScript": "typescriptLines",
  Identifiers: "identifiers",
  Symbols: "symbols",
  Types: "types",
  Instantiations: "instantiations",
  "Memory used": "memoryKB",
  "Parse time": "parseSeconds",
  "Bind time": "bindSeconds",
  "Check time": "checkSeconds",
  "Total time": "totalSeconds",
};

/** The `--extendedDiagnostics` figures a compiler run printed, as numbers. */
export function extendedDiagnostics(output) {
  const figures = {};
  for (const line of output.split("\n")) {
    const match = /^([A-Za-z ]+):\s+([\d.]+)[Ks]?\s*$/.exec(line.trim());
    const key = match && DIAGNOSTICS[match[1]];
    if (key) figures[key] = Number(match[2]);
  }
  const missing = [
    "types",
    "instantiations",
    "memoryKB",
    "checkSeconds",
  ].filter((key) => !(key in figures));
  if (missing.length) {
    throw new Error(`tsc printed no ${missing.join(", ")} figure`);
  }
  return figures;
}

function compile(dir, example) {
  const root = join(dir, "typing", example.id);
  mkdirSync(root, { recursive: true });
  writeFileSync(join(root, example.file), example.code);
  const compilerOptions = { ...CONSUMER_OPTIONS, ...example.compilerOptions };
  writeFileSync(
    join(root, "tsconfig.json"),
    JSON.stringify({ compilerOptions, files: [example.file] }, null, 2)
  );
  let output;
  try {
    output = execFileSync(
      process.execPath,
      [
        TSC,
        "-p",
        "tsconfig.json",
        "--extendedDiagnostics",
        "--pretty",
        "false",
      ],
      { cwd: root, encoding: "utf8" }
    );
  } catch (error) {
    const errors = String(error.stdout ?? "")
      .split("\n")
      .filter((line) => /error TS\d+/.test(line));
    return { errors: errors.length ? errors : [String(error.message)] };
  }
  return {
    errors: [],
    compilerOptions,
    diagnostics: extendedDiagnostics(output),
  };
}

/**
 * Compile every example against one packed install. Each result carries its
 * compiler errors; a clean one carries the diagnostics.
 */
export function typingBaseline(examples = TYPING_EXAMPLES) {
  const install = packedConsumer(
    [...new Set(examples.flatMap((example) => example.packages))],
    { peers: true, extra: [...new Set(examples.flatMap((e) => e.extra))] }
  );
  try {
    return {
      typescript: TYPESCRIPT_VERSION,
      resolution: "packed tarballs installed into a scratch consumer",
      packages: install.packages,
      examples: examples.map((example) => ({
        id: example.id,
        file: example.file,
        code: example.code,
        ...compile(install.dir, example),
      })),
    };
  } finally {
    install.dispose();
  }
}
