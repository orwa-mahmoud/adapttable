/**
 * Compact per-column filter row under the header. Structure only —
 * adapters pass the Search, Select, range inputs and multi menu the
 * end user clicks. Same defs and extra bag the panel uses (#282).
 */
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { ColumnDef, TableLabels } from "../types";
import { ColumnSpacer } from "../virtual/ColumnSpacer";
import { defaultFilterRegistry } from "./filterBuiltins";
import { type FilterDef, filterLabel, filterStateKeys } from "./filterDefs";
import {
  type FilterFormSource,
  listFilterValues,
  useBooleanFilterWidget,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "./filterForm";
import {
  type FilterTypeRegistry,
  renderRegisteredFilter,
} from "./filterRegistry";
import { useFilterOptions } from "./useFilterOptions";

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
 * Overlay a sticky `top` on a cell or pad style.
 *
 * @public
 */
export function headerFilterStickTop(
  sticky: boolean,
  base: CSSProperties | undefined,
  top: number,
  stickyExtras?: CSSProperties
): CSSProperties | undefined {
  if (!sticky) return base;
  return { ...stickyExtras, ...base, top };
}

/**
 * Props for an adapter `FilterHeaderRow` — no slots on the public API.
 *
 * @public
 */
export interface FilterHeaderRowProps<TRow> {
  /** When false the row does not render, even if defs exist. */
  readonly enabled?: boolean;
  /** Visible columns, so each filter lands under its own header. */
  readonly columns: readonly ColumnDef<TRow>[];
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
  readonly cellStyle?: (column: ColumnDef<TRow>) => CSSProperties | undefined;
  /** Edge a column is pinned to, absent when it floats. */
  readonly pinSide?: (key: string) => "start" | "end" | undefined;
  /** Style for the spacer cells at either end. */
  readonly padStyle?: CSSProperties;
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
 * Whether a header filter holds a value worth marking its column with.
 *
 * The emptiness rules are the whole point, and they are not obvious: a cleared
 * text field leaves `""`, a cleared multi-select leaves `[]`, and a control
 * nobody touched leaves `undefined`. None of those is a filter. A funnel that
 * lights up for one is worse than no funnel at all, because a reader who trusts
 * it goes looking for a filter that is not there.
 *
 * Every adapter drew this conclusion for itself with a byte-identical copy of
 * these six lines; it belongs here, where it can be wrong in one place only.
 *
 * @public
 */
export function hasActiveHeaderFilter<TRow>(
  props: Readonly<
    Pick<FilterHeaderControlProps<TRow>, "def" | "source" | "registry">
  >
): boolean {
  return filterStateKeys(
    props.def,
    props.registry ?? defaultFilterRegistry
  ).some((key) => {
    const value = props.source.extra[key];
    if (value == null || value === "") return false;
    return !(Array.isArray(value) && value.length === 0);
  });
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
 * Adapter-supplied controls for {@link FilterHeaderChrome}.
 *
 * @public
 */
export interface FilterHeaderSlots {
  /** Renders a free-text filter. */
  readonly Search: (props: FilterHeaderSearchProps) => ReactNode;
  /** Renders a single-choice filter. */
  readonly Select: (props: FilterHeaderSelectProps) => ReactNode;
  /** Renders one bound of a range filter. */
  readonly Range: (props: FilterHeaderRangeProps) => ReactNode;
  /** Renders a multi-choice filter behind a popover. */
  readonly Multi: (props: FilterHeaderMultiProps) => ReactNode;
}

/**
 * Props for {@link FilterHeaderChrome}.
 *
 * @public
 */
export interface FilterHeaderChromeProps<
  TRow,
> extends FilterHeaderRowProps<TRow> {
  /** The kit's controls for each filter shape. */
  readonly slots: FilterHeaderSlots;
}

/**
 * Props for {@link FilterHeaderControlChrome}.
 *
 * @public
 */
export interface FilterHeaderControlChromeProps<
  TRow,
> extends FilterHeaderControlProps<TRow> {
  /** The kit's controls for each filter shape. */
  readonly slots: FilterHeaderSlots;
}

/**
 * The definition that drives a column's header filter, if any.
 *
 * @public
 */
export function filterDefForColumn<TRow>(
  defs: readonly FilterDef<TRow>[],
  key: string
): FilterDef<TRow> | undefined {
  return defs.find((def) => (def.column ?? def.key) === key);
}

function Pad({
  part,
  style,
  stickyAttr,
  className,
}: Readonly<{
  part: string;
  style?: CSSProperties;
  stickyAttr?: true;
  className?: string;
}>): ReactElement {
  return (
    <td
      data-adapttable-part={part}
      data-sticky={stickyAttr}
      style={style}
      className={className}
    />
  );
}

function TextCell<TRow>({
  def,
  source,
  labels,
  className,
  slots,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
  className?: string;
  slots: FilterHeaderSlots;
}>): ReactElement {
  const widget = useTextFilterWidget(def, source);
  const Search = slots.Search;
  return (
    <Search
      label={widget.label}
      placeholder={labels.search}
      value={widget.value}
      className={className}
      onChange={(value) => widget.write(widget.op, value)}
    />
  );
}

function SelectCell<TRow>({
  def,
  source,
  labels,
  className,
  slots,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
  className?: string;
  slots: FilterHeaderSlots;
}>): ReactElement {
  const { options } = useFilterOptions(def);
  const selected = listFilterValues(source.extra[def.key]);
  const write = (values: readonly string[]) => {
    source.setExtra(def.key, values.length > 0 ? [...values] : undefined);
  };
  const Select = slots.Select;
  return (
    <Select
      label={filterLabel(def)}
      value={selected[0] ?? ""}
      className={className}
      options={[
        { value: "", label: labels.boolAny },
        ...options.map((option) => ({
          value: option.value,
          label: option.label,
        })),
      ]}
      onChange={(value) => {
        write(value === "" ? [] : [value]);
      }}
    />
  );
}

function CompactMultiCell<TRow>({
  def,
  source,
  labels,
  className,
  menuClassName,
  slots,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
  className?: string;
  menuClassName?: string;
  slots: FilterHeaderSlots;
}>): ReactElement {
  const { options } = useFilterOptions(def);
  const selected = listFilterValues(source.extra[def.key]);
  const write = (values: readonly string[]) => {
    source.setExtra(def.key, values.length > 0 ? [...values] : undefined);
  };
  const first = options.find((option) => option.value === selected[0]);
  let summary = labels.boolAny;
  if (selected.length === 1) summary = first?.label ?? selected[0] ?? summary;
  if (selected.length > 1) summary = labels.groupCount(selected.length);
  const Multi = slots.Multi;
  return (
    <Multi
      label={filterLabel(def)}
      summary={summary}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      selected={selected}
      className={className}
      menuClassName={menuClassName}
      onToggle={(value, checked) => {
        write(
          checked
            ? [...selected, value]
            : selected.filter((item) => item !== value)
        );
      }}
    />
  );
}

function BooleanCell<TRow>({
  def,
  source,
  labels,
  className,
  slots,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
  className?: string;
  slots: FilterHeaderSlots;
}>): ReactElement {
  const widget = useBooleanFilterWidget(def, source);
  const Select = slots.Select;
  return (
    <Select
      label={widget.label}
      value={widget.choice}
      className={className}
      options={[
        { value: "", label: labels.boolAny },
        { value: "true", label: labels.boolTrue },
        { value: "false", label: labels.boolFalse },
      ]}
      onChange={(value) => widget.write(value as typeof widget.choice)}
    />
  );
}

function RangeCell<TRow>({
  def,
  source,
  className,
  slots,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  className?: string;
  slots: FilterHeaderSlots;
}>): ReactElement {
  const widget = useRangeFilterWidget(def, source);
  // Compact header has no operator picker. An unset op would wipe the
  // value on write; `gte` is the same inference a lone lower bound uses.
  const op = widget.op ?? "gte";
  const Range = slots.Range;
  return (
    <span data-adapttable-part="filter-header-input" className={className}>
      <Range
        label={widget.label}
        type={widget.inputType}
        value={widget.a}
        onChange={(value) => widget.write(op, value, widget.b)}
      />
      {widget.arity === "two" ? (
        <Range
          label={widget.label}
          type={widget.inputType}
          value={widget.b}
          onChange={(value) => widget.write(op, widget.a, value)}
        />
      ) : null}
    </span>
  );
}

function FilterHeaderCell<TRow>({
  def,
  source,
  labels,
  className,
  menuClassName,
  registry = defaultFilterRegistry,
  slots,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
  className?: string;
  menuClassName?: string;
  registry?: FilterTypeRegistry;
  slots: FilterHeaderSlots;
}>): ReactElement | null {
  const spec = registry.get(def.type);
  const custom = renderRegisteredFilter(
    def,
    source,
    labels,
    registry,
    className
  );
  if (custom) return custom;
  switch (spec?.widget ?? def.type) {
    case "text":
      return (
        <TextCell
          def={def}
          source={source}
          labels={labels}
          className={className}
          slots={slots}
        />
      );
    case "select":
      return (
        <SelectCell
          def={def}
          source={source}
          labels={labels}
          className={className}
          slots={slots}
        />
      );
    case "multiSelect":
    case "checklist":
      return (
        <CompactMultiCell
          def={def}
          source={source}
          labels={labels}
          className={className}
          menuClassName={menuClassName}
          slots={slots}
        />
      );
    case "boolean":
      return (
        <BooleanCell
          def={def}
          source={source}
          labels={labels}
          className={className}
          slots={slots}
        />
      );
    case "numberRange":
    case "dateRange":
      return (
        <RangeCell
          def={def}
          source={source}
          className={className}
          slots={slots}
        />
      );
    default:
      return null;
  }
}

/**
 * Compact control for one filter definition — used in the header row and antd titles.
 *
 * @public
 */
export function FilterHeaderControlChrome<TRow>({
  def,
  source,
  labels,
  className,
  registry = defaultFilterRegistry,
  slots,
}: Readonly<FilterHeaderControlChromeProps<TRow>>): ReactElement {
  return (
    <FilterHeaderCell
      def={def}
      source={source}
      labels={labels}
      className={className}
      registry={registry}
      slots={slots}
    />
  );
}

/**
 * Second header row of per-column quick filters. Pads and spacers match
 * the leaf header so sticky, pin offsets, and column windowing stay aligned.
 *
 * @public
 */
export function FilterHeaderChrome<TRow>({
  enabled = true,
  columns,
  defs,
  source,
  labels,
  expandable = false,
  showReorder = false,
  selection = false,
  showActions = false,
  columnSpacers,
  cellStyle,
  pinSide,
  padStyle,
  stickyAttr,
  classNames = {},
  registry = defaultFilterRegistry,
  slots,
}: Readonly<FilterHeaderChromeProps<TRow>>): ReactElement | null {
  if (!enabled || defs.length === 0) return null;
  const pad = (part: string, extra?: string) => (
    <Pad
      part={part}
      style={padStyle}
      stickyAttr={stickyAttr}
      className={[classNames.headerCell, extra].filter(Boolean).join(" ")}
    />
  );
  return (
    <tr
      data-adapttable-part="filter-header-row"
      className={classNames.filterHeaderRow}
      aria-label={labels.headerFilters}
    >
      {expandable ? pad("expand-header", classNames.expandHeader) : null}
      {showReorder ? pad("reorder-header", classNames.reorderHeader) : null}
      {selection ? pad("selection-header", classNames.selectionHeader) : null}
      {columnSpacers ? (
        <ColumnSpacer width={columnSpacers.start} side="start" as="th" />
      ) : null}
      {columns.map((column) => {
        const def = filterDefForColumn(defs, column.key);
        return (
          <th
            key={column.key}
            data-adapttable-part="filter-header-cell"
            data-sticky={stickyAttr}
            data-pinned={pinSide?.(column.key)}
            style={cellStyle?.(column)}
            className={
              [classNames.headerCell, classNames.filterHeaderCell]
                .filter(Boolean)
                .join(" ") || undefined
            }
            data-column-key={column.key}
          >
            {def ? (
              <FilterHeaderCell
                def={def}
                source={source}
                labels={labels}
                className={classNames.filterHeaderInput}
                menuClassName={classNames.filterHeaderMenu}
                registry={registry}
                slots={slots}
              />
            ) : null}
          </th>
        );
      })}
      {columnSpacers ? (
        <ColumnSpacer width={columnSpacers.end} side="end" as="th" />
      ) : null}
      {showActions ? pad("actions-header", classNames.actionsHeader) : null}
    </tr>
  );
}
