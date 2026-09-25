/** Removable chips for the active filters. */
import type { TableLabels } from "@adapttable/core";
import type { ActiveFilterChip } from "@adapttable/react";
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
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {chips.map((chip) => (
          <li key={chip.key}>
            <Badge size="2" radius="full">
              {chip.label}
              <IconButton
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
        <li>
          <Button size="1" variant="ghost" onClick={onClearAll}>
            {labels.clearAll}
          </Button>
        </li>
      </ul>
    </Flex>
  );
}
