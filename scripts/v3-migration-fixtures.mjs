/**
 * Representative v2 apps and the two honest v3 upgrades, per published kit.
 *
 * The rehearsal compiles the v3 sides against packed tarballs. This module
 * only builds the source strings so the contract can be unit-tested without
 * a pack cycle.
 */

export const KITS = [
  "antd",
  "base-ui",
  "chakra",
  "mantine",
  "mui",
  "radix",
  "shadcn",
  "unstyled",
];

const SHARED_ROW = String.raw`type Row = { id: string; name: string; city: string; spend: number };
const rows: Row[] = [
  { id: "1", name: "Ada", city: "Dubai", spend: 10 },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", sortable: true, editable: true },
  { key: "city" },
  { key: "spend", align: "end" },
];
const filterDefs = [
  {
    key: "city",
    type: "text" as const,
    label: "City",
    getValue: (row: Row) => row.city,
  },
];
const save = (row: Row, key: string, next: unknown): Row => ({
  ...row,
  [key]: next as Row[keyof Row],
});
`;

/** v2 enabling-prop app — the compiler must reject every named prop. */
export function v2RichApp(kit) {
  return String.raw`import { headerGroupRows } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/${kit}";
import { DataTable } from "@adapttable/${kit}";

${SHARED_ROW}
void headerGroupRows;

export const V2Rich = () => (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    enableColumnMenu
    exportCsv
    densityChooser
    findInTable
    fitColumns
    fullscreen
    headerFilters
    multiSort
    resizableColumns
    statusBar
    groupBy="city"
    filters={filterDefs}
  />
);
`;
}

/** Shortest v3 upgrade: one preset import replaces the chrome the v2 app named. */
export function v3PresetApp(kit) {
  return String.raw`import type { ColumnDef } from "@adapttable/${kit}";
import { DataTable } from "@adapttable/${kit}";
import { standardFeatures } from "@adapttable/${kit}/preset";

${SHARED_ROW}

export const V3Preset = () => (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    features={standardFeatures({
      grouping: "city",
      filters: filterDefs,
    })}
  />
);
`;
}

/**
 * Smallest v3 upgrade: only the features the lean v2 app actually used.
 * Capability set matches {@link v2MinimalApp} — column menu, CSV, grouping,
 * cell editing — nothing else.
 */
export function v3MinimalApp(kit) {
  return String.raw`import type { TableFeature } from "@adapttable/core";
import type { ColumnDef } from "@adapttable/${kit}";
import { DataTable } from "@adapttable/${kit}";
import { columnMenu } from "@adapttable/${kit}/column-menu";
import { editing } from "@adapttable/${kit}/editing";
import { exportCsv } from "@adapttable/${kit}/export";
import { grouping } from "@adapttable/${kit}/grouping";

${SHARED_ROW}

const features: TableFeature<Row>[] = [
  grouping("city"),
  columnMenu(),
  exportCsv(),
  editing(save),
];

export const V3Minimal = () => (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    features={features}
  />
);
`;
}

/** Lean v2 app whose four enabling props become the four minimal imports. */
export function v2MinimalApp(kit) {
  return String.raw`import type { ColumnDef } from "@adapttable/${kit}";
import { DataTable } from "@adapttable/${kit}";

${SHARED_ROW}

export const V2Minimal = () => (
  <DataTable
    data={rows}
    columns={columns}
    rowKey={(row) => row.id}
    enableColumnMenu
    exportCsv
    groupBy="city"
    onCellEdit={save}
  />
);
`;
}

/** Packed declarations must refuse every removed enabling prop. */
export function v2PropsMustFail(kit) {
  const props = [
    "enableColumnMenu",
    "exportCsv",
    "groupBy",
    "filters",
    "onCellEdit",
    "densityChooser",
    "findInTable",
  ];
  const probes = props
    .map(
      (prop) =>
        `// @ts-expect-error v3 removed the ${prop} enabling prop
export const removed_${prop} = <DataTable {...base} ${prop}={undefined} />;`
    )
    .join("\n\n");
  return String.raw`import type { ColumnDef } from "@adapttable/${kit}";
import { DataTable } from "@adapttable/${kit}";

type Row = { id: string; name: string; city: string };
const rows: Row[] = [{ id: "1", name: "Ada", city: "Dubai" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }, { key: "city" }];
const base = { data: rows, columns, rowKey: (row: Row) => row.id };

${probes}
`;
}

/** Headless consumers keep the same three-prop engine. Kit-free. */
export const HEADLESS_V3 = String.raw`import type { ColumnDef } from "@adapttable/core";
import { useDataTable, useFrontendData } from "@adapttable/core";

type Row = { id: string; name: string };
const rows: Row[] = [{ id: "1", name: "Ada" }];
const columns: ColumnDef<Row>[] = [{ key: "name" }];

export function HeadlessV3() {
  const source = useFrontendData({ data: rows, columns, getRowId: (row) => row.id });
  const table = useDataTable({ source, columns, rowKey: (row) => row.id });
  return <table {...table.getTableProps()}>{table.rows.length}</table>;
}
`;
