/**
 * Angular columns: core's column model, with renderers that are Angular
 * templates or components.
 */
import type {
  ColumnGroupDef,
  ColumnGroupRecord,
  ColumnMetadata,
} from "@adapttable/core";
import {
  columnPathText,
  flattenColumnTree,
  resolveColumnDefaults,
} from "@adapttable/core/binding";
import type { TemplateRef, Type } from "@angular/core";

/**
 * What a cell renderer receives: as a template's context (`let-row`,
 * `let-value="value"`), or as a component's inputs of the same names.
 *
 * @public
 */
export interface CellContext<TRow> {
  /** The row, so `let-row` binds it. */
  readonly $implicit: TRow;
  /** The row. */
  readonly row: TRow;
  /** The row's position in the rendered window. */
  readonly rowIndex: number;
  /** The column. */
  readonly column: ColumnDef<TRow>;
  /** The column's accessor value for the row. */
  readonly value: unknown;
}

/**
 * What a header or footer renderer receives.
 *
 * @public
 */
export interface HeaderContext<TRow> {
  /** The column, so `let-column` binds it. */
  readonly $implicit: ColumnDef<TRow>;
  /** The column. */
  readonly column: ColumnDef<TRow>;
}

/**
 * What a footer renderer receives: the column, and the summary row's value
 * for it.
 *
 * @public
 */
export interface FooterContext<TRow> extends HeaderContext<TRow> {
  /** The summary row's value for this column, or `undefined`. */
  readonly value: unknown;
}

/**
 * A renderer: an `ng-template` or a standalone component. A component
 * receives the context's fields it declares as inputs.
 *
 * @public
 */
export type Renderer<TContext> = TemplateRef<TContext> | Type<unknown>;

/**
 * One Angular column. Everything core reads — sorting, filtering, sizing,
 * `i18n` paths — comes from `ColumnMetadata`; the renderers are
 * Angular's own.
 *
 * @public
 */
export interface ColumnDef<TRow> extends Omit<ColumnMetadata<TRow>, "header"> {
  /** Plain-text header. Defaults to the key, humanized. */
  header?: string;
  /** Renders the cell. Without one, the cell shows the accessor value. */
  cell?: Renderer<CellContext<TRow>>;
  /** Renders the header content. Without one, it shows `header`. */
  headerCell?: Renderer<HeaderContext<TRow>>;
  /** Renders the footer content, handed the summary row's value. */
  footer?: Renderer<FooterContext<TRow>>;
  /**
   * Host-provided text or controls after the header caption, in a
   * `header-actions` part outside the sort button. Templates and components
   * receive the same context as `headerCell`.
   */
  headerActions?: string | Renderer<HeaderContext<TRow>>;
}

/**
 * The text of a primitive value; `null` for anything else — an object has no
 * text a cell or an attribute should show.
 */
export function primitiveText(value: unknown): string | null {
  return columnPathText(value);
}

/**
 * Fill a column's declarative defaults: a missing `header` is the key,
 * humanized, and a column without an `accessor` reads the row by its
 * locale-resolved data path — so a `cell` renderer still receives `value`.
 *
 * @param columns - The declared columns.
 * @param locale - The active locale.
 * @returns The columns, complete ones unchanged.
 *
 * @public
 */
export function resolveColumns<TRow>(
  columns: readonly ColumnDef<TRow>[],
  locale?: string
): ColumnDef<TRow>[] {
  return resolveColumnDefaults<TRow, ColumnDef<TRow>>(columns, locale);
}

/**
 * A header group over columns: its caption spans its children, which are
 * columns or further groups.
 *
 * @public
 */
export interface ColumnGroup<TRow> extends Omit<
  ColumnGroupDef<TRow>,
  "children"
> {
  /** Nested groups or columns. */
  readonly children: readonly ColumnInput<TRow>[];
}

/**
 * What a table's `columns` take: columns, and groups of them.
 *
 * @public
 */
export type ColumnInput<TRow> = ColumnDef<TRow> | ColumnGroup<TRow>;

/** Whether a column input is a group. */
function isGroup<TRow>(input: ColumnInput<TRow>): input is ColumnGroup<TRow> {
  return "children" in input && Array.isArray(input.children);
}

/** Every column under the inputs, depth first. */
function leavesOf<TRow>(
  inputs: readonly ColumnInput<TRow>[]
): ColumnDef<TRow>[] {
  return inputs.flatMap((input) =>
    isGroup(input) ? leavesOf(input.children) : [input]
  );
}

/**
 * The tree as core walks it: groups as they are, each column reduced to what
 * places it — its key and its declared group.
 */
function corePlaceOf<TRow>(input: ColumnInput<TRow>): ColumnInputPlace<TRow> {
  if (!isGroup(input)) return { key: input.key, group: input.group };
  return { ...input, children: input.children.map(corePlaceOf) };
}

/** A column input reduced to what core's tree walk reads. */
type ColumnInputPlace<TRow> =
  | Pick<ColumnMetadata<TRow>, "key" | "group">
  | (Omit<ColumnGroupDef<TRow>, "children"> & {
      readonly children: readonly ColumnInputPlace<TRow>[];
    });

/**
 * Flatten columns and groups: the columns in order, each carrying its group
 * path, and a record per group.
 *
 * @param columns - The declared columns and groups.
 * @returns The leaves and the groups by id.
 *
 * @public
 */
export function flattenColumns<TRow>(columns: readonly ColumnInput<TRow>[]): {
  readonly leaves: ColumnDef<TRow>[];
  readonly groups: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
} {
  const flat = flattenColumnTree<TRow>(columns.map(corePlaceOf));
  // Core walks the same inputs in the same order; its leaves carry the path.
  const leaves = leavesOf(columns).map((leaf, index) => ({
    ...leaf,
    group: flat.leaves[index]?.group ?? leaf.group,
  }));
  return { leaves, groups: flat.groups };
}
