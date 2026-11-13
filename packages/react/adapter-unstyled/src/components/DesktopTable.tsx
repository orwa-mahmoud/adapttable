/** The desktop table, drawn by the binding with native table elements. */
import {
  createDesktopTable,
  edgePinStyle,
  groupedHeaderCellStyle,
  isCurrentMatchCell,
  isMatchedCell,
  isSelectedCell,
  type KitCheckboxProps,
  type KitDesktopCellProps,
  type KitDesktopHeaderCellProps,
  type KitDesktopPaint,
  type KitDesktopRowProps,
  type KitSortLabelProps,
  PIN_Z,
  type SharedTableRenderProps,
} from "@adapttable/react/adapter";
import type { CSSProperties, ReactNode } from "react";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import {
  useClassNames,
  useClassOfPart,
  usePartClass,
} from "./classNamesContext";
import { Checkbox as NativeCheckbox } from "./kitPrimitives";
import { RowActionButtons } from "./RowActionButtons";

export interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  classNames: DataTableClassNames;
  /**
   * Whether the user pinned the injected actions column to the inline end
   * (one click in the Columns menu) — sticks it independently of any data
   * pin on that side.
   */
  actionsPinned?: boolean;
}

/** The rail and header cells that also take the shared cell class. */
const SHARED_CLASS: Readonly<Partial<Record<string, "cell" | "headerCell">>> = {
  "reorder-cell": "cell",
  "selection-cell": "cell",
  "actions-cell": "cell",
  "expand-header": "headerCell",
  "reorder-header": "headerCell",
  "selection-header": "headerCell",
  "actions-header": "headerCell",
};

/** The class of a part, after the shared cell class some rails also take. */
function usePartClasses(part: string | undefined): string | undefined {
  const classNames = useClassNames();
  const own = useClassOfPart(part);
  const shared = part === undefined ? undefined : SHARED_CLASS[part];
  return shared === undefined ? own : cx(classNames[shared], own);
}

/**
 * The paint: rails stick flush to their edge, the header sticks over the
 * rows, and selected or matched cells are marked by the host's classes.
 */
function usePaint(): KitDesktopPaint {
  return PAINT;
}

const PAINT: KitDesktopPaint = {
  rail: (side, pinned) => edgePinStyle(side, pinned, PIN_Z.body),
  cell: (pin) => pin,
  selectedCell: {},
  classHighlight: true,
  summaryCell: {},
  headRail: (side, pinned, _inset, pin) => pin.edgeHeadStyle(side, pinned),
  leaf: (leaf) => leaf.style,
  group: (cell) =>
    groupedHeaderCellStyle(
      cell,
      "color-mix(in srgb, CanvasText 22%, transparent)"
    ),
  resizeHandle: (style) => style,
  // The caption sits in the header cell's own flow.
  captionRow: () => CAPTION_IN_FLOW,
};

const CAPTION_IN_FLOW: CSSProperties = { display: "contents" };

/** A row: a body row takes the row class, the others their part's. */
export function Row({
  kind,
  elementRef,
  selected: _selected,
  className,
  ...rest
}: Readonly<KitDesktopRowProps>) {
  "use no memo";
  const classNames = useClassNames();
  const own = useClassOfPart(rest["data-adapttable-part"]);
  return (
    <tr
      ref={elementRef}
      className={kind === "body" ? cx(classNames.row, className) : own}
      {...rest}
    />
  );
}

/** A data cell's classes: the cell's, then its span, selection and match. */
function dataCellClass(
  classNames: DataTableClassNames,
  props: Readonly<Omit<KitDesktopCellProps, "kind">>
): string {
  return [
    classNames.cell,
    props["data-cell-span"] ? classNames.cellSpan : "",
    isSelectedCell(props) ? classNames.cellSelected : "",
    isMatchedCell(props) ? classNames.cellMatch : "",
    isCurrentMatchCell(props) ? classNames.cellMatchCurrent : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function Cell({ kind, ...rest }: Readonly<KitDesktopCellProps>) {
  "use no memo";
  const classNames = useClassNames();
  const own = usePartClasses(rest["data-adapttable-part"]);
  return (
    <td
      className={
        kind === "data" && rest["data-adapttable-part"] === "cell"
          ? dataCellClass(classNames, rest)
          : own
      }
      {...rest}
    />
  );
}

function HeaderCell({
  kind: _kind,
  railWidth: _railWidth,
  ...rest
}: Readonly<KitDesktopHeaderCellProps>) {
  "use no memo";
  return (
    <th className={usePartClasses(rest["data-adapttable-part"])} {...rest} />
  );
}

function Foot(
  props: Readonly<{ "data-adapttable-part": string; children: ReactNode }>
) {
  "use no memo";
  return <tfoot className={useClassNames().summary} {...props} />;
}

/** The selection checkboxes, each named `checkbox` for the host's styles. */
function Checkbox(props: Readonly<KitCheckboxProps>) {
  "use no memo";
  return (
    <NativeCheckbox
      data-adapttable-part="checkbox"
      className={useClassNames().checkbox}
      {...props}
    />
  );
}

/** The arrow a sortable column shows: both ways until it is sorted. */
function sortGlyph(active: boolean, dir: "asc" | "desc" | undefined): string {
  if (!active) return "↕";
  return dir === "asc" ? "↑" : "↓";
}

/** The caption as a native button, its sort level and its arrow. */
function SortLabel({
  active,
  dir,
  index,
  title,
  buttonProps,
  children,
}: Readonly<KitSortLabelProps>) {
  "use no memo";
  const classNames = useClassNames();
  return (
    <button
      {...buttonProps}
      data-adapttable-part="sort-button"
      className={classNames.sortButton}
      title={title}
    >
      {children}
      {typeof index === "number" && (
        <span
          data-adapttable-part="sort-index"
          className={classNames.sortIndex}
        >
          {index}
        </span>
      )}
      <span aria-hidden> {sortGlyph(active, dir)}</span>
    </button>
  );
}

/** Desktop semantic table rendering. */
export const DesktopTable = /* @__PURE__ */ createDesktopTable<
  Record<never, never>
>({
  widths: { expansion: 32, selection: 44, actions: 120 },
  Row,
  Cell,
  HeaderCell,
  Foot,
  Checkbox,
  SortLabel,
  RowActions: RowActionButtons,
  usePaint,
  usePartClass,
  useChrome: () => ({ classNames: { ...useClassNames() } }),
});
