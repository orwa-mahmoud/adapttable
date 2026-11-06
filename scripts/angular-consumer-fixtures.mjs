/**
 * Packed Angular consumers, compiled and linked as production applications.
 *
 * Each fixture is a standalone component with a real template, importing
 * AdaptTable only through the public names its packed `exports` map publishes.
 * The cases cover the headless binding, every Angular kit's base table, and
 * the features the item asks for: grouping with aggregation, editing,
 * filters, virtualization, export, a feature combination and the preset.
 *
 * `initialKB` and `totalKB` hold AdaptTable's own share — the Angular
 * framework and each kit's UI library stay external, the same peer policy the
 * React and Vue budgets use. `appKB` holds the complete application, framework
 * included, and is reported beside the own share, never mixed into it.
 *
 * The ceilings come from the first linked measurement of this toolchain
 * (2026-11-05, Angular 22.2.3) with about 15% of headroom. They are this
 * toolchain's ceilings: a CLI build uses a different minifier, so its bytes
 * are not comparable and are not the baseline.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { kitDir, KITS, packageNameAt } from "./kits.mjs";
import { packageDir } from "./packages.mjs";

const ROWS = [
  { id: "ada", name: "Ada", team: "engines", points: 3 },
  { id: "grace", name: "Grace", team: "compilers", points: 5 },
];

const PERSON = "{ id: string; name: string; team: string; points: number }";

/** Every Angular kit the registry holds, outside the private role. */
export function angularKits(kits = KITS, root = packageDir("core")) {
  const repository = join(root, "..", "..", "..");
  return kits
    .filter((kit) => kit.framework === "angular" && kit.role !== "private")
    .map((kit) => ({
      folder: kit.name,
      name: packageNameAt(kitDir(kit, repository)),
    }));
}

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/**
 * The public subpaths an Angular kit's base entry imports from the binding.
 * Read from the built FESM, which is exactly what a consumer's graph reaches,
 * so a new import shows up here without editing a list by hand.
 */
export function angularBaseImports(folder) {
  const manifest = readJson(join(packageDir(folder), "package.json"));
  const target = manifest.exports?.["."]?.default;
  if (typeof target !== "string") {
    throw new Error(`${manifest.name} publishes no default export`);
  }
  const code = readFileSync(join(packageDir(folder), target), "utf8");
  return [
    ...new Set(
      [...code.matchAll(/from "(@adapttable\/[^"]+)"/g)].map((m) => m[1])
    ),
  ].sort();
}

/** The component body every rendered fixture shares. */
function component(imports, body) {
  return `import { Component } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
${imports}

@Component({
  selector: "consumer-app",
  standalone: true,
  imports: [AdaptDataTable],
  template: \`
    <adapt-data-table
      [data]="rows"
      [columns]="columns"
      [rowKey]="rowKey"
      ${body}
    />
  \`,
})
export class ConsumerApp {
  readonly rows: ${PERSON}[] = ${JSON.stringify(ROWS)};
  readonly columns: ColumnDef<${PERSON}>[] = [
    { key: "name", header: "Name", sortable: true },
    { key: "team", header: "Team" },
    { key: "points", header: "Points" },
  ];
  readonly rowKey = (row: ${PERSON}) => row.id;
  readonly features = FEATURES;
}
`;
}

/** A rendered table from one kit, plus the features and summary it turns on. */
function rendered(name, kit, features, options) {
  const summary = options.summary;
  const imported = [
    `import { AdaptDataTable } from "${kit.name}";`,
    ...features.map((feature) => {
      const from = feature.from ?? `${kit.name}/${feature.entry}`;
      return `import { ${feature.factory} } from "${from}";`;
    }),
    ...(summary ? [`import { aggregate } from "@adapttable/angular";`] : []),
  ].join("\n");
  const list = features.map((feature) => feature.call).join(", ");
  const bindings = [
    `[features]="features"`,
    summary ? `[summaryRow]="summary"` : "",
    `tableLabel="People"`,
  ]
    .filter(Boolean)
    .join(" ");
  const members = [`readonly features = [${list}];`];
  if (summary) members.push(`readonly summary = ${summary};`);
  const source = component(imported, bindings).replace(
    "readonly features = FEATURES;",
    members.join("\n  ")
  );
  return {
    name,
    kind: "angular-consumer",
    framework: "angular",
    pkg: kit.folder,
    rendered: true,
    peerPolicy: "own-share",
    functionality: options.functionality,
    present: [
      "AdaptDataTable",
      ...features.flatMap((feature) => feature.present),
      ...(summary ? ["aggregate"] : []),
    ],
    absent: options.absent,
    initialKB: options.initialKB,
    totalKB: options.totalKB,
    appKB: options.appKB,
    code: source,
  };
}

