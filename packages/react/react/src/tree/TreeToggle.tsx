/**
 * Tree-toggle layout. The leaf spacer stays here (display only). Adapters
 * pass the chevron button the end user clicks.
 */
import { resolveLabels } from "@adapttable/core";
import type {
  TreeToggleProps,
  TreeToggleSlots as NeutralTreeToggleSlots,
} from "@adapttable/core/binding";
import type { ReactElement, ReactNode } from "react";

export type {
  TreeToggleButtonProps,
  TreeToggleProps,
} from "@adapttable/core/binding";

/**
 * Adapter-supplied controls for {@link TreeToggleChrome} —
 * `@adapttable/core`'s `TreeToggleSlots` drawing React nodes.
 *
 * @public
 */
export type TreeToggleSlots = NeutralTreeToggleSlots<ReactNode>;

/**
 * Props for {@link TreeToggleChrome}.
 *
 * @public
 */
export interface TreeToggleChromeProps<TRow> extends TreeToggleProps<TRow> {
  /** The kit's components for each part. */
  readonly slots: TreeToggleSlots;
}

/**
 * Renders the chevron for a row with children, or an equal-width spacer for a
 * leaf so the column stays aligned.
 *
 * @public
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
  const copy = resolveLabels(labels);
  return (
    <Button
      label={entry.expanded ? copy.collapseRow : copy.expandRow}
      expanded={entry.expanded}
      loading={entry.loading === true}
      className={toggleClassName}
      onClick={() => {
        onToggle(entry.key);
      }}
    />
  );
}
