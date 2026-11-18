import {
  filterOpLabel,
  useBooleanFilterWidget,
  useFilterOptions,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "@adapttable/react";
import {
  defaultFilterRegistry,
  type FilterDef,
  type FilterFormSource,
  filterLabel,
  type FilterTypeRegistry,
  type FilterValue,
  type FilterWidget,
  FilterWidgetField,
  joinRelativeToken,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  splitRelativeToken,
  type TableLabels,
  type TableSource,
} from "@adapttable/react/adapter";
import {
  Group,
  Input,
  Loader,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  TextInput,
} from "@mantine/core";
import { type ReactNode } from "react";

import { ChecklistFilter } from "./ChecklistFilter";

/**
 * Mantine's Input.Wrapper sits the label flush on the control (0px). The
 * form stack only spaces fields from each other — this is the label gap.
 */
const FILTER_LABEL_STYLES = { label: { marginBottom: 16 } };

/** Above the filter popover (`zIndex={10050}`) so a Select is clickable. */
const FILTER_COMBOBOX_PROPS = { withinPortal: true, zIndex: 10051 } as const;

/**
 * Props for `AutoFilterForm`.
 *
 * @public
 */
export interface AutoFilterFormProps<TRow> {
  /** The resolved declarative definitions, in render order. */
  defs: readonly FilterDef<TRow>[];
  /** The resolved source whose `extra` bag the controls read and write. */
  source: TableSource<TRow>;
  /** Resolved labels — the range widgets read the operator/value strings. */
  labels: Required<TableLabels>;
  /** Type registry; defaults to the built-ins. */
  registry?: FilterTypeRegistry;
}

/** A scalar filter value as input text (`""` when unset). */
const asText = (value: FilterValue): string =>
  value == null ? "" : String(value);

/** A multi-select value as an array, tolerating a scalar from the URL. */
const asList = (value: FilterValue): string[] => {
  if (value == null || value === "") return [];
  return Array.isArray(value) ? value : [String(value)];
};

/** Preset select + optional N for last/next. Stores the token. */
function RelativeTokenField({
  labels,
  value,
  onValue,
}: Readonly<{
  labels: Required<TableLabels>;
  value: string;
  onValue: (next: string) => void;
}>) {
  "use no memo";
  const { preset, n } = splitRelativeToken(value);
  const counted = preset === "last" || preset === "next";
  return (
    <>
      <Select
        size="sm"
        comboboxProps={FILTER_COMBOBOX_PROPS}
        style={{ flex: "1 1 8.5rem", minWidth: "8.5rem" }}
        aria-label={labels.opRelative}
        data={RELATIVE_PRESETS.map((p) => ({
          value: p,
          label: labels[RELATIVE_PRESET_LABEL_KEYS[p]],
        }))}
        value={preset}
        onChange={(next) => {
          const found = RELATIVE_PRESETS.find((p) => p === next);
          if (found) onValue(joinRelativeToken(found, n));
        }}
      />
      {counted && (
        <NumberInput
          size="sm"
          hideControls
          min={1}
          style={{ flex: "0 0 4.5rem", width: "4.5rem" }}
          aria-label={labels.value}
          value={n}
          onChange={(next) => onValue(joinRelativeToken(preset, Number(next)))}
        />
      )}
    </>
  );
}

/**
 * The operator-first control shared by the `numberRange` / `dateRange`
 * types. The operator is persisted as `f_<key>Op`.
 */
function RangeField<TRow>({
  def,
  source,
  labels,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  "use no memo";
  const { label, ops, opLabelKeys, inputType, arity, op, setOp, a, b, write } =
    useRangeFilterWidget(def, source);
  const data = ops.map((value) => ({
    value,
    label: filterOpLabel(
      labels,
      opLabelKeys[value as keyof typeof opLabelKeys]
    ),
  }));
  const handleOp = (value: string | null) => {
    const next = ops.find((choice) => choice === value);
    setOp(next);
    write(next, a, b);
  };

  const valueInput = (
    text: string,
    fieldValue: string,
    commit: (next: string) => void
  ) =>
    inputType === "number" ? (
      <NumberInput
        size="sm"
        hideControls
        style={{ flex: "1 1 6rem", minWidth: "6rem" }}
        aria-label={`${label} ${text}`}
        placeholder={text}
        value={fieldValue}
        onChange={(next) => commit(String(next))}
      />
    ) : (
      <TextInput
        type={inputType === "date" ? "date" : "text"}
        size="sm"
        style={{ flex: "1 1 8.5rem", minWidth: "8.5rem" }}
        aria-label={`${label} ${text}`}
        placeholder={text}
        value={fieldValue}
        onChange={(e) => commit(e.currentTarget.value)}
      />
    );

  let values: ReactNode = null;
  if (arity === "two") {
    values = (
      <>
        {valueInput(labels.from, a, (next) => write(op, next, b))}
        {valueInput(labels.to, b, (next) => write(op, a, next))}
      </>
    );
  } else if (op === "relative") {
    values = (
      <RelativeTokenField
        labels={labels}
        value={a}
        onValue={(next) => write(op, next, "")}
      />
    );
  } else if (op && arity !== "none") {
    values = valueInput(labels.value, a, (next) => write(op, next, ""));
  }

  return (
    <Stack gap="md" data-adapttable-part="filter-field">
      <Input.Label size="sm">{label}</Input.Label>
      {/* Operator and value(s) share a row when they fit — "At least [5]" —
          and wrap when they don't (date inputs have a wide native minimum,
          so "Between" two dates takes a second row in narrow drawers). */}
      <Group gap="sm" align="flex-start">
        <Select
          size="sm"
          clearable
          comboboxProps={FILTER_COMBOBOX_PROPS}
          style={{ flex: "0 0 8.5rem", width: "8.5rem" }}
          aria-label={`${label} ${labels.operator}`}
          data-adapttable-part="filter-operator"
          placeholder={labels.operator}
          data={data}
          value={op ?? null}
          onChange={handleOp}
        />
        {values}
      </Group>
    </Stack>
  );
}

/**
 * Single-choice control. Options resolve through `useFilterOptions`
 * (static array, async loader, or none); while a loader is in flight the
 * select shows one disabled placeholder option.
 */
function BooleanControl<TRow>({
  def,
  source,
  labels,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  "use no memo";
  const { label, choice, write } = useBooleanFilterWidget(def, source);
  return (
    <Select
      size="sm"
      label={label}
      styles={FILTER_LABEL_STYLES}
      wrapperProps={{ "data-adapttable-part": "filter-field" }}
      comboboxProps={FILTER_COMBOBOX_PROPS}
      data-adapttable-part="filter-select"
      data={[
        { value: "", label: labels.boolAny },
        { value: "true", label: labels.boolTrue },
        { value: "false", label: labels.boolFalse },
      ]}
      value={choice}
      onChange={(next) => {
        if (next === "" || next === "true" || next === "false") write(next);
      }}
      allowDeselect={false}
    />
  );
}

function SelectControl<TRow>({
  def,
  source,
  labels,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  "use no memo";
  const label = filterLabel(def);
  const { options, loading } = useFilterOptions(def);
  const data = loading
    ? [{ value: "", label: "…", disabled: true }]
    : [{ value: "", label: labels.filterAll }, ...options];
  return (
    <Select
      size="sm"
      label={label}
      styles={FILTER_LABEL_STYLES}
      wrapperProps={{ "data-adapttable-part": "filter-field" }}
      comboboxProps={FILTER_COMBOBOX_PROPS}
      data-adapttable-part="filter-select"
      data={data}
      value={asText(source.extra[def.key])}
      onChange={(next) => source.setExtra(def.key, next ?? "")}
      allowDeselect={false}
    />
  );
}

/**
 * Searchable multi-select. Options resolve through `useFilterOptions`;
 * while a loader is in flight the field shows a small spinner.
 */
function MultiSelectControl<TRow>({
  def,
  source,
}: Readonly<{ def: FilterDef<TRow>; source: FilterFormSource<TRow> }>) {
  "use no memo";
  const label = filterLabel(def);
  const { options, loading } = useFilterOptions(def);
  return (
    <MultiSelect
      size="sm"
      label={label}
      styles={FILTER_LABEL_STYLES}
      wrapperProps={{ "data-adapttable-part": "filter-field" }}
      comboboxProps={FILTER_COMBOBOX_PROPS}
      searchable
      clearable
      hidePickedOptions={false}
      maxDropdownHeight={240}
      data={options}
      value={asList(source.extra[def.key])}
      onChange={(values) => source.setExtra(def.key, values)}
      disabled={loading}
      rightSection={loading ? <Loader size="xs" /> : undefined}
    />
  );
}

/** Operator-first text filter: comparison select, then the term (if needed). */
function TextFilterField<TRow>({
  def,
  source,
  labels,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  "use no memo";
  const { label, ops, opLabelKeys, op, value, needsValue, write } =
    useTextFilterWidget(def, source);
  const data = ops.map((choice) => ({
    value: choice,
    label: filterOpLabel(labels, opLabelKeys[choice]),
  }));
  return (
    <Stack gap="md" data-adapttable-part="filter-field">
      <Input.Label size="sm">{label}</Input.Label>
      <Group gap="sm" align="flex-start">
        <Select
          size="sm"
          comboboxProps={FILTER_COMBOBOX_PROPS}
          style={{ flex: "0 0 8.5rem", width: "8.5rem" }}
          aria-label={`${label} ${labels.operator}`}
          data-adapttable-part="filter-operator"
          data={data}
          value={op}
          onChange={(next) => {
            const found = ops.find((choice) => choice === next);
            if (found) write(found, value);
          }}
        />
        {needsValue && (
          <TextInput
            size="sm"
            style={{ flex: "1 1 7rem", minWidth: "7rem" }}
            aria-label={label}
            data-adapttable-part="filter-input"
            placeholder={def.placeholder}
            value={value}
            onChange={(e) => write(op, e.currentTarget.value)}
          />
        )}
      </Group>
    </Stack>
  );
}

/** The Mantine text filter: its operator and its value. @public */
export const textFilterWidget: FilterWidget = {
  kinds: ["text"],
  render: TextFilterField,
};
/** The Mantine yes/no filter. @public */
export const booleanFilterWidget: FilterWidget = {
  kinds: ["boolean"],
  render: BooleanControl,
};
/** The Mantine single-choice filter. @public */
export const selectFilterWidget: FilterWidget = {
  kinds: ["select"],
  render: SelectControl,
};
/** The Mantine multiple-choice filter. @public */
export const multiSelectFilterWidget: FilterWidget = {
  kinds: ["multiSelect"],
  render: MultiSelectControl,
};
/** The Mantine searchable checklist filter. @public */
export const checklistFilterWidget: FilterWidget = {
  kinds: ["checklist"],
  render: ChecklistFilter,
};
/** The Mantine operator-first number and date range filter. @public */
export const rangeFilterWidget: FilterWidget = {
  kinds: ["dateRange", "numberRange"],
  render: RangeField,
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
  registry,
  widgets,
}: Readonly<FilterFieldsProps>) {
  // Every field reads the live source, so a cache would miss on each change.
  "use no memo";
  return (
    <Stack gap="lg">
      {defs.map((def) => (
        <FilterWidgetField
          key={def.key}
          field={{ def, source, labels }}
          registry={registry}
          widgets={widgets}
        />
      ))}
    </Stack>
  );
}

/**
 * The auto-built filter form: one labeled, Mantine-native control per
 * declarative `FilterDef`. Values live in the source's `extra` bag
 * (so the URL, chips and — on frontend data — the predicate all follow);
 * clearing a control writes the empty value, which drops the URL param.
 * Range types render operator-first: an operator select plus one value
 * input (two for "Between"), persisted as the inclusive pair.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function AutoFilterForm<TRow>({
  defs,
  source,
  labels,
  registry = defaultFilterRegistry,
}: Readonly<AutoFilterFormProps<TRow>>) {
  "use no memo";
  return (
    <FilterFields
      defs={defs}
      source={source}
      labels={labels}
      registry={registry}
      widgets={FILTER_WIDGETS}
    />
  );
}
