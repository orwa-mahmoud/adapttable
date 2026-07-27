import type {
  ColumnMenuChromeProps,
  ColumnMenuLabels,
  Direction,
  UseColumnLayoutResult,
} from "@adapttable/core";
import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  columnReorderKeyProps,
  EyeIcon,
  GripIcon,
  nextPinSide,
  pinActionLabel,
  PinIcon,
  useColumnDragState,
} from "@adapttable/core";
import {
  ActionIcon,
  Box,
  Button,
  Divider,
  Group,
  Popover,
  Text,
} from "@mantine/core";
import { useState } from "react";

/**
 * Props for the column menu — the shared core contract, plus the injected
 * actions column: when the table has row actions, the menu lists it too
 * (named by `labels.actions`) with an eye toggle and a one-click end-pin.
 */
export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  /** Resolved labels — the shared menu set plus the actions-column name. */
  labels: ColumnMenuLabels & { actions: string };
  /** Whether the table has row actions (lists the injected actions column). */
  hasRowActions?: boolean;
  /** Text direction — the menu portals to `<body>`, so it loses the table's
   *  direction unless we hand it over explicitly (RTL flipped grip ↔ pin). */
  dir?: Direction;
}

/** The eye toggle + struck-through name shared by data and actions rows. */
function RowVisibility({
  hidden,
  name,
  labels,
  onToggle,
}: Readonly<{
  hidden: boolean;
  name: string;
  labels: Pick<ColumnMenuLabels, "showColumn" | "hideColumn">;
  onToggle: () => void;
}>) {
  return (
    <>
      <ActionIcon
        variant={hidden ? "subtle" : "light"}
        color={hidden ? "gray" : "blue"}
        size="sm"
        aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
        aria-pressed={!hidden}
        onClick={onToggle}
      >
        <EyeIcon off={hidden} />
      </ActionIcon>
      <Text
        size="sm"
        style={{ flex: 1 }}
        c={hidden ? "dimmed" : undefined}
        td={hidden ? "line-through" : undefined}
      >
        {name}
      </Text>
    </>
  );
}

/** The pin control shared by data and actions rows. */
function PinToggle({
  pinned,
  label,
  onClick,
}: Readonly<{ pinned: boolean; label: string; onClick: () => void }>) {
  return (
    <ActionIcon
      variant={pinned ? "filled" : "subtle"}
      color={pinned ? "blue" : "gray"}
      size="sm"
      aria-label={label}
      onClick={onClick}
    >
      <PinIcon />
    </ActionIcon>
  );
}

/**
 * The injected actions column's menu row: the same eye toggle as data
 * columns plus a pin toggle that flips right ↔ unpinned in one click. No
 * drag grip (the column always trails) and no left pin.
 */
function ActionsRow<TRow>({
  layout,
  labels,
}: Readonly<{
  layout: UseColumnLayoutResult<TRow>;
  labels: ColumnMenuProps<TRow>["labels"];
}>) {
  const hidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const pinned = layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  return (
    <Group justify="flex-start" wrap="nowrap" gap={6} px={4} py={2}>
      {/* Spacer where data rows show the drag grip, keeping toggles aligned. */}
      <Box w={22} />
      <RowVisibility
        hidden={hidden}
        name={labels.actions}
        labels={labels}
        onToggle={() => layout.toggleVisible(ACTIONS_COLUMN_KEY)}
      />
      <PinToggle
        pinned={pinned}
        label={`${pinned ? labels.unpin : labels.pinEnd}: ${labels.actions}`}
        onClick={() =>
          layout.setPinned(ACTIONS_COLUMN_KEY, pinned ? undefined : "end")
        }
      />
    </Group>
  );
}

/**
 * Column-management popover: per-column drag grip (reorder), eye (show/hide),
 * and pin toggle. Keyboard users focus a grip and use arrow keys.
 */
export function ColumnMenu<TRow>({
  allColumns,
  layout,
  labels,
  hasRowActions = false,
  dir,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const [opened, setOpened] = useState(false);
  // A Popover, not a Menu: the panel holds checkboxes, drag handles and
  // buttons, so `role="menu"` semantics (menuitem children) would be a lie.
  return (
    <Popover
      opened={opened}
      onDismiss={() => setOpened(false)}
      position="bottom-end"
      withinPortal
      returnFocus
    >
      <Popover.Target>
        <Button
          variant="default"
          size="sm"
          aria-expanded={opened}
          onClick={() => setOpened((value) => !value)}
        >
          {labels.columns}
        </Button>
      </Popover.Target>
      <Popover.Dropdown dir={dir}>
        <Box p={4} miw={250}>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" px={4} pb={6}>
            {labels.columns}
          </Text>
          {columnMenuRows(allColumns, layout).map((r) => {
            // Drop-position feedback: dim the dragged row, draw an
            // insertion line on the hovered target's landing edge.
            const indicator = drag.rowAttrs(r.key, r.index);
            const edge = indicator["data-drop"];
            const edgeOffset = edge === "before" ? "2px" : "-2px";
            return (
              <Group
                key={r.key}
                justify="flex-start"
                wrap="nowrap"
                gap={6}
                px={4}
                py={2}
                style={{
                  cursor: "grab",
                  opacity: "data-dragging" in indicator ? 0.4 : undefined,
                  boxShadow: edge
                    ? `inset 0 ${edgeOffset} 0 0 var(--mantine-primary-color-filled)`
                    : undefined,
                }}
                {...drag.rowDragProps(r.key, r.index)}
                {...drag.dropProps(r.index, layout.move)}
                {...indicator}
              >
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="sm"
                  style={{ cursor: "grab" }}
                  {...columnReorderKeyProps(
                    r.key,
                    r.index,
                    layout.move,
                    `${labels.moveStart} / ${labels.moveEnd}: ${r.name}`
                  )}
                >
                  <GripIcon />
                </ActionIcon>
                <RowVisibility
                  hidden={r.hidden}
                  name={r.name}
                  labels={labels}
                  onToggle={() => layout.toggleVisible(r.key)}
                />
                <PinToggle
                  pinned={r.pinned !== undefined}
                  label={`${pinActionLabel(r.pinned, labels)}: ${r.name}`}
                  onClick={() => layout.setPinned(r.key, nextPinSide(r.pinned))}
                />
              </Group>
            );
          })}
          {hasRowActions && (
            <>
              <Divider my={4} />
              <ActionsRow layout={layout} labels={labels} />
            </>
          )}
          <Divider my={4} />
          <Button
            variant="subtle"
            size="xs"
            fullWidth
            justify="flex-start"
            onClick={() => layout.reset()}
          >
            {labels.resetColumns}
          </Button>
        </Box>
      </Popover.Dropdown>
    </Popover>
  );
}
