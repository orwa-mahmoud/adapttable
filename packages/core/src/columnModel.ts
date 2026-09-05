/**
 * Neutral column and primitive table types. This module imports no React.
 */

/**
 * Sort direction for a column.
 *
 * @public
 */
export type SortDirection = "asc" | "desc";

/**
 * Comparable primitive returned by a sort-value extractor.
 *
 * @public
 */
export type SortableValue = string | number | boolean | null | undefined;

/**
 * When a leaf under a collapsible column group is visible.
 *
 * @public
 */
export type ColumnGroupShow = "open" | "closed" | "always";

/**
 * A single extra-filter value as it round-trips through URL state.
 *
 * @public
 */
export type FilterValue = string | string[] | number | undefined;

/**
 * The bag of extra (caller-defined) filter values keyed by filter name.
 *
 * @public
 */
export type ExtraFilters = Record<string, FilterValue>;

/**
 * Neutral filter metadata. React `ColumnModel` narrows this to `ColumnFilter`.
 *
 * @public
 */
export type ColumnModelFilter = string | Readonly<Record<string, unknown>>;

/**
 * Neutral editor metadata. React `ColumnModel` narrows this to `CellEditor`.
 *
 * @public
 */
export type ColumnModelEditor = string | Readonly<Record<string, unknown>>;

/**
 * Neutral column — identity, values, and operation metadata. No renderers.
 *
 * @public
 */
export interface ColumnModel<TRow = unknown> {
  /**
   * Unique within the table. Also the value sent to a backend as `sortBy`,
   * and the default row data path for the cell value.
   */
  key: string;
  /** Plain-text header caption. Bindings may store richer nodes separately. */
  header?: string;
  /** Native tooltip on the header caption. */
  headerTooltip?: string;
  /**
   * Allow the user to change this column's display name from the Columns
   * menu. The table keeps the stable `key`.
   */
  renameable?: boolean;
  /**
   * How readily this column is given up when the table is too narrow.
   * Priority 1 is kept longest.
   */
  responsivePriority?: number;
  /**
   * Presentational header group. A string is one level; a path stacks rows.
   */
  group?: string | readonly string[];
  /**
   * When this leaf sits under a collapsible group.
   */
  groupShow?: ColumnGroupShow;
  /**
   * Per-locale data paths for this column's value.
   */
  i18n?: Readonly<Record<string, string>>;
  /**
   * Declarative filter for this column. React columns narrow the type.
   */
  filter?: ColumnModelFilter;
  /**
   * Opt this column into inline cell editing.
   */
  editable?: boolean | ((row: TRow) => boolean);
  /**
   * Editor widget when editable. React columns narrow the type.
   */
  editor?: ColumnModelEditor;
  /**
   * Override the draft seed for the editor (raw value).
   */
  editValue?: (row: TRow) => string;
  /**
   * Turn the edited text back into the value to commit.
   */
  parseValue?: (draft: string, row: TRow) => unknown;
  /**
   * Gate a commit on this column's own rule.
   */
  validate?: (
    value: unknown,
    row: TRow
  ) => string | undefined | Promise<string | undefined>;
  /**
   * What this column reads from a row.
   *
   * Neutral here, because export, clipboard and selection statistics all need
   * a cell's value and none of them can render one. A binding narrows it to
   * whatever it renders — `@adapttable/react`'s `ColumnDef.accessor` returns
   * a `ReactNode` — and every context that needs plain data keeps the value
   * only when it is already a primitive or a Date, falling through to
   * `sortValue` when the binding returned something it drew instead.
   */
  accessor?: (row: TRow) => unknown;
  /**
   * Primitive extractor used by the client-side sort comparator.
   */
  sortValue?: (row: TRow) => SortableValue;
  /**
   * The value this column contributes to an export.
   */
  exportValue?: (row: TRow) => unknown;
  /**
   * The cell as plain text, for every context that cannot render JSX.
   */
  formatValue?: (row: TRow) => string;
  /** Enable sorting for this column. Off by default. */
  sortable?: boolean;
  /** Column width passed through to the rendered header/cell. */
  width?: number | string;
  /** Floor for this column's width, in pixels. */
  minWidth?: number;
  /** Ceiling for this column's width, in pixels. */
  maxWidth?: number;
  /** This column's share of leftover width when the table fits its container. */
  flex?: number;
  /** Text alignment within the cell. Defaults to `"start"`. */
  align?: "start" | "center" | "end";
  /** How many columns this cell covers. */
  colSpan?: number | ((row: TRow) => number);
  /** How many rows this cell covers. */
  rowSpan?: number | ((row: TRow) => number);
  /** Label used on mobile card layouts. */
  mobileLabel?: string;
  /** Hide this column entirely on mobile layouts. */
  hideOnMobile?: boolean;
  /** Hide this column entirely on desktop layouts. */
  hideOnDesktop?: boolean;
  /** Gray out the menu's reorder grip. */
  lockPosition?: boolean;
  /** Gray out the menu's show/hide control. */
  lockVisibility?: boolean;
  /** Gray out resize and per-column auto-size. */
  lockWidth?: boolean;
  /** Gray out the menu's pin control. */
  lockPin?: boolean;
  /** Arbitrary metadata adapters may read. */
  meta?: Record<string, unknown>;
}

/**
 * Column shape neutral helpers and the engine read. Bindings may attach
 * richer header nodes and React filter/editor specs; neutral code never
 * interprets those as renderers.
 *
 * @public
 */
export type ColumnMetadata<TRow = unknown> = Omit<
  ColumnModel<TRow>,
  "header" | "filter" | "editor"
> & {
  header?: unknown;
  filter?: unknown;
  editor?: unknown;
};
