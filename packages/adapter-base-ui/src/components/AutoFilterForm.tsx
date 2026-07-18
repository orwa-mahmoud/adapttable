import {
  type Direction,
  type FilterDef,
  type FilterFormSource,
  filterLabel,
  listFilterValues,
  RANGE_OPS,
  resolveLabels,
  scalarFilterText,
  type TableLabels,
  useFilterOptions,
  useRangeFilterWidget,
} from "@adapttable/core";
import { type ReactNode, useId } from "react";

import type { BaseUiAccentColor } from "../types";
import { Flex, Spinner, Text, TextField } from "../ui";
import { FormField, NativeSelect, type SelectOption } from "./primitives";

/**
 * A labelled GROUP wrapper for multi-control fields (the multiSelect chip
 * group). Unlike {@link FormField} the label carries an `id` so the group
 * references it via `aria-labelledby` instead of naming a single control.
 */
function GroupField({
  label,
  id,
  children,
}: Readonly<{ label: ReactNode; id: string; children: ReactNode }>) {
  return (
    <Flex direction="column" gap="1">
      <Text id={id} as="span" size="2">
        {label}
      </Text>
      {children}
    </Flex>
  );
}

/** Props for {@link AutoFilterForm}. */
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
}

/**
 * Operator-first range widget (`numberRange` / `dateRange`): a comparison
 * select, then ONE bound input — or a From/To pair for "Between". The widget
 * logic (operator seeding, bound derivation, writes) lives in core's
 * {@link useRangeFilterWidget}; this renders the Base UI controls over it.
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
  const { label, opLabelKeys, inputType, op, setOp, a, b, write } =
    useRangeFilterWidget(def, source);
  // The operator select offers a "no comparison" clear choice (empty value)
  // followed by every range operator.
  const opOptions: SelectOption[] = [
    { value: "", label: labels.operator },
    ...RANGE_OPS.map((o) => ({ value: o, label: labels[opLabelKeys[o]] })),
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
          placeholder={labels.operator}
          value={op ?? ""}
          options={opOptions}
          onValueChange={(value) => {
            const next = RANGE_OPS.find((o) => o === value);
            setOp(next);
            write(next, a, b);
          }}
        />
        {op === "between" ? (
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
        ) : (
          op && (
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
          )
        )}
      </Flex>
    </FormField>
  );
}

/** One definition rendered as its kit-native Base UI control. */
function AutoFilterField<TRow>({
  def,
  source,
  labels,
  accentColor,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
  accentColor?: BaseUiAccentColor;
}>) {
  const id = useId();
  const { extra, setExtra } = source;
  const label = filterLabel(def);
  // Static arrays resolve instantly; async loaders run once and report
  // `loading` so the select/checkbox controls can show a native affordance.
  const { options, loading } = useFilterOptions(def);
  switch (def.type) {
    case "text":
      return (
        <FormField label={label}>
          <TextField.Root
            size="1"
            aria-label={label}
            value={scalarFilterText(extra[def.key])}
            placeholder={def.placeholder}
            onChange={(e) => setExtra(def.key, e.target.value)}
          />
        </FormField>
      );
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
    case "multiSelect": {
      // Toggle chips — selected state is the chip chrome, no nested checkbox.
      // Named through the group label via `aria-labelledby`; each chip is a
      // `role="checkbox"` so existing a11y semantics / tests stay intact.
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
            <Spinner size="1" />
          ) : (
            <Flex gap="2" wrap="wrap" role="group" aria-labelledby={id}>
              {options.map((option) => {
                const checked = selected.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    id={`${id}-${option.value}`}
                    role="checkbox"
                    aria-checked={checked}
                    className="adapttable-filter-chip"
                    data-checked={checked ? "true" : "false"}
                    data-accent={accentColor}
                    onClick={() => toggle(option.value)}
                  >
                    {option.label}
                  </button>
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
  }
}

/**
 * The auto-built filter form: one kit-native Base UI control per
 * declarative {@link FilterDef}, reading and writing the source's extra-filter
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
}: Readonly<AutoFilterFormProps<TRow>>) {
  const resolved = resolveLabels(labels);
  return (
    <Flex direction="column" gap="3">
      {defs.map((def) => (
        <AutoFilterField
          key={def.key}
          def={def}
          source={source}
          labels={resolved}
          accentColor={accentColor}
        />
      ))}
    </Flex>
  );
}
