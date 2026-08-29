/**
 * The three product layers a consumer arrives at, written as source a packed
 * install has to compile.
 *
 * `consumer-harness.mjs` writes these into the resolution scratch and type
 * checks them under all three module resolutions, so every import is resolved
 * through the tarball's `exports` map and its emitted declarations — the two
 * things a monorepo test can never see, because it resolves source.
 *
 * The compatibility aliases are the exception: they are generated from
 * `mainEntryAliases.ts` rather than listed, so the day one is added or retired
 * the fixture follows without anyone remembering to edit it.
 */

/** `<DataTable data columns rowKey />` and nothing else. */
export const BEGINNER = String.raw`import type { ColumnDef } from "@adapttable/unstyled";
import { DataTable } from "@adapttable/unstyled";

type Row = { id: string; name: string; city: string };
const rows: Row[] = [{ id: "1", name: "Alpha", city: "Dubai" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }, { key: "city" }];

export const Beginner = () => (
  <DataTable data={rows} columns={columns} rowKey={(row) => row.id} />
);
`;

/** The v2 props a table already in production is passing. */
export const V2_PROPS = String.raw`import type { ColumnDef, FilterDef } from "@adapttable/unstyled";
import { DataTable } from "@adapttable/unstyled";

type Row = { id: string; name: string; city: string; spend: number };
const rows: Row[] = [{ id: "1", name: "Alpha", city: "Dubai", spend: 10 }];
const columns: ColumnDef<Row>[] = [
  { key: "name", sortable: true, editable: true },
  { key: "city" },
  { key: "spend", align: "end" },
];
const filters: FilterDef[] = [{ key: "city", label: "City", type: "text" }];

export const StillAccepted = () => (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    groupBy="city"
    virtualize
    searchable
    filters={filters}
    onRowReorder={(next) => next}
    onCellEdit={(edit) => edit}
  />
);
`;

/** Kit factories, a custom feature, and every registration the host offers. */
export const SENIOR = String.raw`import type {
  Aggregator,
  Command,
  ContextMenuItem,
  CustomCellEditorRender,
  ExportWriter,
  FilterTypeSpec,
  SidePanelEntry,
  TableFeature,
  TableFeatureHost,
} from "@adapttable/unstyled/features";
import {
  cellNavigation,
  editing,
  grouping,
  rowReorder,
  savedViews,
  virtualize,
} from "@adapttable/unstyled/features";
import { columnMenu } from "@adapttable/unstyled/column-menu";
import { pivot } from "@adapttable/core/pivot";
import type { ColumnDef } from "@adapttable/unstyled";
import { DataTable } from "@adapttable/unstyled";

type Row = { id: string; name: string; city: string; spend: number };
const rows: Row[] = [{ id: "1", name: "Alpha", city: "Dubai", spend: 10 }];
const columns: ColumnDef<Row>[] = [{ key: "name" }, { key: "spend" }];

const spread: Aggregator = (values) => {
  const numbers = values.map(Number);
  return Math.min(...numbers) + "–" + Math.max(...numbers);
};

const shout: CustomCellEditorRender = (ctrl) => (
  <input
    aria-label={ctrl.label}
    value={ctrl.draft}
    onChange={(event) => ctrl.setDraft(event.target.value.toUpperCase())}
    onBlur={ctrl.onBlur}
    onKeyDown={ctrl.onKeyDown}
  />
);

const evenRows: FilterTypeSpec = {
  type: "even",
  widget: "text",
  defaultOp: "is",
  ops: ["is"],
  stateKeys: (def) => [def.key],
  chips: () => ({}),
  conditionToExtra: () => ({}),
  match: () => true,
};

const csvish: ExportWriter = {
  extension: "txt",
  build: () => ({ parts: ["ok"], mimeType: "text/plain", text: "ok" }),
};

const panel: SidePanelEntry = { key: "notes", label: "Notes", content: null };
const command: Command = {
  key: "hello",
  label: "Say hello",
  onSelect: () => {},
};
const extraItem: ContextMenuItem = command;

/** Everything a senior integrator can register, in one feature. */
const everything: TableFeature<Row> = {
  id: "harness:everything",
  setup(host: TableFeatureHost<Row>) {
    host.registerAggregator("spread", spread);
    host.registerEditor("shout", shout);
    host.registerFilterType(evenRows);
    host.registerWriter(csvish);
    host.registerPanel(panel);
    host.registerCommand(command);
    host.registerContextMenuItems(() => [extraItem]);
    host.extendFilterType("text", { defaultOp: "contains" });
    host.onDispose(() => {});
    return () => {};
  },
};

export const Senior = () => (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    features={[
      rowReorder<Row>((next) => next),
      savedViews<Row>({ storageKey: "harness" }),
      grouping<Row>("city"),
      editing<Row>((row, key, next) => ({ ...row, [key]: next })),
      virtualize<Row>(),
      columnMenu<Row>(),
      cellNavigation<Row>(),
      everything,
    ]}
  />
);

export const pivoted = pivot;
`;

