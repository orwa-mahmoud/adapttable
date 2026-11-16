/**
 * The Columns menu, built once from a kit's primitives.
 *
 * Core's column-menu model decides the rows, their actions and their labels;
 * this file lays them out and wires drag, keyboard reorder, rename and
 * Escape. The kit's primitives draw every control, and its look gives the
 * spacing that keeps the menu in its library's rhythm.
 */
import {
  ACTIONS_COLUMN_KEY,
  type ColumnMenuItem,
  type ColumnMenuLabels,
  type ColumnMenuRow,
  type ColumnMenuSlotProps,
  REORDER_COLUMN_KEY,
} from "@adapttable/core";
import {
  columnMenuActions,
  columnMenuRows,
  filterColumnMenuRows,
  hideAllColumns,
  nextPinSide,
  pinActionLabel,
  showAllColumns,
  unpinAllColumns,
} from "@adapttable/core/binding";
import { type CSSProperties, type ReactElement, useRef, useState } from "react";

import { LiveRegion } from "../a11y/LiveRegion";
import {
  type ColumnDragState,
  columnReorderKeyProps,
  useColumnDragState,
} from "../columns/columnReorder";
import { EyeIcon, GripIcon, PinIcon } from "../columns/icons";
import type { UseColumnLayoutResult } from "../columns/useColumnLayout";
import {
  type ColumnRenameEditorState,
  useColumnRenameEditor,
} from "../columns/useColumnRenameEditor";
import { useFeatureHost } from "../features/featureHostContext";
import { useEscapeClose } from "../overlays/useEscapeClose";
import { anchoredTrigger } from "./anchoredTrigger";
import { type KitRenameFieldProps, RenameForm } from "./columnRename";
import { spaceBelow } from "./panelHeight";
import { type KitUsePartClass, noPartClass } from "./partClass";
import type { KitPrimitivesOf } from "./primitives";

/**
 * The spacing and colours that keep the Columns menu in a kit's own rhythm.
 * Every style lands on a layout element the binding draws; the controls
 * inside come from the kit's primitives.
 *
 * @public
 */
export interface KitColumnMenuLook {
  /** The scrolling panel: its padding and minimum width. */
  readonly panel: CSSProperties;
  /** The caption above the search field. */
  readonly heading: CSSProperties;
  /** The search field's own margins. */
  readonly search: CSSProperties;
  /** The row of show-all, hide-all and unpin-all buttons. */
  readonly bulk: CSSProperties;
  /** One column's row: grip, eye, name, pin, more. */
  readonly row: CSSProperties;
  /** A row for a column the table injects; absent, as a column's row. */
  readonly fixedRow?: CSSProperties;
  /** The gap that stands where a fixed row has no grip. */
  readonly rowSpacer: CSSProperties;
  /** The grip, beyond what the kit's icon button gives it. */
  readonly grip: CSSProperties;
  /** A rule between groups of rows. */
  readonly divider: CSSProperties;
  /** A column's expanded actions. */
  readonly submenu: CSSProperties;
  /** A choice among a column's actions. */
  readonly choice: CSSProperties;
  /** The rename form. */
  readonly renameForm: CSSProperties;
  /** The rename form's buttons. */
  readonly renameActions: CSSProperties;
  /** The colour of the line that shows where a dragged row lands. */
  readonly accent: string;
  /**
   * Each column's controls sit straight in its item, which takes the row's
   * style and drag wiring, with the actions and the rename status beside
   * them. Absent, the item holds a row of controls with the actions below.
   */
  readonly flatItem?: boolean;
  /** Whether a rule sets the size and reset buttons apart. Absent, one does. */
  readonly footerDivider?: boolean;
  /**
   * What the kit's popover adds around the panel (padding, border, the gap
   * from its trigger), kept clear of the window's edge. Absent, nothing.
   */
  readonly panelInset?: number;
}

