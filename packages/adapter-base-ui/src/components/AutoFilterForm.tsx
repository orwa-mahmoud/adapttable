import {
  CHECKLIST_LIST_HEIGHT,
  defaultFilterRegistry,
  type Direction,
  type FilterDef,
  type FilterFormSource,
  filterLabel,
  filterOpLabel,
  type FilterTypeRegistry,
  filterWidgetKind,
  joinRelativeToken,
  listFilterValues,
  RELATIVE_PRESET_LABEL_KEYS,
  RELATIVE_PRESETS,
  renderRegisteredFilter,
  resolveLabels,
  scalarFilterText,
  splitRelativeToken,
  type TableLabels,
  useBooleanFilterWidget,
  useFilterOptions,
  useRangeFilterWidget,
  useTextFilterWidget,
} from "@adapttable/core";
import { type ReactNode, useId } from "react";

import type { BaseUiAccentColor } from "../types";
import { Flex, Spinner, Text, TextField } from "../ui";
import { ChecklistFilter } from "./ChecklistFilter";
import {
  Checkbox,
  FormField,
  NativeSelect,
  type SelectOption,
} from "./primitives";

/**
 * A labelled GROUP wrapper for multi-control fields (the multiSelect chip
 * group). Unlike `FormField` the label carries an `id` so the group
 * references it via `aria-labelledby` instead of naming a single control.
 */
function GroupField({
  label,
  id,
  children,
}: Readonly<{ label: ReactNode; id: string; children: ReactNode }>) {
  return (
    <Flex direction="column" gap="4">
      <Text id={id} as="span" size="2">
        {label}
      </Text>
      {children}
    </Flex>
  );
}

/** Props for `AutoFilterForm`. */
export interface AutoFilterFormProps<TRow> {
  /** Writing direction (kept for parity; Base UI controls flip from ambient dir). */
  dir?: Direction;
  /** The resolved filter definitions, in render order. */
  defs: readonly FilterDef<TRow>[];
  /** The resolved table source (filter bag + setters). */
  source: FilterFormSource<TRow>;
  /** Base UI accent color for option checkboxes. */
  accentColor?: BaseUiAccentColor;
  /** Pre-translated label overrides (operator names, From/To, …). */
  labels?: TableLabels;
  /** Type registry; defaults to the built-ins. */
  registry?: FilterTypeRegistry;
}

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
      <NativeSelect
        size="1"
        width="8.5rem"
        aria-label={labels.opRelative}
        value={preset}
        options={RELATIVE_PRESETS.map((p) => ({
          value: p,
          label: labels[RELATIVE_PRESET_LABEL_KEYS[p]],
        }))}
        onValueChange={(next) => {
          const found = RELATIVE_PRESETS.find((p) => p === next);
          if (found) onValue(joinRelativeToken(found, n));
        }}
      />
      {counted && (
        <TextField.Root
          size="1"
          type="number"
          min={1}
          aria-label={labels.value}
          value={String(n)}
          onChange={(e) =>
            onValue(joinRelativeToken(preset, Number(e.target.value)))
          }
          style={{ flex: "0 0 4.5rem", width: "4.5rem" }}
        />
      )}
    </>
  );
}

/**
 * Operator-first range widget (`numberRange` / `dateRange`): a comparison
 * select, then ONE bound input — or a From/To pair for "Between". The widget
 * logic (operator seeding, bound derivation, writes) lives in core's
 * `useRangeFilterWidget`; this renders the Base UI controls over it.
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
  const id = useId();
  const { label, ops, opLabelKeys, inputType, arity, op, setOp, a, b, write } =
    useRangeFilterWidget(def, source);
  // The operator select offers a "no comparison" clear choice (empty value)
  // followed by every range operator.
  const opOptions: SelectOption[] = [
    { value: "", label: labels.operator },
    ...ops.map((o) => ({
      value: o,
      label: filterOpLabel(labels, opLabelKeys[o as keyof typeof opLabelKeys]),
    })),
  ];
  return (
    <FormField label={label}>
      {/* Operator and value(s) share ONE row — it reads like a sentence:
          "At least [5]". */}
      <Flex gap="2" align="start" wrap="wrap">
        <NativeSelect
          size="1"
          width="8.5rem"
          aria-label={labels.operator}
          data-adapttable-part="filter-operator"
          placeholder={labels.operator}
          value={op ?? ""}
          options={opOptions}
          onValueChange={(value) => {
            const next = ops.find((o) => o === value);
            setOp(next);
            write(next, a, b);
          }}
        />
        {arity === "two" && (
          <>
            <TextField.Root
              id={`${id}-a`}
              size="1"
              type={inputType}
              aria-label={labels.from}
              placeholder={labels.from}
              value={a}
              onChange={(e) => write(op, e.target.value, b)}
              style={{ flex: "1 1 7rem", minWidth: "7rem" }}
            />
            <TextField.Root
              id={`${id}-b`}
              size="1"
              type={inputType}
              aria-label={labels.to}
              placeholder={labels.to}
              value={b}
              onChange={(e) => write(op, a, e.target.value)}
              style={{ flex: "1 1 7rem", minWidth: "7rem" }}
            />
          </>
        )}
        {op === "relative" && (
          <RelativeTokenField
            labels={labels}
            value={a}
            onValue={(next) => write(op, next, "")}
          />
        )}
        {op !== undefined &&
          op !== "relative" &&
          arity !== "none" &&
          arity !== "two" && (
            <TextField.Root
              id={`${id}-a`}
              size="1"
              type={inputType}
              aria-label={labels.value}
              placeholder={labels.value}
              value={a}
              onChange={(e) => write(op, e.target.value, "")}
              style={{ flex: "1 1 7rem", minWidth: "7rem" }}
            />
          )}
      </Flex>
    </FormField>
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
  const { label, ops, opLabelKeys, op, value, needsValue, write } =
    useTextFilterWidget(def, source);
  const opOptions: SelectOption[] = ops.map((choice) => ({
    value: choice,
    label: filterOpLabel(labels, opLabelKeys[choice]),
  }));
  return (
    <FormField label={label}>
      <Flex gap="2" align="start" wrap="wrap">
        <NativeSelect
          size="1"
          width="8.5rem"
          aria-label={labels.operator}
          data-adapttable-part="filter-operator"
          value={op}
          options={opOptions}
          onValueChange={(next) => {
            const found = ops.find((choice) => choice === next);
            if (found) write(found, value);
          }}
        />
        {needsValue && (
          <TextField.Root
            size="1"
            aria-label={label}
            data-adapttable-part="filter-input"
            value={value}
            placeholder={def.placeholder}
            onChange={(e) => write(op, e.target.value)}
            style={{ flex: "1 1 7rem", minWidth: "7rem" }}
          />
        )}
      </Flex>
    </FormField>
  );
}

