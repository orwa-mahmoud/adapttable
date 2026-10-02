/** Removable chips for the active filters. */
import type { ActiveFilterChip } from "@adapttable/react";
import type { TableLabels } from "@adapttable/react/adapter";
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
    <Wrap
      data-adapttable-part="chips"
      aria-label={labels.filters}
      as="ul"
      listStyleType="none"
    >
      {chips.map((chip) => (
        <WrapItem key={chip.key} as="li" data-adapttable-part="chip">
          <Tag.Root size="md" borderRadius="full">
            <Tag.Label>{chip.label}</Tag.Label>
            <Tag.EndElement>
              <Tag.CloseTrigger
                data-adapttable-part="chip-remove"
                aria-label={labels.removeFilter(chip.label)}
                onClick={chip.onRemove}
              />
            </Tag.EndElement>
          </Tag.Root>
        </WrapItem>
      ))}
      <WrapItem as="li" data-adapttable-part="chip">
        <Button
          data-adapttable-part="chip-remove"
          size="xs"
          variant="plain"
          onClick={onClearAll}
        >
          {labels.clearAll}
        </Button>
      </WrapItem>
    </Wrap>
  );
}