/** What the Columns menu draws with. */
type ColumnMenuKit = KitPrimitivesOf<
  | "Button"
  | "IconButton"
  | "TextInput"
  | "Select"
  | "Popover"
  | "Text"
  | "Divider"
> & {
  /** The kit's own rename field; absent, the label, input and error are drawn apart. */
  readonly RenameField?: (props: KitRenameFieldProps) => ReactElement;
  /**
   * The host's class for a part the menu draws itself: each item, the bulk
   * row, a column's actions and the rename form. Absent, they carry none.
   */
  readonly usePartClass?: KitUsePartClass;
};

const NOOP_RENAME = (): void => undefined;

/** The tallest the panel grows before it scrolls. */
const PANEL_MAX_HEIGHT = 480;

/** The line that shows which side of a row a dragged column lands on. */
function dropLine(edge: "before" | "after", color: string): string {
  return `inset 0 ${edge === "before" ? "2px" : "-2px"} 0 0 ${color}`;
}

interface Shared {
  readonly kit: ColumnMenuKit;
  readonly look: KitColumnMenuLook;
  readonly labels: ColumnMenuLabels;
  readonly classOf: (part: string) => string | undefined;
}

/** Eye, name and pin: what every row shows, movable or not. */
function RowControls({
  kit,
  labels,
  hidden,
  name,
  canHide = true,
  onToggleVisible,
  pinned,
  pinLabel,
  canPin = true,
  onPin,
}: Readonly<
  Omit<Shared, "look" | "classOf"> & {
    hidden: boolean;
    name: string;
    canHide?: boolean;
    onToggleVisible: () => void;
    pinned: boolean;
    pinLabel: string;
    canPin?: boolean;
    onPin: () => void;
  }
>): ReactElement {
  // Drawn fresh with its row: the compiler's cache would outweigh it.
  "use no memo";
  const { IconButton, Text } = kit;
  return (
    <>
      <IconButton
        data-adapttable-part="column-menu-visibility"
        data-active={hidden ? undefined : ""}
        aria-label={`${hidden ? labels.showColumn : labels.hideColumn}: ${name}`}
        aria-pressed={!hidden}
        tone={hidden ? "neutral" : "primary"}
        disabled={!canHide}
        onClick={onToggleVisible}
      >
        <EyeIcon off={hidden} />
      </IconButton>
      <Text
        data-adapttable-part="column-menu-label"
        data-hidden={hidden ? "" : undefined}
        tone={hidden ? "disabled" : undefined}
        style={{ flex: 1, textDecoration: hidden ? "line-through" : "none" }}
      >
        {name}
      </Text>
      <IconButton
        data-adapttable-part="column-menu-pin"
        data-active={pinned ? "" : undefined}
        aria-pressed={pinned}
        aria-label={`${pinLabel}: ${name}`}
        variant={pinned ? "filled" : "text"}
        tone={pinned ? "primary" : "neutral"}
        disabled={!canPin}
        onClick={onPin}
      >
        <PinIcon />
      </IconButton>
    </>
  );
}

/**
 * A row for a column the table injects (the reorder grips, the row actions).
 * It never moves, so it has no grip, and it pins to one side only.
 */
function FixedRow<TRow>({
  kit,
  look,
  labels,
  classOf,
  layout,
  columnKey,
  name,
  side,
}: Readonly<
  Shared & {
    layout: UseColumnLayoutResult<TRow>;
    columnKey: string;
    name: string;
    side: "start" | "end";
  }
>): ReactElement {
  // Drawn fresh with its row: the compiler's cache would outweigh it.
  "use no memo";
  const hidden = layout.isHidden(columnKey);
  const pinned = layout.state.pinned[columnKey] !== undefined;
  const pinLabel = side === "start" ? labels.pinStart : labels.pinEnd;
  const item = {
    "data-adapttable-part": "column-menu-item",
    // The reorder column leads and the actions column trails.
    [side === "start" ? "data-reorder" : "data-actions"]: "",
    "data-hidden": hidden ? "" : undefined,
    "data-pinned": pinned ? side : undefined,
    className: classOf("column-menu-item"),
  };
  const controls = (
    <>
      <span aria-hidden style={look.rowSpacer} />
      <RowControls
        kit={kit}
        labels={labels}
        hidden={hidden}
        name={name}
        onToggleVisible={() => layout.toggleVisible(columnKey)}
        pinned={pinned}
        pinLabel={pinned ? labels.unpin : pinLabel}
        onPin={() => layout.setPinned(columnKey, pinned ? undefined : side)}
      />
    </>
  );
  const rowStyle = look.fixedRow ?? look.row;
  return look.flatItem ? (
    <div {...item} style={rowStyle}>
      {controls}
    </div>
  ) : (
    <div {...item}>
      <div style={rowStyle}>{controls}</div>
    </div>
  );
}

