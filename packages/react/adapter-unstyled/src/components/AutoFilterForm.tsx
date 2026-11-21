import {
  CHECKLIST_LIST_HEIGHT,
  filterOpLabel,
  useBooleanFilterWidget,
  useFilterOptions,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "@adapttable/react";
import {
  booleanFilterSpecs,
  checklistFilterSpecs,
  defaultFilterRegistry,
  FILTER_LABELS,
  type FilterDef,
  type FilterFormSource,
  filterLabel,
  type FilterTypeRegistry,
  type FilterValue,
  type FilterWidget,
  FilterWidgetField,
  type FilterWidgetProps,
  joinRelativeToken,
  multiSelectFilterSpecs,
  rangeFilterSpecs,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  resolveTableLabels,
  selectFilterSpecs,
  splitRelativeToken,
  type TableLabels,
  type TableSource,
  textFilterSpecs,
} from "@adapttable/react/adapter";
import { type CSSProperties, type ReactNode, useId } from "react";

import type { DataTableClassNames } from "../types";
import { ChecklistFilter } from "./ChecklistFilter";

const FORM_LABELS = [FILTER_LABELS];

/** No class overrides: the parts keep only their `data-adapttable-part` hooks. */
const NO_CLASS_NAMES: DataTableClassNames = {};

/* Part names shared by more than one field shape. */
const FIELD_PART = "filter-field";
const LABEL_PART = "filter-label";

/** Column stack so the caption is a flex item (legend ignored gap). */
const FIELD_STACK: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 16,
  minWidth: 0,
  margin: 0,
  padding: 0,
  border: 0,
};

/** A filter-bag value as input text (`undefined` renders empty). */
function asText(value: FilterValue): string {
  return String(value ?? "");
}

/** A `multiSelect` bag value as an array, tolerating a scalar from the URL. */
function selectedValues(value: FilterValue): string[] {
  if (Array.isArray(value)) return value;
  if (value == null || value === "") return [];
  return [String(value)];
}

/** Props shared by every per-definition field component. */
interface DefFieldProps<TRow> {
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  /** Per-part class name overrides (the `filter*` keys). */
  classNames?: DataTableClassNames;
}

interface GroupFieldProps {
  caption: string;
  classNames: DataTableClassNames;
  children: ReactNode;
}

/** Native labelled group for multi-control fields — no visible fieldset box. */
function GroupField({
  caption,
  classNames,
  children,
}: Readonly<GroupFieldProps>) {
  "use no memo";
  const id = useId();
  return (
    <fieldset
      aria-labelledby={id}
      data-adapttable-part={FIELD_PART}
      className={classNames.filterField}
      style={FIELD_STACK}
    >
      <div
        id={id}
        data-adapttable-part={LABEL_PART}
        className={classNames.filterLabel}
      >
        {caption}
      </div>
      {children}
    </fieldset>
  );
}

function TextField<TRow>({
  def,
  source,
  classNames = NO_CLASS_NAMES,
  labels,
}: Readonly<DefFieldProps<TRow> & { labels: Required<TableLabels> }>) {
  "use no memo";
  const { label, ops, opLabelKeys, op, value, needsValue, write } =
    useTextFilterWidget(def, source);
  return (
    <GroupField caption={label} classNames={classNames}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <select
          style={{ flex: "0 0 8.5rem", width: "8.5rem" }}
          aria-label={labels.operator}
          data-adapttable-part="filter-operator"
          className={classNames.filterOperator}
          value={op}
          onChange={(e) => {
            const next = ops.find((choice) => choice === e.currentTarget.value);
            if (next) write(next, value);
          }}
        >
          {ops.map((choice) => (
            <option key={choice} value={choice}>
              {filterOpLabel(labels, opLabelKeys[choice])}
            </option>
          ))}
        </select>
        {needsValue && (
          <input
            type="text"
            aria-label={label}
            placeholder={def.placeholder}
            data-adapttable-part="filter-input"
            className={classNames.filterInput}
            value={value}
            onChange={(e) => write(op, e.currentTarget.value)}
          />
        )}
      </div>
    </GroupField>
  );
}

