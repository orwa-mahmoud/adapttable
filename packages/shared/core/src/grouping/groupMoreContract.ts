/**
 * The group "show more" offer's contract: the props a kit's offer takes and
 * the button a kit fills its Chrome with.
 *
 * Every binding's offer words the same label and reveals the same page; only
 * the button differs. Rendered content is the binding's `TNode`, so a React
 * kit and an Angular kit fill the same shapes with their own types.
 */
import type { TableLabels } from "../types";

/**
 * What a "show more" offer reveals: more groups, or more rows inside one.
 *
 * @public
 */
export type GroupMoreScope = "groups" | "rows";

/**
 * Props for a kit's `GroupMoreButton` — no slots on the public API.
 *
 * @public
 */
export interface GroupMoreButtonProps {
  /** Whether this offers more groups or more rows inside one. */
  scope: GroupMoreScope;
  /** How many are still hidden. */
  remaining: number;
  /** The group whose rows are being revealed, for a `"rows"` offer. */
  groupKey?: string;
  /** Labels; falls back to the built-in English. */
  labels: Required<TableLabels>;
  /** Reveal the next page. */
  onShowMore: (entry: { scope: GroupMoreScope; groupKey?: string }) => void;
}

/**
 * Kit button the group-more chrome calls.
 *
 * @public
 */
export interface GroupMoreButtonSlotProps {
  /** Accessible name for the control. */
  readonly label: string;
  /** Called when pressed. */
  readonly onClick: () => void;
}

/**
 * Kit-supplied controls for the group-more Chrome.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface GroupMoreButtonSlots<TNode = unknown> {
  /** Renders a button. */
  readonly Button: (props: GroupMoreButtonSlotProps) => TNode;
}
