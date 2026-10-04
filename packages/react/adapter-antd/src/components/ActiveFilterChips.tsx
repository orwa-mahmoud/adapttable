/** Removable chips for the active filters. */
import type { ActiveFilterChip } from "@adapttable/react";
import type { TableLabels } from "@adapttable/react/adapter";
import { Button, Flex, Tag } from "antd";

/** Name the actual close control without replacing Ant Design's icon or handlers. */
function nameCloseControl(root: HTMLSpanElement | null) {
  const close = root?.querySelector<HTMLElement>('[role="button"]');
  if (!close) return;
  close.dataset.adapttablePart = "chip-remove";
  return () => {
    delete close.dataset.adapttablePart;
  };
}

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
      data-adapttable-part="chips"
      gap={4}
      wrap
      align="center"
      component="ul"
      aria-label={labels.filters}
    >
      {chips.map((chip) => (
        <li
          key={chip.key}
          data-adapttable-part="chip"
          style={{ listStyle: "none" }}
        >
          {/* The object form of `closable` forwards ARIA attributes onto the
              close control itself, which otherwise announces antd's own
              untranslated "Close". */}
          <Tag
            ref={nameCloseControl}
            closable={{
              "aria-label": labels.removeFilter(chip.label),
            }}
            onClose={chip.onRemove}
          >
            {chip.label}
          </Tag>
        </li>
      ))}
      <li data-adapttable-part="chip" style={{ listStyle: "none" }}>
        <Button
          data-adapttable-part="chip-remove"
          size="small"
          type="link"
          onClick={onClearAll}
        >
          {labels.clearAll}
        </Button>
      </li>
    </Flex>
  );
}