function BooleanField<TRow>({
  def,
  source,
  classNames = NO_CLASS_NAMES,
  labels,
}: Readonly<DefFieldProps<TRow> & { labels: Required<TableLabels> }>) {
  "use no memo";
  const { label, choice, write } = useBooleanFilterWidget(def, source);
  return (
    <label
      data-adapttable-part={FIELD_PART}
      className={classNames.filterField}
      style={FIELD_STACK}
    >
      <span
        data-adapttable-part={LABEL_PART}
        className={classNames.filterLabel}
      >
        {label}
      </span>
      <select
        aria-label={label}
        data-adapttable-part="filter-select"
        className={classNames.filterSelect}
        value={choice}
        onChange={(e) => {
          const next = e.currentTarget.value;
          if (next === "" || next === "true" || next === "false") write(next);
        }}
      >
        <option value="">{labels.boolAny}</option>
        <option value="true">{labels.boolTrue}</option>
        <option value="false">{labels.boolFalse}</option>
      </select>
    </label>
  );
}

function SelectField<TRow>({
  def,
  source,
  classNames = NO_CLASS_NAMES,
  labels,
}: Readonly<DefFieldProps<TRow> & { labels: Required<TableLabels> }>) {
  "use no memo";
  // `def.options` may be a static array, an async loader, or a leftover
  // "auto" — never map it directly; the hook resolves all three shapes.
  const { options, loading } = useFilterOptions(def);
  return (
    <label
      data-adapttable-part={FIELD_PART}
      className={classNames.filterField}
      style={FIELD_STACK}
    >
      <span
        data-adapttable-part={LABEL_PART}
        className={classNames.filterLabel}
      >
        {filterLabel(def)}
      </span>
      <select
        data-adapttable-part="filter-select"
        className={classNames.filterSelect}
        value={asText(source.extra[def.key])}
        onChange={(e) => source.setExtra(def.key, e.currentTarget.value)}
      >
        {loading ? (
          <option value="" disabled>
            …
          </option>
        ) : (
          <>
            <option value="">{labels.filterAll}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </>
        )}
      </select>
    </label>
  );
}

function MultiSelectField<TRow>({
  def,
  source,
  classNames = NO_CLASS_NAMES,
}: Readonly<DefFieldProps<TRow>>) {
  "use no memo";
  const selected = selectedValues(source.extra[def.key]);
  // Same contract as SelectField: the hook resolves arrays / loaders / "auto".
  const { options, loading } = useFilterOptions(def);
  return (
    <GroupField caption={filterLabel(def)} classNames={classNames}>
      <div
        data-adapttable-part="filter-checkbox-group"
        className={classNames.filterCheckboxGroup}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          maxHeight: CHECKLIST_LIST_HEIGHT,
          overflow: "auto",
        }}
      >
        {loading ? (
          <span
            data-adapttable-part="filter-options-loading"
            className={classNames.filterOptionsLoading}
          >
            …
          </span>
        ) : (
          options.map((option) => (
            <label
              key={option.value}
              data-adapttable-part="filter-checkbox"
              className={classNames.filterCheckbox}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(e) =>
                  source.setExtra(
                    def.key,
                    e.currentTarget.checked
                      ? [...selected, option.value]
                      : selected.filter((v) => v !== option.value)
                  )
                }
              />{" "}
              {option.label}
            </label>
          ))
        )}
      </div>
    </GroupField>
  );
}

interface RangeValueInputProps {
  type: "date" | "number" | "text";
  /** Placeholder AND accessible name (`Value`, `From`, or `To`). */
  label: string;
  value: string;
  onValue: (next: string) => void;
  classNames: DataTableClassNames;
}

/** One bound of a range widget; the parent owns the write-through. */
function RangeValueInput({
  type,
  label,
  value,
  onValue,
  classNames,
}: Readonly<RangeValueInputProps>) {
  "use no memo";
  return (
    <input
      type={type}
      style={{ flex: "1 1 7rem", minWidth: "7rem" }}
      placeholder={label}
      aria-label={label}
      data-adapttable-part="filter-input"
      className={classNames.filterInput}
      value={value}
      onChange={(e) => onValue(e.currentTarget.value)}
    />
  );
}

interface RelativeTokenFieldProps {
  labels: Required<TableLabels>;
  value: string;
  onValue: (next: string) => void;
  classNames: DataTableClassNames;
}

