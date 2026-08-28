/**
 * Tree-toggle layout. The leaf spacer stays here (display only). Adapters
 * pass the chevron button the end user clicks.
 */
import type { ReactElement, ReactNode } from "react";

import type { TableLabels } from "../types";
import type { TreeEntry } from "./treeRows";

/** Props for an adapter `TreeToggle` — no slots on the public API. */
export interface TreeToggleProps<TRow> {
  /** The row's place in the tree. */
  entry: TreeEntry<TRow>;
  /** Labels; falls back to the built-in English. */
  labels?: TableLabels;
  /** Open or close this node. */
  onToggle: (id: string) => void;
  /** Class for the chevron — the unstyled kit's `treeToggle` hook. */
  toggleClassName?: string;
  /** Class for a leaf's placeholder — the unstyled kit's `treeSpacer` hook. */
  spacerClassName?: string;
}

/** Kit chevron the tree layout calls. */
export interface TreeToggleButtonProps {
  readonly label: string;
  readonly expanded: boolean;
  readonly loading: boolean;
  readonly className?: string;
  readonly onClick: () => void;
}

/** Adapter-supplied controls for {@link TreeToggleChrome}. */
export interface TreeToggleSlots {
  readonly Button: (props: TreeToggleButtonProps) => ReactNode;
}

/** Props for {@link TreeToggleChrome}. */
export interface TreeToggleChromeProps<TRow> extends TreeToggleProps<TRow> {
  readonly slots: TreeToggleSlots;
}

/**
 * Renders the chevron for a row with children, or an equal-width spacer for a
 * leaf so the column stays aligned.
 */
export function TreeToggleChrome<TRow>({
  entry,
  labels,
  onToggle,
  toggleClassName,
  spacerClassName,
  slots,
}: Readonly<TreeToggleChromeProps<TRow>>): ReactElement {
  if (!entry.hasChildren) {
    return (
      <span
        aria-hidden="true"
        data-adapttable-part="tree-spacer"
        className={spacerClassName}
        style={{ display: "inline-block", width: "1.5em", flexShrink: 0 }}
      />
    );
  }
  const Button = slots.Button;
  return (
    <Button
      label={
        entry.expanded
          ? (labels?.collapseRow ?? "Collapse row")
          : (labels?.expandRow ?? "Expand row")
      }
      expanded={entry.expanded}
      loading={entry.loading === true}
      className={toggleClassName}
      onClick={() => {
        onToggle(entry.key);
      }}
    />
  );
}
