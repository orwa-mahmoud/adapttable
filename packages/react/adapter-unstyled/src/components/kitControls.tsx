/**
 * The unstyled kit's small controls: each one the binding builds from native
 * elements, plus the header filter trigger, the multiple choice and the row
 * move menu, which keep their native disclosure markup.
 */
import { useHeaderFilterOverlay } from "@adapttable/react";
import {
  type AgentApprovalProps,
  type BatchEditBarProps,
  type ColumnGroupToggleProps,
  createAgentApproval,
  createBatchEditBar,
  createColumnGroupToggle,
  createEditableCellSlots,
  createFilterHeaderControl,
  createFilterHeaderRow,
  createFindBar,
  createGroupMoreButton,
  createRowEditActions,
  createRowReorderButtons,
  createRowReorderHandle,
  createTreeCell,
  createTreeToggle,
  type EditableCellSlots,
  type FilterHeaderControlProps,
  type FilterHeaderMultiProps,
  type FilterHeaderRowProps,
  filterLabel,
  type FindBarProps,
  type GroupMoreButtonProps,
  hasActiveHeaderFilter,
  restoreFocusSoon,
  type RowEditActionsProps,
  type RowMoveMenuSlotProps,
  type RowReorderButtonsProps,
  type RowReorderHandleProps,
  type TableSource,
  type TreeCellProps,
  type TreeToggleProps,
} from "@adapttable/react/adapter";
import { type ChangeEvent, useEffect, useRef } from "react";

import type { DataTableClassNames } from "../types";
import { AutoFilterForm } from "./AutoFilterForm";
import { FiltersIcon, iconForRowEditPart } from "./icons";
import {
  Button,
  Checkbox,
  FindInput,
  GroupToggleButton,
  IconButton,
  iconButtonOf,
  LinkButton,
  REORDER_BUTTON,
  ReorderButton,
  Select,
  TextInput,
} from "./kitPrimitives";

export type {
  AgentApprovalProps,
  BatchEditBarProps,
  ColumnGroupToggleProps,
  FilterHeaderControlProps,
  FilterHeaderRowProps,
  FindBarProps,
  GroupMoreButtonProps,
  RowEditActionsProps,
  RowReorderButtonsProps,
  RowReorderHandleProps,
  TreeCellProps,
  TreeToggleProps,
};

function HeaderMulti({
  label,
  summary,
  options,
  selected,
  className,
  menuClassName,
  onToggle,
}: Readonly<FilterHeaderMultiProps>) {
  return (
    <details style={{ position: "relative", width: "100%" }}>
      <summary
        aria-label={label}
        data-adapttable-part="filter-header-input"
        className={className}
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          boxSizing: "border-box",
          width: "100%",
          paddingBlock: 4,
          paddingInline: 8,
          border: "1px solid color-mix(in srgb, CanvasText 24%, Canvas)",
          borderRadius: 6,
          background: "Canvas",
          overflow: "hidden",
          listStyle: "none",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {summary}
        </span>
        <span aria-hidden>▾</span>
      </summary>
      <fieldset
        aria-label={label}
        data-adapttable-part="filter-header-menu"
        className={menuClassName}
        style={{
          position: "absolute",
          zIndex: 8,
          top: "100%",
          insetInlineStart: 0,
          minWidth: "100%",
          minInlineSize: 0,
          maxHeight: 220,
          overflow: "auto",
          margin: 0,
          padding: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
          background: "Canvas",
          color: "CanvasText",
          border: "1px solid color-mix(in srgb, CanvasText 24%, Canvas)",
          borderRadius: 6,
          boxShadow: "0 8px 20px rgb(0 0 0 / 12%)",
        }}
      >
        {options.map((option) => (
          <label
            key={option.value}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                onToggle(option.value, event.target.checked);
              }}
            />
            {option.label}
          </label>
        ))}
      </fieldset>
    </details>
  );
}

const headerKit = { TextInput, Select, Button, Checkbox, Multi: HeaderMulti };

/** The filter row under the column headers. */
export const FilterHeaderRow = /* @__PURE__ */ createFilterHeaderRow(headerKit);

/** One column's header filter. */
export const FilterHeaderControl =
  /* @__PURE__ */ createFilterHeaderControl(headerKit);