/** Preset select + optional N for `last:N` / `next:N`. Stores the token. */
function RelativeTokenField({
  labels,
  value,
  onValue,
  classNames,
}: Readonly<RelativeTokenFieldProps>) {
  "use no memo";
  const { preset, n } = splitRelativeToken(value);
  const counted = preset === "last" || preset === "next";
  return (
    <>
      <select
        style={{ flex: "1 1 8.5rem", minWidth: "8.5rem" }}
        aria-label={labels.opRelative}
        data-adapttable-part="filter-input"
        className={classNames.filterInput}
        value={preset}
        onChange={(e) => {
          const next = RELATIVE_PRESETS.find(
            (p) => p === e.currentTarget.value
          );
          if (next) onValue(joinRelativeToken(next, n));
        }}
      >
        {RELATIVE_PRESETS.map((p) => (
          <option key={p} value={p}>
            {labels[RELATIVE_PRESET_LABEL_KEYS[p]]}
          </option>
        ))}
      </select>
      {counted && (
        <input
          type="number"
          min={1}
          style={{ flex: "0 0 4.5rem", width: "4.5rem" }}
          aria-label={labels.value}
          data-adapttable-part="filter-input"
          className={classNames.filterInput}
          value={n}
          onChange={(e) =>
            onValue(joinRelativeToken(preset, Number(e.currentTarget.value)))
          }
        />
      )}
    </>
  );
}

interface RangeFieldProps<TRow> extends DefFieldProps<TRow> {
  labels: Required<TableLabels>;
}

/**
 * Operator-first range field: a comparison `<select>` (its placeholder
 * option clears the pair), then ONE value input — or a labeled From/To
 * pair for `between`. The operator is persisted as `f_<key>Op`.
 */
