/**
 * The tree column's cell: the chevron, the indent, and the cell's own content
 * on one line.
 *
 * The indent belongs to the whole cell, not to the chevron. Indenting only the
 * disclosure control leaves every name at the same margin, so a hierarchy reads
 * as a flat list with chevrons scattered through it — this wraps the content so
 * the name moves with its depth.
 *
 * Any column that is not the tree column renders its children untouched, which
 * is what lets an adapter wrap its existing cell in one place rather than
 * duplicating it behind a condition.
 */
import { treeIndentStyle } from "@adapttable/core";
import type { TreeCellProps as NeutralTreeCellProps } from "@adapttable/core/binding";
import type { ReactElement, ReactNode } from "react";

import { TreeToggleChrome, type TreeToggleSlots } from "./TreeToggle";

/**
 * Props for an adapter `TreeCell` — `@adapttable/core`'s `TreeCellProps`
 * with React content.
 *
 * @public
 */
export type TreeCellProps<TRow> = NeutralTreeCellProps<TRow, ReactNode>;

/**
 * Props for {@link TreeCellChrome}.
 *
 * @public
 */
export interface TreeCellChromeProps<TRow> extends TreeCellProps<TRow> {
  /** The kit's components for each part. */
  readonly slots: TreeToggleSlots;
}

// A leaf's first item is an empty spacer, which would set the box's baseline
// and drop the cell's text below the rest of the row; centring keeps every
// tree row the height of a plain one.
const WRAPPER = {
  display: "inline-flex",
  alignItems: "center",
  verticalAlign: "middle",
  gap: 4,
} as const;

/**
 * Wrap a cell in its tree chrome when it is the tree column, and pass it
 * through unchanged when it is not.
 *
 * @public
 */
export function TreeCellChrome<TRow>({
  entry,
  columnKey,
  treeColumnKey,
  labels,
  onToggle,
  className,
  toggleClassName,
  spacerClassName,
  children,
  slots,
}: Readonly<TreeCellChromeProps<TRow>>): ReactElement {
  if (!entry || columnKey !== treeColumnKey) return <>{children}</>;
  return (
    <span
      data-adapttable-part="tree-cell"
      className={className}
      style={{ ...WRAPPER, ...treeIndentStyle(entry.level) }}
    >
      <TreeToggleChrome
        entry={entry}
        labels={labels}
        onToggle={onToggle ?? (() => undefined)}
        toggleClassName={toggleClassName}
        spacerClassName={spacerClassName}
        slots={slots}
      />
      {children}
    </span>
  );
}
