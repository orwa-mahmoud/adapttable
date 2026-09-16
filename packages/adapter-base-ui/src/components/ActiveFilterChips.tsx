/** Removable chips for the active filters. */
import type { TableLabels } from "@adapttable/core";
import type { ActiveFilterChip } from "@adapttable/react";

import { Badge, Button, IconButton } from "../ui";

/** Removable badge chips. */
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
    <ul
      aria-label={labels.filters}
      style={{
        listStyle: "none",
        padding: 0,
        margin: 0,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.25rem",
      }}
    >
      {chips.map((chip) => (
        <li key={chip.key}>
          <Badge size="2" radius="full">
            {chip.label}
            <IconButton
              size="1"
              variant="ghost"
              radius="full"
              color="gray"
              aria-label={`${labels.clearAll}: ${chip.label}`}
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
  );
}
