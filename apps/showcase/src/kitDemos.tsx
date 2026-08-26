import type { ColumnDef, ColumnLayoutState } from "@adapttable/core";
import type { DataTableProps } from "@adapttable/mantine";
import {
  type ComponentType,
  lazy,
  type ReactNode,
  startTransition,
} from "react";

import { cssVars } from "./cssVars";
import type { Locale, Person } from "./data";
import {
  type DataMode,
  type Density,
  type Failure,
  type FiltersUi,
  type PageMode,
} from "./Demo";
import { ADAPTER_TOKENS } from "./themeTokens";

export type KitDemoProps = Readonly<{
  mode: DataMode;
  locale: Locale;
  dark?: boolean;
  filtersUi?: FiltersUi;
  urlKey?: string;
  density?: Density;
  animate?: boolean;
  grouping?: boolean;
  tree?: boolean;
  nested?: boolean;
  rowMode?: boolean;
  batch?: boolean;
  rowMutations?: boolean;
  rowReorder?: boolean;
  rowPinning?: boolean;
  cellSpan?: boolean;
  extraRows?: boolean;
  rowStyle?: boolean;
  /** Flash the row a change just landed on. */
  highlight?: boolean;
  /** Fail the load, so the error chrome is on screen. */
  failure?: Failure;
  /** What the error state's retry does. */
  onRecover?: () => void;
  /** Lay the mobile cards out with the demo's own `renderCard`. */
  customCard?: boolean;
  /** Apply live row patches on a timer, the way a socket feed would. */
  realtime?: boolean;
  editing?: boolean;
  headerFilters?: boolean;
  /** Mount the per-field Filters form. Default on. */
  filterFields?: boolean;
  columnGroups?: boolean;
  sparkline?: boolean;
  /**
   * Columns built from user-typed formulas, appended after the declared set.
   * The page builds them, because the page is where the formula is typed and
   * where a parse error has to be shown.
   */
  formulaColumns?: readonly ColumnDef<Person>[];
  /**
   * Write the id-derived fields (`status`, `budget`, `utilization`) onto the
   * rows. A formula reads fields, not accessors, so `=budget * 0.15` needs a
   * row that carries `budget`.
   */
  derivedFields?: boolean;
  /** Add the boolean and multi-select editor columns. */
  editorShowcase?: boolean;
  columnMenu?: boolean;
  filterControls?: boolean;
  /** Bulk actions, which are what turn row selection on. */
  bulkActions?: boolean;
  /** The strip under the table: row range, selection count, selection sums. */
  statusBar?: boolean;
  /** Right-click menus on headers, rows and cells. */
  contextMenu?: boolean;
  /** The toolbar's density control. */
  densityChooser?: boolean;
  /** Reports the density the user picked. */
  onDensityChange?: (next: "comfortable" | "compact") => void;
  /** The toolbar's fullscreen toggle. */
  fullscreen?: boolean;
  /** The Cmd/Ctrl+K command palette. */
  commandPalette?: boolean;
  /** What Print prints — a palette command, and the toolbar button's action. */
  onPrint?: () => void;
  /** A Print button in the toolbar. Needs `onPrint` to draw anything. */
  printButton?: boolean;
  /** Undo and Redo in the toolbar. Needs editing armed to do anything. */
  undoRedoButtons?: boolean;
  /** A settings panel docked beside the table. */
  sidePanel?: DataTableProps<Person>["sidePanel"];
  /** Use the wide, horizontally-scrolling column set with Person pinned. */
  wide?: boolean;
  /** The column layout a page starts from. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  /** Arrow-key cell navigation and Shift+arrow range selection. */
  cellNavigation?: boolean;
  /** A checkbox in every column header that selects the column. */
  columnSelectionCheckbox?: boolean;
  /** The toolbar Export button's configuration. */
  exportCsv?: DataTableProps<Person>["exportCsv"];
  forceMobile?: boolean;
  pageMode?: PageMode;
  focused?: boolean;
}>;

