import type { Direction, UseColumnLayoutResult } from "@adapttable/core";
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
import { Button, Divider, Flex, Popover, theme } from "antd";
import { useEffect, useRef, useState } from "react";

/** Menu labels plus the actions-column display name. */
type MenuLabels = ColumnMenuLabels & { actions: string };

export interface ColumnMenuProps<TRow> extends ColumnMenuChromeProps<TRow> {
  dir?: Direction;
  /** Resolved labels, including the injected actions column's name. */
  labels: MenuLabels;
  /** List the injected row-actions column as a managed trailing row. */
  hasRowActions?: boolean;
}

/** The eye toggle shared by data rows and the trailing actions row. */
function VisibilityToggle({
  name,
  hidden,
  labels,
  onToggle,
}: Readonly<{
  name: string;
  hidden: boolean;
  labels: MenuLabels;
  onToggle: () => void;
}>) {
  return (
    <Button
      size="small"
      type={hidden ? "text" : "link"}
      aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
      aria-pressed={!hidden}
      icon={<EyeIcon off={hidden} />}
      onClick={onToggle}
    />
  );
}

/** The row's name, struck through while its column is hidden. */
function RowName({
  name,
  hidden,
}: Readonly<{ name: string; hidden: boolean }>) {
  return (
    <span
      style={{
        flex: 1,
        fontSize: 14,
        opacity: hidden ? 0.5 : 1,
        textDecoration: hidden ? "line-through" : "none",
      }}
    >
      {name}
    </span>
  );
}

/** The pin toggle; its accessible name says what the NEXT click does. */
function PinToggle({
  pinned,
  actionLabel,
  onPin,
}: Readonly<{ pinned: boolean; actionLabel: string; onPin: () => void }>) {
  return (
    <Button
      size="small"
      type={pinned ? "primary" : "text"}
      aria-label={actionLabel}
      icon={<PinIcon />}
      onClick={onPin}
    />
  );
}

/**
 * The injected row-actions column's management row. Separated from the data
 * columns and stripped to the two controls that apply: the eye and a
 * ONE-CLICK end pin (right ↔ unpinned — the actions column never moves or
 * pins left, so there is no grip and no three-way pin cycle). An invisible
 * grip keeps its controls aligned with the data rows above.
 */
function ActionsRow<TRow>({
  layout,
  labels,
}: Readonly<{ layout: UseColumnLayoutResult<TRow>; labels: MenuLabels }>) {
  const hidden = layout.isHidden(ACTIONS_COLUMN_KEY);
  const pinned = layout.state.pinned[ACTIONS_COLUMN_KEY] === "end";
  return (
    <>
      <Divider style={{ margin: "6px 0" }} />
      <Flex align="center" gap={6} style={{ padding: "2px 0" }}>
        <span
          aria-hidden="true"
          style={{ display: "inline-flex", visibility: "hidden" }}
        >
          <GripIcon />
        </span>
        <VisibilityToggle
          name={labels.actions}
          hidden={hidden}
          labels={labels}
          onToggle={() => layout.toggleVisible(ACTIONS_COLUMN_KEY)}
        />
        <RowName name={labels.actions} hidden={hidden} />
        <PinToggle
          pinned={pinned}
          actionLabel={`${pinned ? labels.unpin : labels.pinEnd}: ${labels.actions}`}
          onPin={() =>
            layout.setPinned(ACTIONS_COLUMN_KEY, pinned ? undefined : "end")
          }
        />
      </Flex>
    </>
  );
}

/**
 * AntD column-management popover: per-column drag grip (reorder), eye
 * (show/hide), and pin toggle — plus a separated trailing row for the
 * injected actions column when the table has row actions. Controlled open
 * state so Escape dismisses it (antd's Popover has no built-in Escape
 * handling) and the trigger reports `aria-expanded` like the Filters button
 * beside it.
 */
export function ColumnMenu<TRow>({
  allColumns,
  layout,
  labels,
  dir,
  hasRowActions,
}: Readonly<ColumnMenuProps<TRow>>) {
  const drag = useColumnDragState();
  const { token } = theme.useToken();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);
  // antd's Popover already paints the elevated surface (background, radius,
  // shadow) on `.ant-popover-container`. Repeating it here stacked a second
  // card inside the first — a visible card-in-a-card. Only the inner spacing
  // and width belong to us; `styles.content` below zeroes antd's own padding
  // so this is the single source of it.
  const content = (
    <div style={{ padding: 8, minWidth: 260 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          opacity: 0.6,
          padding: "0 4px 6px",
        }}
      >
        {labels.columns}
      </div>
      {columnMenuRows(allColumns, layout).map((r) => {
        // Drop-position feedback: dim the source, line the landing edge.
        const indicator = drag.rowAttrs(r.key, r.index);
        const edge = indicator["data-drop"];
        const edgeOffset = edge === "before" ? "2px" : "-2px";
        return (
          <Flex
            key={r.key}
            align="center"
            gap={6}
            style={{
              padding: "2px 0",
              cursor: "grab",
              opacity: "data-dragging" in indicator ? 0.4 : undefined,
              boxShadow: edge
                ? `inset 0 ${edgeOffset} 0 0 ${token.colorPrimary}`
                : undefined,
            }}
            {...drag.rowDragProps(r.key, r.index)}
            {...drag.dropProps(r.index, layout.move)}
            {...indicator}
          >
            <span
              style={{ display: "inline-flex", cursor: "grab", opacity: 0.55 }}
              {...columnReorderKeyProps(
                r.key,
                r.index,
                layout.move,
                `${labels.moveStart} / ${labels.moveEnd}: ${r.name}`
              )}
            >
              <GripIcon />
            </span>
            <VisibilityToggle
              name={r.name}
              hidden={r.hidden}
              labels={labels}
              onToggle={() => layout.toggleVisible(r.key)}
            />
            <RowName name={r.name} hidden={r.hidden} />
            <PinToggle
              pinned={Boolean(r.pinned)}
              actionLabel={`${pinActionLabel(r.pinned, labels)}: ${r.name}`}
              onPin={() => layout.setPinned(r.key, nextPinSide(r.pinned))}
            />
          </Flex>
        );
      })}
      {hasRowActions && <ActionsRow layout={layout} labels={labels} />}
      <Divider style={{ margin: "8px 0" }} />
      <Button size="small" type="text" onClick={() => layout.reset()}>
        {labels.resetColumns}
      </Button>
    </div>
  );
  return (
    <Popover
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement={dir === "rtl" ? "bottomLeft" : "bottomRight"}
      content={content}
      styles={{ content: { padding: 0 } }}
    >
      <Button ref={triggerRef} aria-expanded={open} aria-haspopup="true">
        {labels.columns}
      </Button>
    </Popover>
  );
}
