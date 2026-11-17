/**
 * Compact per-column filter row under the header. Structure only —
 * adapters pass the Search, Select, range inputs and multi menu the
 * end user clicks. Same defs and extra bag the panel uses (#282).
 */
import {
  defaultFilterRegistry,
  type FilterDef,
  filterDefForColumn,
  type FilterFormSource,
  type FilterTypeRegistry,
  renderRegisteredFilter,
  type TableLabels,
} from "@adapttable/core";
import {
  type FilterHeaderControlProps,
  type FilterHeaderRowProps as NeutralFilterHeaderRowProps,
  type FilterHeaderSlots as NeutralFilterHeaderSlots,
  headerFilterBooleanOptions,
  headerFilterCellKind,
  headerFilterMultiModel,
  headerFilterRangeModel,
  headerFilterSelectModel,
} from "@adapttable/core/binding";
import type { CSSProperties, ReactElement, ReactNode } from "react";

import type { ColumnDef } from "../columnDef";
import { ColumnSpacer } from "../virtual/ColumnSpacer";
import {
  useBooleanFilterWidget,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "./filterForm";
import { useFilterOptions } from "./useFilterOptions";

export type { FilterFormSource, FilterTypeRegistry };
export { filterDefForColumn } from "@adapttable/core";
export type {
  FilterHeaderClassNames,
  FilterHeaderControlProps,
  FilterHeaderMultiProps,
  FilterHeaderOption,
  FilterHeaderRangeProps,
  FilterHeaderSearchProps,
  FilterHeaderSelectProps,
} from "@adapttable/core/binding";
export { hasActiveHeaderFilter } from "@adapttable/core/binding";

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
 * Props for an adapter `FilterHeaderRow` — `@adapttable/core`'s
 * `FilterHeaderRowProps` over React's column definition and inline style.
 *
 * @public
 */
export type FilterHeaderRowProps<TRow> = NeutralFilterHeaderRowProps<
  TRow,
  ColumnDef<TRow>,
  CSSProperties
>;

/**
 * Adapter-supplied controls for {@link FilterHeaderChrome} —
 * `@adapttable/core`'s `FilterHeaderSlots` drawing React nodes.
 *
 * @public
 */
export type FilterHeaderSlots = NeutralFilterHeaderSlots<ReactNode>;

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
  const model = headerFilterSelectModel(def, source, options, labels);
  const Select = slots.Select;
  return (
    <Select
      label={model.label}
      value={model.value}
      className={className}
      options={model.options}
      onChange={model.write}
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
  const model = headerFilterMultiModel(def, source, options, labels);
  const Multi = slots.Multi;
  return (
    <Multi
      label={model.label}
      summary={model.summary}
      options={model.options}
      selected={model.selected}
      className={className}
      menuClassName={menuClassName}
      onToggle={model.toggle}
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
      options={headerFilterBooleanOptions(labels)}
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
  const model = headerFilterRangeModel(widget);
  const Range = slots.Range;
  return (
    <span data-adapttable-part="filter-header-input" className={className}>
      <Range
        label={widget.label}
        type={widget.inputType}
        value={widget.a}
        onChange={model.writeLower}
      />
      {model.showUpper ? (
        <Range
          label={widget.label}
          type={widget.inputType}
          value={widget.b}
          onChange={model.writeUpper}
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
  const custom = renderRegisteredFilter(
    def,
    source,
    labels,
    registry,
    className
  );
  if (custom) return custom as ReactElement;
  switch (headerFilterCellKind(def, registry)) {
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
    case "multi":
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
    case "range":
      return (
        <RangeCell
          def={def}
          source={source}
          className={className}
          slots={slots}
        />
      );
    case undefined:
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