function Submenu({
  kit,
  look,
  labels,
  classOf,
  actions,
  rename,
  onClose,
}: Readonly<
  Shared & {
    actions: readonly ColumnMenuItem[];
    rename: ColumnRenameEditorState;
    onClose: () => void;
  }
>): ReactElement {
  // Drawn fresh with its row: the compiler's cache would outweigh it.
  "use no memo";
  const { Button, Select } = kit;
  return (
    <div
      data-adapttable-part="column-menu-submenu"
      className={classOf("column-menu-submenu")}
      style={look.submenu}
    >
      {actions.map((action) =>
        "kind" in action ? (
          <Select
            key={action.id}
            fullWidth
            label={action.label}
            aria-label={action.label}
            value={action.value}
            options={action.options}
            disabled={action.disabled}
            rootPart="column-menu-choice"
            style={look.choice}
            onValueChange={action.onChange}
          />
        ) : (
          <Button
            key={action.id}
            fullWidth
            justify="start"
            data-adapttable-part="column-menu-action"
            disabled={
              action.disabled || (action.id === "rename" && rename.editing)
            }
            onClick={() => {
              action.run();
              if (action.id !== "rename") onClose();
            }}
          >
            {action.label}
          </Button>
        )
      )}
      {rename.editing ? (
        <RenameForm
          kit={kit}
          place="menu"
          labels={labels}
          classOf={classOf}
          rename={rename}
          formStyle={look.renameForm}
          actionsStyle={look.renameActions}
        />
      ) : null}
    </div>
  );
}

type RowItemProps<TRow> = Shared &
  Pick<
    ColumnMenuSlotProps<TRow>,
    | "layout"
    | "sortBy"
    | "sortDir"
    | "onSortColumn"
    | "onAutoSizeColumn"
    | "onFilterColumn"
    | "onRenameColumn"
    | "groupingPanel"
  > & {
    readonly row: ColumnMenuRow<TRow>;
    readonly drag: ColumnDragState;
  };

