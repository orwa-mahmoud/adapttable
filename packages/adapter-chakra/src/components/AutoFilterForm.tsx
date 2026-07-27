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
import {
  Checkbox,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { type ReactNode, useId } from "react";

import { FormField, NativeSelect } from "./primitives";

/**
 * A labelled GROUP wrapper for multi-control fields (the multiSelect checkbox
 * group). Unlike {@link FormField} it does NOT use Ark's `Field.Root`, whose
 * single-control labelling would hijack the first checkbox's id and name. The
 * label carries an `id` so the group references it via `aria-labelledby`.
 */
function GroupField({
  label,
  id,
  children,
}: Readonly<{ label: ReactNode; id: string; children: ReactNode }>) {
  return (
    <Stack gap={1}>
      <Text id={id} as="span" fontSize="sm">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

/** Props for {@link AutoFilterForm}. */
export interface AutoFilterFormProps<TRow> {
  /** Writing direction (flips the select chevron). */
  dir?: Direction;
  /** The resolved filter definitions, in render order. */
  defs: readonly FilterDef<TRow>[];
  /** The resolved table source (filter bag + setters). */
  source: FilterFormSource<TRow>;
  /** Chakra color scheme for option checkboxes. */
  accentColor?: string;
  /** Pre-translated label overrides (operator names, From/To, …). */
  labels?: TableLabels;
}

/**
 * Operator-first range widget (`numberRange` / `dateRange`): a comparison
 * select, then ONE bound input — or a From/To pair for "Between". The widget
 * logic (operator seeding, bound derivation, writes) lives in core's
 * {@link useRangeFilterWidget}; this renders the Chakra controls over it.
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
  return (
    <FormField label={label}>
      {/* Operator and value(s) share ONE row — it reads like a sentence:
          "At least [5]". */}
      <HStack gap={2} align="flex-start" flexWrap="wrap" rowGap={2}>
        {/* Chakra renders `placeholder` as the empty first option, so the
            operator placeholder doubles as the "no comparison" clear choice. */}
        <NativeSelect
          size="sm"
          flex="0 0 8.5rem"
          w="8.5rem"
          placeholder={labels.operator}
          value={op ?? ""}
          onChange={(e) => {
            const next = RANGE_OPS.find((o) => o === e.target.value);
            setOp(next);
            write(next, a, b);
          }}
        >
          {RANGE_OPS.map((o) => (
            <option key={o} value={o}>
              {labels[opLabelKeys[o]]}
            </option>
          ))}
        </NativeSelect>
        {op === "between" ? (
          <>
            <Input
              id={`${id}-a`}
              size="sm"
              flex="1 1 7rem"
              minW="7rem"
              type={inputType}
              aria-label={labels.from}
              placeholder={labels.from}
              value={a}
              onChange={(e) => write(op, e.target.value, b)}
            />
            <Input
              id={`${id}-b`}
              size="sm"
              flex="1 1 7rem"
              minW="7rem"
              type={inputType}
              aria-label={labels.to}
              placeholder={labels.to}
              value={b}
              onChange={(e) => write(op, a, e.target.value)}
            />
          </>
        ) : (
          op && (
            <Input
              id={`${id}-a`}
              size="sm"
              flex="1 1 7rem"
              minW="7rem"
              type={inputType}
              aria-label={labels.value}
              placeholder={labels.value}
              value={a}
              onChange={(e) => write(op, e.target.value, "")}
            />
          )
        )}
      </HStack>
    </FormField>
  );
}

/** One definition rendered as its kit-native Chakra control. */
function AutoFilterField<TRow>({
  def,
  source,
  labels,
  accentColor,
}: Readonly<{
  def: FilterDef<TRow>;
  source: FilterFormSource<TRow>;
  labels: Required<TableLabels>;
  accentColor?: string;
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
          <Input
            size="sm"
            value={scalarFilterText(extra[def.key])}
            placeholder={def.placeholder}
            onChange={(e) => setExtra(def.key, e.target.value)}
          />
        </FormField>
      );
    case "select":
      return (
        <FormField label={label}>
          <NativeSelect
            size="sm"
            value={scalarFilterText(extra[def.key])}
            onChange={(e) => setExtra(def.key, e.target.value)}
          >
            {loading ? (
              <option value="" disabled>
                …
              </option>
            ) : (
              <>
                <option value="">All</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </>
            )}
          </NativeSelect>
        </FormField>
      );
    case "multiSelect": {
      // A multiSelect is a GROUP of checkboxes, not a single labellable
      // control, so it uses a plain group label (an Ark `Field.Root` would
      // hijack the labelling onto the first checkbox). Each box self-labels
      // through its own `Checkbox.Label`, derives its checked state from the
      // current list, and toggles itself in/out via the input's `onChange`
      // (the reliable single-source toggle in jsdom and the browser alike).
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
            <Spinner size="xs" />
          ) : (
            <HStack
              gap={3}
              flexWrap="wrap"
              rowGap={1}
              role="group"
              aria-labelledby={id}
            >
              {options.map((option, index) => (
                <Checkbox.Root
                  key={option.value}
                  id={`${id}-${index}`}
                  size="sm"
                  colorPalette={accentColor}
                  value={option.value}
                  checked={selected.includes(option.value)}
                >
                  {/* `onClick` (not `onChange`): Ark sets `checked`
                      imperatively, desyncing React's change tracker. */}
                  <Checkbox.HiddenInput onClick={() => toggle(option.value)} />
                  <Checkbox.Control />
                  <Checkbox.Label>{option.label}</Checkbox.Label>
                </Checkbox.Root>
              ))}
            </HStack>
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
 * The auto-built filter form: one kit-native Chakra control per declarative
 * {@link FilterDef}, reading and writing the source's extra-filter bag —
 * `""` / `[]` clears a key. Rendered inside the filter popover or drawer
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
    <Stack gap={3}>
      {defs.map((def) => (
        <AutoFilterField
          key={def.key}
          def={def}
          source={source}
          labels={resolved}
          accentColor={accentColor}
        />
      ))}
    </Stack>
  );
}