/**
 * The features a fixture can turn on. `entry` is the kit subpath; the
 * aggregate factory lives on the binding, which every kit already depends on.
 */
const FEATURES = {
  grouping: {
    factory: "grouping",
    entry: "grouping",
    call: 'grouping("team", { groupAggregates: (rows) => ({ points: rows.length }) })',
    present: ["coreGrouping"],
  },
  editing: {
    factory: "editing",
    entry: "editing",
    call: "editing(() => {})",
    present: ["editing"],
  },
  filters: {
    factory: "filters",
    entry: "filters",
    call: "filters()",
    present: ["filters"],
  },
  virtualize: {
    factory: "virtualize",
    entry: "virtualize",
    call: "virtualize()",
    present: ["coreVirtualize"],
  },
  exportCsv: {
    factory: "exportCsv",
    entry: "export",
    call: "exportCsv()",
    present: ["coreExportCsv"],
  },
  preset: {
    factory: "standardPreset",
    entry: "preset",
    // The preset returns the feature list itself, so it spreads into features.
    call: "...standardPreset()",
    present: ["standardPreset"],
  },
};

/**
 * Feature engines a base table must not carry. These are the implementations,
 * not the words: "grouping" and "exportCsv" also appear in shared labels and
 * comments, so they prove nothing about what the bundle runs.
 */
const BASE_ABSENT = [
  "coreGrouping",
  "coreVirtualize",
  "coreExportCsv",
  "pdfWriter",
  "xlsxWriter",
];

const LEAN = `import { Component, input } from "@angular/core";
import { injectTableSurfaceHost } from "@adapttable/angular";

type Person = ${PERSON};

const columns = [
  { key: "name", header: "Name" },
  { key: "team", header: "Team" },
];

@Component({
  selector: "consumer-app",
  standalone: true,
  template: \`@for (slot of view().body(); track $index) { <span></span> }\`,
})
export class ConsumerApp {
  readonly data = input.required<Person[]>();
  readonly view = injectTableSurfaceHost({
    data: this.data,
    columns,
    rowKey: (row: Person) => row.id,
  });
}
`;

const LEAN_COMPOSED = `import { Component, input } from "@angular/core";
import { injectTableSurfaceHost } from "@adapttable/angular";
import { cellNavigation, editing, grouping } from "@adapttable/angular/features";

type Person = ${PERSON};

const columns = [
  { key: "name", header: "Name" },
  { key: "team", header: "Team" },
];

@Component({
  selector: "consumer-app",
  standalone: true,
  template: \`@for (slot of view().body(); track $index) { <span></span> }\`,
})
export class ConsumerApp {
  readonly data = input.required<Person[]>();
  readonly view = injectTableSurfaceHost({
    data: this.data,
    columns,
    rowKey: (row: Person) => row.id,
    features: [grouping("team"), cellNavigation(), editing(() => {})],
  });
}
`;