/** Filters icon on the column header — the same field the Filters panel draws. */
export function FilterHeaderTrigger<TRow>(
  props: Readonly<
    FilterHeaderControlProps<TRow> & { classNames?: DataTableClassNames }
  >
) {
  const active = hasActiveHeaderFilter(props);
  const { open, setOpen, source, sessionProps, resetKey } =
    useHeaderFilterOverlay(props);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  // Escape is bound to the document, like the row-move confirm below, so it
  // works wherever focus sits. It runs in the capture phase, ahead of the
  // shared dismiss that remounts the panel, and closes in place so focus can
  // return to the funnel.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setOpen(false);
      detailsRef.current?.querySelector("summary")?.focus();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [open, setOpen]);
  return (
    <details
      key={resetKey}
      ref={detailsRef}
      {...sessionProps}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      data-adapttable-part="filter-header-trigger"
      className={props.className ?? props.classNames?.filterHeaderTrigger}
      style={{ position: "relative", display: "inline-block" }}
    >
      <summary
        aria-label={filterLabel(props.def)}
        data-active={active ? "" : undefined}
        style={{
          listStyle: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          padding: 2,
        }}
      >
        <FiltersIcon size={14} />
      </summary>
      <dialog
        open
        aria-label={filterLabel(props.def)}
        data-adapttable-part="filter-header-cell"
        className={props.classNames?.filterHeaderCell}
        style={{
          position: "absolute",
          zIndex: 3,
          insetInlineStart: 0,
          insetInlineEnd: "auto",
          top: "100%",
          bottom: "auto",
          margin: 0,
          minWidth: "20rem",
          padding: "0.5rem",
          background: "Canvas",
          color: "CanvasText",
          border: "1px solid currentColor",
        }}
      >
        <AutoFilterForm
          defs={[props.def]}
          source={source as TableSource<TRow>}
          labels={props.labels}
          registry={props.registry}
          classNames={props.classNames}
        />
      </dialog>
    </details>
  );
}

/** Find in the table. */
export const FindBar = /* @__PURE__ */ createFindBar({
  TextInput: FindInput,
  IconButton,
});

/** A row's edit, save and cancel buttons: plain native buttons. */
export const RowEditActions = /* @__PURE__ */ createRowEditActions(
  { Button, IconButton: /* @__PURE__ */ iconButtonOf({}) },
  iconForRowEditPart
);

/** Save or discard a batch of edits. */
export const BatchEditBar = /* @__PURE__ */ createBatchEditBar({ Button });

/** Approve or reject a pending agent write. */
export const AgentApproval = /* @__PURE__ */ createAgentApproval({ Button });

/** A tree row's expand toggle. */
export const TreeToggle = /* @__PURE__ */ createTreeToggle({ IconButton });

/** A tree row's first cell. */
export const TreeCell = /* @__PURE__ */ createTreeCell({ IconButton });

/** A column group's collapse toggle. */
export const ColumnGroupToggle = /* @__PURE__ */ createColumnGroupToggle({
  IconButton: GroupToggleButton,
});

/** Reveal more groups or rows: a link-like button. */
export const GroupMoreButton = /* @__PURE__ */ createGroupMoreButton({
  Button: LinkButton,
});

function RowMoveMenu({
  label,
  items,
  confirmation,
}: Readonly<RowMoveMenuSlotProps>) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (confirmation && detailsRef.current) detailsRef.current.open = true;
  }, [confirmation]);
  const finish = (action: () => void) => {
    action();
    if (detailsRef.current) detailsRef.current.open = false;
    queueMicrotask(() => restoreFocusSoon(triggerRef.current));
  };
  const finishRef = useRef(finish);
  finishRef.current = finish;
  // Escape abandons the pending move. It is bound to the document rather than
  // to the dialog so it works wherever focus sits — the same route this kit's
  // filter panel takes for its own dismissal.
  useEffect(() => {
    if (!confirmation) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      finishRef.current(confirmation.onCancel);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmation]);
  return (
    <details
      ref={detailsRef}
      data-adapttable-part="row-move-menu"
      style={{ display: "inline-block", position: "relative" }}
    >
      <summary
        ref={triggerRef}
        aria-label={label}
        data-adapttable-part="row-move-menu-trigger"
        style={{ ...REORDER_BUTTON, cursor: "pointer", listStyle: "none" }}
      >
        ⋮
      </summary>
      <div
        role="menu"
        aria-label={label}
        data-adapttable-part="row-move-menu-content"
        style={{
          position: "absolute",
          zIndex: 20,
          insetInlineStart: 0,
          minWidth: "12rem",
          padding: "0.5rem",
          border: "1px solid currentColor",
          borderRadius: "0.375rem",
          background: "Canvas",
          color: "CanvasText",
        }}
      >
        {confirmation ? (
          <div
            role="alertdialog"
            aria-label={confirmation.title}
            data-adapttable-part="row-move-confirmation"
          >
            <strong>{confirmation.title}</strong>
            <p>{confirmation.description}</p>
            <button
              type="button"
              onClick={() => finish(confirmation.onConfirm)}
            >
              {confirmation.confirmLabel}
            </button>{" "}
            <button type="button" onClick={() => finish(confirmation.onCancel)}>
              {confirmation.cancelLabel}
            </button>
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              title={item.disabledReason}
              data-adapttable-part="row-move-menu-item"
              style={{
                display: "block",
                width: "100%",
                minHeight: "2.75rem",
                textAlign: "start",
              }}
              onClick={item.onSelect}
            >
              {item.label}
            </button>
          ))
        )}
      </div>
    </details>
  );
}

const rowMove = { IconButton: ReorderButton, MoveMenu: RowMoveMenu };

/** A row's drag handle. */
export const RowReorderHandle = /* @__PURE__ */ createRowReorderHandle(rowMove);

/** A row's move up and down buttons. */
export const RowReorderButtons =
  /* @__PURE__ */ createRowReorderButtons(rowMove);

/** The editable cell's activation target and its gate buttons. */
export const editableCellSlots: EditableCellSlots =
  /* @__PURE__ */ createEditableCellSlots({ Button });