export type DemoComponent = ComponentType<KitDemoProps>;

/**
 * Every kit is its own chunk, the default one included. The shell paints
 * while that chunk arrives in parallel rather than after it — `lazy` starts
 * the import on the first render, so the table is not waiting on a click.
 */
export const ADAPTERS: Record<string, DemoComponent> = {
  mantine: lazy(() =>
    import("./adapters/MantineDemo").then((m) => ({ default: m.MantineDemo }))
  ),
  mui: lazy(() =>
    import("./adapters/MuiDemo").then((m) => ({ default: m.MuiDemo }))
  ),
  chakra: lazy(() =>
    import("./adapters/ChakraDemo").then((m) => ({ default: m.ChakraDemo }))
  ),
  antd: lazy(() =>
    import("./adapters/AntdDemo").then((m) => ({ default: m.AntdDemo }))
  ),
  radix: lazy(() =>
    import("./adapters/RadixDemo").then((m) => ({ default: m.RadixDemo }))
  ),
  "base-ui": lazy(() =>
    import("./adapters/BaseUiDemo").then((m) => ({ default: m.BaseUiDemo }))
  ),
  shadcn: lazy(() =>
    import("./adapters/ShadcnDemo").then((m) => ({ default: m.ShadcnDemo }))
  ),
  tailwind: lazy(() =>
    import("./adapters/UnstyledDemo").then((m) => ({
      default: m.UnstyledDemo,
    }))
  ),
};

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: Readonly<{
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; disabled?: boolean; title?: string }[];
  label: string;
}>) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={value === o.value ? "seg__btn is-on" : "seg__btn"}
          aria-pressed={value === o.value}
          disabled={o.disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Control({
  label,
  children,
}: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className="ctrl">
      <span className="ctrl__label">{label}</span>
      {children}
    </div>
  );
}

export function ControlPanel({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="opt-panel">
      <h2 className="opt-panel__title">{title}</h2>
      <div className="opt-panel__row">{children}</div>
    </section>
  );
}

export function DemoFallback() {
  // `aria-busy` alone: a placeholder is a state, not an announcement, and the
  // accessibility page mirrors every live region into its transcript — a kit
  // chunk arriving is not something a screen reader should read out.
  return (
    <div className="demo-surface__fallback" aria-busy="true">
      Loading adapter…
    </div>
  );
}

/** The live demo at `/` is the only page that reads `?kit=`. Unknown or
 * missing values fall back to Mantine. */
export function readKitFromUrl(): string {
  if (typeof window === "undefined") return "mantine";
  const kit = new URLSearchParams(window.location.search).get("kit");
  return kit && kit in ADAPTERS ? kit : "mantine";
}

export function KitSwitcher({
  adapter,
  dark,
  onChange,
  urlSync = false,
}: Readonly<{
  adapter: string;
  dark: boolean;
  onChange: (key: string) => void;
  /** Write `?kit=` so a link opens this adapter. Live demo only. */
  urlSync?: boolean;
}>) {
  return (
    <div className="adapterbar">
      {ADAPTER_TOKENS.map((a) => (
        <button
          key={a.key}
          type="button"
          data-testid={`adapter-${a.key}`}
          className={adapter === a.key ? "adtab is-on" : "adtab"}
          aria-pressed={adapter === a.key}
          style={cssVars({ "--c": dark ? a.accentDark : a.accentLight })}
          onClick={() => {
            if (urlSync) {
              const url = new URL(window.location.href);
              if (a.key === "mantine") url.searchParams.delete("kit");
              else url.searchParams.set("kit", a.key);
              window.history.replaceState(null, "", url);
            }
            startTransition(() => onChange(a.key));
          }}
        >
          <span className="adtab__dot" />
          <span className="adtab__l">
            <strong>{a.label}</strong>
            <small>{a.blurb}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