function RangeField<TRow>({
  def,
  source,
  classNames = NO_CLASS_NAMES,
  labels,
}: Readonly<RangeFieldProps<TRow>>) {
  "use no memo";
  const { label, ops, opLabelKeys, inputType, arity, op, setOp, a, b, write } =
    useRangeFilterWidget(def, source);
  const boundType = inputType === "text" ? "text" : inputType;
  return (
    <GroupField caption={label} classNames={classNames}>
      {/* Structural layout only (like the toolbar): the operator keeps a
          constant width; values fill the rest and wrap when they don't fit
          (date inputs have a wide native minimum). */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        <select
          style={{ flex: "0 0 8.5rem", width: "8.5rem" }}
          aria-label={labels.operator}
          data-adapttable-part="filter-operator"
          className={classNames.filterOperator}
          value={op ?? ""}
          onChange={(e) => {
            // Find (not cast) the next operator; "" → undefined → clear.
            const next = ops.find((o) => o === e.currentTarget.value);
            setOp(next);
            write(next, a, b);
          }}
        >
          <option value="">{labels.operator}</option>
          {ops.map((o) => (
            <option key={o} value={o}>
              {filterOpLabel(
                labels,
                opLabelKeys[o as keyof typeof opLabelKeys]
              )}
            </option>
          ))}
        </select>
        {arity === "two" && (
          <>
            <RangeValueInput
              type={boundType}
              label={labels.from}
              value={a}
              onValue={(next) => write(op, next, b)}
              classNames={classNames}
            />
            <RangeValueInput
              type={boundType}
              label={labels.to}
              value={b}
              onValue={(next) => write(op, a, next)}
              classNames={classNames}
            />
          </>
        )}
        {op === "relative" && (
          <RelativeTokenField
            labels={labels}
            value={a}
            onValue={(next) => write(op, next, "")}
            classNames={classNames}
          />
        )}
        {op !== undefined &&
          op !== "relative" &&
          arity !== "none" &&
          arity !== "two" && (
            <RangeValueInput
              type={boundType}
              label={labels.value}
              value={a}
              onValue={(next) => write(op, next, "")}
              classNames={classNames}
            />
          )}
      </div>
    </GroupField>
  );
}

/** The unstyled text filter: its operator and its value. @public */
export const textFilterWidget: FilterWidget = {
  kinds: ["text"],
  render: TextField,
  specs: /* @__PURE__ */ textFilterSpecs(),
};
/** The unstyled yes/no filter. @public */
export const booleanFilterWidget: FilterWidget = {
  kinds: ["boolean"],
  render: BooleanField,
  specs: /* @__PURE__ */ booleanFilterSpecs(),
};
/** The unstyled single-choice filter. @public */
export const selectFilterWidget: FilterWidget = {
  kinds: ["select"],
  render: SelectField,
  specs: /* @__PURE__ */ selectFilterSpecs(),
};
/** The unstyled multiple-choice filter. @public */
export const multiSelectFilterWidget: FilterWidget = {
  kinds: ["multiSelect"],
  render: MultiSelectField,
  specs: /* @__PURE__ */ multiSelectFilterSpecs(),
};
/** The unstyled searchable checklist filter. @public */
export const checklistFilterWidget: FilterWidget = {
  kinds: ["checklist"],
  render: ChecklistFilter,
  specs: /* @__PURE__ */ checklistFilterSpecs(),
};
/** The unstyled operator-first number and date range filter. @public */
export const rangeFilterWidget: FilterWidget = {
  kinds: ["dateRange", "numberRange"],
  render: RangeField,
  specs: /* @__PURE__ */ rangeFilterSpecs(),
};
/** Every built-in widget: what the automatic filters form draws. */
export const FILTER_WIDGETS: readonly FilterWidget[] = [
  textFilterWidget,
  booleanFilterWidget,
  selectFilterWidget,
  multiSelectFilterWidget,
  checklistFilterWidget,
  rangeFilterWidget,
];

/** Props for `FilterFields`. */
export interface FilterFieldsProps {
  /** The resolved filter definitions, in render order. */
  readonly defs: readonly FilterDef<unknown>[];
  /** The filter bag the widgets read from and write to. */
  readonly source: FilterFormSource<unknown>;
  /** Resolved labels for every control. */
  readonly labels: Required<TableLabels>;
  /** Per-part class name overrides (the `filter*` keys). */
  readonly classNames: DataTableClassNames;
  /** Type registry that names each definition's widget. */
  readonly registry: FilterTypeRegistry;
  /** The widgets the fields are drawn with. */
  readonly widgets: readonly FilterWidget[];
}

/** One field per definition, drawn with the given widgets. */
export function FilterFields({
  defs,
  source,
  labels,
  classNames,
  registry,
  widgets,
}: Readonly<FilterFieldsProps>) {
  // Every field reads the live source, so a cache would miss on each change.
  "use no memo";
  // The class overrides ride along; every unstyled widget draws them.
  const field = (def: FilterDef<unknown>): FilterWidgetProps => {
    const props = { def, source, labels, classNames };
    return props;
  };
  return (
    <>
      {defs.map((def) => (
        <FilterWidgetField
          key={def.key}
          field={field(def)}
          registry={registry}
          widgets={widgets}
        />
      ))}
    </>
  );
}

/**
 * Props for `AutoFilterForm`.
 *
 * @public
 */
export interface AutoFilterFormProps<TRow> {
  /** The resolved filter definitions, in render order. */
  defs: readonly FilterDef<TRow>[];
  /** The table source whose filter bag the controls read and write. */
  source: TableSource<TRow>;
  /** Per-part class name overrides (the `filter*` keys). */
  classNames?: DataTableClassNames;
  /**
   * Label overrides for the range widgets (`operator`, `value`, `from`,
   * `to`, and the `op*` operator names); English defaults merge in.
   */
  labels?: TableLabels;
  /** Type registry; defaults to the built-ins. */
  registry?: FilterTypeRegistry;
}

/**
 * The auto-built filter form for the declarative `filters` array: one
 * semantic field per definition (`text` input, `select` with an "all values"
 * option, wrapping `multiSelect` chips, operator-first `dateRange` /
 * `numberRange` widgets), each carrying `data-adapttable-part` hooks and
 * `classNames` overrides. Controls read `source.extra` and write through
 * `source.setExtra` / `source.setExtras` — an empty value clears its key.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function AutoFilterForm<TRow>({
  defs,
  source,
  classNames = {},
  labels,
  registry = defaultFilterRegistry,
}: Readonly<AutoFilterFormProps<TRow>>) {
  "use no memo";
  return (
    <FilterFields
      defs={defs}
      source={source}
      classNames={classNames}
      labels={resolveTableLabels(labels, FORM_LABELS)}
      registry={registry}
      widgets={FILTER_WIDGETS}
    />
  );
}
