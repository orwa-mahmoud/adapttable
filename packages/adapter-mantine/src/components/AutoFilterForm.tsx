import {
  defaultFilterRegistry,
  type FilterDef,
  filterLabel,
  filterOpLabel,
  type FilterTypeRegistry,
  type FilterValue,
  filterWidgetKind,
  joinRelativeToken,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  renderRegisteredFilter,
  splitRelativeToken,
  type TableLabels,
  type TableSource,
  useBooleanFilterWidget,
  useFilterOptions,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "@adapttable/core";
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
  source: TableSource<TRow>;
  labels: Required<TableLabels>;
}>) {
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
    <Stack gap="md">
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
  source: TableSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  const { label, choice, write } = useBooleanFilterWidget(def, source);
  return (
    <Select
      size="sm"
      label={label}
      styles={FILTER_LABEL_STYLES}
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
}: Readonly<{ def: FilterDef<TRow>; source: TableSource<TRow> }>) {
  const label = filterLabel(def);
  const { options, loading } = useFilterOptions(def);
  const data = loading
    ? [{ value: "", label: "…", disabled: true }]
    : [{ value: "", label: "All" }, ...options];
  return (
    <Select
      size="sm"
      label={label}
      styles={FILTER_LABEL_STYLES}
      comboboxProps={FILTER_COMBOBOX_PROPS}
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
}: Readonly<{ def: FilterDef<TRow>; source: TableSource<TRow> }>) {
  const label = filterLabel(def);
  const { options, loading } = useFilterOptions(def);
  return (
    <MultiSelect
      size="sm"
      label={label}
      styles={FILTER_LABEL_STYLES}
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
  source: TableSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  const { label, ops, opLabelKeys, op, value, needsValue, write } =
    useTextFilterWidget(def, source);
  const data = ops.map((choice) => ({
    value: choice,
    label: filterOpLabel(labels, opLabelKeys[choice]),
  }));
  return (
    <Stack gap="md">
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

/** One labeled, kit-native control for a single filter definition. */
function FilterControl<TRow>({
  def,
  source,
  labels,
  registry,
}: Readonly<{
  def: FilterDef<TRow>;
  source: TableSource<TRow>;
  labels: Required<TableLabels>;
  registry: FilterTypeRegistry;
}>) {
  const custom = renderRegisteredFilter(def, source, labels, registry);
  if (custom) return custom;
  switch (filterWidgetKind(def, registry)) {
    case "text":
      return <TextFilterField def={def} source={source} labels={labels} />;
    case "boolean":
      return <BooleanControl def={def} source={source} labels={labels} />;
    case "select":
      return <SelectControl def={def} source={source} />;
    case "multiSelect":
      return <MultiSelectControl def={def} source={source} />;
    case "checklist":
      return <ChecklistFilter def={def} source={source} labels={labels} />;
    case "dateRange":
    case "numberRange":
      return <RangeField def={def} source={source} labels={labels} />;
    default:
      return null;
  }
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
  return (
    <Stack gap="lg">
      {defs.map((def) => (
        <FilterControl
          key={def.key}
          def={def}
          registry={registry}
          source={source}
          labels={labels}
        />
      ))}
    </Stack>
  );
}
