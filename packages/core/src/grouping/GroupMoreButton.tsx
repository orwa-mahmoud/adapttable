/**
 * The offer that reveals the next page of groups, or of a group's rows.
 *
 * Wording and the part name stay here so they cannot drift. Adapters pass
 * the button the end user clicks.
 */
import type { ReactElement, ReactNode } from "react";

import type { TableLabels } from "../types";

/**
 * Props for an adapter `GroupMoreButton` — no slots on the public API.
 *
 * @public
 */
export interface GroupMoreButtonProps {
  /** Whether this offers more groups or more rows inside one. */
  scope: "groups" | "rows";
  /** How many are still hidden. */
  remaining: number;
  /** The group whose rows are being revealed, for a `"rows"` offer. */
  groupKey?: string;
  /** Labels; falls back to the built-in English. */
  labels: Required<TableLabels>;
  /** Reveal the next page. */
  onShowMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
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
 * Adapter-supplied controls for {@link GroupMoreButtonChrome}.
 *
 * @public
 */
export interface GroupMoreButtonSlots {
  readonly Button: (props: GroupMoreButtonSlotProps) => ReactNode;
}

/**
 * Props for {@link GroupMoreButtonChrome}.
 *
 * @public
 */
export interface GroupMoreButtonChromeProps extends GroupMoreButtonProps {
  /** The kit's components for each part. */
  readonly slots: GroupMoreButtonSlots;
}

/**
 * Renders the offer through the adapter's button.
 *
 * @public
 */
export function GroupMoreButtonChrome({
  scope,
  remaining,
  groupKey,
  labels,
  onShowMore,
  slots,
}: Readonly<GroupMoreButtonChromeProps>): ReactElement {
  const Button = slots.Button;
  return (
    <Button
      label={
        scope === "groups"
          ? labels.moreGroups(remaining)
          : labels.moreRowsInGroup(remaining)
      }
      onClick={() => {
        onShowMore({ scope, groupKey });
      }}
    />
  );
}