const HEADLESS = `import { Component, input } from "@angular/core";
import type { ColumnDef } from "@adapttable/angular";
import { injectDataTable, injectFrontendData } from "@adapttable/angular";
import { AdaptAttrs, AdaptCell, AdaptHeader } from "@adapttable/angular/adapter";

type Person = ${PERSON};

const columns: ColumnDef<Person>[] = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team" },
];

@Component({
  selector: "consumer-app",
  standalone: true,
  imports: [AdaptAttrs, AdaptCell, AdaptHeader],
  template: \`
    <table [adaptAttrs]="table.tableAttrs()">
      <thead>
        <tr [adaptAttrs]="table.headerRowAttrs()">
          @for (column of table.columns(); track column.key) {
            <th [adaptAttrs]="table.headerCellAttrs(column)">
              <span [adaptHeader]="column"></span>
            </th>
          }
        </tr>
      </thead>
      <tbody>
        @for (row of table.rows(); track table.rowKey(row); let i = $index) {
          <tr [adaptAttrs]="table.rowAttrs(row, i)">
            @for (column of table.columns(); track column.key) {
              <td [adaptCell]="column" [adaptCellRow]="row" [adaptCellIndex]="i"></td>
            }
          </tr>
        }
      </tbody>
    </table>
  \`,
})
export class ConsumerApp {
  readonly data = input.required<Person[]>();
  readonly table = injectDataTable({
    source: injectFrontendData({ data: this.data, columns }),
    columns,
    rowKey: (row: Person) => row.id,
  });
}
`;

/**
 * Own-share ceilings in KiB, taken from the first linked measurement on
 * 2026-11-05 (Angular 22.2.3) and rounded up by about 15%. `app` is the
 * complete application with the framework bundled, recorded beside the own
 * share and not enforced against it: the framework's bytes are Angular's.
 */
const CEILINGS = {
  "angular · headless table": { own: 37, app: 120 },
  "angular · angular-unstyled table": { own: 140, app: 250 },
  "angular · angular-material table": { own: 141, app: 252 },
  "angular · ng-bootstrap table": { own: 141, app: 252 },
  "angular · spartan table": { own: 141, app: 252 },
  "angular · taiga-ui table": { own: 151, app: 262 },
  "angular · angular-aria table": { own: 140, app: 250 },
  "angular · ngx-bootstrap table": { own: 141, app: 252 },
  "angular · angular-cdk table": { own: 140, app: 250 },
  "angular · ng-zorro table": { own: 145, app: 256 },
  "angular · unstyled + grouping": { own: 143, app: 254 },
  "angular · unstyled grouping + aggregation": { own: 143, app: 254 },
  "angular · unstyled + editing": { own: 148, app: 260 },
  "angular · unstyled + filters": { own: 154, app: 266 },
  "angular · unstyled + virtualize": { own: 140, app: 250 },
  "angular · unstyled + exportCsv": { own: 142, app: 252 },
  "angular · unstyled combination": { own: 156, app: 268 },
  "angular · unstyled + preset": { own: 173, app: 286 },
  "angular · lean table": { own: 56, app: 96 },
  "angular · lean grouping navigation editing": { own: 82, app: 121 },
};

/** The measured own share and complete app, in KiB, for one fixture. */
function ceilings(name) {
  const ceiling = CEILINGS[name];
  if (!ceiling) throw new Error(`No Angular ceiling for ${name}`);
  return { initialKB: ceiling.own, totalKB: ceiling.own, appKB: ceiling.app };
}

/**
 * The Angular matrix. Every ceiling is own-share KiB from the linked
 * measurement of 2026-11-05; the complete application is recorded as `appKB`.
 */
