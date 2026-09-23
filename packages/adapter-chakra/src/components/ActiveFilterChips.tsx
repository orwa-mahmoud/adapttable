/** Removable chips for the active filters. */
import type { TableLabels } from "@adapttable/core";
import type { ActiveFilterChip } from "@adapttable/react";
import { Button, Tag, Wrap, WrapItem } from "@chakra-ui/react";

/** Removable Chakra tag chips. */
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
    <Wrap aria-label={labels.filters} as="ul" listStyleType="none">
      {chips.map((chip) => (
        <WrapItem key={chip.key} as="li">
          <Tag.Root size="md" borderRadius="full">
            <Tag.Label>{chip.label}</Tag.Label>
            <Tag.EndElement>
              <Tag.CloseTrigger
                aria-label={labels.removeFilter(chip.label)}
                onClick={chip.onRemove}
              />
            </Tag.EndElement>
          </Tag.Root>
        </WrapItem>
      ))}
      <WrapItem as="li">
        <Button size="xs" variant="plain" onClick={onClearAll}>
          {labels.clearAll}
        </Button>
      </WrapItem>
    </Wrap>
  );
}
