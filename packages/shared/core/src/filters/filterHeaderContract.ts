/**
 * The per-column header filter row's contract: the props a kit's
 * `FilterHeaderRow` and `FilterHeaderControl` take and the controls a kit
 * fills their Chrome with.
 *
 * Every binding's header-filter Chrome picks the same control for each filter
 * shape — a search, a select, a pair of range bounds or a multi menu; only the
 * components differ. Rendered content is the binding's `TNode`, columns are
 * its column type and inline styles its style object, so a React kit and an
 * Angular kit fill the same shapes with their own types.
 */

import type { ColumnModel } from "../contracts/columns";
import type { CssProperties } from "../style/cssProperties";
import type { TableLabels } from "../types";
import type { FilterDef } from "./filterDefs";
import type { FilterFormSource } from "./filterFormModel";
import type { FilterTypeRegistry } from "./filterRegistry";

/**
 * Class hooks the unstyled adapter maps onto `DataTableClassNames`.
 *
 * @public
 */
export interface FilterHeaderClassNames {
  /** Class for the filter row. */
  filterHeaderRow?: string;
  /** Class for one filter cell. */
  filterHeaderCell?: string;
  /** Class for the control inside a filter cell. */
  filterHeaderInput?: string;
  /** Class for a filter cell's popover. */
  filterHeaderMenu?: string;
  /** Class shared with the ordinary header cells. */
  headerCell?: string;
  /** Class for the expansion column's header cell. */
  expandHeader?: string;
  /** Class for the reorder column's header cell. */
  reorderHeader?: string;
  /** Class for the selection column's header cell. */
  selectionHeader?: string;
  /** Class for the actions column's header cell. */
  actionsHeader?: string;
}

/**
 * Props for an adapter `FilterHeaderRow` — no slots on the public API.
 *
 * @typeParam TRow - The row type.
 * @typeParam TColumn - The binding's column definition.
 * @typeParam TStyle - The binding's inline style object.
 *
 * @public
 */
export interface FilterHeaderRowProps<
  TRow,
  TColumn = ColumnModel<TRow>,
  TStyle = CssProperties,
> {
  /** When false the row does not render, even if defs exist. */
  readonly enabled?: boolean;
  /** Visible columns, so each filter lands under its own header. */
  readonly columns: readonly TColumn[];
  /** Filter definitions to render. */
  readonly defs: readonly FilterDef<TRow>[];
  /** Reads and writes the active filter values. */
  readonly source: FilterFormSource<TRow>;
  /** Custom filter types, beyond the built-ins. */
  readonly registry?: FilterTypeRegistry;
  /** Resolved labels, every key filled. */
  readonly labels: Required<TableLabels>;
  /** Whether an expansion column is injected. */
  readonly expandable?: boolean;
  /** Whether a reorder column is injected. */
  readonly showReorder?: boolean;
  /** Whether a selection column is injected. */
  readonly selection?: boolean;
  /** Whether an actions column is injected. */
  readonly showActions?: boolean;
  /** Widths standing in for columns outside the window. */
  readonly columnSpacers?: { start: number; end: number };
  /** Width and sticky offsets for a column's filter cell. */
  readonly cellStyle?: (column: TColumn) => TStyle | undefined;
  /** Edge a column is pinned to, absent when it floats. */
  readonly pinSide?: (key: string) => "start" | "end" | undefined;
  /** Style for the spacer cells at either end. */
  readonly padStyle?: TStyle;
  /** Present only when the row sticks, for styling hooks. */
  readonly stickyAttr?: true;
  /** Per-part classes for the row. */
  readonly classNames?: FilterHeaderClassNames;
}

/**
 * Props for an adapter `FilterHeaderControl` — no slots on the public API.
 *
 * @public
 */
export interface FilterHeaderControlProps<TRow> {
  /** The filter this control edits. */
  readonly def: FilterDef<TRow>;
  /** Reads and writes the active filter values. */
  readonly source: FilterFormSource<TRow>;
  /** Resolved labels, every key filled. */
  readonly labels: Required<TableLabels>;
  /** Class for the control. */
  readonly className?: string;
  /** Custom filter types, beyond the built-ins. */
  readonly registry?: FilterTypeRegistry;
  /**
   * Dismiss the overlay after a finished single-control write. Default off.
   * Wired from the table's `closeHeaderFilterOnSelect`.
   */
  readonly closeOnSelect?: boolean;
}

/**
 * One option in a header Select or multi menu.
 *
 * @public
 */
export interface FilterHeaderOption {
  /** Value stored when this option is chosen. */
  readonly value: string;
  /** Caption shown for the option. */
  readonly label: string;
}

/**
 * Kit search field a text header cell calls.
 *
 * @public
 */
export interface FilterHeaderSearchProps {
  /** Accessible name for the box. */
  readonly label: string;
  /** Placeholder text. */
  readonly placeholder: string;
  /** Current text. */
  readonly value: string;
  /** Class for the box. */
  readonly className?: string;
  /** Called with the new text on every keystroke. */
  readonly onChange: (value: string) => void;
}

/**
 * Kit Select a select/boolean header cell calls.
 *
 * @public
 */
export interface FilterHeaderSelectProps {
  /** Accessible name for the select. */
  readonly label: string;
  /** Currently chosen value. */
  readonly value: string;
  /** Choices to offer. */
  readonly options: readonly FilterHeaderOption[];
  /** Class for the select. */
  readonly className?: string;
  /** Called with the chosen value. */
  readonly onChange: (value: string) => void;
}

/**
 * Kit number/date field a range header cell calls.
 *
 * @public
 */
export interface FilterHeaderRangeProps {
  /** Accessible name for the field. */
  readonly label: string;
  /** Which input type the bound is edited with. */
  readonly type: "text" | "number" | "date";
  /** Current bound, as text. */
  readonly value: string;
  /** Called with the new bound. */
  readonly onChange: (value: string) => void;
}

/**
 * Kit compact multi menu a checklist/multiSelect header cell calls.
 *
 * @public
 */
export interface FilterHeaderMultiProps {
  /** Accessible name for the trigger. */
  readonly label: string;
  /** What the trigger shows for the current selection. */
  readonly summary: string;
  /** Choices to offer. */
  readonly options: readonly FilterHeaderOption[];
  /** Values currently checked. */
  readonly selected: readonly string[];
  /** Class for the trigger. */
  readonly className?: string;
  /** Class for the popover. */
  readonly menuClassName?: string;
  /** Called with a value and its new checked state. */
  readonly onToggle: (value: string, checked: boolean) => void;
}

/**
 * Kit-supplied controls for the header filter row's Chrome.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface FilterHeaderSlots<TNode = unknown> {
  /** Renders a free-text filter. */
  readonly Search: (props: FilterHeaderSearchProps) => TNode;
  /** Renders a single-choice filter. */
  readonly Select: (props: FilterHeaderSelectProps) => TNode;
  /** Renders one bound of a range filter. */
  readonly Range: (props: FilterHeaderRangeProps) => TNode;
  /** Renders a multi-choice filter behind a popover. */
  readonly Multi: (props: FilterHeaderMultiProps) => TNode;
}
