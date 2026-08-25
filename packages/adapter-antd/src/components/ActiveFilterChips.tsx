/** Removable chips for the active filters. */
import { type ActiveFilterChip, type TableLabels } from "@adapttable/core";
import { Button, Flex, Tag } from "antd";

/** Removable antd tag chips. */
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
      gap={4}
      wrap
      align="center"
      component="ul"
      aria-label={labels.filters}
    >
      {chips.map((chip) => (
        <li key={chip.key} style={{ listStyle: "none" }}>
          {/* The object form of `closable` forwards ARIA attributes onto the
              close control itself, which otherwise announces antd's own
              untranslated "Close". */}
          <Tag
            closable={{ "aria-label": `${labels.clearAll}: ${chip.label}` }}
            onClose={chip.onRemove}
          >
            {chip.label}
          </Tag>
        </li>
      ))}
      <li style={{ listStyle: "none" }}>
        <Button size="small" type="link" onClick={onClearAll}>
          {labels.clearAll}
        </Button>
      </li>
    </Flex>
  );
}