export function angularConsumerFixtures(kits = angularKits()) {
  const native = kits.find((kit) => kit.folder === "adapter-angular-unstyled");
  if (!native) {
    throw new Error("The Angular matrix needs the unstyled kit");
  }
  const bases = kits.map((kit) =>
    rendered(
      `angular · ${kit.name.replace("@adapttable/", "")} table`,
      kit,
      [],
      {
        functionality: `${kit.name} base table, no optional feature`,
        absent: BASE_ABSENT,
        ...ceilings(`angular · ${kit.name.replace("@adapttable/", "")} table`),
      }
    )
  );
  const feature = (key, functionality, absent = BASE_ABSENT) =>
    rendered(`angular · unstyled + ${key}`, native, [FEATURES[key]], {
      functionality,
      absent: absent.filter(
        (marker) => !FEATURES[key].present.includes(marker)
      ),
      ...ceilings(`angular · unstyled + ${key}`),
    });
  return [
    {
      name: "angular · headless table",
      kind: "angular-consumer",
      framework: "angular",
      pkg: "angular",
      rendered: true,
      peerPolicy: "own-share",
      functionality: "Headless table: signals, attributes and cell projection",
      present: [
        "injectDataTable",
        "injectFrontendData",
        "defaultLabels",
        "resolveLabels",
      ],
      absent: ["AdaptDataTable", "coreGrouping", "xlsxWriter"],
      ...ceilings("angular · headless table"),
      code: HEADLESS,
    },
    {
      name: "angular · lean table",
      kind: "angular-consumer",
      framework: "angular",
      pkg: "angular",
      rendered: true,
      peerPolicy: "own-share",
      functionality: "Lean structural host with no optional feature",
      present: ["injectTableSurfaceHost"],
      absent: [
        "AdaptDataTable",
        "coreGrouping",
        "createGridFocusController",
        "injectCellEditing",
        "pdfWriter",
        "xlsxWriter",
      ],
      ...ceilings("angular · lean table"),
      code: LEAN,
    },
    {
      name: "angular · lean grouping navigation editing",
      kind: "angular-consumer",
      framework: "angular",
      pkg: "angular",
      rendered: true,
      peerPolicy: "own-share",
      functionality:
        "Lean structural host with grouping, cell navigation and editing",
      present: [
        "injectTableSurfaceHost",
        "coreGrouping",
        "createGridFocusController",
        "injectCellEditing",
      ],
      absent: ["AdaptDataTable", "pdfWriter", "xlsxWriter"],
      ...ceilings("angular · lean grouping navigation editing"),
      code: LEAN_COMPOSED,
    },
    ...bases,
    feature("grouping", "Native table with row grouping"),
    rendered(
      "angular · unstyled grouping + aggregation",
      native,
      [FEATURES.grouping],
      {
        functionality: "Native table, row grouping and a summary aggregate",
        summary: 'aggregate({ points: "sum" })',
        absent: BASE_ABSENT.filter((marker) => marker !== "coreGrouping"),
        ...ceilings("angular · unstyled grouping + aggregation"),
      }
    ),
    feature("editing", "Native table with cell editing"),
    feature("filters", "Native table with the filter drawer"),
    feature("virtualize", "Native table with row virtualization"),
    feature("exportCsv", "Native table with CSV export"),
    rendered(
      "angular · unstyled combination",
      native,
      [FEATURES.filters, FEATURES.virtualize, FEATURES.exportCsv],
      {
        functionality: "Native table with filters, virtualization and export",
        absent: ["coreGrouping"],
        ...ceilings("angular · unstyled combination"),
      }
    ),
    feature(
      "preset",
      "Native table with the standard preset",
      // The preset's own list includes grouping and CSV export, so their
      // engines belong in this graph. The writers it never configures do not.
      ["coreVirtualize", "pdfWriter", "xlsxWriter"]
    ),
  ];
}

/** Names a packed Angular consumer must keep. A missing one fails the budget. */
const ANGULAR_COVERAGE = [
  "headless",
  "grouping",
  "aggregation",
  "editing",
  "filters",
  "virtualize",
  "combination",
  "preset",
];

/**
 * Registry membership must not silently drop an Angular kit or feature.
 * The budget calls this, so CI fails on the same entry that measures bytes.
 */
export function angularConsumerCoverageProblems(
  fixtures,
  kits = angularKits()
) {
  const angular = fixtures.filter((fixture) => fixture.framework === "angular");
  const problems = [];
  for (const kit of kits) {
    const bases = angular.filter((fixture) => fixture.pkg === kit.folder);
    if (bases.length < 1) {
      problems.push(`Missing Angular kit base consumer: ${kit.name}`);
    }
  }
  if (!angular.some((fixture) => fixture.pkg === "angular")) {
    problems.push("Missing Angular headless consumer");
  }
  for (const feature of ANGULAR_COVERAGE) {
    if (!angular.some((fixture) => fixture.name.includes(feature))) {
      problems.push(`Missing Angular consumer that turns on ${feature}`);
    }
  }
  return problems;
}
