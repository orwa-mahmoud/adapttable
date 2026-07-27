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
  Flex,
  IconButton,
  Popover,
  Separator,
  Text,
} from "@radix-ui/themes";

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
  /** Text direction — the menu portals to `<body>`, so it loses the table's
   *  direction unless we hand it over explicitly (RTL flips grip ↔ pin). */
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
      size="1"
      variant="ghost"
      color="gray"
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
      size="2"
      color={hidden ? "gray" : undefined}
      style={{
        flex: 1,
        textDecoration: hidden ? "line-through" : undefined,
      }}
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
      size="1"
      variant={pinned ? "solid" : "ghost"}
      color={pinned ? "teal" : "gray"}
      aria-label={label}
      onClick={onClick}
    >
      <PinIcon />
    </IconButton>
  );
}

/**
 * Radix Themes column-management popover: per-column drag grip (reorder), eye
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
    <Popover.Root>
      <Popover.Trigger>
        <Button size="2" variant="outline">
          {labels.columns}
        </Button>
      </Popover.Trigger>
      <Popover.Content align="end" side="bottom" minWidth="260px" dir={dir}>
        <Flex direction="column" gap="1">
          <Text
            size="1"
            weight="bold"
            color="gray"
            style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            {labels.columns}
          </Text>
          {columnMenuRows(allColumns, layout).map((r) => {
            // Drop-position feedback: dim the source, line the landing edge.
            const indicator = drag.rowAttrs(r.key, r.index);
            const edge = indicator["data-drop"];
            const edgeOffset = edge === "before" ? "2px" : "-2px";
            return (
              <Flex
                key={r.key}
                gap="1"
                align="center"
                style={{
                  cursor: "grab",
                  padding: "2px 0",
                  opacity: "data-dragging" in indicator ? 0.4 : undefined,
                  boxShadow: edge
                    ? `inset 0 ${edgeOffset} 0 0 var(--accent-9)`
                    : undefined,
                }}
                {...drag.rowDragProps(r.key, r.index)}
                {...drag.dropProps(r.index, layout.move)}
                {...indicator}
              >
                <IconButton
                  size="1"
                  variant="ghost"
                  color="gray"
                  style={{ cursor: "grab" }}
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
                  onClick={() => layout.setPinned(r.key, nextPinSide(r.pinned))}
                />
              </Flex>
            );
          })}
          {hasRowActions && (
            <>
              <Separator my="1" size="4" />
              <Flex gap="1" align="center">
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
              </Flex>
            </>
          )}
          <Separator my="1" size="4" />
          <Button
            size="1"
            variant="ghost"
            color="gray"
            style={{ alignSelf: "flex-start" }}
            onClick={() => layout.reset()}
          >
            {labels.resetColumns}
          </Button>
        </Flex>
      </Popover.Content>
    </Popover.Root>
  );
}
