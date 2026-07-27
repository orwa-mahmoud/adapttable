import type { Direction } from "@adapttable/core";
import {
  ACTIONS_COLUMN_KEY,
  columnMenuRows,
  columnReorderKeyProps,
  useColumnDragState,
} from "@adapttable/core";
import type {
  ColumnMenuChromeProps,
  ColumnMenuLabels,
} from "@adapttable/core/adapter";
import {
  EyeIcon,
  GripIcon,
  nextPinSide,
  pinActionLabel,
  PinIcon,
} from "@adapttable/core/adapter";
import {
  Button,
  HStack,
  IconButton,
  Popover,
  Portal,
  Separator,
  Text,
} from "@chakra-ui/react";

/**
 * Props for the column menu — the shared core contract, plus the injected
 * row-actions column entry (`hasRowActions` + its `actions` display name).
 */
export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  /** Resolved labels, including the actions column's display name. */
  labels: ColumnMenuLabels & { actions: string };
  /**
   * List the injected row-actions column as a separated trailing row with
   * the standard visibility toggle and a one-click end-pin toggle (the
   * actions column always trails, so it never reorders or pins left).
   */
  hasRowActions?: boolean;
  /** Text direction — flips the row layout (grip ↔ pin) under RTL, since the
   *  menu portals to `<body>` and would otherwise lose the table's direction. */
  dir?: Direction;
}

/** Eye toggle for one menu row (a data column or the actions entry). */
function VisibilityToggle({
  hidden,
  name,
  labels,
  onToggle,
}: Readonly<{
  hidden: boolean;
  name: string;
  labels: ColumnMenuLabels;
  onToggle: () => void;
}>) {
  return (
    <IconButton
      size="xs"
      variant="ghost"
      aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
      aria-pressed={!hidden}
      onClick={onToggle}
    >
      <EyeIcon off={hidden} />
    </IconButton>
  );
}

/** Menu-row label, struck through while its column is hidden. */
function RowName({
  hidden,
  name,
}: Readonly<{ hidden: boolean; name: string }>) {
  return (
    <Text
      fontSize="sm"
      flex={1}
      color={hidden ? "gray.500" : undefined}
      textDecoration={hidden ? "line-through" : undefined}
    >
      {name}
    </Text>
  );
}

/** Pin toggle for one menu row; `label` names the action it performs next. */
function PinToggle({
  pinned,
  label,
  onClick,
}: Readonly<{ pinned: boolean; label: string; onClick: () => void }>) {
  return (
    <IconButton
      size="xs"
      variant={pinned ? "solid" : "ghost"}
      colorPalette={pinned ? "teal" : "gray"}
      aria-label={label}
      onClick={onClick}
    >
      <PinIcon />
    </IconButton>
  );
}

/**
 * Chakra column-management popover: per-column drag grip (reorder), eye
 * (show/hide), and pin toggle — plus, when the table has row actions, a
 * trailing entry that hides or end-pins the injected actions column.
 */
export function ColumnMenu<TRow>({
  allColumns,
  layout,
  labels,
  hasRowActions,
  dir,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const actionsHidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const actionsPinned = layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  return (
    <Popover.Root positioning={{ placement: "bottom-end" }} lazyMount>
      <Popover.Trigger asChild>
        <Button size="sm" variant="outline">
          {labels.columns}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content minW="260px" w="auto" dir={dir}>
            <Popover.Body px={2} py={2}>
              <Text
                fontSize="xs"
                fontWeight="600"
                textTransform="uppercase"
                letterSpacing="0.06em"
                color="gray.500"
                px={1}
                pb={1}
              >
                {labels.columns}
              </Text>
              {columnMenuRows(allColumns, layout).map((r) => {
                // Drop-position feedback: dim the source, line the landing edge.
                const indicator = drag.rowAttrs(r.key, r.index);
                const edge = indicator["data-drop"];
                const edgeOffset = edge === "before" ? "2px" : "-2px";
                return (
                  <HStack
                    key={r.key}
                    gap={1}
                    py={0.5}
                    cursor="grab"
                    opacity={"data-dragging" in indicator ? 0.4 : undefined}
                    boxShadow={
                      edge
                        ? `inset 0 ${edgeOffset} 0 0 var(--chakra-colors-blue-500)`
                        : undefined
                    }
                    {...drag.rowDragProps(r.key, r.index)}
                    {...drag.dropProps(r.index, layout.move)}
                    {...indicator}
                  >
                    <IconButton
                      size="xs"
                      variant="ghost"
                      cursor="grab"
                      {...columnReorderKeyProps(
                        r.key,
                        r.index,
                        layout.move,
                        `${labels.moveStart} / ${labels.moveEnd}: ${r.name}`
                      )}
                    >
                      <GripIcon />
                    </IconButton>
                    <VisibilityToggle
                      hidden={r.hidden}
                      name={r.name}
                      labels={labels}
                      onToggle={() => layout.toggleVisible(r.key)}
                    />
                    <RowName hidden={r.hidden} name={r.name} />
                    <PinToggle
                      pinned={Boolean(r.pinned)}
                      label={`${pinActionLabel(r.pinned, labels)}: ${r.name}`}
                      onClick={() =>
                        layout.setPinned(r.key, nextPinSide(r.pinned))
                      }
                    />
                  </HStack>
                );
              })}
              {hasRowActions && (
                <>
                  <Separator my={1} />
                  <HStack gap={1} py={0.5}>
                    <VisibilityToggle
                      hidden={actionsHidden}
                      name={labels.actions}
                      labels={labels}
                      onToggle={() => layout.toggleVisible(ACTIONS_COLUMN_KEY)}
                    />
                    <RowName hidden={actionsHidden} name={labels.actions} />
                    <PinToggle
                      pinned={actionsPinned}
                      label={`${actionsPinned ? labels.unpin : labels.pinEnd}: ${labels.actions}`}
                      onClick={() =>
                        layout.setPinned(
                          ACTIONS_COLUMN_KEY,
                          actionsPinned ? undefined : "end"
                        )
                      }
                    />
                  </HStack>
                </>
              )}
              <Separator my={1} />
              <Button size="xs" variant="ghost" onClick={() => layout.reset()}>
                {labels.resetColumns}
              </Button>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
