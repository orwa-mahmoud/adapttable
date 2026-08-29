/**
 * What each entry point promises a consumer can write down.
 *
 * A type is nameable from an entry point only when a consumer of the PACKED
 * package can import it from that route. The source barrel and the emitted
 * declaration are different artifacts: the declaration bundler drops an
 * `export type` it decides nothing local needs, and it renames a duplicate
 * it keeps (`ColumnDef$1`) to a name no consumer can write. So the promise
 * is checked against `dist/*.d.ts` as shipped, never against `src/`.
 *
 * The list is deliberately representative rather than exhaustive — one wide
 * case per route (a type several routes hand back) and the narrow ones only
 * that route hands back. `consumer-harness.mjs` reads it against the tarball
 * a user installs; `packed-names.test.mjs` covers the reader itself.
 */

/**
 * `[pkg, entry, names]` — `pkg` is the installed package directory under
 * `@adapttable/`, `entry` the `dist/<entry>.d.ts` that must name them.
 */
export const NAMEABLE = [
  ["core", "features", ["BulkAction", "ExportWriter", "TableFeature"]],
  ["core", "sparkline", ["ColumnDef", "SparklineColumnSpec"]],
  ["core", "pivot", ["ColumnDef", "PivotConfig"]],
  ["core", "xlsx", ["ExportViewEntry", "ExportWriter"]],
  ["core", "pdf", ["ExportWriter", "PrintPageBreak"]],
  [
    "core",
    "adapter",
    [
      "ColumnDef",
      "ContextMenuPoint",
      "PrintToolbar",
      "Props",
      "TableContextMenuOptions",
      "UseCommandPaletteOptions",
    ],
  ],
  // The panel's props are its own interface rather than core's chrome props,
  // so the name has to arrive from shadcn itself — a star re-export of
  // unstyled cannot supply it.
  ["shadcn", "index", ["SavedViewsPanel", "SavedViewsPanelProps"]],
];

/**
 * The type-level half of the same promise, compiled against the tarballs
 * under all three module resolutions.
 *
 * Assignability alone would not prove one canonical declaration — four
 * structural copies of `ColumnDef` also assign — so this runs beside the
 * by-name check on the emitted declarations, which a renamed duplicate fails.
 */
export const NAMEABLE_PROBE = `import type { ColumnDef } from "@adapttable/core";
import type {
  ColumnDef as AdapterColumnDef,
  ContextMenuPoint,
  PrintToolbar,
  Props,
  TableContextMenuOptions,
  UseCommandPaletteOptions,
} from "@adapttable/core/adapter";
import type {
  BulkAction,
  ExportWriter as FeaturesExportWriter,
  TableFeature,
} from "@adapttable/core/features";
import type {
  ExportWriter as PdfExportWriter,
  PrintPageBreak,
} from "@adapttable/core/pdf";
import type {
  ColumnDef as PivotColumnDef,
  PivotConfig,
} from "@adapttable/core/pivot";
import type {
  ColumnDef as SparklineColumnDef,
  SparklineColumnSpec,
} from "@adapttable/core/sparkline";
import type {
  ExportViewEntry,
  ExportWriter as XlsxExportWriter,
} from "@adapttable/core/xlsx";
import type { SavedViewsPanelProps } from "@adapttable/shadcn";

type Row = { id: string; name: string };

// One declaration reached by four routes: a column written once is accepted
// everywhere it is handed back.
const column: ColumnDef<Row> = { key: "name" };
export const sparklineColumn: SparklineColumnDef<Row> = column;
export const pivotColumn: PivotColumnDef<Row> = sparklineColumn;
export const adapterColumn: AdapterColumnDef<Row> = pivotColumn;

declare const writer: FeaturesExportWriter;
export const xlsxWriter: XlsxExportWriter = writer;
export const pdfWriter: PdfExportWriter = xlsxWriter;

// Narrow cases: a type only one route hands back, named from that route.
export type Nameable = {
  bulk: BulkAction;
  feature: TableFeature<Row>;
  spec: SparklineColumnSpec<Row>;
  pivotConfig: PivotConfig;
  view: ExportViewEntry<Row>;
  pageBreak: PrintPageBreak;
  props: Props;
  printToolbar: PrintToolbar;
  point: ContextMenuPoint;
  contextMenu: TableContextMenuOptions<Row>;
  palette: UseCommandPaletteOptions;
  savedViewsPanel: SavedViewsPanelProps;
};

// The panel's props name no core chrome type, so a consumer can write the
// whole shape without importing @adapttable/core at all.
export const panel: SavedViewsPanelProps = {
  views: [],
  onApply: () => {},
  onRename: () => {},
  onMove: () => {},
  onSetDefault: () => {},
  onRemove: () => {},
};
`;

/**
 * Every name an emitted declaration file exports, however it spells it.
 *
 * Both shapes a bundler emits are read: the trailing `export { … }` block a
 * rolled-up entry ends with, and a directly exported declaration. A renamed
 * duplicate lands under its generated name (`ColumnDef$1`), so it never
 * answers for the bare one — which is the point.
 */
export function exportedNames(dts) {
  const names = new Set();
  for (const block of dts.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const part of block[1].split(",")) {
      const spec = part.trim();
      if (!spec) continue;
      const renamed = /\bas ([A-Za-z_$][\w$]*)$/.exec(spec);
      names.add(renamed ? renamed[1] : spec.replace(/^type /, ""));
    }
  }
  // Single spaces, not `\s+`: emitted declarations are machine-written, and
  // a chain of variable-width runs backtracks super-linearly on long files.
  for (const decl of dts.matchAll(
    /^export (?:declare )?(?:abstract )?(?:function|const|let|var|class|interface|type|enum) ([A-Za-z_$][\w$]*)/gm
  )) {
    names.add(decl[1]);
  }
  return names;
}

/** The promised names this declaration file does not deliver, in order. */
export function missingNames(dts, names) {
  const exported = exportedNames(dts);
  return names.filter((name) => !exported.has(name));
}
