import type { ActiveFilterChip } from "@adapttable/core";
import { Anchor, Group, Pill } from "@mantine/core";

/** Props for {@link ActiveFilterChips}. */
export interface ActiveFilterChipsProps {
  /** The chips to render. */
  chips: readonly ActiveFilterChip[];
  /** Optional clear-all handler; the link is hidden when omitted. */
  onClearAll?: () => void;
  /** Accessible label for the strip. */
  label: string;
  /** Clear-all link text. */
  clearAllLabel: string;
}

/** A wrapping strip of removable filter chips. Renders nothing when empty. */
export function ActiveFilterChips({
  chips,
  onClearAll,
  label,
  clearAllLabel,
}: Readonly<ActiveFilterChipsProps>) {
  if (chips.length === 0) return null;
  return (
    <Group
      gap={6}
      aria-label={label}
      component="ul"
      style={{ listStyle: "none", padding: 0, margin: 0 }}
    >
      {chips.map((chip) => (
        <Pill
          key={chip.key}
          component="li"
          withRemoveButton
          onRemove={chip.onRemove}
          // Mantine's Pill defaults its close button to `aria-hidden` and
          // `tabIndex={-1}`, on the assumption that a surrounding widget owns
          // the keyboard. A filter chip has no such owner, so the button
          // states its own name and takes its own place in the tab order.
          removeButtonProps={{
            "aria-label": `${clearAllLabel}: ${chip.label}`,
            "aria-hidden": false,
            tabIndex: 0,
          }}
        >
          {chip.label}
        </Pill>
      ))}
      {onClearAll && (
        <Anchor
          component="button"
          type="button"
          fz="xs"
          fw={600}
          onClick={onClearAll}
        >
          {clearAllLabel}
        </Anchor>
      )}
    </Group>
  );
}