function RowItem<TRow>({
  kit,
  look,
  labels,
  classOf,
  row,
  layout,
  drag,
  sortBy,
  sortDir,
  onSortColumn,
  onAutoSizeColumn,
  onFilterColumn,
  onRenameColumn,
  groupingPanel,
}: Readonly<RowItemProps<TRow>>): ReactElement {
  const { IconButton } = kit;
  const { key, name, hidden, pinned, index, canMove } = row;
  const [open, setOpen] = useState(false);
  const featureHost = useFeatureHost<TRow>();
  const rename = useColumnRenameEditor({
    key,
    name,
    onRename: onRenameColumn ?? NOOP_RENAME,
    requiredMessage: labels.columnNameRequired,
    renamedMessage: labels.columnRenamed,
  });
  const actions = columnMenuActions(row, {
    featureHost,
    labels,
    layout,
    sortBy,
    sortDir,
    onSortColumn,
    onAutoSizeColumn,
    onFilterColumn,
    onBeginRename: onRenameColumn ? rename.begin : undefined,
    groupingPanel,
  });
  const indicator = canMove ? drag.rowAttrs(key, index) : {};
  const edge = indicator["data-drop"];
  const moveLabel = `${labels.moveStart} / ${labels.moveEnd}: ${name}`;
  const rowStyle: CSSProperties = {
    ...look.row,
    cursor: canMove ? "grab" : "default",
    opacity: "data-dragging" in indicator ? 0.4 : undefined,
    boxShadow: edge ? dropLine(edge, look.accent) : undefined,
  };
  const rowWiring = canMove
    ? {
        ...drag.rowDragProps(key, index),
        ...drag.dropProps(index, layout.move),
        ...indicator,
      }
    : {};
  const controls = (
    <>
      <IconButton
        data-adapttable-part="column-menu-grip"
        aria-label={moveLabel}
        disabled={!canMove}
        style={{ ...look.grip, cursor: canMove ? "grab" : "default" }}
        {...(canMove
          ? columnReorderKeyProps(key, index, layout.move, moveLabel)
          : {})}
      >
        <GripIcon />
      </IconButton>
      <RowControls
        kit={kit}
        labels={labels}
        hidden={hidden}
        name={name}
        canHide={row.canHide}
        onToggleVisible={() => layout.toggleVisible(key)}
        pinned={pinned !== undefined}
        pinLabel={pinActionLabel(pinned, labels)}
        canPin={row.canPin}
        onPin={() => layout.setPinned(key, nextPinSide(pinned))}
      />
      <IconButton
        data-adapttable-part="column-menu-more"
        aria-expanded={open}
        aria-label={`${labels.columnActions}: ${name}`}
        onClick={() => setOpen((value) => !value)}
      >
        ⋯
      </IconButton>
    </>
  );
  const details = (
    <>
      {open ? (
        <Submenu
          kit={kit}
          look={look}
          labels={labels}
          classOf={classOf}
          actions={actions}
          rename={rename}
          onClose={() => setOpen(false)}
        />
      ) : null}
      <LiveRegion part="column-rename-announcer" statusRole={false}>
        {rename.announcement}
      </LiveRegion>
    </>
  );
  const item = {
    "data-adapttable-part": "column-menu-item",
    "data-hidden": hidden ? "" : undefined,
    "data-pinned": pinned,
    className: classOf("column-menu-item"),
  };
  return look.flatItem ? (
    <div {...item} style={rowStyle} {...rowWiring}>
      {controls}
      {details}
    </div>
  ) : (
    <div {...item}>
      <div style={rowStyle} {...rowWiring}>
        {controls}
      </div>
      {details}
    </div>
  );
}

/**
 * The Columns menu: a button that opens a panel with one row per column to
 * reorder, show or hide, pin, rename, sort, filter and size it.
 *
 * It is a popover, not a menu, so list keyboard navigation never competes
 * with the grip's arrow-key reorder. With row actions or row reordering, a
 * separated trailing row manages each injected column too.
 *
 * @param kit - The kit's primitives, and its own `RenameField` where its text
 *   input draws the label and the error itself.
 * @param useLook - The kit's spacing and colours; called as a hook.
 *
 * @public
 */
