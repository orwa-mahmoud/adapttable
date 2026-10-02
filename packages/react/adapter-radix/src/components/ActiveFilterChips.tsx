/** Removable chips for the active filters. */
import type { ActiveFilterChip } from "@adapttable/react";
import type { TableLabels } from "@adapttable/react/adapter";
import { Badge, Button, Flex, IconButton } from "@radix-ui/themes";

/** Removable Radix badge chips. */
export function Chips({
  chips,
  onClearAll,
  labels,
}: Readonly<{
  chips: readonly ActiveFilterChip[];
  onClearAll: () => void;
  labels: Required<TableLabels>;
}>) {
  if (chips.length === 0) return null;
  return (
    <Flex
      asChild
      gap="1"
      wrap="wrap"
      align="center"
      aria-label={labels.filters}
    >
      <ul
        data-adapttable-part="chips"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {chips.map((chip) => (
          <li key={chip.key} data-adapttable-part="chip">
            <Badge size="2" radius="full">
              {chip.label}
              <IconButton
                data-adapttable-part="chip-remove"
                size="1"
                variant="ghost"
                radius="full"
                color="gray"
                aria-label={labels.removeFilter(chip.label)}
                onClick={chip.onRemove}
              >
                ×
              </IconButton>
            </Badge>
          </li>
        ))}
        <li data-adapttable-part="chip">
          <Button
            data-adapttable-part="chip-remove"
            size="1"
            variant="ghost"
            onClick={onClearAll}
          >
            {labels.clearAll}
          </Button>
        </li>
      </ul>
    </Flex>
  );
}
