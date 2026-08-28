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
import {
  Checkbox,
  HStack,
  Input,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { type ReactNode, useId } from "react";

import { ChecklistFilter } from "./ChecklistFilter";
import { FormField, NativeSelect } from "./primitives";

/**
 * A labelled GROUP wrapper for multi-control fields (the multiSelect checkbox
 * group). Unlike `FormField` it does NOT use Ark's `Field.Root`, whose
 * single-control labelling would hijack the first checkbox's id and name. The
 * label carries an `id` so the group references it via `aria-labelledby`.
 */
function GroupField({
  label,
  id,
  children,
}: Readonly<{ label: ReactNode; id: string; children: ReactNode }>) {
  return (
    <Stack gap={4}>
      <Text id={id} as="span" fontSize="sm">
        {label}
      </Text>
      {children}
    </Stack>
  );
}

/** Props for `AutoFilterForm`. */
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
        size="sm"
        flex="1 1 8.5rem"
        minW="8.5rem"
        aria-label={labels.opRelative}
        value={preset}
        onChange={(e) => {
          const next = RELATIVE_PRESETS.find((p) => p === e.target.value);
          if (next) onValue(joinRelativeToken(next, n));
        }}
      >
        {RELATIVE_PRESETS.map((p) => (
          <option key={p} value={p}>
            {labels[RELATIVE_PRESET_LABEL_KEYS[p]]}
          </option>
        ))}
      </NativeSelect>
      {counted && (
        <Input
          size="sm"
          flex="0 0 4.5rem"
          w="4.5rem"
          type="number"
          min={1}
          aria-label={labels.value}
          value={n}
          onChange={(e) =>
            onValue(joinRelativeToken(preset, Number(e.target.value)))
          }
        />
      )}
    </>
  );
}

/**
 * Operator-first range widget (`numberRange` / `dateRange`): a comparison
 * select, then ONE bound input — or a From/To pair for "Between". The widget
 * logic (operator seeding, bound derivation, writes) lives in core's
 * `useRangeFilterWidget`; this renders the Chakra controls over it.
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
          aria-label={labels.operator}
          data-adapttable-part="filter-operator"
          placeholder={labels.operator}
          value={op ?? ""}
          onChange={(e) => {
            const next = ops.find((o) => o === e.target.value);
            setOp(next);
            write(next, a, b);
          }}
        >
          {ops.map((o) => (
            <option key={o} value={o}>
              {filterOpLabel(
                labels,
                opLabelKeys[o as keyof typeof opLabelKeys]
              )}
            </option>
          ))}
        </NativeSelect>
        {arity === "two" && (
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
          )}
      </HStack>
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
  return (
    <FormField label={label}>
      <HStack gap={2} align="flex-start" flexWrap="wrap" rowGap={2}>
        <NativeSelect
          size="sm"
          flex="0 0 8.5rem"
          w="8.5rem"
          aria-label={labels.operator}
          data-adapttable-part="filter-operator"
          value={op}
          onChange={(e) => {
            const found = ops.find((choice) => choice === e.target.value);
            if (found) write(found, value);
          }}
        >
          {ops.map((choice) => (
            <option key={choice} value={choice}>
              {filterOpLabel(labels, opLabelKeys[choice])}
            </option>
          ))}
        </NativeSelect>
        {needsValue && (
          <Input
            size="sm"
            flex="1 1 7rem"
            minW="7rem"
            aria-label={label}
            data-adapttable-part="filter-input"
            value={value}
            placeholder={def.placeholder}
            onChange={(e) => write(op, e.target.value)}
          />
        )}
      </HStack>
    </FormField>
  );
}

/** Tri-state boolean: Any / True / False — never a checkbox. */
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
        size="sm"
        aria-label={label}
        data-adapttable-part="filter-select"
        value={choice}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "" || next === "true" || next === "false") write(next);
        }}
      >
        <option value="">{labels.boolAny}</option>
        <option value="true">{labels.boolTrue}</option>
        <option value="false">{labels.boolFalse}</option>
      </NativeSelect>
    </FormField>
  );
}

/** One definition rendered as its kit-native Chakra control. */
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
  accentColor?: string;
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
            <Spinner size="xs" />
          ) : (
            <HStack
              gap={2}
              flexWrap="wrap"
              align="flex-start"
              role="group"
              aria-labelledby={id}
              maxH={`${CHECKLIST_LIST_HEIGHT}px`}
              overflowY="auto"
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
    default:
      return null;
  }
}

/**
 * The auto-built filter form: one kit-native Chakra control per declarative
 * `FilterDef`, reading and writing the source's extra-filter bag —
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
  registry = defaultFilterRegistry,
}: Readonly<AutoFilterFormProps<TRow>>) {
  const resolved = resolveLabels(labels);
  return (
    <Stack gap={6}>
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
    </Stack>
  );
}