export function createColumnMenu(
  kit: KitPrimitivesOf<
    | "Button"
    | "IconButton"
    | "TextInput"
    | "Select"
    | "Popover"
    | "Text"
    | "Divider"
  > & {
    readonly RenameField?: (props: KitRenameFieldProps) => ReactElement;
    readonly usePartClass?: KitUsePartClass;
  },
  useLook: () => KitColumnMenuLook
): <TRow>(props: Readonly<ColumnMenuSlotProps<TRow>>) => ReactElement {
  const { Button, TextInput, Popover, Text, Divider } = kit;
  const usePartClass = kit.usePartClass ?? noPartClass;
  return function ColumnMenu<TRow>({
    allColumns,
    layout,
    labels,
    hasRowActions = false,
    hasRowReorder = false,
    onAutoSize,
    onAutoSizeColumn,
    onSortColumn,
    onFilterColumn,
    onRenameColumn,
    sortBy,
    sortDir,
    groupingPanel,
    dir,
  }: Readonly<ColumnMenuSlotProps<TRow>>): ReactElement {
    const look = useLook();
    const classOf = usePartClass();
    const drag = useColumnDragState();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const anchorRef = useRef<HTMLButtonElement | null>(null);
    const rows = filterColumnMenuRows(
      columnMenuRows(allColumns, layout),
      query
    );
    // One owner for Escape: it closes from wherever focus sits in the panel,
    // and leaves the key to the rename field while that is being edited.
    useEscapeClose(
      open,
      () => {
        setOpen(false);
        anchorRef.current?.focus();
      },
      {
        ignoreWithin: '[data-adapttable-part="column-rename-input"]',
      }
    );
    const shared = { kit, look, labels, classOf };
    return (
      <Popover
        open={open}
        onOpenChange={setOpen}
        part="column-menu-panel"
        placement="bottom-start"
        flush
        dir={dir}
        aria-label={labels.columns}
        trigger={anchoredTrigger({
          Button,
          anchorRef,
          part: "column-menu-button",
          open,
          children: labels.columns,
        })}
      >
        <div
          dir={dir}
          style={{
            ...look.panel,
            maxHeight:
              look.panel.maxHeight ??
              spaceBelow(anchorRef.current, PANEL_MAX_HEIGHT, look.panelInset),
            overflowY: look.panel.overflowY ?? "auto",
          }}
        >
          <Text
            variant="caption"
            tone="secondary"
            data-adapttable-part="column-menu-title"
            style={look.heading}
          >
            {labels.columns}
          </Text>
          <TextInput
            type="search"
            fullWidth
            placeholder={labels.searchColumns}
            aria-label={labels.searchColumns}
            data-adapttable-part="column-menu-search"
            value={query}
            style={look.search}
            onValueChange={setQuery}
          />
          <div
            data-adapttable-part="column-menu-bulk"
            className={classOf("column-menu-bulk")}
            style={look.bulk}
          >
            <Button
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => showAllColumns(rows, layout)}
            >
              {labels.showAllColumns}
            </Button>
            <Button
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => hideAllColumns(rows, layout)}
            >
              {labels.hideAllColumns}
            </Button>
            <Button
              data-adapttable-part="column-menu-bulk-button"
              onClick={() => unpinAllColumns(rows, layout)}
            >
              {labels.unpinAllColumns}
            </Button>
          </div>
          {rows.map((row) => (
            <RowItem
              key={row.key}
              {...shared}
              row={row}
              layout={layout}
              drag={drag}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortColumn={onSortColumn}
              onAutoSizeColumn={onAutoSizeColumn}
              onFilterColumn={onFilterColumn}
              onRenameColumn={onRenameColumn}
              groupingPanel={groupingPanel}
            />
          ))}
          {hasRowReorder || hasRowActions ? (
            <Divider
              data-adapttable-part="column-menu-separator"
              style={look.divider}
            />
          ) : null}
          {hasRowReorder ? (
            <FixedRow
              {...shared}
              layout={layout}
              columnKey={REORDER_COLUMN_KEY}
              name={labels.reorderRow}
              side="start"
            />
          ) : null}
          {hasRowActions ? (
            <FixedRow
              {...shared}
              layout={layout}
              columnKey={ACTIONS_COLUMN_KEY}
              name={labels.actions}
              side="end"
            />
          ) : null}
          {look.footerDivider === false ? null : (
            <Divider style={look.divider} />
          )}
          <Button
            fullWidth
            justify="start"
            data-adapttable-part="column-menu-auto-size"
            onClick={onAutoSize}
          >
            {labels.autoSizeColumns}
          </Button>
          <Button
            fullWidth
            justify="start"
            data-adapttable-part="column-menu-reset"
            onClick={() => layout.reset()}
          >
            {labels.resetColumns}
          </Button>
        </div>
      </Popover>
    );
  };
}