/** Slots, class maps, render callbacks, and shadcn's preset merging. */
export const CUSTOMIZATION = String.raw`// The renderer types come from @adapttable/core: a kit republishes 128 core
// names but not these three, so core is the documented route that has them.
import type {
  MobileCardRenderer,
  RowActionsRenderer,
  ToolbarSlots,
} from "@adapttable/core";
import type {
  ColumnDef,
  DataTableClassNames,
  DataTableSlots,
} from "@adapttable/unstyled";
import { DataTable } from "@adapttable/unstyled";
import type { SavedViewsPanelProps } from "@adapttable/shadcn";
import {
  DataTable as ShadcnDataTable,
  shadcnClassNames,
} from "@adapttable/shadcn";

type Row = { id: string; name: string; city: string };
const rows: Row[] = [{ id: "1", name: "Alpha", city: "Dubai" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }, { key: "city" }];

const slots: DataTableSlots = {
  empty: <p>Nothing here yet</p>,
  noResults: <p>No match</p>,
  skeleton: <p>Loading…</p>,
  error: (state) => <p role="alert">{String(state.error)}</p>,
};

/** Per-node classes: unstyled and shadcn publish a key for every part. */
const classNames: DataTableClassNames = {
  root: "my-root",
  table: "my-table",
  cell: "my-cell",
  headerCell: "my-header-cell",
  toolbar: "my-toolbar",
};

const toolbarSlots: ToolbarSlots = { end: <button type="button">Mine</button> };

const renderCard: MobileCardRenderer<Row> = (_row, card) => (
  <article>
    {card.fields.map((field) => (
      <p key={field.column.key}>{field.value}</p>
    ))}
  </article>
);

const renderRowActions: RowActionsRenderer<Row> = (ctx) => (
  <button type="button" onClick={() => ctx.row}>
    Act
  </button>
);

export const Customized = () => (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    slots={slots}
    classNames={classNames}
    toolbar
    toolbarSlots={toolbarSlots}
    renderCard={renderCard}
    renderRowActions={renderRowActions}
    renderRowDetail={(row) => <pre>{row.name}</pre>}
  />
);

/** shadcn merges your map over its preset, key by key. */
export const Merged = () => (
  <ShadcnDataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    classNames={{ ...shadcnClassNames, cell: "mine-only" }}
  />
);

export type PanelProps = SavedViewsPanelProps;
`;

/** A source, the prop-getters, caller overrides, fully custom markup. */
export const HEADLESS = String.raw`import type {
  ColumnDef,
  Props,
  TableSource,
  UseDataTableResult,
} from "@adapttable/core";
import { useDataTable, useFrontendData } from "@adapttable/core";

type Row = { id: string; name: string; city: string };
const rows: Row[] = [{ id: "1", name: "Alpha", city: "Dubai" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }, { key: "city" }];

/** Fully custom markup: every visible node is the host's own. */
export function Headless() {
  const source: TableSource<Row> = useFrontendData<Row>({
    data: rows,
    columns,
    getRowId: (row) => row.id,
  });
  const table: UseDataTableResult<Row> = useDataTable<Row>({
    source,
    columns,
    rowKey: (row) => row.id,
  });

  // Caller overrides merge over the prop-getter's own props, which is the
  // whole point of the getter taking Props.
  const mine: Props = { className: "mine", onClick: () => {} };

  return (
    <div>
      <input {...table.getSearchInputProps({ id: "search" })} />
      <table {...table.getTableProps(mine)}>
        <thead>
          <tr {...table.getHeaderRowProps(mine)}>
            {table.columns.map((column) => (
              <th key={column.key} {...table.getHeaderCellProps(column, mine)}>
                <button {...table.getSortButtonProps(column, mine)}>
                  {String(column.key)}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr key={table.getRowKey(row)} {...table.getRowProps(row, index, mine)}>
              {table.columns.map((column) => (
                <td key={column.key} {...table.getCellProps(column, mine)}>
                  {table.getCellContent(column, row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        {table.pagination.safePage} · {table.labels.search} · {table.dir}
      </p>
    </div>
  );
}
`;

/**
 * Split `mainEntryAliases.ts` into its type and value aliases.
 *
 * Read from the module that declares them so the fixture cannot drift: the
 * whole point is that every alias still reachable is still reached.
 */
export function aliasesIn(source) {
  const types = [];
  const values = [];
  for (const m of source.matchAll(
    /^export (type|const) ([A-Za-z_$][\w$]*)/gm
  )) {
    (m[1] === "type" ? types : values).push(m[2]);
  }
  types.sort((a, b) => a.localeCompare(b));
  values.sort((a, b) => a.localeCompare(b));
  return { types, values };
}

/** Three aliases are generic, so naming them needs a row type. */
const GENERIC = new Set([
  "BodyCell",
  "FilterHeaderRowProps",
  "RowReorderState",
]);

/** A type alias must still name a type — proved by `tsc`, not at runtime. */
export function aliasTypeProbe({ types, values }) {
  const named = [...types, ...values];
  const fields = types.map(
    (name) =>
      `  ${name[0].toLowerCase()}${name.slice(1)}: ${name}${GENERIC.has(name) ? "<Row>" : ""};`
  );
  return [
    "// Every deprecated main-entry alias, reached from the v2 import path it",
    "// has always had. They stay until v3 so existing code keeps compiling.",
    "import {",
    ...types.map((name) => `  type ${name},`),
    ...values.map((name) => `  ${name},`),
    '} from "@adapttable/core";',
    "",
    "type Row = { id: string };",
    "",
    "export type Aliases = {",
    ...fields,
    "};",
    "",
    "export const aliasValues = {",
    ...values.map((name) => `  ${name},`),
    "};",
    "",
    `export const named = ${named.length};`,
    "",
  ].join("\n");
}

/** A value alias must still be a value — proved by running it, not by tsc. */
export function aliasRuntimeProbe(values) {
  return [
    'import * as core from "@adapttable/core";',
    `const values = ${JSON.stringify(values)};`,
    "const missing = values.filter((name) => core[name] === undefined);",
    "if (missing.length > 0)",
    "  throw new Error(",
    '    "compatibility aliases missing from the packed @adapttable/core: " +',
    '      missing.join(", ")',
    "  );",
    'console.log("aliases ok (" + values.length + " values)");',
    "",
  ].join("\n");
}
