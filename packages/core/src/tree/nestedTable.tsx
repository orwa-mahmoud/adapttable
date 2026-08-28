/**
 * A nested table under a row — a real table, not a rendered slot.
 *
 * `renderRowDetail` hands the host a blank panel: whatever goes in it is theirs
 * to build, and a table built by hand in there has none of the sorting,
 * filtering, selection, keyboard navigation or accessibility the outer one has.
 * A nested table is the same component the page uses, so the reader gets the
 * same table twice over rather than a lesser one inside a better one.
 *
 * The host mounts the kit's own `<DataTable>` — core has no components, and the
 * child rows are a different type from the parent's, which no prop on a
 * single-generic component can carry without erasing it. What core owns is the
 * part every nested table gets wrong on its own: the defaults it must have, the
 * region that names it for assistive technology, and the fall back to a
 * hand-built panel for rows that have no nested table.
 */
import type { ReactElement, ReactNode } from "react";

import type { TableLabels } from "../types";

/** Row density, as the table's own prop spells it. */
type Density = "comfortable" | "compact";

/**
 * The props a nested table must be mounted with, handed to the host's `table`
 * callback to spread onto the kit's own component.
 *
 * @public
 */
export interface NestedTableDefaults {
  /**
   * Never true. Two tables writing `?page=` fight over one URL, and the loser
   * silently resets while the reader is using it.
   */
  urlSync: false;
  /**
   * Off by default: a second search box inside a row reads as chrome rather
   * than as a feature. Spread these first and pass `searchable` after to keep
   * it.
   */
  searchable: boolean;
  /** The parent's density, so the child matches rather than guessing. */
  density: Density | undefined;
  /** The parent's labels, so a nested table is localized like its parent. */
  labels: TableLabels | undefined;
  /** The accessible name, also used on the region around it. */
  tableLabel: string;
}

/**
 * A row's nested table.
 *
 * @public
 */
export interface NestedTable {
  /**
   * Accessible name for the nested table and its region — the only thing a
   * screen-reader user has to go on once focus is inside it. Name it after the
   * row it belongs to ("Orders for Ada Lovelace"), not after the feature.
   */
  label?: string;
  /**
   * Mount the kit's own table with these defaults:
   * `(defaults) => <DataTable {...defaults} data={row.orders} columns={cols} rowKey={id} />`.
   * The child rows keep their own type — the closure holds it, so nothing is
   * erased at a prop boundary.
   */
  table: (defaults: NestedTableDefaults) => ReactNode;
}

/**
 * A host's declaration: the nested table for a row, or nothing.
 *
 * @public
 */
export type NestedTableFor<TRow> = (row: TRow) => NestedTable | undefined;

/**
 * What the parent contributes to its nested tables.
 *
 * @internal
 */
export interface NestedTableParent {
  /** The parent's density. */
  density?: Density;
  /** The parent's labels. */
  labels?: TableLabels;
}

/** The name a nested table takes when the host does not give it one. */
const DEFAULT_LABEL = "Row details";

/**
 * The defaults a table inside a row is mounted with.
 *
 * @param label - The nested table's accessible name.
 * @param parent - What the parent table contributes.
 * @returns Props to spread onto the kit's own table.
 *
 * @internal
 */
export function nestedTableDefaults(
  label: string,
  parent: NestedTableParent = {}
): NestedTableDefaults {
  return {
    urlSync: false,
    searchable: false,
    density: parent.density,
    labels: parent.labels,
    tableLabel: label,
  };
}

/**
 * Turn a nested-table declaration into the detail renderer the table already
 * knows how to place under a row.
 *
 * @typeParam TRow - The parent row type.
 * @param options - The declaration, the host's own panel, and the parent chrome.
 * @returns A `renderRowDetail`, or `undefined` when neither is declared.
 *
 * @internal
 */
export function nestedTableDetail<TRow>(options: {
  nestedTable: NestedTableFor<TRow> | undefined;
  /** The host's own detail panel, used for rows with no nested table. */
  renderRowDetail?: (row: TRow) => ReactNode;
  parent?: NestedTableParent;
}): ((row: TRow) => ReactNode) | undefined {
  const { nestedTable, renderRowDetail, parent } = options;
  if (!nestedTable) return renderRowDetail;
  // One shape out of here, always an element or null: a union of "the host's
  // node" and "our element" reads as two functions wearing one name.
  function renderNestedDetail(row: TRow): ReactElement | null {
    const nested = nestedTable?.(row);
    if (nested) return <NestedTableRegion nested={nested} parent={parent} />;
    const own = renderRowDetail?.(row);
    return own === undefined || own === null ? null : <>{own}</>;
  }
  return renderNestedDetail;
}

/** The region around a nested table, named for assistive technology. */
function NestedTableRegion({
  nested,
  parent,
}: Readonly<{
  nested: NestedTable;
  parent?: NestedTableParent;
}>): ReactElement {
  const label = nested.label ?? DEFAULT_LABEL;
  return (
    <section data-adapttable-part="nested-table" aria-label={label}>
      {nested.table(nestedTableDefaults(label, parent))}
    </section>
  );
}