function BooleanFilterField<TRow>({
  def,
  source,
  labels,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
}>) {
  const { label, choice, write } = useBooleanFilterWidget(def, source);
  return (
    <FormField label={label}>
      <NativeSelect
        size="1"
        aria-label={label}
        data-adapttable-part="filter-select"
        value={choice}
        options={[
          { value: "", label: labels.boolAny },
          { value: "true", label: labels.boolTrue },
          { value: "false", label: labels.boolFalse },
        ]}
        onValueChange={(next) => {
          if (next === "" || next === "true" || next === "false") write(next);
        }}
      />
    </FormField>
  );
}

/** One definition rendered as its kit-native Base UI control. */
function AutoFilterField<TRow>({
  def,
  source,
  labels,
  accentColor,
  registry,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
  accentColor?: BaseUiAccentColor;
  registry: FilterTypeRegistry;
}>) {
  const id = useId();
  const { extra, setExtra } = source;
  const label = filterLabel(def);
  // Static arrays resolve instantly; async loaders run once and report
  // `loading` so the select/checkbox controls can show a native affordance.
  const { options, loading } = useFilterOptions(def);
  const custom = renderRegisteredFilter(def, source, labels, registry);
  if (custom) return custom;
  switch (filterWidgetKind(def, registry)) {
    case "text":
      return <TextFilterField def={def} source={source} labels={labels} />;
    case "boolean":
      return <BooleanFilterField def={def} source={source} labels={labels} />;
    case "select": {
      const selectOptions: SelectOption[] = loading
        ? [{ value: "", label: "…", disabled: true }]
        : [
            { value: "", label: "All" },
            ...options.map((option) => ({
              value: option.value,
              label: option.label,
            })),
          ];
      return (
        <FormField label={label}>
          <NativeSelect
            size="1"
            aria-label={label}
            value={scalarFilterText(extra[def.key])}
            options={selectOptions}
            onValueChange={(value) => setExtra(def.key, value)}
          />
        </FormField>
      );
    }
    case "checklist":
      return <ChecklistFilter def={def} source={source} labels={labels} />;
    case "multiSelect": {
      const selected = listFilterValues(extra[def.key]);
      const toggle = (value: string) =>
        setExtra(
          def.key,
          selected.includes(value)
            ? selected.filter((v) => v !== value)
            : [...selected, value]
        );
      return (
        <GroupField label={label} id={id}>
          {loading ? (
            <Spinner size="1" label={labels.loading} />
          ) : (
            <Flex
              gap="2"
              wrap="wrap"
              role="group"
              aria-labelledby={id}
              style={{
                maxHeight: CHECKLIST_LIST_HEIGHT,
                overflow: "auto",
              }}
            >
              {options.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <label
                    key={option.value}
                    className="adapttable-filter-chip"
                    data-checked={checked ? "true" : "false"}
                    data-accent={accentColor}
                  >
                    <Checkbox
                      checked={checked}
                      color={accentColor}
                      value={option.value}
                      className="adapttable-visually-hidden"
                      onToggle={() => toggle(option.value)}
                    />
                    {option.label}
                  </label>
                );
              })}
            </Flex>
          )}
        </GroupField>
      );
    }
    case "dateRange":
    case "numberRange":
      return <RangeField def={def} source={source} labels={labels} />;
    default:
      return null;
  }
}

/**
 * The auto-built filter form: one kit-native Base UI control per
 * declarative `FilterDef`, reading and writing the source's extra-filter
 * bag — `""` / `[]` clears a key. Rendered inside the filter popover or dialog
 * when the `filters` prop is the declarative array form.
 *
 * @typeParam TRow - The row type.
 */
export function AutoFilterForm<TRow>({
  defs,
  source,
  accentColor,
  labels,
  registry = defaultFilterRegistry,
}: Readonly<AutoFilterFormProps<TRow>>) {
  const resolved = resolveLabels(labels);
  return (
    <Flex direction="column" gap="5">
      {defs.map((def) => (
        <AutoFilterField
          key={def.key}
          def={def}
          source={source}
          labels={resolved}
          accentColor={accentColor}
          registry={registry}
        />
      ))}
    </Flex>
  );
}
